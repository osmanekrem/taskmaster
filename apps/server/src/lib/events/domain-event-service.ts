import { db } from '@/db';
import { domainEvents, eventOutbox, type DomainEventInsert, type EventOutboxInsert, EVENT_TYPES, type DomainEventType } from '@/db/schema';
import { eq, and, lt, isNull, sql, or } from 'drizzle-orm';
import type { DbOrTx } from '@/lib/transaction';
import { z } from 'zod';

// Re-export event types from schema
export { EVENT_TYPES, type DomainEventType } from '@/db/schema';

// Event Types Mapping (convenience constants)
export const EventTypes = {
  // Issue Events
  ISSUE_CREATED: 'issue:created',
  ISSUE_UPDATED: 'issue:updated',
  ISSUE_DELETED: 'issue:deleted',
  ISSUE_STATUS_CHANGED: 'issue:transitioned',
  ISSUE_ASSIGNED: 'issue:assigned',
  ISSUE_COMMENTED: 'issue:commented',
  ISSUE_ATTACHMENT_ADDED: 'issue:attachment_added',
  ISSUE_ATTACHMENT_REMOVED: 'issue:attachment_removed',
  ISSUE_LINKED: 'issue:linked',
  ISSUE_UNLINKED: 'issue:unlinked',
  ISSUE_MOVED: 'issue:moved',
  ISSUE_VIEWED: 'issue:viewed',
  BULK_ISSUE_UPDATED: 'issue:bulk_updated',
  
  // Sprint Events
  SPRINT_CREATED: 'sprint:created',
  SPRINT_STARTED: 'sprint:started',
  SPRINT_COMPLETED: 'sprint:completed',
  SPRINT_DELETED: 'sprint:deleted',
  SPRINT_ISSUE_ADDED: 'sprint:issue_added',
  SPRINT_ISSUE_REMOVED: 'sprint:issue_removed',
  
  // Project Events
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  PROJECT_ARCHIVED: 'project:archived',
  
  // User Events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_LOGGED_IN: 'user:logged_in',
  
  // Workflow Events
  WORKFLOW_TRANSITION: 'workflow:transition_executed',
  WORKFLOW_UPDATED: 'workflow:updated',
  WORKFLOW_CREATED: 'workflow:created',
  WORKFLOW_DELETED: 'workflow:deleted',
  
  // Automation Events
  AUTOMATION_TRIGGERED: 'automation:rule_triggered',
  AUTOMATION_COMPLETED: 'automation:rule_executed',
  AUTOMATION_FAILED: 'automation:rule_failed',
  
  // Webhook Events
  WEBHOOK_RECEIVED: 'webhook:received',
  WEBHOOK_DELIVERED: 'webhook:delivered',
  WEBHOOK_FAILED: 'webhook:failed',
  
  // System Events
  SYSTEM_JOB_COMPLETED: 'system:job_completed',
  SYSTEM_ERROR: 'system:error',
} as const satisfies Record<string, DomainEventType>;

// Event Payload Schemas
export const IssueCreatedPayload = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  projectId: z.string(),
  issueTypeId: z.string(),
  summary: z.string(),
  assigneeId: z.string().nullable(),
  reporterId: z.string(),
  statusId: z.string(),
  priority: z.string().nullable(),
});

export const IssueUpdatedPayload = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
  })),
});

export const IssueStatusChangedPayload = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  fromStatusId: z.string(),
  toStatusId: z.string(),
  transitionId: z.string().optional(),
});

export const IssueCommentedPayload = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  commentId: z.string(),
  content: z.string(),
  authorId: z.string(),
});

export const SprintEventPayload = z.object({
  sprintId: z.string(),
  projectId: z.string(),
  name: z.string(),
});

// Event Metadata Schema
export const EventMetadata = z.object({
  userId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  traceId: z.string().optional(),
});

export type EventMetadataType = z.infer<typeof EventMetadata>;

// Outbox Destinations
export const OutboxDestinations = {
  WEBHOOK: 'webhook',
  AUTOMATION: 'automation',
  NOTIFICATION: 'notification',
  AUDIT: 'audit',
  EXTERNAL_SYSTEM: 'external_system',
} as const;

export type OutboxDestination = typeof OutboxDestinations[keyof typeof OutboxDestinations];

