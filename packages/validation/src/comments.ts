import { z } from 'zod';
import { paginationSchema } from './general';

// =============================================================================
// COMMENT SCHEMAS
// =============================================================================

// Create comment
export const createCommentSchema = z.object({
  issueId: z.string().uuid(),
  content: z.string().min(1, 'Yorum boş olamaz').max(50000, 'Yorum çok uzun'),
  parentId: z.string().uuid().optional(), // For threaded replies
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// Update comment
export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Yorum boş olamaz').max(50000, 'Yorum çok uzun'),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// Comment filters
export const commentFiltersSchema = z.object({
  issueId: z.string().uuid(),
  includeDeleted: z.boolean().optional().default(false),
  ...paginationSchema.shape,
});

export type CommentFilters = z.infer<typeof commentFiltersSchema>;

// =============================================================================
// REACTION SCHEMAS
// =============================================================================

// Allowed emoji reactions
export const emojiReactionSchema = z.enum([
  '👍', '👎', '❤️', '🎉', '😄', '😕', '👀', '🚀',
]);

export const addReactionSchema = z.object({
  commentId: z.string().uuid(),
  emoji: emojiReactionSchema,
});

export type AddReactionInput = z.infer<typeof addReactionSchema>;

export const removeReactionSchema = z.object({
  commentId: z.string().uuid(),
  emoji: emojiReactionSchema,
});

// =============================================================================
// ATTACHMENT SCHEMAS
// =============================================================================

// Allowed file types
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Code
  'application/json',
  'application/xml',
  'text/html',
  'text/css',
  'text/javascript',
] as const;

// Max file size: 25MB
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Create attachment metadata (after upload)
export const createAttachmentSchema = z.object({
  issueId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  storageKey: z.string().min(1),
  storageProvider: z.enum(['local', 's3', 'cloudflare']).optional().default('local'),
  thumbnailKey: z.string().optional(),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;

// Attachment filters
export const attachmentFiltersSchema = z.object({
  issueId: z.string().uuid(),
  ...paginationSchema.shape,
});

export type AttachmentFilters = z.infer<typeof attachmentFiltersSchema>;

// =============================================================================
// MENTION EXTRACTION
// =============================================================================

// Extract @mentions from content
export function extractMentions(content: string): string[] {
  // Match @username or @[user-id]
  const mentionRegex = /@\[([a-f0-9-]{36})\]|@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Prefer UUID format, fallback to username
    const userId = match[1] || match[2];
    if (userId && !mentions.includes(userId)) {
      mentions.push(userId);
    }
  }

  return mentions;
}
