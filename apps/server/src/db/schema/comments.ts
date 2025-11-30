import { pgTable, text, timestamp, integer, boolean, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { issues } from './issues';

// =============================================================================
// COMMENTS - Issue yorumları (threaded)
// =============================================================================

export const issueComments = pgTable('issue_comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Which issue this comment belongs to
  issueId: text('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),

  // Who wrote the comment
  authorId: text('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),

  // Comment content (supports markdown)
  content: text('content').notNull(),

  // For threaded/nested comments (reply to another comment)
  parentId: text('parent_id')
    .references((): any => issueComments.id, { onDelete: 'cascade' }),

  // Edit tracking
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),

  // Soft delete
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  issueIdx: index('issue_comments_issue_idx').on(table.issueId),
  authorIdx: index('issue_comments_author_idx').on(table.authorId),
  parentIdx: index('issue_comments_parent_idx').on(table.parentId),
  createdAtIdx: index('issue_comments_created_at_idx').on(table.createdAt),
}));

// =============================================================================
// ATTACHMENTS - Issue ekleri
// =============================================================================

export const issueAttachments = pgTable('issue_attachments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Which issue this attachment belongs to
  issueId: text('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),

  // Who uploaded
  uploaderId: text('uploader_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),

  // File info
  filename: text('filename').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // bytes

  // Storage location (S3 key, local path, or URL)
  storageKey: text('storage_key').notNull(),
  storageProvider: text('storage_provider').default('local'), // 'local', 's3', 'cloudflare'

  // Optional thumbnail for images
  thumbnailKey: text('thumbnail_key'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  issueIdx: index('issue_attachments_issue_idx').on(table.issueId),
  uploaderIdx: index('issue_attachments_uploader_idx').on(table.uploaderId),
}));

// =============================================================================
// COMMENT MENTIONS - @mentions tracking
// =============================================================================

export const commentMentions = pgTable('comment_mentions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  commentId: text('comment_id')
    .notNull()
    .references(() => issueComments.id, { onDelete: 'cascade' }),

  // Who was mentioned
  mentionedUserId: text('mentioned_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  commentIdx: index('comment_mentions_comment_idx').on(table.commentId),
  userIdx: index('comment_mentions_user_idx').on(table.mentionedUserId),
}));

// =============================================================================
// REACTIONS - Comment reactions (like, thumbsup, etc.)
// =============================================================================

export const commentReactions = pgTable('comment_reactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  commentId: text('comment_id')
    .notNull()
    .references(() => issueComments.id, { onDelete: 'cascade' }),

  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Emoji reaction (👍, ❤️, 🎉, etc.)
  emoji: text('emoji').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  commentIdx: index('comment_reactions_comment_idx').on(table.commentId),
  userIdx: index('comment_reactions_user_idx').on(table.userId),
  // Prevent duplicate reactions (same user, same emoji, same comment)
  uniqueReaction: unique('comment_reactions_unique').on(table.commentId, table.userId, table.emoji),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const issueCommentRelations = relations(issueComments, ({ one, many }) => ({
  issue: one(issues, {
    fields: [issueComments.issueId],
    references: [issues.id],
  }),
  author: one(user, {
    fields: [issueComments.authorId],
    references: [user.id],
  }),
  parent: one(issueComments, {
    fields: [issueComments.parentId],
    references: [issueComments.id],
    relationName: 'replies',
  }),
  replies: many(issueComments, {
    relationName: 'replies',
  }),
  mentions: many(commentMentions),
  reactions: many(commentReactions),
}));

export const issueAttachmentRelations = relations(issueAttachments, ({ one }) => ({
  issue: one(issues, {
    fields: [issueAttachments.issueId],
    references: [issues.id],
  }),
  uploader: one(user, {
    fields: [issueAttachments.uploaderId],
    references: [user.id],
  }),
}));

export const commentMentionRelations = relations(commentMentions, ({ one }) => ({
  comment: one(issueComments, {
    fields: [commentMentions.commentId],
    references: [issueComments.id],
  }),
  mentionedUser: one(user, {
    fields: [commentMentions.mentionedUserId],
    references: [user.id],
  }),
}));

export const commentReactionRelations = relations(commentReactions, ({ one }) => ({
  comment: one(issueComments, {
    fields: [commentReactions.commentId],
    references: [issueComments.id],
  }),
  user: one(user, {
    fields: [commentReactions.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type IssueComment = typeof issueComments.$inferSelect;
export type NewIssueComment = typeof issueComments.$inferInsert;
export type IssueAttachment = typeof issueAttachments.$inferSelect;
export type NewIssueAttachment = typeof issueAttachments.$inferInsert;
export type CommentMention = typeof commentMentions.$inferSelect;
export type CommentReaction = typeof commentReactions.$inferSelect;
