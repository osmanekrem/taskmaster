// =============================================================================
// QUEUE CONSTANTS
// =============================================================================

/**
 * Queue names for BullMQ job processing
 */
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  AUTOMATION: 'automation',
  OUTBOX: 'outbox',
  BURNDOWN: 'burndown',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
