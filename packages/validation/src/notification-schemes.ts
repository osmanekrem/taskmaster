import { z } from 'zod';
import { notificationChannelSchema } from './notifications';

// ============================================================================
// NOTIFICATION SCHEME VALIDATION SCHEMAS
// ============================================================================

/**
 * Notification recipient types
 */
export const notificationRecipientTypes = [
  'current_assignee',
  'reporter',
  'project_lead',
  'component_lead',
  'all_watchers',
  'users_in_role',
  'single_user',
  'group',
  'custom_field_user',
  'current_user',
  'previous_assignee',
] as const;

/**
 * Schema for notification recipient type
 */
export const notificationRecipientTypeSchema = z.enum(notificationRecipientTypes);

/**
 * Schema for recipient parameters
 */
export const recipientParamsSchema = z.object({
  userId: z.string().optional(),
  roleId: z.string().optional(),
  groupId: z.string().optional(),
  fieldId: z.string().optional(),
});

/**
 * Schema for creating a notification scheme
 */
export const createNotificationSchemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for updating a notification scheme
 */
export const updateNotificationSchemeSchema = z.object({
  schemeId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Schema for adding an event to a notification scheme
 */
export const addNotificationSchemeEventSchema = z.object({
  schemeId: z.string().uuid(),
  eventType: z.string(),
  recipientType: notificationRecipientTypeSchema,
  recipientParams: recipientParamsSchema.optional(),
  channels: z.array(notificationChannelSchema).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * Schema for updating a notification scheme event
 */
export const updateNotificationSchemeEventSchema = z.object({
  eventId: z.string().uuid(),
  recipientType: notificationRecipientTypeSchema.optional(),
  recipientParams: recipientParamsSchema.optional(),
  channels: z.array(notificationChannelSchema).optional(),
  isEnabled: z.boolean().optional(),
});

/**
 * Schema for notification scheme ID parameter
 */
export const notificationSchemeIdSchema = z.object({
  schemeId: z.string().uuid(),
});

/**
 * Schema for event ID parameter
 */
export const notificationEventIdSchema = z.object({
  eventId: z.string().uuid(),
});

/**
 * Schema for project ID parameter
 */
export const notificationProjectIdSchema = z.object({
  projectId: z.string(),
});

/**
 * Schema for assigning a scheme to a project
 */
export const assignNotificationSchemeSchema = z.object({
  projectId: z.string(),
  schemeId: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NotificationRecipientType = z.infer<typeof notificationRecipientTypeSchema>;
export type RecipientParamsInput = z.infer<typeof recipientParamsSchema>;
export type CreateNotificationSchemeInput = z.infer<typeof createNotificationSchemeSchema>;
export type UpdateNotificationSchemeInput = z.infer<typeof updateNotificationSchemeSchema>;
export type AddNotificationSchemeEventInput = z.infer<typeof addNotificationSchemeEventSchema>;
export type UpdateNotificationSchemeEventInput = z.infer<typeof updateNotificationSchemeEventSchema>;
export type NotificationSchemeIdInput = z.infer<typeof notificationSchemeIdSchema>;
export type NotificationEventIdInput = z.infer<typeof notificationEventIdSchema>;
export type NotificationProjectIdInput = z.infer<typeof notificationProjectIdSchema>;
export type AssignNotificationSchemeInput = z.infer<typeof assignNotificationSchemeSchema>;
