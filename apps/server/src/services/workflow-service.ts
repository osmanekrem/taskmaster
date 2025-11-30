import { db } from '@/db';
import { workflowRepository } from '@/repositories/workflow-repository';
import { statusRepository } from '@/repositories/status-repository';
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
  };
};
