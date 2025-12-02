import { router, protectedProcedure } from '@/lib/trpc';
import { z } from 'zod';
import {
  createIssueSchema,
  updateIssueSchema,
  updateFieldValuesSchema,
  transitionIssueSchema,
  issueFiltersSchema,
  getIssueSchema,
  issueHistoryFiltersSchema,
  reorderIssueSchema,
  bulkReorderIssuesSchema,
} from '@taskmaster/validation';
import { successResponse, paginatedResponse } from '@/utils/response';
import {
  requirePermission,
  requireOwnershipPermission,
  extractProjectId,
  extractEntityId,
} from '@/lib/middleware/permission';

export const issuesRouter = router({
  // ==========================================================================
  // QUERY: Get Issues
  // ==========================================================================

  getIssues: protectedProcedure
    .input(issueFiltersSchema)
    .use(requirePermission('issue:view', extractProjectId.fromProjectId))
    .query(async ({ ctx, input }) => {
      const result = await ctx.services.issue.getIssues(input);
      return paginatedResponse(result.data, result.pagination);
    }),

  getIssueById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const issue = await ctx.services.issue.getIssueById(input.id);
      return successResponse(issue, 'Issue retrieved');
    }),

  getIssueByKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const issue = await ctx.services.issue.getIssueByKey(input.key);
      return successResponse(issue, 'Issue retrieved');
    }),

  getSubtasks: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const subtasks = await ctx.services.issue.getSubtasks(input.parentId);
      return successResponse(subtasks, 'Subtasks retrieved');
    }),

  getEpicChildren: protectedProcedure
    .input(z.object({ epicId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const children = await ctx.services.issue.getEpicChildren(input.epicId);
      return successResponse(children, 'Epic children retrieved');
    }),

  // ==========================================================================
  // MUTATION: Create Issue
  // ==========================================================================

  createIssue: protectedProcedure
    .input(createIssueSchema)
    .use(requirePermission('issue:create', extractProjectId.fromProjectId))
    .mutation(async ({ ctx, input }) => {
      const issue = await ctx.services.issue.createIssue(
        input,
        ctx.session!.user.id,
      );
      return successResponse(issue, 'Issue created');
    }),

  // ==========================================================================
  // MUTATION: Update Issue
  // ==========================================================================

  updateIssue: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateIssueSchema,
      }),
    )
    .use(
      requireOwnershipPermission(
        'issue:edit',
        'issue:edit_own',
        'issue',
        extractEntityId.fromId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const issue = await ctx.services.issue.updateIssue(
        input.id,
        input.data,
        ctx.session!.user.id,
      );
      return successResponse(issue, 'Issue updated');
    }),

  // ==========================================================================
  // MUTATION: Update Field Values
  // ==========================================================================

  updateFieldValues: protectedProcedure
    .input(
      z.object({
        issueId: z.string().uuid(),
        ...updateFieldValuesSchema.shape,
      }),
    )
    .use(
      requireOwnershipPermission(
        'issue:edit',
        'issue:edit_own',
        'issue',
        extractEntityId.fromIssueId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const { issueId, fieldValues } = input;
      const issue = await ctx.services.issue.updateFieldValues(
        issueId,
        fieldValues,
        ctx.session!.user.id,
      );
      return successResponse(issue, 'Field values updated');
    }),

  // ==========================================================================
  // MUTATION: Transition Status
  // ==========================================================================

  transitionIssue: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        ...transitionIssueSchema.shape,
      }),
    )
    .use(requirePermission('issue:transition'))
    .mutation(async ({ ctx, input }) => {
      const { id, ...transitionData } = input;
      const issue = await ctx.services.issue.transitionIssue(
        id,
        transitionData,
        ctx.session!.user.id,
      );
      return successResponse(issue, 'Issue transitioned');
    }),

  getAvailableTransitions: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const transitions = await ctx.services.issue.getAvailableTransitions(
        input.issueId,
      );
      return successResponse(transitions, 'Transitions retrieved');
    }),

  // ==========================================================================
  // MUTATION: Delete Issue
  // ==========================================================================

  deleteIssue: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(
      requireOwnershipPermission(
        'issue:delete',
        'issue:delete_own',
        'issue',
        extractEntityId.fromId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.services.issue.deleteIssue(input.id);
      return successResponse(null, 'Issue deleted');
    }),

  // ==========================================================================
  // QUERY: Issue History
  // ==========================================================================

  getIssueHistory: protectedProcedure
    .input(issueHistoryFiltersSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const { issueId, page, limit } = input;
      const result = await ctx.services.issue.getIssueHistory(
        issueId,
        page,
        limit,
      );
      return paginatedResponse(result.data, result.pagination);
    }),

  // ==========================================================================
  // MUTATION: Reorder Issues (Backlog ranking)
  // ==========================================================================

  /**
   * Reorder a single issue in the backlog
   * Moves the issue after/before another issue
   */
  reorderIssue: protectedProcedure
    .input(reorderIssueSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.reorderIssue(
        input.issueId,
        input.afterIssueId ?? null,
        input.beforeIssueId ?? null,
        ctx.session!.user.id,
      );
      return successResponse(result, 'Issue reordered');
    }),

  /**
   * Bulk reorder issues - sets explicit order for multiple issues
   * issueIds array defines the new order (first = top)
   */
  bulkReorderIssues: protectedProcedure
    .input(bulkReorderIssuesSchema)
    .use(requirePermission('issue:edit', extractProjectId.fromProjectId))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.bulkReorderIssues(
        input.projectId,
        input.issueIds,
        ctx.session!.user.id,
      );
      return successResponse(result, 'Issues reordered');
    }),

  /**
   * Get issues ordered by rank for backlog view
   */
  getBacklogIssues: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        limit: z.number().min(1).max(500).optional().default(100),
      }),
    )
    .use(requirePermission('issue:view', extractProjectId.fromProjectId))
    .query(async ({ ctx, input }) => {
      const issues = await ctx.services.issue.getBacklogIssues(
        input.projectId,
        input.limit,
      );
      return successResponse(issues, 'Backlog issues retrieved');
    }),

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Bulk edit multiple issues at once
   */
  bulkEdit: protectedProcedure
    .input(
      z.object({
        issueIds: z.array(z.string().uuid()).min(1).max(100),
        updates: z.object({
          assigneeId: z.string().uuid().nullable().optional(),
          priority: z.string().optional(),
          labels: z.array(z.string()).optional(),
          dueDate: z.string().datetime().nullable().optional(),
          epicId: z.string().uuid().nullable().optional(),
        }),
      }),
    )
    .use(requirePermission('issue:edit'))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.bulkEdit(
        input.issueIds,
        {
          ...input.updates,
          dueDate: input.updates.dueDate
            ? new Date(input.updates.dueDate)
            : input.updates.dueDate === null
              ? null
              : undefined,
        },
        ctx.session!.user.id,
      );
      return successResponse(result, `${result.updatedCount} issues updated`);
    }),

  /**
   * Bulk transition multiple issues to a new status
   */
  bulkTransition: protectedProcedure
    .input(
      z.object({
        issueIds: z.array(z.string().uuid()).min(1).max(100),
        toStatusId: z.string().uuid(),
        resolutionId: z.string().uuid().optional(),
        comment: z.string().optional(),
        skipValidation: z.boolean().optional().default(false),
      }),
    )
    .use(requirePermission('issue:transition'))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.bulkTransition(
        input.issueIds,
        input.toStatusId,
        ctx.session!.user.id,
        {
          resolutionId: input.resolutionId,
          comment: input.comment,
          skipValidation: input.skipValidation,
        },
      );
      return successResponse(
        result,
        `${result.transitionedCount} issues transitioned`,
      );
    }),

  /**
   * Bulk delete multiple issues
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        issueIds: z.array(z.string().uuid()).min(1).max(100),
        deleteSubtasks: z.boolean().optional().default(true),
      }),
    )
    .use(requirePermission('issue:delete'))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.bulkDelete(
        input.issueIds,
        ctx.session!.user.id,
        { deleteSubtasks: input.deleteSubtasks },
      );
      return successResponse(result, `${result.deletedCount} issues deleted`);
    }),

  /**
   * Bulk move issues to another project
   */
  bulkMove: protectedProcedure
    .input(
      z.object({
        issueIds: z.array(z.string().uuid()).min(1).max(100),
        targetProjectId: z.string().uuid(),
        targetIssueTypeId: z.string().uuid().optional(),
        targetStatusId: z.string().uuid().optional(),
      }),
    )
    .use(requirePermission('issue:move'))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.services.issue.bulkMove(
        input.issueIds,
        input.targetProjectId,
        ctx.session!.user.id,
        {
          targetIssueTypeId: input.targetIssueTypeId,
          targetStatusId: input.targetStatusId,
        },
      );
      return successResponse(result, `${result.movedCount} issues moved`);
    }),
});
