// =============================================================================
// ISSUE LINKS ROUTER
// =============================================================================

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../lib/trpc';
import { IssueLinkService } from '../services/issue-link-service';
import { IssueLinkRepository } from '../repositories/issue-link-repository';
import { IssueRepository } from '../repositories/issue-repository';
import { db } from '../db';
import { requirePermission } from '../lib/middleware/permission';

// Initialize dependencies
const issueLinkRepository = new IssueLinkRepository(db);
const issueRepository = new IssueRepository();
const issueLinkService = new IssueLinkService(
  issueLinkRepository,
  issueRepository,
);

// Export type for router
export type { IssueLinkType, IssueLink } from '../db/schema';

export const issueLinksRouter = router({
  // ===========================================================================
  // LINK TYPES
  // ===========================================================================

  /**
   * Get all link types
   */
  listLinkTypes: protectedProcedure
    .use(requirePermission('issue:view'))
    .query(async () => {
      return issueLinkService.getAllLinkTypes();
    }),

  /**
   * Get link type by ID
   */
  getLinkType: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return issueLinkService.getLinkTypeById(input.id);
    }),

  /**
   * Create a new link type (admin only)
   */
  createLinkType: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        inwardName: z.string().min(1).max(100),
        outwardName: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return issueLinkService.createLinkType(input);
    }),

  /**
   * Update a link type (admin only)
   */
  updateLinkType: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        inwardName: z.string().min(1).max(100).optional(),
        outwardName: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return issueLinkService.updateLinkType(id, data);
    }),

  /**
   * Delete a link type (admin only)
   */
  deleteLinkType: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await issueLinkService.deleteLinkType(input.id);
      return { success: true };
    }),

  // ===========================================================================
  // ISSUE LINKS
  // ===========================================================================

  /**
   * Get all links for an issue
   */
  getLinksForIssue: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return issueLinkService.getLinksForIssue(input.issueId);
    }),

  /**
   * Create a link between two issues
   */
  createLink: protectedProcedure
    .input(
      z.object({
        sourceIssueId: z.string().uuid(),
        targetIssueId: z.string().uuid(),
        linkTypeId: z.string().uuid(),
      }),
    )
    .use(requirePermission('issue:link'))
    .mutation(async ({ input, ctx }) => {
      return issueLinkService.createLink({
        ...input,
        createdBy: ctx.session!.user.id,
      });
    }),

  /**
   * Delete a link
   */
  deleteLink: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('issue:link'))
    .mutation(async ({ input, ctx }) => {
      await issueLinkService.deleteLink(input.id, ctx.session!.user.id);
      return { success: true };
    }),

  /**
   * Get blocking issues for an issue
   */
  getBlockingIssues: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return issueLinkService.getBlockingIssues(input.issueId);
    }),

  /**
   * Get issues blocked by an issue
   */
  getBlockedByIssue: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return issueLinkService.getBlockedByIssue(input.issueId);
    }),

  /**
   * Check if issue is blocked
   */
  isBlocked: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      const blocked = await issueLinkService.isBlocked(input.issueId);
      return { blocked };
    }),

  /**
   * Get link statistics (admin only)
   */
  getLinkStats: adminProcedure.query(async () => {
    return issueLinkService.getLinkStats();
  }),
});
