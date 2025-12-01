import { IssueRepository } from '@/repositories/issue-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import type { NotificationService } from '@/services/notification-service';
import { db } from '@/db';
import { statuses } from '@/db/schema/statuses';
import { workflowStatuses, workflowTransitions } from '@/db/schema/workflows';
import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { fields } from '@/db/schema/field';
import { sprintIssues } from '@/db/schema/sprints';
import { eq, and, isNull, or } from 'drizzle-orm';
import { ErrorMessages, ISSUE_TYPE_HIERARCHY } from '@taskmaster/constants';
import { createAppError } from '@/lib/errors';
import type {
  CreateIssueInput,
  UpdateIssueInput,
  TransitionIssueInput,
  IssueFilters,
} from '@taskmaster/validation';
import type { FieldValue, HistoryChange } from '@/db/schema/issues';
import {
  generateRankAfter,
  generateRankBetween,
  generateRanks,
} from '@/utils/lexorank';
import {
  validateFieldValue,
  validateEntityExists,
  type FieldConfig,
} from '@/utils/field-validation';
import { workflowService } from '@/services/workflow-service';
import { withTransaction } from '@/lib/transaction';
import { issues } from '@/db/schema/issues';
import { issueComments } from '@/db/schema/comments';
import { issueWatchers } from '@/db/schema/notifications';
import {
  emitIssueCreated,
  emitIssueUpdated,
  emitIssueTransitioned,
  emitIssueAssigned,
} from '@/lib/events/event-bus';

/**
 * Issue Service
 *
 * Handles all issue-related business logic including:
 * - CRUD operations
 * - Status transitions via workflow engine
 * - Field value management
 * - Backlog ranking/ordering
 * - History tracking
 *
 * Dependencies are injected through constructor for testability.
 */
