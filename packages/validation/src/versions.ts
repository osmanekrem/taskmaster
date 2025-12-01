import { z } from 'zod';

// ============================================================================
// VERSION VALIDATION SCHEMAS
// ============================================================================

/**
 * Version status options
 */
export const versionStatuses = ['unreleased', 'released', 'archived'] as const;

/**
 * Schema for version status
 */
export const versionStatusSchema = z.enum(versionStatuses);

/**
 * Schema for listing versions with optional archived filter
 */
export const listVersionsSchema = z.object({
  projectId: z.string().uuid(),
  includeArchived: z.boolean().default(false),
});

/**
 * Schema for project ID parameter
 */
export const versionProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Schema for version ID parameter
 */
export const versionIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for getting versions by status
 */
export const getVersionsByStatusSchema = z.object({
  projectId: z.string().uuid(),
  status: versionStatusSchema,
});

/**
 * Schema for creating a version
 */
export const createVersionSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
});

/**
 * Schema for updating a version
 */
export const updateVersionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  startDate: z.string().optional().nullable(),
  releaseDate: z.string().optional().nullable(),
  sortOrder: z.string().max(10).optional(),
});

/**
 * Schema for releasing a version
 */
export const releaseVersionSchema = z.object({
  id: z.string().uuid(),
  releaseDate: z.string().optional(),
});

/**
 * Schema for issue ID parameter for version operations
 */
export const issueVersionIdSchema = z.object({
  issueId: z.string().uuid(),
});

/**
 * Schema for adding/removing a version to/from an issue
 */
export const issueVersionSchema = z.object({
  issueId: z.string().uuid(),
  versionId: z.string().uuid(),
});

/**
 * Schema for setting all versions on an issue
 */
export const setIssueVersionsSchema = z.object({
  issueId: z.string().uuid(),
  versionIds: z.array(z.string().uuid()),
});

/**
 * Schema for getting issues by version
 */
export const getIssuesByVersionSchema = z.object({
  versionId: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type VersionStatus = z.infer<typeof versionStatusSchema>;
export type ListVersionsInput = z.infer<typeof listVersionsSchema>;
export type VersionProjectIdInput = z.infer<typeof versionProjectIdSchema>;
export type VersionIdInput = z.infer<typeof versionIdSchema>;
export type GetVersionsByStatusInput = z.infer<typeof getVersionsByStatusSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type UpdateVersionInput = z.infer<typeof updateVersionSchema>;
export type ReleaseVersionInput = z.infer<typeof releaseVersionSchema>;
export type IssueVersionIdInput = z.infer<typeof issueVersionIdSchema>;
export type IssueVersionInput = z.infer<typeof issueVersionSchema>;
export type SetIssueVersionsInput = z.infer<typeof setIssueVersionsSchema>;
export type GetIssuesByVersionInput = z.infer<typeof getIssuesByVersionSchema>;
