// =============================================================================
// DOMAIN EVENTS SCHEMA
// Persistent event store for reliable event delivery and audit
// =============================================================================

import { pgTable, text, timestamp, jsonb, integer, index, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

// =============================================================================
// OUTBOX STATUS ENUM
// =============================================================================

export const outboxStatusEnum = pgEnum('outbox_status', [
  'pending',     // Event created, not yet processed
  'processing',  // Currently being processed
  'processed',   // Successfully processed
  'failed',      // Processing failed, may be retried
]);

// =============================================================================
// EVENT TYPES
// =============================================================================

export const EVENT_TYPES = [
  // Issue events
  'issue:created',
  'issue:updated',
  'issue:deleted',
  'issue:transitioned',
  'issue:assigned',
  'issue:commented',
  'issue:linked',
  'issue:unlinked',
  'issue:moved',
  'issue:viewed',
  'issue:bulk_updated',
  'issue:attachment_added',
  'issue:attachment_removed',
  
  // Sprint events
  'sprint:created',
  'sprint:started',
  'sprint:completed',
  'sprint:deleted',
  'sprint:issue_added',
  'sprint:issue_removed',
  
  // Project events
  'project:created',
  'project:updated',
  'project:archived',
  'project:deleted',
  
  // User events
  'user:created',
  'user:updated',
  'user:deleted',
  'user:logged_in',
  
  // Workflow events
  'workflow:created',
  'workflow:updated',
  'workflow:deleted',
  'workflow:transition_executed',
  
  // Automation events
  'automation:rule_triggered',
  'automation:rule_executed',
  'automation:rule_failed',
  
  // Webhook events
  'webhook:received',
  'webhook:delivered',
  'webhook:failed',
  
  // System events
  'system:job_completed',
  'system:error',
] as const;

export type DomainEventType = (typeof EVENT_TYPES)[number];

// =============================================================================
// DOMAIN EVENTS TABLE
// Main event store for all domain events
// =============================================================================

export const domainEvents = pgTable(
  'domain_events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Event identification
    eventType: text('event_type').$type<DomainEventType>().notNull(),
    aggregateType: text('aggregate_type').notNull(), // 'issue', 'project', 'sprint', etc.
    aggregateId: text('aggregate_id').notNull(), // ID of the affected entity

    // Event payload (structured JSON)
    payload: jsonb('payload').notNull(),
    metadata: jsonb('metadata'), // Event metadata (userId, correlationId, etc.)

    // Versioning for optimistic concurrency
    eventVersion: integer('event_version').default(1).notNull(),

    // Metadata
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // Who triggered the event
    correlationId: text('correlation_id'), // For tracing related events
    causationId: text('causation_id'), // ID of the event that caused this event

    // Processing
    occurredAt: timestamp('occurred_at').defaultNow().notNull(), // When the event occurred
    processedAt: timestamp('processed_at'), // When fully processed

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Query indexes
    eventTypeIdx: index('domain_events_event_type_idx').on(table.eventType),
    aggregateIdx: index('domain_events_aggregate_idx').on(
      table.aggregateType,
      table.aggregateId,
    ),
    versionIdx: index('domain_events_version_idx').on(table.eventVersion),
    createdAtIdx: index('domain_events_created_at_idx').on(table.createdAt),
    userIdx: index('domain_events_user_idx').on(table.userId),
    correlationIdx: index('domain_events_correlation_idx').on(table.correlationId),
    
    // Composite: Find unprocessed events (ordered by creation time)
    unprocessedIdx: index('domain_events_unprocessed_idx').on(
      table.processedAt,
      table.createdAt,
    ),
  }),
);

// =============================================================================
// EVENT OUTBOX TABLE
// Transactional outbox for reliable event publishing
// =============================================================================

export const eventOutbox = pgTable(
  'event_outbox',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Reference to domain event
    eventId: text('event_id')
      .notNull()
      .references(() => domainEvents.id, { onDelete: 'cascade' }),

    // Target destination
    destination: text('destination').notNull(), // 'webhook', 'automation', 'notification', 'audit'

    // Processing status
    status: outboxStatusEnum('status').default('pending').notNull(),
    retryCount: integer('retry_count').default(0).notNull(),
    lastError: text('last_error'),
    lockedUntil: timestamp('locked_until'), // For optimistic locking
    processedAt: timestamp('processed_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index('event_outbox_event_idx').on(table.eventId),
    destinationIdx: index('event_outbox_destination_idx').on(table.destination),
    statusIdx: index('event_outbox_status_idx').on(table.status),
    lockedUntilIdx: index('event_outbox_locked_until_idx').on(table.lockedUntil),
    
    // Composite: Find pending events for a destination
    pendingIdx: index('event_outbox_pending_idx').on(
      table.status,
      table.destination,
      table.createdAt,
    ),
  }),
);

// =============================================================================
// EVENT SUBSCRIPTIONS TABLE
// Configurable event subscriptions for webhooks, automation rules, etc.
// =============================================================================

export const eventSubscriptions = pgTable(
  'event_subscriptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // What this subscription is for
    name: text('name').notNull(),
    description: text('description'),

    // Which events to subscribe to
    eventTypes: jsonb('event_types').$type<DomainEventType[]>().notNull(),
    
    // Optional filters
    aggregateType: text('aggregate_type'), // Filter by aggregate type
    projectId: text('project_id'), // Filter by project (for project-scoped subscriptions)

    // Destination
    destination: text('destination').notNull(), // 'webhook', 'queue', 'notification'
    destinationConfig: jsonb('destination_config'), // Webhook URL, queue name, etc.

    // Status
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    destinationIdx: index('event_subscriptions_destination_idx').on(table.destination),
    activeIdx: index('event_subscriptions_active_idx').on(table.isActive),
    projectIdx: index('event_subscriptions_project_idx').on(table.projectId),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const domainEventRelations = relations(domainEvents, ({ one, many }) => ({
  user: one(user, {
    fields: [domainEvents.userId],
    references: [user.id],
  }),
  outboxEntries: many(eventOutbox),
}));

export const eventOutboxRelations = relations(eventOutbox, ({ one }) => ({
  event: one(domainEvents, {
    fields: [eventOutbox.eventId],
    references: [domainEvents.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type DomainEvent = typeof domainEvents.$inferSelect;
export type DomainEventInsert = typeof domainEvents.$inferInsert;

export type EventOutboxEntry = typeof eventOutbox.$inferSelect;
export type EventOutboxInsert = typeof eventOutbox.$inferInsert;

export type EventSubscription = typeof eventSubscriptions.$inferSelect;
export type NewEventSubscription = typeof eventSubscriptions.$inferInsert;

// =============================================================================
// EVENT PAYLOAD TYPES
// Structured payloads for each event type
// =============================================================================

export interface IssueCreatedPayload {
  issueId: string;
  issueKey: string;
  projectId: string;
  issueTypeId: string;
  summary?: string;
  reporterId: string;
  assigneeId?: string;
}

export interface IssueUpdatedPayload {
  issueId: string;
  issueKey: string;
  projectId: string;
  changes: Array<{
    field: string;
    from: unknown;
    to: unknown;
  }>;
}

export interface IssueTransitionedPayload {
  issueId: string;
  issueKey: string;
  projectId: string;
  transitionId: string;
  fromStatusId: string;
  toStatusId: string;
  resolutionId?: string;
}

export interface IssueAssignedPayload {
  issueId: string;
  issueKey: string;
  projectId: string;
  fromAssigneeId?: string;
  toAssigneeId?: string;
}

// Add more payload types as needed...
