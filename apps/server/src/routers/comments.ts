import { router, protectedProcedure } from '@/lib/trpc';
import { z } from 'zod';
import {
  createCommentSchema,
  updateCommentSchema,
  commentFiltersSchema,
  addReactionSchema,
  removeReactionSchema,
  createAttachmentSchema,
  attachmentFiltersSchema,
} from '@taskmaster/validation';
import { successResponse, paginatedResponse } from '@/utils/response';
import {
  requirePermission,
  requireOwnershipPermission,
  extractEntityId,
} from '@/lib/middleware/permission';

export const commentsRouter = router({
  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  getComments: protectedProcedure
    .input(commentFiltersSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const result = await ctx.services.comment.getComments(input);
      return paginatedResponse(result.data, result.pagination);
    }),

  getCommentById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const comment = await ctx.services.comment.getCommentById(input.id);
      return successResponse(comment, 'Comment retrieved');
    }),

  createComment: protectedProcedure
    .input(createCommentSchema)
    .use(requirePermission('comment:create'))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.services.comment.createComment(
        input,
        ctx.session!.user.id,
      );
      return successResponse(comment, 'Comment created');
    }),

  updateComment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateCommentSchema,
      }),
    )
    .use(
      requireOwnershipPermission(
        'comment:edit',
        'comment:edit_own',
        'comment',
        extractEntityId.fromId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.services.comment.updateComment(
        input.id,
        input.data,
        ctx.session!.user.id,
      );
      return successResponse(comment, 'Comment updated');
    }),

  deleteComment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        hardDelete: z.boolean().optional().default(false),
      }),
    )
    .use(
      requireOwnershipPermission(
        'comment:delete',
        'comment:delete_own',
        'comment',
        extractEntityId.fromId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.services.comment.deleteComment(
        input.id,
        ctx.session!.user.id,
        input.hardDelete,
      );
      return successResponse(null, 'Comment deleted');
    }),

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  addReaction: protectedProcedure
    .input(addReactionSchema)
    .use(requirePermission('comment:create'))
    .mutation(async ({ ctx, input }) => {
      const reaction = await ctx.services.comment.addReaction(
        input.commentId,
        ctx.session!.user.id,
        input.emoji,
      );
      return successResponse(reaction, 'Reaction added');
    }),

  removeReaction: protectedProcedure
    .input(removeReactionSchema)
    .use(requirePermission('comment:create'))
    .mutation(async ({ ctx, input }) => {
      await ctx.services.comment.removeReaction(
        input.commentId,
        ctx.session!.user.id,
        input.emoji,
      );
      return successResponse(null, 'Reaction removed');
    }),

  getReactionCounts: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const counts = await ctx.services.comment.getReactionCounts(
        input.commentId,
      );
      return successResponse(counts, 'Reaction counts retrieved');
    }),

  // ==========================================================================
  // ATTACHMENTS
  // ==========================================================================

  getAttachments: protectedProcedure
    .input(attachmentFiltersSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const result = await ctx.services.comment.getAttachments(input);
      return paginatedResponse(result.data, result.pagination);
    }),

  getAttachmentById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const attachment = await ctx.services.comment.getAttachmentById(input.id);
      return successResponse(attachment, 'Attachment retrieved');
    }),

  createAttachment: protectedProcedure
    .input(createAttachmentSchema)
    .use(requirePermission('attachment:create'))
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.services.comment.createAttachment(
        input,
        ctx.session!.user.id,
      );
      return successResponse(attachment, 'Attachment created');
    }),

  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(
      requireOwnershipPermission(
        'attachment:delete',
        'attachment:delete_own',
        'attachment',
        extractEntityId.fromId,
      ),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.services.comment.deleteAttachment(
        input.id,
        ctx.session!.user.id,
      );
      return successResponse(null, 'Attachment deleted');
    }),
});
