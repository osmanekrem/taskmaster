import { z } from 'zod';
import { idSchema } from './general';

// =============================================================================
// WORKFLOW SCHEMAS
// =============================================================================

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow adı zorunludur').max(100, 'Workflow adı en fazla 100 karakter olabilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  isDefault: z.boolean().optional(),
});

export type CreateWorkflowSchema = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  workflowId: idSchema,
  name: z.string().min(1, 'Workflow adı zorunludur').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type UpdateWorkflowSchema = z.infer<typeof updateWorkflowSchema>;

export const getWorkflowByIdSchema = z.object({
  workflowId: idSchema,
});

export type GetWorkflowByIdSchema = z.infer<typeof getWorkflowByIdSchema>;

export const deleteWorkflowSchema = z.object({
  workflowId: idSchema,
});

export type DeleteWorkflowSchema = z.infer<typeof deleteWorkflowSchema>;

// =============================================================================
// WORKFLOW STATUS SCHEMAS
// =============================================================================

export const addStatusToWorkflowSchema = z.object({
  workflowId: idSchema,
  statusId: idSchema,
  isInitial: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type AddStatusToWorkflowSchema = z.infer<typeof addStatusToWorkflowSchema>;

export const removeStatusFromWorkflowSchema = z.object({
  workflowId: idSchema,
  statusId: idSchema,
});

export type RemoveStatusFromWorkflowSchema = z.infer<typeof removeStatusFromWorkflowSchema>;

export const updateWorkflowStatusSchema = z.object({
  workflowId: idSchema,
  statusId: idSchema,
  isInitial: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type UpdateWorkflowStatusSchema = z.infer<typeof updateWorkflowStatusSchema>;

export const getWorkflowStatusesSchema = z.object({
  workflowId: idSchema,
});

export type GetWorkflowStatusesSchema = z.infer<typeof getWorkflowStatusesSchema>;

// Bulk update for reordering
export const reorderWorkflowStatusesSchema = z.object({
  workflowId: idSchema,
  statuses: z.array(z.object({
    statusId: idSchema,
    sortOrder: z.number().int().min(0),
  })),
});

export type ReorderWorkflowStatusesSchema = z.infer<typeof reorderWorkflowStatusesSchema>;

// =============================================================================
// WORKFLOW TRANSITION SCHEMAS
// =============================================================================

// Transition condition types
export const transitionConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user_in_project_role'),
    roleId: z.string(),
  }),
  z.object({
    type: z.literal('user_is_assignee'),
  }),
  z.object({
    type: z.literal('user_is_reporter'),
  }),
  z.object({
    type: z.literal('user_in_group'),
    groupId: z.string(),
  }),
]);

export type TransitionConditionSchema = z.infer<typeof transitionConditionSchema>;

// Transition validator types
export const transitionValidatorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('field_required'),
    fieldId: z.string(),
  }),
  z.object({
    type: z.literal('field_has_value'),
    fieldId: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('permission_check'),
    permission: z.string(),
  }),
  z.object({
    type: z.literal('previous_status'),
    statusId: z.string(),
  }),
]);

export type TransitionValidatorSchema = z.infer<typeof transitionValidatorSchema>;

// Post function types
export const transitionPostFunctionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set_field'),
    fieldId: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('clear_field'),
    fieldId: z.string(),
  }),
  z.object({
    type: z.literal('assign_to_reporter'),
  }),
  z.object({
    type: z.literal('assign_to_user'),
    userId: z.string(),
  }),
  z.object({
    type: z.literal('trigger_webhook'),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal('send_notification'),
    template: z.string(),
  }),
]);

export type TransitionPostFunctionSchema = z.infer<typeof transitionPostFunctionSchema>;

export const createTransitionSchema = z.object({
  workflowId: idSchema,
  name: z.string().min(1, 'Transition adı zorunludur').max(100),
  description: z.string().max(500).optional(),
  fromStatusId: idSchema.optional().nullable(), // null = global (from any status)
  toStatusId: idSchema,
  conditions: z.array(transitionConditionSchema).optional(),
  validators: z.array(transitionValidatorSchema).optional(),
  postFunctions: z.array(transitionPostFunctionSchema).optional(),
  screenId: idSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateTransitionSchema = z.infer<typeof createTransitionSchema>;

export const updateTransitionSchema = z.object({
  transitionId: idSchema,
  name: z.string().min(1, 'Transition adı zorunludur').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  fromStatusId: idSchema.optional().nullable(),
  toStatusId: idSchema.optional(),
  conditions: z.array(transitionConditionSchema).optional(),
  validators: z.array(transitionValidatorSchema).optional(),
  postFunctions: z.array(transitionPostFunctionSchema).optional(),
  screenId: idSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export type UpdateTransitionSchema = z.infer<typeof updateTransitionSchema>;

export const deleteTransitionSchema = z.object({
  transitionId: idSchema,
});

export type DeleteTransitionSchema = z.infer<typeof deleteTransitionSchema>;

export const getTransitionsByWorkflowSchema = z.object({
  workflowId: idSchema,
});

export type GetTransitionsByWorkflowSchema = z.infer<typeof getTransitionsByWorkflowSchema>;

// Get available transitions from a status (for UI)
export const getAvailableTransitionsSchema = z.object({
  workflowId: idSchema,
  fromStatusId: idSchema.optional(), // Current status of the issue
});

export type GetAvailableTransitionsSchema = z.infer<typeof getAvailableTransitionsSchema>;

// =============================================================================
// WORKFLOW ENGINE SCHEMAS
// =============================================================================

/**
 * Get available transitions for an issue using the workflow engine
 * This evaluates conditions to determine which transitions the user can execute
 */
export const getAvailableTransitionsForIssueSchema = z.object({
  issueId: idSchema,
  workflowId: idSchema,
});

export type GetAvailableTransitionsForIssueSchema = z.infer<typeof getAvailableTransitionsForIssueSchema>;

/**
 * Execute a workflow transition on an issue
 */
export const executeTransitionSchema = z.object({
  issueId: idSchema,
  workflowId: idSchema,
  transitionId: idSchema,
  screenData: z.record(z.string(), z.unknown()).optional(),
  fieldValues: z.record(z.string(), z.unknown()).optional(),
  resolutionId: idSchema.optional().nullable(),
  comment: z.string().max(10000).optional(),
});

export type ExecuteTransitionSchema = z.infer<typeof executeTransitionSchema>;

/**
 * Validate a transition without executing it
 */
export const validateTransitionRequestSchema = z.object({
  issueId: idSchema,
  workflowId: idSchema,
  transitionId: idSchema,
  screenData: z.record(z.string(), z.unknown()).optional(),
  fieldValues: z.record(z.string(), z.unknown()).optional(),
  resolutionId: idSchema.optional().nullable(),
});

export type ValidateTransitionRequestSchema = z.infer<typeof validateTransitionRequestSchema>;
