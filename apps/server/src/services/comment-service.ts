import {
  CommentRepository,
  AttachmentRepository,
} from '@/repositories/comment-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import type { NotificationService } from '@/services/notification-service';
import { db } from '@/db';
import { user } from '@/db/schema/auth';
import { eq, inArray } from 'drizzle-orm';
import { ErrorMessages } from '@taskmaster/constants';
import { createAppError } from '@/lib/errors';
import {
  getStorageProvider,
  generateStorageKey,
  generateThumbnailKey,
} from '@/lib/storage';
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
import { 
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
} from '@/lib/events/event-bus';
import { getContainer } from '@/lib/context';

export class CommentService {
  constructor(
    private commentRepository: CommentRepository,
    private attachmentRepository: AttachmentRepository,
    private issueRepository: IssueRepository,
    private notificationService: NotificationService,
  ) {}

  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  async getComments(filters: CommentFilters) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(filters.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    return this.commentRepository.findCommentsByIssue(filters);
  }

  async getCommentById(id: string) {
    const comment = await this.commentRepository.findCommentById(id);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return comment;
  }

  async createComment(input: CreateCommentInput, authorId: string) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(input.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // If replying, verify parent comment exists and is not deleted
    if (input.parentId) {
      const parent = await this.commentRepository.findCommentById(
        input.parentId,
      );
      if (!parent) {
        throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, {
          statusCode: 404,
          code: 'NOT_FOUND',
        });
      }
      if (parent.isDeleted) {
        throw createAppError(ErrorMessages.CANNOT_REPLY_TO_DELETED_COMMENT, {
          statusCode: 400,
          code: 'BAD_REQUEST',
        });
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
    let validMentionedUserIds: string[] = [];
    if (mentionedUserIds.length > 0) {
      // Verify mentioned users exist (filter out invalid IDs)
      validMentionedUserIds = await this.validateUserIds(mentionedUserIds);
      if (validMentionedUserIds.length > 0) {
        await this.commentRepository.createMentions(
          comment.id,
          validMentionedUserIds,
        );
      }
    }

    // Add to issue history
    await this.issueRepository.addHistory(input.issueId, authorId, [
      { field: 'comment', oldValue: null, newValue: comment.id },
    ]);

    // Emit comment:created event (notification scheme will handle watchers)
    emitCommentCreated({
      commentId: comment.id,
      issueId: input.issueId,
      issueKey: issue.key,
      projectId: issue.projectId,
      actorId: authorId,
      parentCommentId: input.parentId,
    });

    // Handle mentions notification directly (not scheme-based)
    if (validMentionedUserIds.length > 0) {
      (async () => {
        try {
          const author = await db.query.user.findFirst({
            where: eq(user.id, authorId),
            columns: { name: true, email: true },
          });
          const actorData = {
            name: author?.name || 'Unknown',
            email: author?.email || '',
          };
          const issueData = {
            key: issue.key,
            title: issue.summary || issue.key,
          };
          const contentPreview = input.content.substring(0, 200);

          await this.notificationService.notifyMentions(
            validMentionedUserIds,
            input.issueId,
            authorId,
            issueData,
            actorData,
            { commentId: comment.id, commentPreview: contentPreview },
          );
        } catch (err) {
          console.error('[Notification] Mention notification failed:', err);
        }
      })();
    }

    // Handle reply notification directly (not scheme-based)
    if (input.parentId) {
      (async () => {
        try {
          const parent = await this.commentRepository.findCommentById(
            input.parentId!,
          );
          if (parent && parent.authorId !== authorId) {
            const author = await db.query.user.findFirst({
              where: eq(user.id, authorId),
              columns: { name: true, email: true },
            });
            const actorData = {
              name: author?.name || 'Unknown',
              email: author?.email || '',
            };
            const issueData = {
              key: issue.key,
              title: issue.summary || issue.key,
            };
            const contentPreview = input.content.substring(0, 200);

            await this.notificationService.notifyCommentReply(
              parent.authorId,
              input.issueId,
              comment.id,
              authorId,
              issueData,
              contentPreview,
              actorData,
            );
          }
        } catch (err) {
          console.error('[Notification] Reply notification failed:', err);
        }
      })();
    }

    return this.commentRepository.findCommentById(comment.id);
  }

  async updateComment(
    commentId: string,
    input: UpdateCommentInput,
    userId: string,
  ) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Check ownership
    if (comment.authorId !== userId) {
      throw createAppError(ErrorMessages.NOT_COMMENT_AUTHOR, {
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    }

    // Check not deleted
    if (comment.isDeleted) {
      throw createAppError(ErrorMessages.CANNOT_EDIT_DELETED_COMMENT, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
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

    // Get issue for event
    const issue = await this.issueRepository.findById(comment.issueId);
    
    // Emit event
    if (issue) {
      emitCommentUpdated({
        commentId,
        issueId: comment.issueId,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
      });
    }

    return this.commentRepository.findCommentById(commentId);
  }

  async deleteComment(commentId: string, userId: string, hardDelete = false) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Check ownership or admin permission
    const isOwner = comment.authorId === userId;
    
    if (!isOwner) {
      // Check if user has admin permission to delete any comment
      const container = getContainer();
      const issue = await this.issueRepository.findById(comment.issueId);
      const projectId = issue?.projectId;
      
      const hasDeletePermission = await container.permission.hasPermission(
        userId, 
        'comment:delete', 
        projectId
      );
      const isAdmin = await container.permission.hasPermission(userId, 'admin:manage_projects');
      
      if (!hasDeletePermission && !isAdmin) {
        throw createAppError(ErrorMessages.NOT_COMMENT_AUTHOR, {
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
    }

    if (comment.isDeleted) {
      throw createAppError(ErrorMessages.COMMENT_ALREADY_DELETED, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // Get issue for event before deletion
    const issue = await this.issueRepository.findById(comment.issueId);

    let result;
    if (hardDelete) {
      result = await this.commentRepository.hardDeleteComment(commentId);
    } else {
      result = await this.commentRepository.softDeleteComment(commentId);
    }

    // Emit event
    if (issue) {
      emitCommentDeleted({
        commentId,
        issueId: comment.issueId,
        issueKey: issue.key,
        projectId: issue.projectId,
        actorId: userId,
      });
    }

    return result;
  }

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  async addReaction(commentId: string, userId: string, emoji: string) {
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      throw createAppError(ErrorMessages.COMMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Check if reaction already exists
    const existing = await this.commentRepository.findReaction(
      commentId,
      userId,
      emoji,
    );
    if (existing) {
      throw createAppError(ErrorMessages.REACTION_ALREADY_EXISTS, {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }

    return this.commentRepository.addReaction(commentId, userId, emoji);
  }

  async removeReaction(commentId: string, userId: string, emoji: string) {
    const existing = await this.commentRepository.findReaction(
      commentId,
      userId,
      emoji,
    );
    if (!existing) {
      throw createAppError(ErrorMessages.REACTION_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
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
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    return this.attachmentRepository.findByIssue(filters);
  }

  async getAttachmentById(id: string) {
    const attachment = await this.attachmentRepository.findById(id);
    if (!attachment) {
      throw createAppError(ErrorMessages.ATTACHMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }
    return attachment;
  }

  async createAttachment(input: CreateAttachmentInput, uploaderId: string) {
    // Verify issue exists
    const issue = await this.issueRepository.findById(input.issueId);
    if (!issue) {
      throw createAppError(ErrorMessages.ISSUE_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(input.mimeType as any)) {
      throw createAppError(ErrorMessages.INVALID_FILE_TYPE, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    }

    // Validate file size
    if (input.size > MAX_FILE_SIZE) {
      throw createAppError(ErrorMessages.FILE_TOO_LARGE, {
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
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
      throw createAppError(ErrorMessages.ATTACHMENT_NOT_FOUND, {
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    }

    // Check ownership or admin permission
    const isOwner = attachment.uploaderId === userId;
    
    if (!isOwner) {
      // Check if user has admin permission to delete any attachment
      const container = getContainer();
      const issue = await this.issueRepository.findById(attachment.issueId);
      const projectId = issue?.projectId;
      
      const hasDeletePermission = await container.permission.hasPermission(
        userId,
        'attachment:delete',
        projectId
      );
      const isAdmin = await container.permission.hasPermission(userId, 'admin:manage_projects');
      
      if (!hasDeletePermission && !isAdmin) {
        throw createAppError(ErrorMessages.FORBIDDEN, {
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
    }

    // Delete actual file from storage
    const storage = getStorageProvider();
    try {
      await storage.delete(attachment.storageKey);

      // Delete thumbnail if exists
      if (attachment.thumbnailKey) {
        await storage.delete(attachment.thumbnailKey);
      }
    } catch (error) {
      // Log error but continue with database deletion
      // File might already be deleted or storage might be unavailable
      console.error(
        '[Storage] Failed to delete file:',
        attachment.storageKey,
        error,
      );
    }

    return this.attachmentRepository.delete(id);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async validateUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];

    // Check which IDs are valid UUIDs and exist
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = userIds.filter((id) => uuidRegex.test(id));

    if (validUuids.length === 0) return [];

    const users = await db.query.user.findMany({
      where: inArray(user.id, validUuids),
      columns: { id: true },
    });

    return users.map((u) => u.id);
  }
}
