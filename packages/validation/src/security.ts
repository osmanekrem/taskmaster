import { z } from 'zod';

// ============================================================================
// SECURITY VALIDATION SCHEMAS
// ============================================================================

/**
 * Member type options for security levels
 */
export const securityMemberTypes = [
  'user',
  'group',
  'project_role',
  'reporter',
  'assignee',
  'project_lead',
  'current_user',
  'custom_field',
] as const;

/**
 * Schema for security level member type
 */
export const securityMemberTypeSchema = z.enum(securityMemberTypes);

/**
 * Schema for creating a security scheme
 */
export const createSecuritySchemeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for updating a security scheme
 */
export const updateSecuritySchemeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for creating a security level
 */
export const createSecurityLevelSchema = z.object({
  schemeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for updating a security level
 */
export const updateSecurityLevelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for adding a member to a security level
 */
export const addSecurityMemberSchema = z.object({
  levelId: z.string().uuid(),
  memberType: securityMemberTypeSchema,
  memberId: z.string().uuid().optional(),
  customFieldId: z.string().uuid().optional(),
});

/**
 * Schema for a single security member
 */
export const securityMemberSchema = z.object({
  memberType: securityMemberTypeSchema,
  memberId: z.string().uuid().optional(),
  customFieldId: z.string().uuid().optional(),
});

/**
 * Schema for setting all members on a security level
 */
export const setSecurityMembersSchema = z.object({
  levelId: z.string().uuid(),
  members: z.array(securityMemberSchema),
});

/**
 * Schema for security scheme ID parameter
 */
export const securitySchemeIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for security level ID parameter
 */
export const securityLevelIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for updating a security scheme by ID
 */
export const updateSecuritySchemeByIdSchema = z.object({
  id: z.string().uuid(),
  data: updateSecuritySchemeSchema,
});

/**
 * Schema for updating a security level by ID
 */
export const updateSecurityLevelByIdSchema = z.object({
  id: z.string().uuid(),
  data: updateSecurityLevelSchema,
});

/**
 * Schema for cloning a security scheme
 */
export const cloneSecuritySchemeSchema = z.object({
  id: z.string().uuid(),
  newName: z.string().min(1).max(200),
});

/**
 * Schema for getting levels by scheme ID
 */
export const getLevelsBySchemeSchema = z.object({
  schemeId: z.string().uuid(),
});

/**
 * Schema for reordering security levels
 */
export const reorderSecurityLevelsSchema = z.object({
  schemeId: z.string().uuid(),
  levelIds: z.array(z.string().uuid()),
});

/**
 * Schema for getting level members
 */
export const getLevelMembersSchema = z.object({
  levelId: z.string().uuid(),
});

/**
 * Schema for removing a security member
 */
export const removeSecurityMemberSchema = z.object({
  memberId: z.string().uuid(),
});

/**
 * Schema for project ID parameter
 */
export const securityProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * Schema for assigning security scheme to project
 */
export const assignSecuritySchemeToProjectSchema = z.object({
  projectId: z.string().uuid(),
  schemeId: z.string().uuid(),
  defaultLevelId: z.string().uuid().optional(),
});

/**
 * Schema for checking issue access
 */
export const canAccessIssueSchema = z.object({
  issueId: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SecurityMemberType = z.infer<typeof securityMemberTypeSchema>;
export type CreateSecuritySchemeInput = z.infer<typeof createSecuritySchemeSchema>;
export type UpdateSecuritySchemeInput = z.infer<typeof updateSecuritySchemeSchema>;
export type CreateSecurityLevelInput = z.infer<typeof createSecurityLevelSchema>;
export type UpdateSecurityLevelInput = z.infer<typeof updateSecurityLevelSchema>;
export type AddSecurityMemberInput = z.infer<typeof addSecurityMemberSchema>;
export type SecurityMemberInput = z.infer<typeof securityMemberSchema>;
export type SetSecurityMembersInput = z.infer<typeof setSecurityMembersSchema>;
export type SecuritySchemeIdInput = z.infer<typeof securitySchemeIdSchema>;
export type SecurityLevelIdInput = z.infer<typeof securityLevelIdSchema>;
export type UpdateSecuritySchemeByIdInput = z.infer<typeof updateSecuritySchemeByIdSchema>;
export type UpdateSecurityLevelByIdInput = z.infer<typeof updateSecurityLevelByIdSchema>;
export type CloneSecuritySchemeInput = z.infer<typeof cloneSecuritySchemeSchema>;
export type GetLevelsBySchemeInput = z.infer<typeof getLevelsBySchemeSchema>;
export type ReorderSecurityLevelsInput = z.infer<typeof reorderSecurityLevelsSchema>;
export type GetLevelMembersInput = z.infer<typeof getLevelMembersSchema>;
export type RemoveSecurityMemberInput = z.infer<typeof removeSecurityMemberSchema>;
export type SecurityProjectIdInput = z.infer<typeof securityProjectIdSchema>;
export type AssignSecuritySchemeToProjectInput = z.infer<typeof assignSecuritySchemeToProjectSchema>;
export type CanAccessIssueInput = z.infer<typeof canAccessIssueSchema>;
