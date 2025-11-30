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
import { requirePermission, requireAnyPermission, extractProjectId } from '@/lib/middleware/permission';

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
      const issue = await ctx.services.issue.createIssue(input, ctx.session.user.id);
      return successResponse(issue, 'Issue created');
    }),

  // ==========================================================================
  // MUTATION: Update Issue
  // ==========================================================================

  updateIssue: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateIssueSchema,
    }))
    .use(requireAnyPermission(['issue:edit', 'issue:edit_own']))
    .mutation(async ({ ctx, input }) => {
      const issue = await ctx.services.issue.updateIssue(input.id, input.data, ctx.session.user.id);
      return successResponse(issue, 'Issue updated');
    }),

  // ==========================================================================
  // MUTATION: Update Field Values
  // ==========================================================================

  updateFieldValues: protectedProcedure
    .input(z.object({
      issueId: z.string().uuid(),
      ...updateFieldValuesSchema.shape,
    }))
    .use(requireAnyPermission(['issue:edit', 'issue:edit_own']))
    .mutation(async ({ ctx, input }) => {
      const { issueId, fieldValues } = input;
      const issue = await ctx.services.issue.updateFieldValues(
        issueId,
        fieldValues,
        ctx.session.user.id
      );
      return successResponse(issue, 'Field values updated');
    }),

  // ==========================================================================
  // MUTATION: Transition Status
  // ==========================================================================

  transitionIssue: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      ...transitionIssueSchema.shape,
    }))
    .use(requirePermission('issue:transition'))
    .mutation(async ({ ctx, input }) => {
      const { id, ...transitionData } = input;
      const issue = await ctx.services.issue.transitionIssue(id, transitionData, ctx.session.user.id);
      return successResponse(issue, 'Issue transitioned');
    }),

  getAvailableTransitions: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const transitions = await ctx.services.issue.getAvailableTransitions(input.issueId);
      return successResponse(transitions, 'Transitions retrieved');
    }),

  // ==========================================================================
  // MUTATION: Delete Issue
  // ==========================================================================

  deleteIssue: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requireAnyPermission(['issue:delete', 'issue:delete_own']))
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
      const result = await ctx.services.issue.getIssueHistory(issueId, page, limit);
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
        ctx.session.user.id
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
        ctx.session.user.id
      );
      return successResponse(result, 'Issues reordered');
    }),

  /**
   * Get issues ordered by rank for backlog view
   */
  getBacklogIssues: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      limit: z.number().min(1).max(500).optional().default(100),
    }))
    .use(requirePermission('issue:view', extractProjectId.fromProjectId))
    .query(async ({ ctx, input }) => {
      const issues = await ctx.services.issue.getBacklogIssues(input.projectId, input.limit);
      return successResponse(issues, 'Backlog issues retrieved');
    }),
});