interface PublishEventOptions {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata?: EventMetadataType;
  destinations?: OutboxDestination[];
  tx?: DbOrTx;
}

interface DomainEventResult {
  eventId: string;
  outboxIds: string[];
}

export class DomainEventService {
  private static instance: DomainEventService;
  private readonly defaultDestinations: OutboxDestination[] = [
    OutboxDestinations.WEBHOOK,
    OutboxDestinations.AUTOMATION,
    OutboxDestinations.NOTIFICATION,
    OutboxDestinations.AUDIT,
  ];

  private constructor() {}

  static getInstance(): DomainEventService {
    if (!DomainEventService.instance) {
      DomainEventService.instance = new DomainEventService();
    }
    return DomainEventService.instance;
  }

  /**
   * Publish a domain event within the same transaction.
   * This ensures the event is persisted atomically with the business operation.
   * 
   * Outbox entries are created for each destination to ensure reliable delivery.
   */
  async publish(options: PublishEventOptions): Promise<DomainEventResult> {
    const {
      eventType,
      aggregateType,
      aggregateId,
      payload,
      metadata = {},
      destinations = this.defaultDestinations,
      tx,
    } = options;

    const database = tx ?? db;

    // Create domain event
    const eventInsert: DomainEventInsert = {
      aggregateType,
      aggregateId,
      eventType,
      eventVersion: 1,
      payload,
      metadata,
      occurredAt: new Date(),
    };

    const [event] = await database
      .insert(domainEvents)
      .values(eventInsert)
      .returning({ id: domainEvents.id });

    // Create outbox entries for each destination
    const outboxEntries: EventOutboxInsert[] = destinations.map(destination => ({
      eventId: event.id,
      destination,
    }));

    const outboxResults = await database
      .insert(eventOutbox)
      .values(outboxEntries)
      .returning({ id: eventOutbox.id });

    return {
      eventId: event.id,
      outboxIds: outboxResults.map(r => r.id),
    };
  }

  /**
   * Process pending outbox entries.
   * This should be called by a background worker.
   * Uses optimistic locking to prevent duplicate processing.
   */
  async processPendingOutbox(
    destination: OutboxDestination,
    processor: (event: { eventType: string; payload: unknown; metadata: unknown }) => Promise<void>,
    batchSize = 10
  ): Promise<number> {
    const now = new Date();
    const lockDuration = 5 * 60 * 1000; // 5 minutes
    const lockUntil = new Date(now.getTime() + lockDuration);

    // Claim pending entries with optimistic locking
    const pendingEntries = await db
      .update(eventOutbox)
      .set({ 
        status: 'processing',
        lockedUntil: lockUntil,
      })
      .where(
        and(
          eq(eventOutbox.destination, destination),
          eq(eventOutbox.status, 'pending'),
          or(
            isNull(eventOutbox.lockedUntil),
            lt(eventOutbox.lockedUntil, now)
          ),
          lt(eventOutbox.retryCount, 5) // Max retries
        )
      )
      .returning();

    // Limit to batch size
    const entriesToProcess = pendingEntries.slice(0, batchSize);
    let processedCount = 0;

    for (const entry of entriesToProcess) {
      try {
        // Fetch the event
        const [event] = await db
          .select()
          .from(domainEvents)
          .where(eq(domainEvents.id, entry.eventId))
          .limit(1);

        if (!event) {
          await this.markOutboxFailed(entry.id, 'Event not found');
          continue;
        }

        // Process the event
        await processor({
          eventType: event.eventType,
          payload: event.payload,
          metadata: event.metadata,
        });

        // Mark as processed
        await db
          .update(eventOutbox)
          .set({
            status: 'processed',
            processedAt: new Date(),
            lockedUntil: null,
          })
          .where(eq(eventOutbox.id, entry.id));

        // Mark event as processed if all outbox entries are done
        await this.maybeMarkEventProcessed(entry.eventId);

        processedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markOutboxFailed(entry.id, errorMessage);
      }
    }

    // Release any entries we claimed but didn't process
    const unprocessedIds = pendingEntries
      .slice(batchSize)
      .map(e => e.id);

    if (unprocessedIds.length > 0) {
      await db
        .update(eventOutbox)
        .set({
          status: 'pending',
          lockedUntil: null,
        })
        .where(sql`${eventOutbox.id} = ANY(${unprocessedIds})`);
    }

    return processedCount;
  }

