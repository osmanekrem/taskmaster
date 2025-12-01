import { z } from 'zod';

// ============================================================================
// LABEL VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for hex color validation
 */
export const labelColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

/**
 * Schema for project ID parameter
 */
export const labelProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Schema for label ID parameter
 */
export const labelIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for searching labels
 */
export const searchLabelsSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
});

/**
 * Schema for creating a label
 */
export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: labelColorSchema.optional(),
  description: z.string().max(255).optional(),
  projectId: z.string().uuid().optional(),
});

/**
 * Schema for creating a global label
 */
export const createGlobalLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: labelColorSchema.optional(),
  description: z.string().max(255).optional(),
});

/**
 * Schema for updating a label
 */
export const updateLabelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: labelColorSchema.optional(),
  description: z.string().max(255).optional().nullable(),
});

/**
 * Schema for issue ID parameter for label operations
 */
export const issueLabelIdSchema = z.object({
  issueId: z.string().uuid(),
});

/**
 * Schema for adding/removing a label to/from an issue
 */
export const issueLabelSchema = z.object({
  issueId: z.string().uuid(),
  labelId: z.string().uuid(),
});

/**
 * Schema for setting all labels on an issue
 */
export const setIssueLabelsSchema = z.object({
  issueId: z.string().uuid(),
  labelIds: z.array(z.string().uuid()),
});

/**
 * Schema for getting issues by label
 */
export const getIssuesByLabelSchema = z.object({
  labelId: z.string().uuid(),
});

/**
 * Schema for getting most used labels
 */
export const getMostUsedLabelsSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(10),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LabelProjectIdInput = z.infer<typeof labelProjectIdSchema>;
export type LabelIdInput = z.infer<typeof labelIdSchema>;
export type SearchLabelsInput = z.infer<typeof searchLabelsSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type CreateGlobalLabelInput = z.infer<typeof createGlobalLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type IssueLabelIdInput = z.infer<typeof issueLabelIdSchema>;
export type IssueLabelInput = z.infer<typeof issueLabelSchema>;
export type SetIssueLabelsInput = z.infer<typeof setIssueLabelsSchema>;
export type GetIssuesByLabelInput = z.infer<typeof getIssuesByLabelSchema>;
export type GetMostUsedLabelsInput = z.infer<typeof getMostUsedLabelsSchema>;
