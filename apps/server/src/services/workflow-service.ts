import { db } from '@/db';
import { workflowRepository } from '@/repositories/workflow-repository';
import { statusRepository } from '@/repositories/status-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import type {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  GetWorkflowByIdSchema,
  DeleteWorkflowSchema,
  AddStatusToWorkflowSchema,
  RemoveStatusFromWorkflowSchema,
  UpdateWorkflowStatusSchema,
  GetWorkflowStatusesSchema,
  ReorderWorkflowStatusesSchema,
  CreateTransitionSchema,
  UpdateTransitionSchema,
  DeleteTransitionSchema,
  GetTransitionsByWorkflowSchema,
  GetAvailableTransitionsSchema,
} from '@taskmaster/validation';
import { throwNotFoundError, throwValidationError, throwConflictError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import {
  WorkflowEngine,
  createWorkflowEngine,
  type WorkflowTransition,
  type WorkflowContext,
  type TransitionRequest,
  type Condition,
  type Validator,
  type PostFunction,
} from '@/engine/workflow';

export const workflowService = (drizzle: DrizzleClientOrTransaction = db) => {
  const repository = workflowRepository(drizzle);
  const statusRepo = statusRepository(drizzle);

  return {
    // =============================================================================
    // WORKFLOWS
    // =============================================================================

    /**
     * Get all workflows
     */
    getAllWorkflows: () => repository.findAllWorkflows(),

    /**
     * Get a workflow by ID with full details
     */
    getWorkflowById: async (input: GetWorkflowByIdSchema) => {
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }
      return workflow;
    },

    /**
     * Get default workflow
     */
    getDefaultWorkflow: () => repository.findDefaultWorkflow(),

    /**
     * Create a new workflow
     */
    createWorkflow: async (input: CreateWorkflowSchema) => {
      // Check if workflow with same name exists
      const existing = await repository.findWorkflowByName(input.name);
      if (existing) {
        throwValidationError('WORKFLOW_NAME_EXISTS', { name: input.name });
      }

      // If this is set as default, clear other defaults
      if (input.isDefault) {
        await repository.clearDefaultWorkflow();
      }

      return await repository.createWorkflow(input);
    },

    /**
     * Update a workflow
     */
    updateWorkflow: async (input: UpdateWorkflowSchema) => {
      const existing = await repository.findWorkflowById(input.workflowId);
      if (!existing) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      // Check if new name conflicts
      if (input.name && input.name !== existing.name) {
        const nameExists = await repository.findWorkflowByName(input.name);
        if (nameExists) {
          throwValidationError('WORKFLOW_NAME_EXISTS', { name: input.name });
        }
      }

      // If setting as default, clear other defaults
      if (input.isDefault && !existing.isDefault) {
        await repository.clearDefaultWorkflow();
      }

      return await repository.updateWorkflow(input);
    },

    /**
     * Delete a workflow
     */
    deleteWorkflow: async (input: DeleteWorkflowSchema) => {
      const existing = await repository.findWorkflowById(input.workflowId);
      if (!existing) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      // Cannot delete default workflow
      if (existing.isDefault) {
        throwValidationError('CANNOT_DELETE_DEFAULT_WORKFLOW', { workflowId: input.workflowId });
      }

      // Check if workflow is in use by any project or issue type
      const usage = await repository.countWorkflowUsage(input.workflowId);
      if (usage.total > 0) {
        throwConflictError('WORKFLOW_IN_USE', { 
          workflowId: input.workflowId,
          projectCount: usage.projectCount,
          issueTypeCount: usage.issueTypeCount,
          message: `Workflow is used by ${usage.projectCount} project(s) and ${usage.issueTypeCount} issue type(s)`,
        });
      }

      return await repository.deleteWorkflow(input.workflowId);
    },

    // =============================================================================
    // WORKFLOW STATUSES
    // =============================================================================

    /**
     * Get all statuses in a workflow
     */
    getWorkflowStatuses: async (input: GetWorkflowStatusesSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      return await repository.findWorkflowStatuses(input.workflowId);
    },

    /**
     * Get initial status of a workflow
     */
    getInitialStatus: async (workflowId: string) => {
      const workflow = await repository.findWorkflowById(workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId });
      }

      return await repository.findInitialStatus(workflowId);
    },

    /**
     * Add a status to a workflow
     */
    addStatusToWorkflow: async (input: AddStatusToWorkflowSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      // Verify status exists
      const status = await statusRepo.findStatusById(input.statusId);
      if (!status) {
        throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
      }

      // Check if already added
      const existing = await repository.findWorkflowStatus(input.workflowId, input.statusId);
      if (existing) {
        throwValidationError('STATUS_ALREADY_IN_WORKFLOW', {
          workflowId: input.workflowId,
          statusId: input.statusId,
        });
      }

      // If setting as initial, clear other initials
      if (input.isInitial) {
        await repository.clearInitialStatus(input.workflowId);
      }

      return await repository.addStatusToWorkflow(input);
    },

    /**
     * Update a status in a workflow
     */
    updateWorkflowStatus: async (input: UpdateWorkflowStatusSchema) => {
      // Verify workflow status exists
      const existing = await repository.findWorkflowStatus(input.workflowId, input.statusId);
      if (!existing) {
        throwNotFoundError('WORKFLOW_STATUS_NOT_FOUND', {
          workflowId: input.workflowId,
          statusId: input.statusId,
        });
      }

      // If setting as initial, clear other initials
      if (input.isInitial && !existing.isInitial) {
        await repository.clearInitialStatus(input.workflowId);
      }

      return await repository.updateWorkflowStatus(input);
    },

    /**
     * Remove a status from a workflow
     */
    removeStatusFromWorkflow: async (input: RemoveStatusFromWorkflowSchema) => {
      // Verify workflow status exists
      const existing = await repository.findWorkflowStatus(input.workflowId, input.statusId);
      if (!existing) {
        throwNotFoundError('WORKFLOW_STATUS_NOT_FOUND', {
          workflowId: input.workflowId,
          statusId: input.statusId,
        });
      }

      // Cannot remove initial status if it's the only one
      if (existing.isInitial) {
        const allStatuses = await repository.findWorkflowStatuses(input.workflowId);
        if (allStatuses.length === 1) {
          throwValidationError('CANNOT_REMOVE_ONLY_STATUS', { workflowId: input.workflowId });
        }
      }

      // Delete all transitions involving this status
      await repository.deleteTransitionsByStatus(input.workflowId, input.statusId);

      return await repository.removeStatusFromWorkflow(input.workflowId, input.statusId);
    },

    /**
     * Reorder statuses in a workflow
     */
    reorderWorkflowStatuses: async (input: ReorderWorkflowStatusesSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      // Update each status order
      for (const status of input.statuses) {
        await repository.updateWorkflowStatusOrder(
          input.workflowId,
          status.statusId,
          status.sortOrder,
        );
      }

      return await repository.findWorkflowStatuses(input.workflowId);
    },

    // =============================================================================
    // WORKFLOW TRANSITIONS
    // =============================================================================

    /**
     * Get all transitions in a workflow
     */
    getTransitionsByWorkflow: async (input: GetTransitionsByWorkflowSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      return await repository.findTransitionsByWorkflow(input.workflowId);
    },

    /**
     * Get available transitions from a status
     */
    getAvailableTransitions: async (input: GetAvailableTransitionsSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      return await repository.findAvailableTransitions(input.workflowId, input.fromStatusId);
    },

    /**
     * Create a new transition
     */
    createTransition: async (input: CreateTransitionSchema) => {
      // Verify workflow exists
      const workflow = await repository.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
      }

      // Verify toStatus is in the workflow
      const toStatusInWorkflow = await repository.findWorkflowStatus(input.workflowId, input.toStatusId);
      if (!toStatusInWorkflow) {
        throwValidationError('STATUS_NOT_IN_WORKFLOW', {
          workflowId: input.workflowId,
          statusId: input.toStatusId,
        });
      }

      // If fromStatusId is provided, verify it's in the workflow
      if (input.fromStatusId) {
        const fromStatusInWorkflow = await repository.findWorkflowStatus(input.workflowId, input.fromStatusId);
        if (!fromStatusInWorkflow) {
          throwValidationError('STATUS_NOT_IN_WORKFLOW', {
            workflowId: input.workflowId,
            statusId: input.fromStatusId,
          });
        }
      }

      return await repository.createTransition(input);
    },

    /**
     * Update a transition
     */
    updateTransition: async (input: UpdateTransitionSchema) => {
      const existing = await repository.findTransitionById(input.transitionId);
      if (!existing) {
        throwNotFoundError('TRANSITION_NOT_FOUND', { transitionId: input.transitionId });
      }

      // If changing toStatusId, verify it's in the workflow
      if (input.toStatusId && input.toStatusId !== existing.toStatusId) {
        const toStatusInWorkflow = await repository.findWorkflowStatus(existing.workflowId, input.toStatusId);
        if (!toStatusInWorkflow) {
          throwValidationError('STATUS_NOT_IN_WORKFLOW', {
            workflowId: existing.workflowId,
            statusId: input.toStatusId,
          });
        }
      }

      // If changing fromStatusId, verify it's in the workflow
      if (input.fromStatusId !== undefined && input.fromStatusId !== existing.fromStatusId) {
        if (input.fromStatusId) {
          const fromStatusInWorkflow = await repository.findWorkflowStatus(existing.workflowId, input.fromStatusId);
          if (!fromStatusInWorkflow) {
            throwValidationError('STATUS_NOT_IN_WORKFLOW', {
              workflowId: existing.workflowId,
              statusId: input.fromStatusId,
            });
          }
        }
      }

      return await repository.updateTransition(input);
    },

    /**
     * Delete a transition
     */
    deleteTransition: async (input: DeleteTransitionSchema) => {
      const existing = await repository.findTransitionById(input.transitionId);
      if (!existing) {
        throwNotFoundError('TRANSITION_NOT_FOUND', { transitionId: input.transitionId });
      }

      return await repository.deleteTransition(input.transitionId);
    },

    /**
     * Validate if a transition is allowed (for executing transitions)
     * This will be expanded when we have issues and users
     */
    validateTransition: async (workflowId: string, fromStatusId: string, toStatusId: string) => {
      const transitions = await repository.findAvailableTransitions(workflowId, fromStatusId);
      const validTransition = transitions.find((t) => t.toStatusId === toStatusId);

      if (!validTransition) {
        throwValidationError('INVALID_TRANSITION', {
          workflowId,
          fromStatusId,
          toStatusId,
        });
      }

      return validTransition;
    },

    // =============================================================================
    // WORKFLOW ENGINE INTEGRATION
    // =============================================================================

    /**
     * Create a WorkflowEngine instance loaded with transitions for a workflow
     */
    createEngineForWorkflow: async (workflowId: string): Promise<WorkflowEngine> => {
      const transitions = await repository.findTransitionsByWorkflow(workflowId);
      const engine = createWorkflowEngine();
      
      // Map DB transitions to engine format
      const engineTransitions: WorkflowTransition[] = transitions.map(t => ({
        id: t.id,
        name: t.name,
        fromStatusId: t.fromStatusId,
        toStatusId: t.toStatusId,
        conditions: (t.conditions || []) as Condition[],
        validators: (t.validators || []) as Validator[],
        postFunctions: (t.postFunctions || []) as PostFunction[],
        screenId: t.screenId ?? undefined,
      }));
      
      engine.loadTransitions(engineTransitions);
      return engine;
    },

    /**
     * Get available transitions for an issue using the workflow engine
     * Evaluates conditions to determine which transitions the user can execute
     */
    getAvailableTransitionsForIssue: async (input: {
      issueId: string;
      userId: string;
      workflowId: string;
    }) => {
      const { issueId, userId, workflowId } = input;
      const issueRepo = new IssueRepository();
      
      // Get issue
      const issue = await issueRepo.findById(issueId);
      if (!issue) {
        throwNotFoundError('ISSUE_NOT_FOUND', { issueId });
      }
      
      // Create engine
      const engine = await workflowService(drizzle).createEngineForWorkflow(workflowId);
      
      // Build context
      const context: Omit<WorkflowContext, 'transitionId' | 'toStatusId'> = {
        userId,
        issue: issue as any, // Type will be properly aligned
        projectId: issue.projectId,
        fromStatusId: issue.statusId,
      };
      
      // Get available transitions
      const available = await engine.getAvailableTransitions(context);
      
      // Enrich with status names
      const statusesMap = new Map<string, string>();
      const statuses = await repository.findWorkflowStatuses(workflowId);
      for (const ws of statuses) {
        if (ws.status) {
          statusesMap.set(ws.statusId, ws.status.name);
        }
      }
      
      return available.map(t => ({
        ...t,
        toStatusName: statusesMap.get(t.toStatusId),
      }));
    },

    /**
     * Execute a workflow transition on an issue
     * Validates conditions and validators, then executes post-functions
     */
    executeTransition: async (input: {
      issueId: string;
      userId: string;
      workflowId: string;
      transitionId: string;
      screenData?: Record<string, unknown>;
      fieldValues?: Record<string, unknown>;
      resolutionId?: string | null;
      comment?: string;
    }) => {
      const { issueId, userId, workflowId, transitionId, ...rest } = input;
      const issueRepo = new IssueRepository();
      
      // Get issue
      const issue = await issueRepo.findById(issueId);
      if (!issue) {
        throwNotFoundError('ISSUE_NOT_FOUND', { issueId });
      }
      
      // Create engine
      const engine = await workflowService(drizzle).createEngineForWorkflow(workflowId);
      
      // Build context
      const baseContext: Omit<WorkflowContext, 'transitionId' | 'toStatusId' | 'screenData' | 'fieldValues' | 'resolutionId' | 'comment'> = {
        userId,
        issue: issue as any,
        projectId: issue.projectId,
        fromStatusId: issue.statusId,
      };
      
      // Build request
      const request: TransitionRequest = {
        transitionId,
        screenData: rest.screenData,
        fieldValues: rest.fieldValues,
        resolutionId: rest.resolutionId,
        comment: rest.comment,
      };
      
      // Execute transition
      const result = await engine.executeTransition(request, baseContext);
      
      if (!result.success) {
        throwValidationError('TRANSITION_FAILED', {
          errors: result.errors,
          conditionFailures: result.conditionResults.filter(r => !r.passed),
          validationFailures: result.validatorResults.filter(r => !r.valid),
        });
      }
      
      // Get transition to know target status
      const transition = engine.getTransition(transitionId);
      
      return {
        success: true,
        toStatusId: transition?.toStatusId,
        changes: result.changes,
        postFunctionChanges: (result as any).issueUpdates || {},
        comments: (result as any).comments || [],
        notifications: (result as any).notifications || [],
        events: (result as any).events || [],
      };
    },

    /**
     * Validate a transition without executing it
     */
    validateTransitionRequest: async (input: {
      issueId: string;
      userId: string;
      workflowId: string;
      transitionId: string;
      screenData?: Record<string, unknown>;
      fieldValues?: Record<string, unknown>;
      resolutionId?: string | null;
    }) => {
      const { issueId, userId, workflowId, transitionId, ...rest } = input;
      const issueRepo = new IssueRepository();
      
      // Get issue
      const issue = await issueRepo.findById(issueId);
      if (!issue) {
        throwNotFoundError('ISSUE_NOT_FOUND', { issueId });
      }
      
      // Create engine
      const engine = await workflowService(drizzle).createEngineForWorkflow(workflowId);
      
      // Build context
      const baseContext: Omit<WorkflowContext, 'transitionId' | 'toStatusId' | 'screenData' | 'fieldValues' | 'resolutionId' | 'comment'> = {
        userId,
        issue: issue as any,
        projectId: issue.projectId,
        fromStatusId: issue.statusId,
      };
      
      // Build request
      const request: TransitionRequest = {
        transitionId,
        screenData: rest.screenData,
        fieldValues: rest.fieldValues,
        resolutionId: rest.resolutionId,
      };
      
      // Validate
      return await engine.validateTransitionRequest(request, baseContext);
    },
  };
};
