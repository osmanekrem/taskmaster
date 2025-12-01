import { z } from 'zod';

// =============================================================================
// ISSUE ASSOCIATIONS VALIDATION
// =============================================================================
// Note: Specific validations for issue-links, components, versions, and labels
// are now in their dedicated files. This file contains only the generic
// issue association schemas.

/**
 * Schema for a single issue association (component, version, or label)
 */
export const issueAssociationSchema = z.object({
  issueId: z.string().uuid(),
  associationId: z.string().uuid(), // componentId, versionId, or labelId
});

/**
 * Schema for setting multiple associations on an issue
 */
export const setIssueAssociationsSchema = z.object({
  issueId: z.string().uuid(),
  associationIds: z.array(z.string().uuid()),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type IssueAssociationInput = z.infer<typeof issueAssociationSchema>;
export type SetIssueAssociationsInput = z.infer<typeof setIssueAssociationsSchema>;
