import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/lib/trpc';
import { requirePermission } from '@/lib/middleware/permission';
import securityService from '@/services/security-service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const memberTypeSchema = z.enum([
  'user',
  'group',
  'project_role',
  'reporter',
  'assignee',
  'project_lead',
  'current_user',
  'custom_field',
]);

const createSchemeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

const updateSchemeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
});

const createLevelSchema = z.object({
  schemeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

const updateLevelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

const addMemberSchema = z.object({
  levelId: z.string().uuid(),
  memberType: memberTypeSchema,
  memberId: z.string().uuid().optional(),
  customFieldId: z.string().uuid().optional(),
});

const setMembersSchema = z.object({
  levelId: z.string().uuid(),
  members: z.array(
    z.object({
      memberType: memberTypeSchema,
      memberId: z.string().uuid().optional(),
      customFieldId: z.string().uuid().optional(),
    }),
  ),
});

// ============================================================================
// ROUTER
// ============================================================================

export const securityRouter = router({
  // =========================================================================
  // SCHEME OPERATIONS
  // =========================================================================

  /**
   * List all security schemes
   */
  listSchemes: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .query(async () => {
      return securityService.getAllSchemes();
    }),

  /**
   * Get scheme by ID
   */
  getScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getSchemeById(input.id);
    }),

  /**
   * Get scheme with levels and members
   */
  getSchemeWithLevels: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getSchemeWithLevels(input.id);
    }),

  /**
   * Create a new security scheme
   */
  createScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(createSchemeSchema)
    .mutation(async ({ input }) => {
      return securityService.createScheme(input);
    }),

  /**
   * Update a security scheme
   */
  updateScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateSchemeSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return securityService.updateScheme(input.id, input.data);
    }),

  /**
   * Delete a security scheme
   */
  deleteScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await securityService.deleteScheme(input.id);
      return { success: true };
    }),

  /**
   * Clone a security scheme
   */
  cloneScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(
      z.object({
        id: z.string().uuid(),
        newName: z.string().min(1).max(200),
      }),
    )
    .mutation(async ({ input }) => {
      return securityService.cloneScheme(input.id, input.newName);
    }),

  // =========================================================================
  // LEVEL OPERATIONS
  // =========================================================================

  /**
   * Get levels by scheme
   */
  getLevelsByScheme: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getLevelsByScheme(input.schemeId);
    }),

  /**
   * Get level by ID
   */
  getLevel: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getLevelById(input.id);
    }),

  /**
   * Get level with members
   */
  getLevelWithMembers: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getLevelWithMembers(input.id);
    }),

  /**
   * Create a new security level
   */
  createLevel: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(createLevelSchema)
    .mutation(async ({ input }) => {
      return securityService.createLevel(input);
    }),

  /**
   * Update a security level
   */
  updateLevel: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateLevelSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return securityService.updateLevel(input.id, input.data);
    }),

  /**
   * Delete a security level
   */
  deleteLevel: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await securityService.deleteLevel(input.id);
      return { success: true };
    }),

  /**
   * Reorder levels in a scheme
   */
  reorderLevels: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(
      z.object({
        schemeId: z.string().uuid(),
        levelIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ input }) => {
      await securityService.reorderLevels(input.schemeId, input.levelIds);
      return { success: true };
    }),

  // =========================================================================
  // MEMBER OPERATIONS
  // =========================================================================

  /**
   * Get members of a level
   */
  getLevelMembers: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ levelId: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getLevelMembers(input.levelId);
    }),

  /**
   * Add member to a level
   */
  addMember: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(addMemberSchema)
    .mutation(async ({ input }) => {
      return securityService.addMember(input);
    }),

  /**
   * Remove member from a level
   */
  removeMember: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await securityService.removeMember(input.memberId);
      return { success: true };
    }),

  /**
   * Set all members for a level
   */
  setLevelMembers: protectedProcedure
    .use(requirePermission('admin:manage_projects'))
    .input(setMembersSchema)
    .mutation(async ({ input }) => {
      return securityService.setLevelMembers(input.levelId, input.members);
    }),

  // =========================================================================
  // PROJECT SCHEME OPERATIONS
  // =========================================================================

  /**
   * Get project's security scheme
   */
  getProjectScheme: protectedProcedure
    .use(requirePermission('project:view', (input: any) => input.projectId))
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return securityService.getProjectScheme(input.projectId);
    }),

  /**
   * Assign security scheme to project
   */
  assignSchemeToProject: protectedProcedure
    .use(requirePermission('project:edit', (input: any) => input.projectId))
    .input(
      z.object({
        projectId: z.string().uuid(),
        schemeId: z.string().uuid(),
        defaultLevelId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await securityService.assignSchemeToProject(input);
      return { success: true };
    }),

  /**
   * Remove security scheme from project
   */
  removeSchemeFromProject: protectedProcedure
    .use(requirePermission('project:edit', (input: any) => input.projectId))
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await securityService.removeSchemeFromProject(input.projectId);
      return { success: true };
    }),

  // =========================================================================
  // ACCESS CHECK OPERATIONS
  // =========================================================================

  /**
   * Get accessible security levels for current user in a project
   */
  getAccessibleLevels: protectedProcedure
    .use(requirePermission('project:view', (input: any) => input.projectId))
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return securityService.getAccessibleLevels(
        ctx.session.user.id,
        input.projectId,
      );
    }),

  /**
   * Get settable security levels for current user in a project
   * These are levels the user can set when creating/editing issues
   */
  getSettableLevels: protectedProcedure
    .use(requirePermission('issue:create', (input: any) => input.projectId))
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return securityService.getSettableLevels(
        ctx.session.user.id,
        input.projectId,
      );
    }),

  /**
   * Check if current user can access an issue
   */
  canAccessIssue: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      return securityService.canAccessIssue(ctx.session.user.id, input.issueId);
    }),
});

export default securityRouter;