export class IssueService {
  constructor(
    private readonly issueRepository: IssueRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // ==========================================================================
  // ISSUE RETRIEVAL
  // ==========================================================================

  async getIssueById(id: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return issue;
  }

  async getIssueByKey(key: string) {
    const issue = await this.issueRepository.findByKey(key);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return issue;
  }

  async getIssues(filters: IssueFilters) {
    return this.issueRepository.findMany(filters);
  }

  async getSubtasks(parentId: string) {
    return this.issueRepository.findChildren(parentId);
  }

  async getEpicChildren(epicId: string) {
    return this.issueRepository.findEpicChildren(epicId);
  }

  // ==========================================================================
  // ISSUE CREATION
  // ==========================================================================

  async createIssue(input: CreateIssueInput, reporterId: string) {
    // 1. Validate project exists
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) {
      throw createAppError(ErrorMessages.PROJECT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // 2. Validate issue type is in project
    const projectIssueType = await this.projectRepository.getProjectIssueType(
      input.projectId,
      input.issueTypeId,
    );
    if (!projectIssueType) {
      throw createAppError(ErrorMessages.ISSUE_TYPE_NOT_IN_PROJECT, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // 3. Get issue type for hierarchy validation
    const issueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, input.issueTypeId),
    });
    if (!issueType) {
      throw createAppError(ErrorMessages.TICKET_TYPE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // 4. Validate parent/epic hierarchy
    if (input.parentId) {
      await this.validateParentHierarchy(
        input.parentId,
        issueType.hierarchyLevel,
      );
    }
    if (input.epicId) {
      await this.validateEpicLink(input.epicId);
    }

    // 5. Get initial status from workflow
    let statusId = input.statusId;
    if (!statusId) {
      statusId = await this.getInitialStatus(
        input.projectId,
        input.issueTypeId,
      );
    } else {
      // Validate the provided status is in the workflow
      await this.validateStatusInWorkflow(
        input.projectId,
        input.issueTypeId,
        statusId,
      );
    }

    // 6. Generate issue key atomically
    const { key, issueNumber } = await this.issueRepository.getNextIssueNumber(
      input.projectId,
    );

    // 7. Generate rank for backlog ordering (insert at bottom)
    const initialRank = await this.getInitialRankForProject(input.projectId);

    // 8. Create the issue
    const issue = await this.issueRepository.create({
      key,
      issueNumber,
      projectId: input.projectId,
      issueTypeId: input.issueTypeId,
      statusId,
      reporterId,
      assigneeId: input.assigneeId,
      parentId: input.parentId,
      epicId: input.epicId,
      dueDate: input.dueDate,
      rank: initialRank,
    });

    // 9. Set field values if provided
    if (input.fieldValues?.length) {
      await this.validateAndSetFieldValues(
        issue.id,
        input.issueTypeId,
        input.fieldValues,
        input.projectId, // Pass projectId for entity validation
      );
    }

    // 10. Add creation history
    await this.issueRepository.addHistory(issue.id, reporterId, [
      { field: 'issue', oldValue: null, newValue: key },
    ]);

    // 11. Auto-watch for reporter (fire-and-forget, don't block on errors)
    this.notificationService
      .autoWatch(issue.id, reporterId, 'auto_created')
      .catch((err) => console.error('[Notification] Auto-watch failed:', err));

    // 12. Emit issue:created event (notification scheme will handle recipients)
    emitIssueCreated({
      issueId: issue.id,
      issueKey: key,
      projectId: input.projectId,
      actorId: reporterId,
    });

    // 13. Emit issue:assigned if assignee is set
    if (input.assigneeId && input.assigneeId !== reporterId) {
      emitIssueAssigned({
        issueId: issue.id,
        issueKey: key,
        projectId: input.projectId,
        actorId: reporterId,
        changes: {
          assigneeId: { from: null, to: input.assigneeId },
        },
      });
    }

    return this.issueRepository.findById(issue.id);
  }

  // ==========================================================================
  // ISSUE UPDATE
  // ==========================================================================

  async updateIssue(id: string, input: UpdateIssueInput, userId: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const changes: HistoryChange[] = [];

    // Validate and track changes
    if (
      input.issueTypeId !== undefined &&
      input.issueTypeId !== issue.issueTypeId
    ) {
      // Validate new issue type is in project
      const projectIssueType = await this.projectRepository.getProjectIssueType(
        issue.projectId,
        input.issueTypeId,
      );
      if (!projectIssueType) {
        throw createAppError(ErrorMessages.ISSUE_TYPE_NOT_IN_PROJECT, {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
      changes.push({
        field: 'issueType',
        oldValue: issue.issueType?.name,
        newValue: (
          await db.query.issueTypes.findFirst({
            where: eq(issueTypes.id, input.issueTypeId),
          })
        )?.name,
      });
    }

    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== issue.assigneeId
    ) {
      changes.push({
        field: 'assignee',
        oldValue: issue.assignee?.name || null,
        newValue: input.assigneeId, // Will be resolved to name in history display
      });
    }

    if (input.parentId !== undefined && input.parentId !== issue.parentId) {
      if (input.parentId) {
        const issueType = await db.query.issueTypes.findFirst({
          where: eq(issueTypes.id, issue.issueTypeId),
        });
        await this.validateParentHierarchy(
          input.parentId,
          issueType?.hierarchyLevel || ISSUE_TYPE_HIERARCHY.STANDARD,
        );
        // Check for circular reference
        if (await this.issueRepository.isAncestorOf(id, input.parentId)) {
          throw createAppError(ErrorMessages.CIRCULAR_HIERARCHY, {
            statusCode: 400,
            code: 'BAD_REQUEST',
          });
        }
      }
      changes.push({
        field: 'parent',
        oldValue: issue.parent?.key || null,
        newValue: input.parentId,
      });
    }

    if (input.epicId !== undefined && input.epicId !== issue.epicId) {
      if (input.epicId) {
        await this.validateEpicLink(input.epicId);
      }
      changes.push({
        field: 'epic',
        oldValue: issue.epic?.key || null,
        newValue: input.epicId,
      });
    }

    if (input.dueDate !== undefined) {
      const oldDate = issue.dueDate?.toISOString().split('T')[0] || null;
      const newDate = input.dueDate?.toISOString().split('T')[0] || null;
      if (oldDate !== newDate) {
        changes.push({
          field: 'dueDate',
          oldValue: oldDate,
          newValue: newDate,
        });
      }
    }

    // Apply update
    const updated = await this.issueRepository.update(id, {
      issueTypeId: input.issueTypeId,
      assigneeId: input.assigneeId,
      parentId: input.parentId,
      epicId: input.epicId,
      dueDate: input.dueDate,
    });

    // Record history
    if (changes.length > 0) {
      await this.issueRepository.addHistory(id, userId, changes);
    }

    // Emit issue:updated event
    if (changes.length > 0) {
      const eventChanges: Record<string, { from: unknown; to: unknown }> = {};
      for (const change of changes) {
        eventChanges[change.field] = {
          from: change.oldValue,
          to: change.newValue,
        };
      }
      emitIssueUpdated({
        issueId: id,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
        changes: eventChanges,
      });
    }

    // Emit issue:assigned if assignee changed
    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== issue.assigneeId &&
      input.assigneeId !== null
    ) {
      emitIssueAssigned({
        issueId: id,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
        changes: {
          assigneeId: { from: issue.assigneeId, to: input.assigneeId },
        },
      });
    }

    return this.issueRepository.findById(id);
  }

  // ==========================================================================
  // FIELD VALUES
  // ==========================================================================

  async updateFieldValues(
    issueId: string,
    fieldValues: { fieldId: string; value: FieldValue }[],
    userId: string,
  ) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const changes: HistoryChange[] = [];
    const currentValues = await this.issueRepository.getFieldValues(issueId);
    const currentValueMap = new Map(currentValues.map((v) => [v.fieldId, v]));

    for (const fv of fieldValues) {
      const current = currentValueMap.get(fv.fieldId);
      const field =
        current?.field ||
        (await db.query.fields.findFirst({ where: eq(fields.id, fv.fieldId) }));

      if (JSON.stringify(current?.value) !== JSON.stringify(fv.value)) {
        changes.push({
          field: field?.name || 'Unknown',
          fieldId: fv.fieldId,
          oldValue: current?.value ?? null,
          newValue: fv.value,
        });
      }
    }

    await this.validateAndSetFieldValues(
      issueId,
      issue.issueTypeId,
      fieldValues,
    );

    if (changes.length > 0) {
      await this.issueRepository.addHistory(issueId, userId, changes);
      await this.issueRepository.update(issueId, { updatedAt: new Date() });
    }

    return this.issueRepository.findById(issueId);
  }

  // ==========================================================================
  // STATUS TRANSITIONS
  // ==========================================================================

  async transitionIssue(
    id: string,
    input: TransitionIssueInput,
    userId: string,
  ) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Get the workflow for this issue
    const workflowId = await this.getWorkflowForIssue(
      issue.projectId,
      issue.issueTypeId,
    );

    // Find the transition that leads to the target status
    const transitions = await db.query.workflowTransitions.findMany({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        eq(workflowTransitions.toStatusId, input.toStatusId),
        or(
          eq(workflowTransitions.fromStatusId, issue.statusId),
          isNull(workflowTransitions.fromStatusId), // Global transition
        ),
      ),
    });

    if (transitions.length === 0) {
      throw createAppError(ErrorMessages.INVALID_STATUS_TRANSITION, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // Use the first valid transition
    const transitionId = transitions[0].id;

    // Get the target status for validation
    const targetStatus = await db.query.statuses.findFirst({
      where: eq(statuses.id, input.toStatusId),
    });
    if (!targetStatus) {
      throw createAppError(ErrorMessages.STATUS_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Validate resolution requirements
    if (targetStatus.category === 'done') {
      if (!input.resolutionId) {
        throw createAppError(ErrorMessages.RESOLUTION_REQUIRED, {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
    } else if (input.resolutionId) {
      throw createAppError(ErrorMessages.CANNOT_SET_RESOLUTION, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // Execute transition using workflow engine
    const workflow = workflowService();
    const result = await workflow.executeTransition({
      issueId: id,
      userId,
      workflowId,
      transitionId,
      resolutionId: input.resolutionId,
      comment: input.comment,
    });

    if (!result.success) {
      throw createAppError(
        (result as any).errors?.join(', ') || 'Transition failed',
        {
          statusCode: 400,
          code: 'TRANSITION_FAILED',
        },
      );
    }

    // Extract post-function changes
    const postFunctionChanges = result as typeof result & {
      issueUpdates?: Record<string, unknown>;
      comments?: { content: string; userId: string }[];
      watchers?: { add: string[]; remove: string[] };
      sprintChange?: { sprintId: string | null };
      notifications?: { type: string; recipients: string[] }[];
    };

    // Build history changes
    const historyChanges: HistoryChange[] = [
      {
        field: 'status',
        oldValue: issue.status?.name,
        newValue: targetStatus.name,
      },
    ];

    if (input.resolutionId) {
      historyChanges.push({
        field: 'resolution',
        oldValue: issue.resolution?.name || null,
        newValue: input.resolutionId,
      });
    }

    // Add post-function changes to history
    if (result.changes) {
      for (const change of result.changes) {
        if (change.field !== 'status') {
          historyChanges.push({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
          });
        }
      }
    }

    // Execute all DB operations in a transaction for atomicity
    await withTransaction(async (tx) => {
      // 1. Update the issue with status change and post-function updates
      const updateData: Record<string, unknown> = {
        statusId: input.toStatusId,
        resolutionId:
          targetStatus.category === 'done' ? input.resolutionId : null,
        resolvedAt: targetStatus.category === 'done' ? new Date() : null,
        updatedAt: new Date(),
      };

      if (postFunctionChanges.issueUpdates) {
        for (const [field, value] of Object.entries(
          postFunctionChanges.issueUpdates,
        )) {
          if (!['statusId', 'resolutionId', 'resolvedAt'].includes(field)) {
            updateData[field] = value;
          }
        }
      }

      await tx.update(issues).set(updateData).where(eq(issues.id, id));

      // 2. Apply watcher changes
      if (postFunctionChanges.watchers) {
        for (const userIdToAdd of postFunctionChanges.watchers.add) {
          await tx
            .insert(issueWatchers)
            .values({
              issueId: id,
              userId: userIdToAdd,
              watchReason: 'workflow',
            })
            .onConflictDoNothing();
        }
        for (const userIdToRemove of postFunctionChanges.watchers.remove) {
          await tx
            .delete(issueWatchers)
            .where(
              and(
                eq(issueWatchers.issueId, id),
                eq(issueWatchers.userId, userIdToRemove),
              ),
            );
        }
      }

      // 3. Apply sprint changes
      if (postFunctionChanges.sprintChange) {
        const newSprintId = postFunctionChanges.sprintChange.sprintId;
        // Remove from current sprint
        await tx.delete(sprintIssues).where(eq(sprintIssues.issueId, id));
        // Add to new sprint if specified
        if (newSprintId) {
          await tx.insert(sprintIssues).values({
            sprintId: newSprintId,
            issueId: id,
            addedAt: new Date(),
          });
        }
      }

      // 4. Create comments from post-functions
      if (postFunctionChanges.comments?.length) {
        for (const comment of postFunctionChanges.comments) {
          await tx.insert(issueComments).values({
            issueId: id,
            authorId: comment.userId,
            content: comment.content,
          });
        }
      }

      // 5. Record history
      await this.issueRepository.addHistory(id, userId, historyChanges);
    });

    // Emit issue:transitioned event (notification scheme will handle recipients)
    emitIssueTransitioned({
      issueId: id,
      issueKey: issue.key,
      projectId: issue.projectId,
      actorId: userId,
      transitionId,
      statusId: input.toStatusId,
      changes: {
        status: { from: issue.status?.name, to: targetStatus.name },
        ...(input.resolutionId && {
          resolution: { from: issue.resolution?.name, to: input.resolutionId },
        }),
      },
    });

    // Process post-function triggered notifications (these are custom, not scheme-based)
    if (postFunctionChanges.notifications?.length) {
      for (const notification of postFunctionChanges.notifications) {
        this.notificationService
          .notifyUsers(
            notification.recipients,
            'workflow_notification' as any,
            `Workflow notification: ${notification.type}`,
            {
              issueId: id,
              actorId: userId,
              data: { type: notification.type },
            },
          )
          .catch((err) =>
            console.error(
              '[Notification] Post-function notification failed:',
              err,
            ),
          );
      }
    }

    // Update burndown data if issue is in an active sprint and status changed to done
    // Fire-and-forget: don't block on burndown update
    if (targetStatus.category === 'done') {
      (async () => {
        try {
          // Check if issue is in a sprint
          const sprintIssue = await db.query.sprintIssues.findFirst({
            where: eq(sprintIssues.issueId, id),
            with: {
              sprint: { columns: { id: true, status: true } },
            },
          });

          if (sprintIssue?.sprint?.status === 'active') {
            const { SprintService } = await import('@/services/sprint-service');
            const sprintService = new SprintService();
            await sprintService.recordBurndownData(sprintIssue.sprint.id);
          }
        } catch (err) {
          console.error('[Burndown] Failed to update burndown:', err);
        }
      })();
    }

    return this.issueRepository.findById(id);
  }

  async getAvailableTransitions(issueId: string) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const workflowId = await this.getWorkflowForIssue(
      issue.projectId,
      issue.issueTypeId,
    );

    // Get transitions from current status
    const transitions = await db.query.workflowTransitions.findMany({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        or(
          eq(workflowTransitions.fromStatusId, issue.statusId),
          isNull(workflowTransitions.fromStatusId), // Global transitions
        ),
      ),
      with: {
        toStatus: true,
      },
    });

    return transitions;
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async deleteIssue(id: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Check for subtasks
    const subtasks = await this.issueRepository.findChildren(id);
    if (subtasks.length > 0) {
      throw createAppError(ErrorMessages.CANNOT_MOVE_ISSUE_WITH_SUBTASKS, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    return this.issueRepository.delete(id);
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  async getIssueHistory(issueId: string, page = 1, limit = 50) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return this.issueRepository.getHistory(issueId, page, limit);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getWorkflowForIssue(
    projectId: string,
    issueTypeId: string,
  ): Promise<string> {
    // 1. Check project-issue-type specific workflow
    const projectIssueType = await this.projectRepository.getProjectIssueType(
      projectId,
      issueTypeId,
    );
    if (projectIssueType?.workflowId) {
      return projectIssueType.workflowId;
    }

    // 2. Check project default workflow
    const project = await this.projectRepository.findById(projectId);
    if (project?.defaultWorkflowId) {
      return project.defaultWorkflowId;
    }

    // 3. Get system default workflow
    const defaultWorkflow = await db.query.workflows.findFirst({
      where: eq(
        (
          await import('@/db/schema/workflows')
        ).workflows.isDefault,
        true,
      ),
    });
    if (!defaultWorkflow) {
      throw new Error('No default workflow found');
    }
    return defaultWorkflow.id;
  }

  private async getInitialStatus(
    projectId: string,
    issueTypeId: string,
  ): Promise<string> {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);

    const initialStatus = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.isInitial, true),
      ),
    });

    if (!initialStatus) {
      throw new Error('No initial status found in workflow');
    }

    return initialStatus.statusId;
  }

  private async validateStatusInWorkflow(
    projectId: string,
    issueTypeId: string,
    statusId: string,
  ) {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);

    const workflowStatus = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.statusId, statusId),
      ),
    });

    if (!workflowStatus) {
      throw createAppError(ErrorMessages.STATUS_NOT_IN_WORKFLOW, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }
  }

  private async validateTransition(
    projectId: string,
    issueTypeId: string,
    fromStatusId: string,
    toStatusId: string,
  ): Promise<boolean> {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);

    // Check for valid transition
    const transition = await db.query.workflowTransitions.findFirst({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        eq(workflowTransitions.toStatusId, toStatusId),
        or(
          eq(workflowTransitions.fromStatusId, fromStatusId),
          isNull(workflowTransitions.fromStatusId), // Global transition
        ),
      ),
    });

    return !!transition;
  }

  private async validateParentHierarchy(
    parentId: string,
    childHierarchyLevel: number,
  ) {
    const parent = await this.issueRepository.findById(parentId);
    if (!parent) {
      throw createAppError(ErrorMessages.PARENT_ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const parentIssueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, parent.issueTypeId),
    });

    // Subtasks can only be children of standard or epic issues
    if (childHierarchyLevel === ISSUE_TYPE_HIERARCHY.SUBTASK) {
      if (parentIssueType?.hierarchyLevel === ISSUE_TYPE_HIERARCHY.SUBTASK) {
        throw createAppError(ErrorMessages.INVALID_PARENT_HIERARCHY, {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
    }
    // Standard issues can only be children of epic issues (for parent relationship)
    else if (childHierarchyLevel === ISSUE_TYPE_HIERARCHY.STANDARD) {
      // Standard issues typically shouldn't have parents (use epic link instead)
      // But if allowed, parent should be epic or higher
    }
  }

  private async validateEpicLink(epicId: string) {
    const epic = await this.issueRepository.findById(epicId);
    if (!epic) {
      throw createAppError(ErrorMessages.EPIC_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const epicIssueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, epic.issueTypeId),
    });

    if (epicIssueType?.hierarchyLevel !== ISSUE_TYPE_HIERARCHY.EPIC) {
      throw createAppError(ErrorMessages.INVALID_EPIC_HIERARCHY, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }
  }

  private async validateAndSetFieldValues(
    issueId: string,
    issueTypeId: string,
    fieldValues: { fieldId: string; value: FieldValue }[],
    projectId?: string,
  ) {
    // Get projectId if not provided (needed for entity validation)
    let resolvedProjectId = projectId;
    if (!resolvedProjectId) {
      const issue = await db.query.issues.findFirst({
        where: eq(issues.id, issueId),
        columns: { projectId: true },
      });
      resolvedProjectId = issue?.projectId;
    }

    // Get fields configured for this issue type
    const configuredFields = await db.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, issueTypeId),
      with: { field: true },
    });

    const configuredFieldIds = new Set(
      configuredFields.map((cf) => cf.fieldId),
    );
    const fieldSlugMap = new Map(
      configuredFields.map((cf) => [cf.fieldId, cf.field?.slug]),
    );
    const fieldMap = new Map(
      configuredFields.map((cf) => [cf.fieldId, cf.field]),
    );
    const fieldConfigMap = new Map(
      configuredFields.map((cf) => [
        cf.fieldId,
        {
          baseConfig: cf.field?.config as Record<string, unknown> | undefined,
          overrideConfig: cf.configOverride as
            | Record<string, unknown>
            | undefined,
        },
      ]),
    );

    // Validate all provided fields are configured for this issue type
    for (const fv of fieldValues) {
      if (!configuredFieldIds.has(fv.fieldId)) {
        throw createAppError(
          `Field ${fv.fieldId} is not configured for this issue type`,
          {
            statusCode: 400,
            code: 'BAD_REQUEST',
          },
        );
      }

      // Get field definition and validate value type
      const field = fieldMap.get(fv.fieldId);
      if (field) {
        const configs = fieldConfigMap.get(fv.fieldId);
        const mergedConfig: FieldConfig = {
          ...configs?.baseConfig,
          ...configs?.overrideConfig,
        };

        // Use centralized validation utility
        const validationResult = validateFieldValue(
          {
            fieldType: field.fieldType,
            name: field.name,
            options: field.options as unknown[] | null | undefined,
          },
          fv.value,
          mergedConfig,
        );

        if (!validationResult.valid) {
          throw createAppError(
            validationResult.error || `Invalid value for field ${field.name}`,
            {
              statusCode: 400,
              code: 'VALIDATION_ERROR',
            },
          );
        }

        // Validate entity existence for picker fields
        if (fv.value !== null && fv.value !== undefined && resolvedProjectId) {
          await validateEntityExists(
            field.fieldType,
            field.name,
            fv.value,
            resolvedProjectId,
            mergedConfig,
          );
        }
      }
    }

    // Set the field values in field_values table
    await this.issueRepository.setFieldValues(issueId, fieldValues);

    // Sync cached fields (summary, story_points, priority)
    const cacheUpdate: Record<string, unknown> = {};
    const CACHED_FIELD_SLUGS = {
      summary: 'summary',
      story_points: 'storyPoints',
      priority: 'priority',
    } as const;

    for (const fv of fieldValues) {
      const slug = fieldSlugMap.get(fv.fieldId);
      if (slug && slug in CACHED_FIELD_SLUGS) {
        const cacheKey =
          CACHED_FIELD_SLUGS[slug as keyof typeof CACHED_FIELD_SLUGS];
        // Story points should be number, others are strings
        if (slug === 'story_points') {
          cacheUpdate[cacheKey] =
            typeof fv.value === 'number' ? fv.value : null;
        } else {
          cacheUpdate[cacheKey] =
            typeof fv.value === 'string' ? fv.value : null;
        }
      }
    }

    // Update cached columns if any cached fields changed
    if (Object.keys(cacheUpdate).length > 0) {
      await this.issueRepository.update(issueId, cacheUpdate);
    }
  }

