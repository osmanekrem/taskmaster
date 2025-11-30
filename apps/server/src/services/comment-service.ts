import { CommentRepository, AttachmentRepository } from '@/repositories/comment-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import { db } from '@/db';
import { user } from '@/db/schema/auth';
import { eq, inArray } from 'drizzle-orm';
import { ErrorMessages } from '@taskmaster/constants';
import { createAppError } from '@/lib/errors';
import {
  type CreateCommentInput,
  type UpdateCommentInput,
  type CommentFilters,
  type CreateAttachmentInput,
  type AttachmentFilters,
  extractMentions,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@taskmaster/validation';

export class CommentService {
  constructor(
    private commentRepository: CommentRepository,
    private attachmentRepository: AttachmentRepository,
    private issueRepository: IssueRepository
  ) {}

  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  async getComments(filters: CommentFilters) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(filters.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    return this.commentRepository.findCommentsByIssue(filters);
  }

  async getCommentById(id: string) {
    const comment = await this.commentRepository.findCommentById(id);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }
    return comment;
  }

  async createComment(input: CreateCommentInput, authorId: string) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(input.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // If replying, verify parent comment exists and is not deleted
    if (input.parentId) {
      const parent = await this.commentRepository.findCommentById(input.parentId);
      if (!parent) {
        throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
      }
      if (parent.isDeleted) {
        throw createAppError(ErrorMessages.CANNOT_REPLY_TO_DELETED_COMMENT, { statusCode: 400, code: 'BAD_REQUEST' });
      }
    }

    // Create comment
    const comment = await this.commentRepository.createComment({
      issueId: input.issueId,
      authorId,
      content: input.content,
      parentId: input.parentId,
    });

    // Extract and save mentions
    const mentionedUserIds = extractMentions(input.content);
    if (mentionedUserIds.length > 0) {
      // Verify mentioned users exist (filter out invalid IDs)
      const validUserIds = await this.validateUserIds(mentionedUserIds);
      if (validUserIds.length > 0) {
        await this.commentRepository.createMentions(comment.id, validUserIds);
      }
    }

    // Add to issue history
    await this.issueRepository.addHistory(input.issueId, authorId, [
      { field: 'comment', oldValue: null, newValue: comment.id },
    ]);

    return this.commentRepository.findCommentById(comment.id);
  }

  async updateComment(commentId: string, input: UpdateCommentInput, userId: string) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Check ownership
    if (comment.authorId !== userId) {
      throw createAppError(ErrorMessages.NOT_COMMENT_AUTHOR, { statusCode: 403, code: 'FORBIDDEN' });
    }

    // Check not deleted
    if (comment.isDeleted) {
      throw createAppError(ErrorMessages.CANNOT_EDIT_DELETED_COMMENT, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    // Update comment
    await this.commentRepository.updateComment(commentId, input.content);

    // Update mentions
    await this.commentRepository.deleteMentions(commentId);
    const mentionedUserIds = extractMentions(input.content);
    if (mentionedUserIds.length > 0) {
      const validUserIds = await this.validateUserIds(mentionedUserIds);
      if (validUserIds.length > 0) {
        await this.commentRepository.createMentions(commentId, validUserIds);
      }
    }

    return this.commentRepository.findCommentById(commentId);
  }

  async deleteComment(commentId: string, userId: string, hardDelete = false) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Check ownership (or admin - TODO: add admin check)
    if (comment.authorId !== userId) {
      throw createAppError(ErrorMessages.NOT_COMMENT_AUTHOR, { statusCode: 403, code: 'FORBIDDEN' });
    }

    if (comment.isDeleted) {
      throw createAppError(ErrorMessages.COMMENT_ALREADY_DELETED, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    if (hardDelete) {
      return this.commentRepository.hardDeleteComment(commentId);
    }

    return this.commentRepository.softDeleteComment(commentId);
  }

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  async addReaction(commentId: string, userId: string, emoji: string) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Check if reaction already exists
    const existing = await this.commentRepository.findReaction(commentId, userId, emoji);
    if (existing) {
      throw createAppError(ErrorMessages.REACTION_ALREADY_EXISTS, { statusCode: 409, code: 'CONFLICT' });
    }

    return this.commentRepository.addReaction(commentId, userId, emoji);
  }

  async removeReaction(commentId: string, userId: string, emoji: string) {
    const existing = await this.commentRepository.findReaction(commentId, userId, emoji);
    if (!existing) {
      throw createAppError(ErrorMessages.REACTION_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    return this.commentRepository.removeReaction(commentId, userId, emoji);
  }

  async getReactionCounts(commentId: string) {
    return this.commentRepository.getReactionCounts(commentId);
  }

  // ==========================================================================
  // ATTACHMENTS
  // ==========================================================================

  async getAttachments(filters: AttachmentFilters) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(filters.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    return this.attachmentRepository.findByIssue(filters);
  }

  async getAttachmentById(id: string) {
    const attachment = await this.attachmentRepository.findById(id);
    if (!attachment) {
      throw createAppError(ErrorMessages.ATTACHMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }
    return attachment;
  }

  async createAttachment(input: CreateAttachmentInput, uploaderId: string) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(input.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as any)) {
      throw createAppError(ErrorMessages.INVALID_FILE_TYPE, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    // Validate file size
    if (input.size > MAX_FILE_SIZE) {
      throw createAppError(ErrorMessages.FILE_TOO_LARGE, { statusCode: 400, code: 'BAD_REQUEST' });
    }

    const attachment = await this.attachmentRepository.create({
      ...input,
      uploaderId,
    });

    // Add to issue history
    await this.issueRepository.addHistory(input.issueId, uploaderId, [
      { field: 'attachment', oldValue: null, newValue: input.originalFilename },
    ]);

    return attachment;
  }

  async deleteAttachment(id: string, userId: string) {
    const attachment = await this.attachmentRepository.findById(id);
    if (!attachment) {
      throw createAppError(ErrorMessages.ATTACHMENT_NOT_FOUND, { statusCode: 404, code: 'NOT_FOUND' });
    }

    // Check ownership (or admin - TODO: add admin check)
    if (attachment.uploaderId !== userId) {
      throw createAppError(ErrorMessages.FORBIDDEN, { statusCode: 403, code: 'FORBIDDEN' });
    }

    // TODO: Delete actual file from storage

    return this.attachmentRepository.delete(id);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async validateUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    // Check which IDs are valid UUIDs and exist
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = userIds.filter((id) => uuidRegex.test(id));

    if (validUuids.length === 0) return [];

    const users = await db.query.user.findMany({
      where: inArray(user.id, validUuids),
      columns: { id: true },
    });

    return users.map((u) => u.id);
  }
}