  private async markOutboxFailed(outboxId: string, error: string): Promise<void> {
    await db
      .update(eventOutbox)
      .set({
        status: 'failed',
        lastError: error,
        retryCount: sql`${eventOutbox.retryCount} + 1`,
        lockedUntil: null,
      })
      .where(eq(eventOutbox.id, outboxId));
  }

  private async maybeMarkEventProcessed(eventId: string): Promise<void> {
    // Check if all outbox entries are processed
    const pendingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventOutbox)
      .where(
        and(
          eq(eventOutbox.eventId, eventId),
          sql`${eventOutbox.status} != 'processed'`
        )
      );

    if (pendingCount[0]?.count === 0) {
      await db
        .update(domainEvents)
        .set({ processedAt: new Date() })
        .where(eq(domainEvents.id, eventId));
    }
  }

  /**
   * Retry failed outbox entries.
   * Implements exponential backoff.
   */
  async retryFailedOutbox(destination: OutboxDestination): Promise<number> {
    const now = new Date();

    // Calculate backoff: 2^retryCount minutes
    const result = await db
      .update(eventOutbox)
      .set({
        status: 'pending',
        lastError: null,
      })
      .where(
        and(
          eq(eventOutbox.destination, destination),
          eq(eventOutbox.status, 'failed'),
          lt(eventOutbox.retryCount, 5),
          // Exponential backoff check
          sql`${eventOutbox.processedAt} < ${now} - interval '1 minute' * power(2, ${eventOutbox.retryCount})`
        )
      )
      .returning({ id: eventOutbox.id });

    return result.length;
  }

  /**
   * Get events for a specific aggregate (for event replay).
   */
  async getAggregateEvents(
    aggregateType: string,
    aggregateId: string,
    afterVersion?: number
  ) {
    const conditions = [
      eq(domainEvents.aggregateType, aggregateType),
      eq(domainEvents.aggregateId, aggregateId),
    ];

    if (afterVersion !== undefined) {
      conditions.push(sql`${domainEvents.eventVersion} > ${afterVersion}`);
    }

    return db
      .select()
      .from(domainEvents)
      .where(and(...conditions))
      .orderBy(domainEvents.eventVersion);
  }

  /**
   * Get unprocessed events count by destination (for monitoring).
   */
  async getOutboxStats(): Promise<Record<string, { pending: number; failed: number; processing: number }>> {
    const stats = await db
      .select({
        destination: eventOutbox.destination,
        status: eventOutbox.status,
        count: sql<number>`count(*)::int`,
      })
      .from(eventOutbox)
      .groupBy(eventOutbox.destination, eventOutbox.status);

    const result: Record<string, { pending: number; failed: number; processing: number }> = {};

    for (const row of stats) {
      if (!result[row.destination]) {
        result[row.destination] = { pending: 0, failed: 0, processing: 0 };
      }
      result[row.destination][row.status as 'pending' | 'failed' | 'processing'] = row.count;
    }

    return result;
  }

  /**
   * Clean up old processed events and outbox entries.
   */
  async cleanup(olderThanDays = 30): Promise<{ events: number; outbox: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    // Delete old outbox entries first (foreign key constraint)
    const outboxResult = await db
      .delete(eventOutbox)
      .where(
        and(
          eq(eventOutbox.status, 'processed'),
          lt(eventOutbox.processedAt!, cutoff)
        )
      )
      .returning({ id: eventOutbox.id });

    // Delete old processed events
    const eventsResult = await db
      .delete(domainEvents)
      .where(
        and(
          sql`${domainEvents.processedAt} IS NOT NULL`,
          lt(domainEvents.processedAt!, cutoff)
        )
      )
      .returning({ id: domainEvents.id });

    return {
      events: eventsResult.length,
      outbox: outboxResult.length,
    };
  }
}

// Singleton export
export const domainEventService = DomainEventService.getInstance();

// Convenience function for publishing events
export async function publishDomainEvent(options: PublishEventOptions): Promise<DomainEventResult> {
  return domainEventService.publish(options);
}
