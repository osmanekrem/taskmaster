import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/lib/trpc';
import { requirePermission } from '@/lib/middleware/permission';
import groupService from '@/services/group-service';
import {
  createGroupSchema,
  updateGroupSchema,
  listGroupsSchema,
  groupIdSchema,
  groupNameParamSchema,
  groupIdParamSchema,
  addGroupMemberSchema,
  addGroupMembersSchema,
  removeGroupMemberSchema,
  removeGroupMembersSchema,
  setGroupMembersSchema,
} from '@taskmaster/validation';

// ============================================================================
// ROUTER
// ============================================================================

export const groupsRouter = router({
  // =========================================================================
  // GROUP OPERATIONS
  // =========================================================================

  /**
   * List all groups
   */
  list: protectedProcedure
    .use(requirePermission('user:view'))
    .input(listGroupsSchema.optional())
    .query(async ({ input }) => {
      return groupService.listGroups(input);
    }),

  /**
   * Get group by ID
   */
  getById: protectedProcedure
    .use(requirePermission('user:view'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return groupService.getGroupById(input.id);
    }),

  /**
   * Get group by name
   */
  getByName: protectedProcedure
    .use(requirePermission('user:view'))
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return groupService.getGroupByName(input.name);
    }),

  /**
   * Get group with members
   */
  getWithMembers: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return groupService.getGroupWithMembers(input.id);
    }),

  /**
   * Create a new group
   */
  create: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(createGroupSchema)
    .mutation(async ({ input }) => {
      return groupService.createGroup(input);
    }),

  /**
   * Update a group
   */
  update: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateGroupSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return groupService.updateGroup(input.id, input.data);
    }),

  /**
   * Delete a group
   */
  delete: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await groupService.deleteGroup(input.id);
      return { success: true };
    }),

  // =========================================================================
  // USER GROUP OPERATIONS
  // =========================================================================

  /**
   * Get groups for current user
   */
  myGroups: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return groupService.getUserGroups(ctx.session.user.id);
  }),

  /**
   * Get groups for a specific user
   */
  getUserGroups: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ input }) => {
      return groupService.getUserGroups(input.userId);
    }),

  /**
   * Check if current user is in a group
   */
  isInGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return groupService.isUserInGroup(input.groupId, ctx.session.user.id);
    }),

  // =========================================================================
  // MEMBER OPERATIONS
  // =========================================================================

  /**
   * Get members of a group
   */
  getMembers: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ input }) => {
      return groupService.getGroupMembers(input.groupId);
    }),

  /**
   * Get member count for a group
   */
  getMemberCount: protectedProcedure
    .use(requirePermission('user:view'))
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ input }) => {
      return groupService.getMemberCount(input.groupId);
    }),

  /**
   * Add user to group
   */
  addMember: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return groupService.addMember(
        input.groupId,
        input.userId,
        ctx.session?.user?.id,
      );
    }),

  /**
   * Add multiple users to group
   */
  addMembers: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        groupId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return groupService.addMembers(
        input.groupId,
        input.userIds,
        ctx.session?.user?.id,
      );
    }),

  /**
   * Remove user from group
   */
  removeMember: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await groupService.removeMember(input.groupId, input.userId);
      return { success: true };
    }),

  /**
   * Remove multiple users from group
   */
  removeMembers: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        groupId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const count = await groupService.removeMembers(
        input.groupId,
        input.userIds,
      );
      return { success: true, removedCount: count };
    }),

  /**
   * Set members for a group (replace all)
   */
  setMembers: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .input(
      z.object({
        groupId: z.string().uuid(),
        userIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return groupService.setMembers(
        input.groupId,
        input.userIds,
        ctx.session?.user?.id,
      );
    }),

  // =========================================================================
  // SYSTEM GROUPS
  // =========================================================================

  /**
   * Get system groups
   */
  getSystemGroups: protectedProcedure
    .use(requirePermission('admin:manage_users'))
    .query(async () => {
      return groupService.getSystemGroups();
    }),
});

export default groupsRouter;
