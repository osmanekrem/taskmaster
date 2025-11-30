import { IssueRepository } from '@/repositories/issue-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import { db } from '@/db';
import { statuses } from '@/db/schema/statuses';
import { workflowStatuses, workflowTransitions } from '@/db/schema/workflows';
import { issueTypes } from '@/db/schema/issue-types';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { fields } from '@/db/schema/field';
import { eq, and, isNull, or } from 'drizzle-orm';
import { ErrorMessages } from '@taskmaster/constants';
import { createAppError } from '@/lib/errors';
import type { CreateIssueInput, UpdateIssueInput, TransitionIssueInput, IssueFilters } from '@taskmaster/validation';
import type { FieldValue, HistoryChange } from '@/db/schema/issues';
import { ISSUE_TYPE_HIERARCHY } from '@taskmaster/constants';

export class IssueService {
  constructor(
    private issueRepository: IssueRepository,
    private projectRepository: ProjectRepository
  ) {}

  // ==========================================================================
  // ISSUE RETRIEVAL
  // ==========================================================================

  async getIssueById(id: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }
    return issue;
  }

  async getIssueByKey(key: string) {
    const issue = await this.issueRepository.findByKey(key);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
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
      throw createAppError(ErrorMessages.PROJECT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // 2. Validate issue type is in project
    const projectIssueType = await this.projectRepository.getProjectIssueType(
      input.projectId,
      input.issueTypeId
    );
    if (!projectIssueType) {
      throw createAppError(ErrorMessages.ISSUE_TYPE_NOT_IN_PROJECT, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    // 3. Get issue type for hierarchy validation
    const issueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, input.issueTypeId),
    });
    if (!issueType) {
      throw createAppError(ErrorMessages.TICKET_TYPE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // 4. Validate parent/epic hierarchy
    if (input.parentId) {
      await this.validateParentHierarchy(input.parentId, issueType.hierarchyLevel);
    }
    if (input.epicId) {
      await this.validateEpicLink(input.epicId);
    }

    // 5. Get initial status from workflow
    let statusId = input.statusId;
    if (!statusId) {
      statusId = await this.getInitialStatus(input.projectId, input.issueTypeId);
    } else {
      // Validate the provided status is in the workflow
      await this.validateStatusInWorkflow(input.projectId, input.issueTypeId, statusId);
    }

    // 6. Generate issue key atomically
    const { key, issueNumber } = await this.issueRepository.getNextIssueNumber(input.projectId);

    // 7. Create the issue
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
    });

    // 8. Set field values if provided
    if (input.fieldValues?.length) {
      await this.validateAndSetFieldValues(issue.id, input.issueTypeId, input.fieldValues);
    }

    // 9. Add creation history
    await this.issueRepository.addHistory(issue.id, reporterId, [
      { field: 'issue', oldValue: null, newValue: key },
    ]);

    return this.issueRepository.findById(issue.id);
  }

  // ==========================================================================
  // ISSUE UPDATE
  // ==========================================================================

  async updateIssue(id: string, input: UpdateIssueInput, userId: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    const changes: HistoryChange[] = [];

    // Validate and track changes
    if (input.issueTypeId !== undefined && input.issueTypeId !== issue.issueTypeId) {
      // Validate new issue type is in project
      const projectIssueType = await this.projectRepository.getProjectIssueType(
        issue.projectId,
        input.issueTypeId
      );
      if (!projectIssueType) {
        throw createAppError(ErrorMessages.ISSUE_TYPE_NOT_IN_PROJECT, { statusCode: 400, code: 'BAD_REQUEST' });
      }
      changes.push({
        field: 'issueType',
        oldValue: issue.issueType?.name,
        newValue: (await db.query.issueTypes.findFirst({ where: eq(issueTypes.id, input.issueTypeId) }))?.name,
      });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== issue.assigneeId) {
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
        await this.validateParentHierarchy(input.parentId, issueType?.hierarchyLevel || ISSUE_TYPE_HIERARCHY.STANDARD);
        // Check for circular reference
        if (await this.issueRepository.isAncestorOf(id, input.parentId)) {
          throw createAppError(ErrorMessages.CIRCULAR_HIERARCHY, { statusCode: 400, code: 'BAD_REQUEST' });
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

    return this.issueRepository.findById(id);
  }

  // ==========================================================================
  // FIELD VALUES
  // ==========================================================================

  async updateFieldValues(
    issueId: string,
    fieldValues: { fieldId: string; value: FieldValue }[],
    userId: string
  ) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    const changes: HistoryChange[] = [];
    const currentValues = await this.issueRepository.getFieldValues(issueId);
    const currentValueMap = new Map(currentValues.map(v => [v.fieldId, v]));

    for (const fv of fieldValues) {
      const current = currentValueMap.get(fv.fieldId);
      const field = current?.field || await db.query.fields.findFirst({ where: eq(fields.id, fv.fieldId) });
      
      if (JSON.stringify(current?.value) !== JSON.stringify(fv.value)) {
        changes.push({
          field: field?.name || 'Unknown',
          fieldId: fv.fieldId,
          oldValue: current?.value ?? null,
          newValue: fv.value,
        });
      }
    }

    await this.validateAndSetFieldValues(issueId, issue.issueTypeId, fieldValues);

    if (changes.length > 0) {
      await this.issueRepository.addHistory(issueId, userId, changes);
      await this.issueRepository.update(issueId, { updatedAt: new Date() });
    }

    return this.issueRepository.findById(issueId);
  }

  // ==========================================================================
  // STATUS TRANSITIONS
  // ==========================================================================

  async transitionIssue(id: string, input: TransitionIssueInput, userId: string) {
    const issue = await this.issueRepository.findById(id);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Validate transition is allowed
    const isValid = await this.validateTransition(
      issue.projectId,
      issue.issueTypeId,
      issue.statusId,
      input.toStatusId
    );
    if (!isValid) {
      throw createAppError(ErrorMessages.INVALID_STATUS_TRANSITION, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    // Get the target status
    const targetStatus = await db.query.statuses.findFirst({
      where: eq(statuses.id, input.toStatusId),
    });
    if (!targetStatus) {
      throw createAppError(ErrorMessages.STATUS_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Validate resolution requirements
    if (targetStatus.category === 'done') {
      if (!input.resolutionId) {
        throw createAppError(ErrorMessages.RESOLUTION_REQUIRED, { statusCode: 400, code: 'BAD_REQUEST' });
      }
    } else if (input.resolutionId) {
      throw createAppError(ErrorMessages.CANNOT_SET_RESOLUTION, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    // Apply transition
    const updateData: any = {
      statusId: input.toStatusId,
      resolutionId: targetStatus.category === 'done' ? input.resolutionId : null,
      resolvedAt: targetStatus.category === 'done' ? new Date() : null,
    };

    await this.issueRepository.update(id, updateData);

    // Record history
    await this.issueRepository.addHistory(id, userId, [
      {
        field: 'status',
        oldValue: issue.status?.name,
        newValue: targetStatus.name,
      },
      ...(input.resolutionId ? [{
        field: 'resolution',
        oldValue: issue.resolution?.name || null,
        newValue: input.resolutionId,
      }] : []),
    ]);

    return this.issueRepository.findById(id);
  }

  async getAvailableTransitions(issueId: string) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    const workflowId = await this.getWorkflowForIssue(issue.projectId, issue.issueTypeId);
    
    // Get transitions from current status
    const transitions = await db.query.workflowTransitions.findMany({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        or(
          eq(workflowTransitions.fromStatusId, issue.statusId),
          isNull(workflowTransitions.fromStatusId) // Global transitions
        )
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
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Check for subtasks
    const subtasks = await this.issueRepository.findChildren(id);
    if (subtasks.length > 0) {
      throw createAppError(ErrorMessages.CANNOT_MOVE_ISSUE_WITH_SUBTASKS, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    return this.issueRepository.delete(id);
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  async getIssueHistory(issueId: string, page = 1, limit = 50) {
    const issue = await this.issueRepository.findById(issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }
    return this.issueRepository.getHistory(issueId, page, limit);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getWorkflowForIssue(projectId: string, issueTypeId: string): Promise<string> {
    // 1. Check project-issue-type specific workflow
    const projectIssueType = await this.projectRepository.getProjectIssueType(projectId, issueTypeId);
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
      where: eq((await import('@/db/schema/workflows')).workflows.isDefault, true),
    });
    if (!defaultWorkflow) {
      throw new Error('No default workflow found');
    }
    return defaultWorkflow.id;
  }

  private async getInitialStatus(projectId: string, issueTypeId: string): Promise<string> {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);
    
    const initialStatus = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.isInitial, true)
      ),
    });

    if (!initialStatus) {
      throw new Error('No initial status found in workflow');
    }

    return initialStatus.statusId;
  }

  private async validateStatusInWorkflow(projectId: string, issueTypeId: string, statusId: string) {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);
    
    const workflowStatus = await db.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.statusId, statusId)
      ),
    });

    if (!workflowStatus) {
      throw createAppError(ErrorMessages.STATUS_NOT_IN_WORKFLOW, { statusCode: 400, code: 'BAD_REQUEST' });
    }
  }

  private async validateTransition(
    projectId: string,
    issueTypeId: string,
    fromStatusId: string,
    toStatusId: string
  ): Promise<boolean> {
    const workflowId = await this.getWorkflowForIssue(projectId, issueTypeId);

    // Check for valid transition
    const transition = await db.query.workflowTransitions.findFirst({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        eq(workflowTransitions.toStatusId, toStatusId),
        or(
          eq(workflowTransitions.fromStatusId, fromStatusId),
          isNull(workflowTransitions.fromStatusId) // Global transition
        )
      ),
    });

    return !!transition;
  }

  private async validateParentHierarchy(parentId: string, childHierarchyLevel: number) {
    const parent = await this.issueRepository.findById(parentId);
    if (!parent) {
      throw createAppError(ErrorMessages.PARENT_ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    const parentIssueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, parent.issueTypeId),
    });

    // Subtasks can only be children of standard or epic issues
    if (childHierarchyLevel === ISSUE_TYPE_HIERARCHY.SUBTASK) {
      if (parentIssueType?.hierarchyLevel === ISSUE_TYPE_HIERARCHY.SUBTASK) {
        throw createAppError(ErrorMessages.INVALID_PARENT_HIERARCHY, { statusCode: 400, code: 'BAD_REQUEST' });
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
      throw createAppError(ErrorMessages.EPIC_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    const epicIssueType = await db.query.issueTypes.findFirst({
      where: eq(issueTypes.id, epic.issueTypeId),
    });

    if (epicIssueType?.hierarchyLevel !== ISSUE_TYPE_HIERARCHY.EPIC) {
      throw createAppError(ErrorMessages.INVALID_EPIC_HIERARCHY, { statusCode: 400, code: 'BAD_REQUEST' });
    }
  }

  private async validateAndSetFieldValues(
    issueId: string,
    issueTypeId: string,
    fieldValues: { fieldId: string; value: FieldValue }[]
  ) {
    // Get fields configured for this issue type
    const configuredFields = await db.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, issueTypeId),
      with: { field: true },
    });

    const configuredFieldIds = new Set(configuredFields.map(cf => cf.fieldId));

    // Validate all provided fields are configured for this issue type
    for (const fv of fieldValues) {
      if (!configuredFieldIds.has(fv.fieldId)) {
        throw createAppError(`Field ${fv.fieldId} is not configured for this issue type`, {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
      }
      // TODO: Add field value type validation based on field.fieldType
    }

    // Set the values
    await this.issueRepository.setFieldValues(issueId, fieldValues);
  }
}
