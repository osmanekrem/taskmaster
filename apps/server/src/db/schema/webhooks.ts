import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { projects } from './projects';
import {
  webhookEvents,
  webhookDeliveryStatuses,
  type WebhookEvent,
} from '@taskmaster/constants';

// Re-export for backwards compatibility
export { webhookEvents };
export type { WebhookEvent };

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Webhook delivery status
 */
export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'success',
  'failed',
  'retrying',
]);

// =============================================================================
// WEBHOOKS TABLE
// =============================================================================

/**
 * Webhook definitions
 * Can be project-specific or global (projectId = null)
 */
export const webhooks = pgTable(
  'webhooks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * Display name for the webhook
     */
    name: text('name').notNull(),

    /**
     * Optional description
     */
    description: text('description'),

    /**
     * Project this webhook belongs to (null = global webhook)
     */
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),

    /**
     * The URL to send webhook payloads to
     */
    url: text('url').notNull(),

    /**
     * Secret for HMAC signature (encrypted in storage)
     * Used to sign payloads so receivers can verify authenticity
     */
    secret: text('secret'),

    /**
     * Events that trigger this webhook
     */
    events: jsonb('events').$type<WebhookEvent[]>().notNull().default([]),

    /**
     * Custom headers to send with each request
     */
    customHeaders: jsonb('custom_headers')
      .$type<Record<string, string>>()
      .default({}),

    /**
     * Whether the webhook is active
     */
    isActive: boolean('is_active').notNull().default(true),

    /**
     * Number of consecutive failures
     * Used for auto-disabling
     */
    failureCount: integer('failure_count').notNull().default(0),

    /**
     * Last time the webhook failed
     */
    lastFailureAt: timestamp('last_failure_at'),

    /**
     * Last successful delivery
     */
    lastSuccessAt: timestamp('last_success_at'),

    /**
     * User who created this webhook
     */
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Find webhooks for a project
    index('webhooks_project_id_idx').on(table.projectId),
    // Find active webhooks
    index('webhooks_is_active_idx').on(table.isActive),
    // Find webhooks by creator
    index('webhooks_created_by_idx').on(table.createdById),
  ],
);

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  project: one(projects, {
    fields: [webhooks.projectId],
    references: [projects.id],
  }),
  createdBy: one(user, {
    fields: [webhooks.createdById],
    references: [user.id],
  }),
  deliveries: many(webhookDeliveries),
}));

// =============================================================================
// WEBHOOK DELIVERIES TABLE
// =============================================================================

/**
 * Webhook delivery logs
 * Records each attempt to deliver a webhook payload
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * The webhook this delivery belongs to
     */
    webhookId: text('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),

    /**
     * The event type that triggered this delivery
     */
    eventType: text('event_type').notNull().$type<WebhookEvent>(),

    /**
     * The full request body sent
     */
    requestBody: jsonb('request_body').$type<Record<string, unknown>>(),

    /**
     * Request headers sent
     */
    requestHeaders: jsonb('request_headers').$type<Record<string, string>>(),

    /**
     * HTTP status code received (null if request failed)
     */
    responseStatus: integer('response_status'),

    /**
     * Response body received
     */
    responseBody: text('response_body'),

    /**
     * Response headers received
     */
    responseHeaders: jsonb('response_headers').$type<Record<string, string>>(),

    /**
     * Time taken to complete the request in milliseconds
     */
    durationMs: integer('duration_ms'),

    /**
     * Error message if the delivery failed
     */
    errorMessage: text('error_message'),

    /**
     * Delivery status
     */
    status: webhookDeliveryStatusEnum('status').notNull().default('pending'),

    /**
     * Which attempt number this is (1-indexed)
     */
    attemptNumber: integer('attempt_number').notNull().default(1),

    /**
     * When to retry (if status is 'retrying')
     */
    nextRetryAt: timestamp('next_retry_at'),

    /**
     * Entity ID that triggered this webhook (for reference)
     */
    entityId: text('entity_id'),

    /**
     * Entity type (issue, comment, sprint, etc.)
     */
    entityType: text('entity_type'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    // Find deliveries for a webhook
    index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
    // Find deliveries by status (for retry processing)
    index('webhook_deliveries_status_idx').on(table.status),
    // Find deliveries to retry
    index('webhook_deliveries_next_retry_idx').on(table.nextRetryAt),
    // Find deliveries by event type
    index('webhook_deliveries_event_type_idx').on(table.eventType),
    // Find recent deliveries
    index('webhook_deliveries_created_at_idx').on(table.createdAt),
  ],
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    webhook: one(webhooks, {
      fields: [webhookDeliveries.webhookId],
      references: [webhooks.id],
    }),
  }),
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
export type WebhookDeliveryStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'retrying';

// =============================================================================
// WEBHOOK PAYLOAD TYPES
// =============================================================================

/**
 * Standard webhook payload structure
 */
export interface WebhookPayload<T = unknown> {
  /**
   * Unique delivery ID
   */
  id: string;

  /**
   * Event type
   */
  event: WebhookEvent;

  /**
   * Timestamp of the event
   */
  timestamp: string;

  /**
   * Webhook ID
   */
  webhookId: string;

  /**
   * Event-specific data
   */
  data: T;

  /**
   * User who triggered the event (if applicable)
   */
  user?: {
    id: string;
    name: string;
    email: string;
  };

  /**
   * Project context (if applicable)
   */
  project?: {
    id: string;
    key: string;
    name: string;
  };
}

/**
 * Issue event payload
 */
export interface IssueWebhookPayload {
  issue: {
    id: string;
    key: string;
    summary: string;
    description?: string;
    status: {
      id: string;
      name: string;
    };
    issueType: {
      id: string;
      name: string;
    };
    priority?: string;
    assignee?: {
      id: string;
      name: string;
      email: string;
    };
    reporter?: {
      id: string;
      name: string;
      email: string;
    };
  };
  changelog?: {
    field: string;
    fieldType: string;
    from: string | null;
    to: string | null;
  }[];
}

/**
 * Comment event payload
 */
export interface CommentWebhookPayload {
  comment: {
    id: string;
    body: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  issue: {
    id: string;
    key: string;
    summary: string;
  };
}

/**
 * Sprint event payload
 */
export interface SprintWebhookPayload {
  sprint: {
    id: string;
    name: string;
    goal?: string;
    state: string;
    startDate?: string;
    endDate?: string;
  };
  project: {
    id: string;
    key: string;
    name: string;
  };
}

/**
 * Version event payload
 */
export interface VersionWebhookPayload {
  version: {
    id: string;
    name: string;
    description?: string;
    released: boolean;
    releaseDate?: string;
  };
  project: {
    id: string;
    key: string;
    name: string;
  };
}

// =============================================================================
// CONSTANTS (re-exported from @taskmaster/constants)
// =============================================================================

export {
  WEBHOOK_MAX_RETRIES,
  WEBHOOK_RETRY_DELAYS,
  WEBHOOK_AUTO_DISABLE_THRESHOLD,
  WEBHOOK_TIMEOUT_MS,
} from '@taskmaster/constants';
