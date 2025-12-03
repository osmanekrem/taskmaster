import { IssueRepository } from '@/repositories/issue-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import { TicketTypeRepository } from '@/repositories/ticket-type-repository';
import { WorkflowRepository } from '@/repositories/workflow-repository';
import { StatusRepository } from '@/repositories/status-repository';
import { FieldRepository } from '@/repositories/field-repository';
import { SprintIssueRepository } from '@/repositories/sprint-repository';
import type { NotificationService } from '@/services/notification-service';
import { db } from '@/db';
import { sprintIssues } from '@/db/schema/sprints';
import { eq, and } from 'drizzle-orm';
import { ErrorMessages, ISSUE_TYPE_HIERARCHY } from '@taskmaster/constants';
import { createAppError } from '@/lib/errors';
import type {
  CreateIssueInput,
  UpdateIssueInput,
  TransitionIssueInput,
  IssueFilters,
} from '@taskmaster/validation';
import type {
  FieldValue,
  HistoryChange,
  ChangeActionType,
} from '@/db/schema/issues';
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
  emitIssueDeleted,
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
    private readonly ticketTypeRepository: TicketTypeRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly statusRepository: StatusRepository,
    private readonly fieldRepository: FieldRepository,
    private readonly sprintIssueRepository: SprintIssueRepository,
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
    const issueType = await this.ticketTypeRepository.findById(
      input.issueTypeId,
    );
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
    if (statusId) {
      // Validate the provided status is in the workflow
      await this.validateStatusInWorkflow(
        input.projectId,
        input.issueTypeId,
        statusId,
      );
    } else {
      statusId = await this.getInitialStatus(
        input.projectId,
        input.issueTypeId,
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
    await this.issueRepository.addChangeGroup(issue.id, reporterId, 'created', [
      { field: 'issue', oldValue: undefined, newValue: key },
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
        newValue: (await this.ticketTypeRepository.findById(input.issueTypeId))
          ?.name,
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
        const issueType = await this.ticketTypeRepository.findById(
          issue.issueTypeId,
        );
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
    await this.issueRepository.update(id, {
      issueTypeId: input.issueTypeId,
      assigneeId: input.assigneeId,
      parentId: input.parentId,
      epicId: input.epicId,
      dueDate: input.dueDate,
    });

    // Record history
    if (changes.length > 0) {
      await this.issueRepository.addChangeGroup(
        id,
        userId,
        this.determineActionType(changes),
        this.toChangeItems(changes),
      );
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
        current?.field || (await this.fieldRepository.findById(fv.fieldId));

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
      await this.issueRepository.addChangeGroup(
        issueId,
        userId,
        'updated',
        this.toChangeItems(changes),
      );
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
    const transitions = await this.workflowRepository.findTransitionsToStatus(
      workflowId,
      issue.statusId,
      input.toStatusId,
    );

    if (transitions.length === 0) {
      throw createAppError(ErrorMessages.INVALID_STATUS_TRANSITION, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // Use the first valid transition
    const transitionId = transitions[0].id;

    // Get the target status for validation
    const targetStatus = await this.statusRepository.findStatusById(
      input.toStatusId,
    );
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
      await this.issueRepository.addChangeGroup(
        id,
        userId,
        'transitioned',
        this.toChangeItems(historyChanges),
      );
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
          const sprintIssue = await this.sprintIssueRepository.findByIssueId(
            id,
          );

          if (sprintIssue?.sprint?.status === 'active') {
            const { container } = await import('@/lib/container');
            await container.sprint.recordBurndownData(sprintIssue.sprint.id);
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
    const transitions = await this.workflowRepository.findAvailableTransitions(
      workflowId,
      issue.statusId,
    );

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

  /**
   * Get issue history using the new normalized change_groups/change_items
   */
  async getIssueHistory(issueId: string, page = 1, limit = 50) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    // Use new normalized change history
    return this.issueRepository.getChangeHistory(issueId, page, limit);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert HistoryChange[] to ChangeItem format for addChangeGroup
   */
  private toChangeItems(changes: HistoryChange[]): Array<{
    field: string;
    fieldId?: string;
    oldString?: string;
    newString?: string;
    oldValue?: string;
    newValue?: string;
  }> {
    return changes.map((c) => ({
      field: c.field,
      fieldId: c.fieldId,
      oldString: this.valueToString(c.oldValue),
      newString: this.valueToString(c.newValue),
      oldValue: this.valueToString(c.oldValue),
      newValue: this.valueToString(c.newValue),
    }));
  }

  /**
   * Convert value to string for change items
   */
  private valueToString(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.join(', ');
    return JSON.stringify(value);
  }

  /**
   * Determine action type from changes
   */
  private determineActionType(changes: HistoryChange[]): ChangeActionType {
    const fields = changes.map((c) => c.field.toLowerCase());

    if (fields.includes('status')) return 'transitioned';
    if (fields.includes('assignee')) return 'assigned';
    if (fields.includes('comment')) return 'commented';
    if (fields.some((f) => f.includes('attachment'))) {
      const attachmentChange = changes.find((c) =>
        c.field.toLowerCase().includes('attachment'),
      );
      if (attachmentChange?.oldValue === null) return 'attachment_added';
      if (attachmentChange?.newValue === null) return 'attachment_removed';
    }
    if (fields.includes('worklog')) return 'worklog_added';
    if (fields.includes('link')) {
      const linkChange = changes.find((c) =>
        c.field.toLowerCase().includes('link'),
      );
      if (linkChange?.oldValue === null) return 'linked';
      if (linkChange?.newValue === null) return 'unlinked';
    }
    if (fields.includes('rank')) return 'updated';

    return 'updated';
  }

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
    const defaultWorkflow = await this.workflowRepository.findDefault();
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

    const initialStatus = await this.workflowRepository.findInitialStatus(
      workflowId,
    );

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

    const workflowStatus = await this.workflowRepository.findWorkflowStatus(
      workflowId,
      statusId,
    );

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
    const transition = await this.workflowRepository.findTransition(
      workflowId,
      fromStatusId,
      toStatusId,
    );

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

    const parentIssueType = await this.ticketTypeRepository.findById(
      parent.issueTypeId,
    );

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

    const epicIssueType = await this.ticketTypeRepository.findById(
      epic.issueTypeId,
    );

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
      const issue = await this.issueRepository.findById(issueId);
      resolvedProjectId = issue?.projectId;
    }

    // Get fields configured for this issue type
    const configuredFields =
      await this.fieldRepository.findIssueTypeFieldsWithFieldByIssueTypeId(
        issueTypeId,
      );

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

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Bulk edit multiple issues at once
   * Applies the same changes to all specified issues
   */
  async bulkEdit(
    issueIds: string[],
    updates: {
      assigneeId?: string | null;
      priority?: string;
      labels?: string[];
      dueDate?: Date | null;
      epicId?: string | null;
    },
    userId: string,
  ) {
    if (issueIds.length === 0) {
      return { success: true, updatedCount: 0, issues: [] };
    }

    // Get all issues to validate they exist and gather old values
    const existingIssues = await this.issueRepository.findByIds(issueIds);

    if (existingIssues.length === 0) {
      throw createAppError('No valid issues found', {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Filter to only found issues
    const foundIds = existingIssues.map((i) => i.id);
    const notFoundIds = issueIds.filter((id) => !foundIds.includes(id));

    // Validate epic if provided
    if (updates.epicId) {
      await this.validateEpicLink(updates.epicId);
    }

    // Prepare history entries for each issue
    const historyEntries: {
      issueId: string;
      userId: string;
      changes: HistoryChange[];
    }[] = [];

    for (const issue of existingIssues) {
      const changes: HistoryChange[] = [];

      if (
        updates.assigneeId !== undefined &&
        updates.assigneeId !== issue.assigneeId
      ) {
        changes.push({
          field: 'assignee',
          oldValue: issue.assignee?.name || null,
          newValue: updates.assigneeId,
        });
      }

      if (
        updates.priority !== undefined &&
        updates.priority !== issue.priority
      ) {
        changes.push({
          field: 'priority',
          oldValue: issue.priority,
          newValue: updates.priority,
        });
      }

      if (updates.labels !== undefined) {
        const oldLabels = (issue.labels as string[]) || [];
        const sortedOldLabels = [...oldLabels].sort((a, b) =>
          a.localeCompare(b),
        );
        const sortedNewLabels = [...updates.labels].sort((a, b) =>
          a.localeCompare(b),
        );
        if (
          JSON.stringify(sortedOldLabels) !== JSON.stringify(sortedNewLabels)
        ) {
          changes.push({
            field: 'labels',
            oldValue: oldLabels.join(', '),
            newValue: updates.labels.join(', '),
          });
        }
      }

      if (updates.dueDate !== undefined) {
        const oldDate = issue.dueDate?.toISOString().split('T')[0] || null;
        const newDate = updates.dueDate?.toISOString().split('T')[0] || null;
        if (oldDate !== newDate) {
          changes.push({
            field: 'dueDate',
            oldValue: oldDate,
            newValue: newDate,
          });
        }
      }

      if (updates.epicId !== undefined && updates.epicId !== issue.epicId) {
        changes.push({
          field: 'epic',
          oldValue: issue.epic?.key || null,
          newValue: updates.epicId,
        });
      }

      if (changes.length > 0) {
        historyEntries.push({ issueId: issue.id, userId, changes });
      }
    }

    // Execute bulk update
    const updated = await this.issueRepository.bulkUpdate(foundIds, updates);

    // Add history for all changes
    if (historyEntries.length > 0) {
      await this.issueRepository.bulkAddChangeGroups(
        historyEntries.map((entry) => ({
          issueId: entry.issueId,
          userId: entry.userId,
          action: this.determineActionType(entry.changes),
          changes: this.toChangeItems(entry.changes),
        })),
      );
    }

    // Emit events for each updated issue
    for (const issue of existingIssues) {
      const historyEntry = historyEntries.find((h) => h.issueId === issue.id);
      if (historyEntry && historyEntry.changes.length > 0) {
        const eventChanges: Record<string, { from: unknown; to: unknown }> = {};
        for (const change of historyEntry.changes) {
          eventChanges[change.field] = {
            from: change.oldValue,
            to: change.newValue,
          };
        }
        emitIssueUpdated({
          issueId: issue.id,
          issueKey: issue.key,
          projectId: issue.projectId,
          actorId: userId,
          changes: eventChanges,
        });
      }
    }

    return {
      success: true,
      updatedCount: updated.length,
      notFoundIds,
      issues: updated,
    };
  }

  /**
   * Bulk transition multiple issues to a new status
   * All issues must support the transition from their current status
   */
  async bulkTransition(
    issueIds: string[],
    toStatusId: string,
    userId: string,
    options?: {
      resolutionId?: string;
      comment?: string;
      skipValidation?: boolean;
    },
  ) {
    if (issueIds.length === 0) {
      return { success: true, transitionedCount: 0, issues: [], failed: [] };
    }

    // Get all issues with their current status
    const existingIssues = await this.issueRepository.findByIds(issueIds);

    if (existingIssues.length === 0) {
      throw createAppError('No valid issues found', {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Get target status
    const targetStatus = await this.statusRepository.findStatusById(toStatusId);

    if (!targetStatus) {
      throw createAppError(ErrorMessages.STATUS_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Validate resolution for done status
    if (targetStatus.category === 'done' && !options?.resolutionId) {
      throw createAppError(ErrorMessages.RESOLUTION_REQUIRED, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    const transitioned: typeof existingIssues = [];
    const failed: { issueId: string; issueKey: string; reason: string }[] = [];

    // Group issues by project/issueType to batch workflow validation
    const issuesByWorkflow = new Map<string, typeof existingIssues>();

    for (const issue of existingIssues) {
      const workflowKey = `${issue.projectId}:${issue.issueTypeId}`;
      if (!issuesByWorkflow.has(workflowKey)) {
        issuesByWorkflow.set(workflowKey, []);
      }
      issuesByWorkflow.get(workflowKey)!.push(issue);
    }

    // Validate and collect transitionable issues
    const validIssueIds: string[] = [];

    for (const [workflowKey, issueGroup] of issuesByWorkflow) {
      const [projectId, issueTypeId] = workflowKey.split(':');

      // Get workflow for this project/issueType combination
      const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);

      for (const issue of issueGroup) {
        // Check if transition is valid from current status
        if (!options?.skipValidation) {
          const transitions =
            await this.workflowRepository.findTransitionsToStatus(
              workflowId,
              issue.statusId,
              toStatusId,
            );

          if (transitions.length === 0) {
            failed.push({
              issueId: issue.id,
              issueKey: issue.key,
              reason: `Invalid transition from ${issue.status?.name} to ${targetStatus.name}`,
            });
            continue;
          }
        }

        validIssueIds.push(issue.id);
        transitioned.push(issue);
      }
    }

    if (validIssueIds.length === 0) {
      return {
        success: false,
        transitionedCount: 0,
        issues: [],
        failed,
        message: 'No issues could be transitioned',
      };
    }

    // Execute bulk status update
    const resolvedAt = targetStatus.category === 'done' ? new Date() : null;
    const resolutionId =
      targetStatus.category === 'done' ? options?.resolutionId : null;

    await this.issueRepository.bulkUpdateStatus(
      validIssueIds,
      toStatusId,
      resolutionId,
      resolvedAt,
    );

    // Prepare and add history entries
    const historyEntries = transitioned.map((issue) => ({
      issueId: issue.id,
      userId,
      changes: [
        {
          field: 'status',
          oldValue: issue.status?.name,
          newValue: targetStatus.name,
        },
        ...(resolutionId
          ? [
              {
                field: 'resolution',
                oldValue: issue.resolution?.name || null,
                newValue: resolutionId,
              },
            ]
          : []),
      ],
    }));

    await this.issueRepository.bulkAddChangeGroups(
      historyEntries.map((entry) => ({
        issueId: entry.issueId,
        userId: entry.userId,
        action: 'transitioned' as ChangeActionType,
        changes: this.toChangeItems(entry.changes),
      })),
    );

    // Emit events for each transitioned issue
    for (const issue of transitioned) {
      emitIssueTransitioned({
        issueId: issue.id,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
        transitionId: 'bulk-transition',
        statusId: toStatusId,
        changes: {
          status: { from: issue.statusId, to: toStatusId },
          ...(resolutionId
            ? { resolution: { from: issue.resolutionId, to: resolutionId } }
            : {}),
        },
      });
    }

    return {
      success: true,
      transitionedCount: transitioned.length,
      issues: transitioned,
      failed,
    };
  }

  /**
   * Bulk delete multiple issues
   */
  async bulkDelete(
    issueIds: string[],
    userId: string,
    options?: {
      deleteSubtasks?: boolean;
    },
  ) {
    if (issueIds.length === 0) {
      return { success: true, deletedCount: 0, deletedKeys: [] };
    }

    // Get all issues to validate they exist
    const existingIssues = await this.issueRepository.findByIds(issueIds);

    if (existingIssues.length === 0) {
      throw createAppError('No valid issues found', {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    const foundIds = existingIssues.map((i) => i.id);

    // If deleteSubtasks is true, also delete child issues
    let allIdsToDelete = [...foundIds];

    if (options?.deleteSubtasks) {
      // Find all subtasks of these issues
      const subtasks = await this.issueRepository.findSubtasksByParentIds(
        foundIds,
      );
      allIdsToDelete = [...allIdsToDelete, ...subtasks.map((s) => s.id)];
    }

    // Emit delete events before actually deleting
    for (const issue of existingIssues) {
      emitIssueDeleted({
        issueId: issue.id,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
      });
    }

    // Execute bulk delete
    const result = await this.issueRepository.bulkDelete(allIdsToDelete);

    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedKeys: result.deletedKeys,
      deletedByProject: result.deletedByProject,
    };
  }

  /**
   * Bulk move issues to a different project
   */
  async bulkMove(
    issueIds: string[],
    targetProjectId: string,
    userId: string,
    options?: {
      targetIssueTypeId?: string;
      targetStatusId?: string;
    },
  ) {
    if (issueIds.length === 0) {
      return { success: true, movedCount: 0, issues: [] };
    }

    // Validate target project exists
    const targetProject = await this.projectRepository.findById(
      targetProjectId,
    );
    if (!targetProject) {
      throw createAppError(ErrorMessages.PROJECT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Get all issues
    const existingIssues = await this.issueRepository.findByIds(issueIds);

    if (existingIssues.length === 0) {
      throw createAppError('No valid issues found', {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Get default issue type and status for target project if not specified
    let targetIssueTypeId = options?.targetIssueTypeId;
    let targetStatusId = options?.targetStatusId;

    if (!targetIssueTypeId) {
      const projectIssueTypes =
        await this.projectRepository.getProjectIssueTypes(targetProjectId);
      targetIssueTypeId = projectIssueTypes[0]?.issueType.id;
      if (!targetIssueTypeId) {
        throw createAppError('Target project has no issue types', {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
    }

    if (!targetStatusId) {
      // Get default status from workflow
      const workflowId = await this.getWorkflowForIssue(
        targetProjectId,
        targetIssueTypeId,
      );
      const workflowStatusList =
        await this.workflowRepository.findWorkflowStatuses(workflowId);
      targetStatusId = workflowStatusList[0]?.statusId;
      if (!targetStatusId) {
        throw createAppError('Could not determine target status', {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
    }

    const movedIssues: { id: string; oldKey: string; newKey: string }[] = [];

    // Move each issue (need to update keys)
    for (const issue of existingIssues) {
      // Generate new key for target project using existing method
      const { key: newKey, issueNumber: nextNumber } =
        await this.issueRepository.getNextIssueNumber(targetProjectId);

      // Update issue
      await db
        .update(issues)
        .set({
          projectId: targetProjectId,
          key: newKey,
          issueNumber: nextNumber,
          issueTypeId: targetIssueTypeId,
          statusId: targetStatusId,
          updatedAt: new Date(),
        })
        .where(eq(issues.id, issue.id));

      movedIssues.push({
        id: issue.id,
        oldKey: issue.key,
        newKey,
      });

      // Add history
      await this.issueRepository.addChangeGroup(issue.id, userId, 'updated', [
        {
          field: 'project',
          oldValue: issue.project?.name,
          newValue: targetProject.name,
        },
        { field: 'key', oldValue: issue.key, newValue: newKey },
      ]);

      // Emit event
      emitIssueUpdated({
        issueId: issue.id,
        issueKey: newKey,
        projectId: targetProjectId,
        actorId: userId,
        changes: {
          project: { from: issue.projectId, to: targetProjectId },
          key: { from: issue.key, to: newKey },
        },
      });
    }

    return {
      success: true,
      movedCount: movedIssues.length,
      issues: movedIssues,
    };
  }
}
