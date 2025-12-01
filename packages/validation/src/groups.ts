import { z } from 'zod';

// ============================================================================
// GROUP VALIDATION SCHEMAS
// ============================================================================

/**
 * Group name validation - letters, numbers, hyphens, underscores only
 */
export const groupNameSchema = z
  .string()
  .min(2, 'Group name must be at least 2 characters')
  .max(100, 'Group name must be at most 100 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Group name can only contain letters, numbers, hyphens, and underscores',
  );

/**
 * Schema for creating a new group
 */
export const createGroupSchema = z.object({
  name: groupNameSchema,
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

/**
 * Schema for updating a group
 */
export const updateGroupSchema = z.object({
  name: groupNameSchema.optional(),
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for listing groups with pagination and filters
 */
export const listGroupsSchema = z.object({
  includeInactive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Schema for group ID parameter
 */
export const groupIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for group name parameter
 */
export const groupNameParamSchema = z.object({
  name: z.string(),
});

/**
 * Schema for user ID parameter
 */
export const groupUserIdSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * Schema for group ID parameter (alternative naming)
 */
export const groupIdParamSchema = z.object({
  groupId: z.string().uuid(),
});

/**
 * Schema for updating a group by ID
 */
export const updateGroupByIdSchema = z.object({
  id: z.string().uuid(),
  data: updateGroupSchema,
});

/**
 * Schema for adding a single member to a group
 */
export const addGroupMemberSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * Schema for adding multiple members to a group
 */
export const addGroupMembersSchema = z.object({
  groupId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
});

/**
 * Schema for removing a single member from a group
 */
export const removeGroupMemberSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

/**
 * Schema for removing multiple members from a group
 */
export const removeGroupMembersSchema = z.object({
  groupId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
});

/**
 * Schema for setting all members of a group (replace)
 */
export const setGroupMembersSchema = z.object({
  groupId: z.string().uuid(),
  userIds: z.array(z.string().uuid()),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ListGroupsInput = z.infer<typeof listGroupsSchema>;
export type GroupIdInput = z.infer<typeof groupIdSchema>;
export type GroupNameParamInput = z.infer<typeof groupNameParamSchema>;
export type GroupUserIdInput = z.infer<typeof groupUserIdSchema>;
export type GroupIdParamInput = z.infer<typeof groupIdParamSchema>;
export type UpdateGroupByIdInput = z.infer<typeof updateGroupByIdSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type AddGroupMembersInput = z.infer<typeof addGroupMembersSchema>;
export type RemoveGroupMemberInput = z.infer<typeof removeGroupMemberSchema>;
export type RemoveGroupMembersInput = z.infer<typeof removeGroupMembersSchema>;
export type SetGroupMembersInput = z.infer<typeof setGroupMembersSchema>;
