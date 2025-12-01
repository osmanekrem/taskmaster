import { z } from 'zod';

// ============================================================================
// ISSUE LINK VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for link type ID parameter
 */
export const linkTypeIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for creating a link type
 */
export const createLinkTypeSchema = z.object({
  name: z.string().min(1).max(100),
  inwardName: z.string().min(1).max(100),
  outwardName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

/**
 * Schema for updating a link type
 */
export const updateLinkTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  inwardName: z.string().min(1).max(100).optional(),
  outwardName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

/**
 * Schema for issue ID parameter for link operations
 */
export const issueLinkIssueIdSchema = z.object({
  issueId: z.string().uuid(),
});

/**
 * Schema for creating a link between issues
 */
export const createIssueLinkSchema = z.object({
  sourceIssueId: z.string().uuid(),
  targetIssueId: z.string().uuid(),
  linkTypeId: z.string().uuid(),
});

/**
 * Schema for issue link ID parameter
 */
export const issueLinkIdSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LinkTypeIdInput = z.infer<typeof linkTypeIdSchema>;
export type CreateLinkTypeInput = z.infer<typeof createLinkTypeSchema>;
export type UpdateLinkTypeInput = z.infer<typeof updateLinkTypeSchema>;
export type IssueLinkIssueIdInput = z.infer<typeof issueLinkIssueIdSchema>;
export type CreateIssueLinkInput = z.infer<typeof createIssueLinkSchema>;
export type IssueLinkIdInput = z.infer<typeof issueLinkIdSchema>;
