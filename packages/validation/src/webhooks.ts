import { z } from 'zod';

// =============================================================================
// WEBHOOK CONSTANTS
// =============================================================================

/**
 * Webhook event types that can trigger a webhook
 */
export const webhookEvents = [
  'issue:created',
  'issue:updated',
  'issue:deleted',
  'issue:assigned',
  'issue:transitioned',
  'issue:commented',
  'comment:created',
  'comment:updated',
  'comment:deleted',
  'sprint:created',
  'sprint:started',
  'sprint:completed',
  'sprint:deleted',
  'version:created',
  'version:updated',
  'version:released',
  'version:deleted',
  'project:created',
  'project:updated',
  'project:deleted',
  'worklog:created',
  'worklog:updated',
  'worklog:deleted',
  'user:created',
  'user:updated',
  'board:created',
  'board:updated',
  'board:deleted',
] as const;

/**
 * Webhook delivery statuses
 */
export const webhookDeliveryStatuses = [
  'pending',
  'success',
  'failed',
  'retrying',
] as const;

// =============================================================================
// WEBHOOK VALIDATION SCHEMAS
// =============================================================================

/**
 * Webhook event schema
 */
export const webhookEventSchema = z.enum(webhookEvents);

export type WebhookEventInput = z.infer<typeof webhookEventSchema>;

/**
 * Create webhook schema
 */
export const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().optional(),
  url: z.string().url(),
  secret: z.string().min(16).max(255).optional(),
  events: z.array(webhookEventSchema).min(1),
  customHeaders: z.record(z.string(), z.string()).optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

/**
 * Update webhook schema
 */
export const updateWebhookSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  secret: z.string().min(16).max(255).optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

/**
 * Webhook ID schema
 */
export const webhookIdSchema = z.object({
  id: z.string().uuid(),
});

export type WebhookIdInput = z.infer<typeof webhookIdSchema>;

/**
 * Webhook ID (alternative naming) schema
 */
export const webhookIdAltSchema = z.object({
  webhookId: z.string().uuid(),
});

export type WebhookIdAltInput = z.infer<typeof webhookIdAltSchema>;

/**
 * Get webhook deliveries schema
 */
export const getWebhookDeliveriesSchema = z.object({
  webhookId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type GetWebhookDeliveriesInput = z.infer<typeof getWebhookDeliveriesSchema>;

/**
 * Get webhook delivery stats schema
 */
export const getWebhookDeliveryStatsSchema = z.object({
  webhookId: z.string().uuid(),
  since: z.date().optional(),
});

export type GetWebhookDeliveryStatsInput = z.infer<typeof getWebhookDeliveryStatsSchema>;

/**
 * Get recent webhook deliveries schema
 */
export const getRecentWebhookDeliveriesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: z.enum(webhookDeliveryStatuses).optional(),
});

export type GetRecentWebhookDeliveriesInput = z.infer<typeof getRecentWebhookDeliveriesSchema>;

/**
 * Toggle webhook schema
 */
export const toggleWebhookSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export type ToggleWebhookInput = z.infer<typeof toggleWebhookSchema>;

/**
 * Project ID schema (for filtering)
 */
export const webhookProjectIdSchema = z.object({
  projectId: z.string().uuid().optional(),
});

export type WebhookProjectIdInput = z.infer<typeof webhookProjectIdSchema>;

/**
 * Test webhook schema
 */
export const testWebhookSchema = z.object({
  webhookId: z.string().uuid(),
});

export type TestWebhookInput = z.infer<typeof testWebhookSchema>;

/**
 * Retry webhook delivery schema
 */
export const retryWebhookDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
});

export type RetryWebhookDeliveryInput = z.infer<typeof retryWebhookDeliverySchema>;
