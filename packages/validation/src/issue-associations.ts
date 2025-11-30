import { z } from 'zod';

// =============================================================================
// ISSUE LINKS VALIDATION
// =============================================================================

export const issueLinkTypeSchema = z.object({
  name: z.string().min(1).max(100),
  inwardName: z.string().min(1).max(100),
  outwardName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createIssueLinkSchema = z.object({
  sourceIssueId: z.string().uuid(),
  targetIssueId: z.string().uuid(),
  linkTypeId: z.string().uuid(),
});

export const updateIssueLinkTypeSchema = issueLinkTypeSchema.partial();

// =============================================================================
// COMPONENTS VALIDATION
// =============================================================================

export const componentSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  leadId: z.string().uuid().optional(),
  defaultAssigneeId: z.string().uuid().optional(),
});

export const createComponentSchema = componentSchema;

export const updateComponentSchema = componentSchema.partial().omit({ projectId: true });

// =============================================================================
// VERSIONS VALIDATION
// =============================================================================

export const versionStatusSchema = z.enum(['unreleased', 'released', 'archived']);

export const versionSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(), // ISO date string
  releaseDate: z.string().optional(),
});

export const createVersionSchema = versionSchema;

export const updateVersionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  startDate: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
  sortOrder: z.string().max(10).optional(),
});

export const releaseVersionSchema = z.object({
  id: z.string().uuid(),
  releaseDate: z.string().optional(),
});

// =============================================================================
// LABELS VALIDATION
// =============================================================================

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

export const labelSchema = z.object({
  name: z.string().min(1).max(100),
  color: hexColorSchema.optional(),
  description: z.string().max(255).optional(),
  projectId: z.string().uuid().optional(), // null = global label
});

export const createLabelSchema = labelSchema;

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: hexColorSchema.optional(),
  description: z.string().max(255).optional().nullable(),
});

export const searchLabelsSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(10),
});

// =============================================================================
// ISSUE ASSOCIATIONS VALIDATION
// =============================================================================

export const issueAssociationSchema = z.object({
  issueId: z.string().uuid(),
  associationId: z.string().uuid(), // componentId, versionId, or labelId
});

export const setIssueAssociationsSchema = z.object({
  issueId: z.string().uuid(),
  associationIds: z.array(z.string().uuid()),
});

// Type exports
export type IssueLinkType = z.infer<typeof issueLinkTypeSchema>;
export type CreateIssueLink = z.infer<typeof createIssueLinkSchema>;
export type Component = z.infer<typeof componentSchema>;
export type CreateComponent = z.infer<typeof createComponentSchema>;
export type UpdateComponent = z.infer<typeof updateComponentSchema>;
export type Version = z.infer<typeof versionSchema>;
export type CreateVersion = z.infer<typeof createVersionSchema>;
export type UpdateVersion = z.infer<typeof updateVersionSchema>;
export type VersionStatus = z.infer<typeof versionStatusSchema>;
export type Label = z.infer<typeof labelSchema>;
export type CreateLabel = z.infer<typeof createLabelSchema>;
export type UpdateLabel = z.infer<typeof updateLabelSchema>;
