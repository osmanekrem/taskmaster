import { z } from 'zod';

// ============================================================================
// COMPONENT VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for project ID parameter
 */
export const componentProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Schema for component ID parameter
 */
export const componentIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for creating a component
 */
export const createComponentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  leadId: z.string().uuid().optional(),
  defaultAssigneeId: z.string().uuid().optional(),
});

/**
 * Schema for updating a component
 */
export const updateComponentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  defaultAssigneeId: z.string().uuid().optional().nullable(),
});

/**
 * Schema for issue ID parameter for component operations
 */
export const issueComponentIdSchema = z.object({
  issueId: z.string().uuid(),
});

/**
 * Schema for adding/removing a component to/from an issue
 */
export const issueComponentSchema = z.object({
  issueId: z.string().uuid(),
  componentId: z.string().uuid(),
});

/**
 * Schema for setting all components on an issue
 */
export const setIssueComponentsSchema = z.object({
  issueId: z.string().uuid(),
  componentIds: z.array(z.string().uuid()),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ComponentProjectIdInput = z.infer<typeof componentProjectIdSchema>;
export type ComponentIdInput = z.infer<typeof componentIdSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type IssueComponentIdInput = z.infer<typeof issueComponentIdSchema>;
export type IssueComponentInput = z.infer<typeof issueComponentSchema>;
export type SetIssueComponentsInput = z.infer<typeof setIssueComponentsSchema>;
