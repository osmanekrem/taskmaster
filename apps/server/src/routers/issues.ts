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
});
