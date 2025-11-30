import { db } from '@/db';
import { issueComments, issueAttachments, commentMentions, commentReactions } from '@/db/schema/comments';
import { eq, and, desc, asc, sql, isNull } from 'drizzle-orm';
import type { CommentFilters, AttachmentFilters } from '@taskmaster/validation';

export class CommentRepository {
  // ==========================================================================
  // COMMENTS
  // ==========================================================================

  async findCommentById(id: string) {
    return db.query.issueComments.findFirst({
      where: eq(issueComments.id, id),
      with: {
        author: {
          columns: { id: true, name: true, email: true, image: true },
        },
        replies: {
          where: eq(issueComments.isDeleted, false),
          with: {
            author: {
              columns: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: asc(issueComments.createdAt),
        },
        mentions: {
          with: {
            mentionedUser: {
              columns: { id: true, name: true, email: true },
            },
          },
        },
        reactions: {
          with: {
            user: {
              columns: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async findCommentsByIssue(filters: CommentFilters) {
    const { issueId, includeDeleted, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const whereClause = includeDeleted
      ? and(eq(issueComments.issueId, issueId), isNull(issueComments.parentId))
      : and(
          eq(issueComments.issueId, issueId),
          eq(issueComments.isDeleted, false),
          isNull(issueComments.parentId) // Only top-level comments
        );

    const [data, countResult] = await Promise.all([
      db.query.issueComments.findMany({
        where: whereClause,
        orderBy: asc(issueComments.createdAt),
        limit,
        offset,
        with: {
          author: {
            columns: { id: true, name: true, email: true, image: true },
          },
          replies: {
            where: includeDeleted ? undefined : eq(issueComments.isDeleted, false),
            with: {
              author: {
                columns: { id: true, name: true, email: true, image: true },
              },
              reactions: true,
            },
            orderBy: asc(issueComments.createdAt),
          },
          mentions: {
            with: {
              mentionedUser: {
                columns: { id: true, name: true, email: true },
              },
            },
          },
          reactions: {
            with: {
              user: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(issueComments)
        .where(whereClause),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    };
  }

  async createComment(data: {
    issueId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }) {
    const [comment] = await db
      .insert(issueComments)
      .values(data)
      .returning();
    return comment;
  }

  async updateComment(id: string, content: string) {
    const [updated] = await db
      .update(issueComments)
      .set({
        content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(issueComments.id, id))
      .returning();
    return updated;
  }

  async softDeleteComment(id: string) {
    const [deleted] = await db
      .update(issueComments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(issueComments.id, id))
      .returning();
    return deleted;
  }

  async hardDeleteComment(id: string) {
    const [deleted] = await db
      .delete(issueComments)
      .where(eq(issueComments.id, id))
      .returning();
    return deleted;
  }

  async countCommentsByIssue(issueId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(issueComments)
      .where(and(eq(issueComments.issueId, issueId), eq(issueComments.isDeleted, false)));
    return Number(result[0]?.count || 0);
  }

  // ==========================================================================
  // MENTIONS
  // ==========================================================================

  async createMentions(commentId: string, userIds: string[]) {
    if (userIds.length === 0) return [];

    const values = userIds.map((userId) => ({
      commentId,
      mentionedUserId: userId,
    }));

    return db.insert(commentMentions).values(values).returning();
  }

  async deleteMentions(commentId: string) {
    return db.delete(commentMentions).where(eq(commentMentions.commentId, commentId));
  }

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  async findReaction(commentId: string, userId: string, emoji: string) {
    return db.query.commentReactions.findFirst({
      where: and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, userId),
        eq(commentReactions.emoji, emoji)
      ),
    });
  }

  async addReaction(commentId: string, userId: string, emoji: string) {
    const [reaction] = await db
      .insert(commentReactions)
      .values({ commentId, userId, emoji })
      .returning();
    return reaction;
  }

  async removeReaction(commentId: string, userId: string, emoji: string) {
    const [deleted] = await db
      .delete(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.userId, userId),
          eq(commentReactions.emoji, emoji)
        )
      )
      .returning();
    return deleted;
  }

  async getReactionCounts(commentId: string) {
    const reactions = await db.query.commentReactions.findMany({
      where: eq(commentReactions.commentId, commentId),
    });

    // Group by emoji
    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }
    return counts;
  }
}

// =============================================================================
// ATTACHMENT REPOSITORY
// =============================================================================

export class AttachmentRepository {
  async findById(id: string) {
    return db.query.issueAttachments.findFirst({
      where: eq(issueAttachments.id, id),
      with: {
        uploader: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async findByIssue(filters: AttachmentFilters) {
    const { issueId, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      db.query.issueAttachments.findMany({
        where: eq(issueAttachments.issueId, issueId),
        orderBy: desc(issueAttachments.createdAt),
        limit,
        offset,
        with: {
          uploader: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(issueAttachments)
        .where(eq(issueAttachments.issueId, issueId)),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    };
  }

  async create(data: {
    issueId: string;
    uploaderId: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    storageKey: string;
    storageProvider?: string;
    thumbnailKey?: string;
  }) {
    const [attachment] = await db
      .insert(issueAttachments)
      .values(data)
      .returning();
    return attachment;
  }

  async delete(id: string) {
    const [deleted] = await db
      .delete(issueAttachments)
      .where(eq(issueAttachments.id, id))
      .returning();
    return deleted;
  }

  async countByIssue(issueId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(issueAttachments)
      .where(eq(issueAttachments.issueId, issueId));
    return Number(result[0]?.count || 0);
  }
}
