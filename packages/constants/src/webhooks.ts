// =============================================================================
// WEBHOOK CONSTANTS
// =============================================================================

/**
 * Webhook event types that can trigger a webhook
 */
export const webhookEvents = [
  // Issue events
  'issue:created',
  'issue:updated',
  'issue:deleted',
  'issue:assigned',
  'issue:transitioned',
  'issue:commented',

  // Comment events
  'comment:created',
  'comment:updated',
  'comment:deleted',

  // Sprint events
  'sprint:created',
  'sprint:started',
  'sprint:completed',
  'sprint:deleted',

  // Version events
  'version:created',
  'version:updated',
  'version:released',
  'version:deleted',

  // Project events
  'project:created',
  'project:updated',
  'project:deleted',

  // Worklog events
  'worklog:created',
  'worklog:updated',
  'worklog:deleted',

  // User events
  'user:created',
  'user:updated',

  // Board events
  'board:created',
  'board:updated',
  'board:deleted',
] as const;

export type WebhookEvent = (typeof webhookEvents)[number];

/**
 * Webhook delivery statuses
 */
export const webhookDeliveryStatuses = [
  'pending',
  'success',
  'failed',
  'retrying',
] as const;

export type WebhookDeliveryStatus = (typeof webhookDeliveryStatuses)[number];

/**
 * Maximum retries for failed webhooks
 */
export const WEBHOOK_MAX_RETRIES = 5;

/**
 * Retry delays in milliseconds (exponential backoff)
 */
export const WEBHOOK_RETRY_DELAYS = [
  1000 * 60, // 1 minute
  1000 * 60 * 5, // 5 minutes
  1000 * 60 * 30, // 30 minutes
  1000 * 60 * 60, // 1 hour
  1000 * 60 * 60 * 4, // 4 hours
] as const;

/**
 * Failure count threshold to auto-disable webhook
 */
export const WEBHOOK_AUTO_DISABLE_THRESHOLD = 10;

/**
 * Webhook timeout in milliseconds
 */
export const WEBHOOK_TIMEOUT_MS = 30000;