  // ==========================================================================
  // RANKING / REORDERING
  // ==========================================================================

  /**
   * Reorder a single issue in the backlog
   */
  async reorderIssue(
    issueId: string,
    afterIssueId: string | null,
    beforeIssueId: string | null,
    userId: string,
  ) {
    // Get the issue to reorder
    const issue = await this.getIssueById(issueId);

    // Get ranks of adjacent issues
    let prevRank: string | null = null;
    let nextRank: string | null = null;

    if (afterIssueId) {
      const afterIssue = await this.issueRepository.findById(afterIssueId);
      if (afterIssue) {
        prevRank = afterIssue.rank;
      }
    }

    if (beforeIssueId) {
      const beforeIssue = await this.issueRepository.findById(beforeIssueId);
      if (beforeIssue) {
        nextRank = beforeIssue.rank;
      }
    }

    // If no afterIssue specified and we need to go to top
    if (!afterIssueId && beforeIssueId) {
      // Get first rank in project to insert before it
      const firstRank = await this.issueRepository.getFirstRankInProject(
        issue.projectId,
      );
      if (firstRank && firstRank !== issue.rank) {
        nextRank = firstRank;
      }
    }

    // If no beforeIssue specified and we need to go to bottom
    if (afterIssueId && !beforeIssueId) {
      // Get last rank in project to insert after it
      const lastRank = await this.issueRepository.getLastRankInProject(
        issue.projectId,
      );
      if (lastRank && lastRank !== issue.rank) {
        prevRank = lastRank;
      }
    }

    // Generate new rank
    const newRank = generateRankBetween(prevRank, nextRank);

    // Update the issue rank
    const updated = await this.issueRepository.updateRank(issueId, newRank);

    return {
      issueId,
      previousRank: issue.rank,
      newRank,
      issue: updated,
    };
  }

  /**
   * Bulk reorder issues - sets explicit order for multiple issues
   */
  async bulkReorderIssues(
    projectId: string,
    issueIds: string[],
    userId: string,
  ) {
    // Validate project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw createAppError(ErrorMessages.PROJECT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Generate ranks for all issues
    const ranks = generateRanks(issueIds.length);

    // Create update array
    const updates = issueIds.map((id, index) => ({
      id,
      rank: ranks[index],
    }));

    // Bulk update
    const results = await this.issueRepository.bulkUpdateRanks(updates);

    return {
      projectId,
      updatedCount: results.length,
      issues: results,
    };
  }

  /**
   * Get backlog issues ordered by rank
   */
  async getBacklogIssues(projectId: string, limit = 100) {
    return this.issueRepository.findByProjectOrderedByRank(projectId, limit);
  }

  /**
   * Get initial rank for a new issue in a project
   */
  async getInitialRankForProject(projectId: string): Promise<string> {
    // Get the last rank in the project and generate one after it
    const lastRank = await this.issueRepository.getLastRankInProject(projectId);
    return generateRankAfter(lastRank);
  }
}
