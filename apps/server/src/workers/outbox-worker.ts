/**
 * Outbox Worker
 *
 * BullMQ worker for processing domain event outbox entries.
 * Ensures reliable delivery of events to different destinations (webhooks, automation, notifications, audit).
 */

import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '@/lib/redis';
import { 
  domainEventService, 
  OutboxDestinations,
  type OutboxDestination 
} from '@/lib/events/domain-event-service';
import { WebhookService } from '@/services/webhook-service';
import { container } from '@/lib/container';

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

const QUEUE_NAME = 'outbox-processor';

// Create Redis connection for BullMQ
const redisConnection = createRedisConnection();

// Create queue instance
export const outboxQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // We handle retries in the outbox pattern
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 60 * 60, // Remove after 1 hour
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 60 * 60 * 24, // Remove after 24 hours
    },
  },
});

// =============================================================================
// JOB TYPES
// =============================================================================

export interface OutboxJobData {
  type: 'process' | 'retry' | 'cleanup';
  destination?: OutboxDestination;
  batchSize?: number;
  olderThanDays?: number;
}

export interface OutboxJobResult {
  processed?: number;
  retried?: number;
  cleaned?: { events: number; outbox: number };
}

// =============================================================================
// DESTINATION PROCESSORS
// =============================================================================

type EventProcessor = (event: { 
  eventType: string; 
  payload: unknown; 
  metadata: unknown;
}) => Promise<void>;

const webhookProcessor: EventProcessor = async (event) => {
  const webhookService = new WebhookService();
  
  // Map domain events to webhook events (domain events use : separator)
  const webhookEventMap: Record<string, string> = {
    'issue:created': 'issue:created',
    'issue:updated': 'issue:updated',
    'issue:deleted': 'issue:deleted',
    'issue:transitioned': 'issue:updated',
    'issue:assigned': 'issue:updated',
    'issue:commented': 'comment:created',
    'sprint:created': 'sprint:created',
    'sprint:started': 'sprint:started',
    'sprint:completed': 'sprint:completed',
    'project:created': 'project:created',
    'project:updated': 'project:updated',
  };

  const webhookEvent = webhookEventMap[event.eventType];
  if (!webhookEvent) {
    // Not a webhook-triggerable event
    return;
  }

  const payload = event.payload as Record<string, unknown>;
  const projectId = payload.projectId as string;

  if (!projectId) {
    console.warn(`[OutboxWorker] No projectId in event ${event.eventType}`);
    return;
  }

  await webhookService.triggerWebhooks({
    event: webhookEvent as any,
    projectId,
    entityId: (payload.issueId || payload.sprintId || payload.projectId) as string,
    entityType: event.eventType.split(':')[0], // 'issue', 'sprint', 'project'
    data: payload,
  });
};

const automationProcessor: EventProcessor = async (event) => {
  // Automation service will be called when it's added to container
  // For now, log and skip
  const payload = event.payload as Record<string, unknown>;
  
  // Map domain events to automation triggers
  const triggerMap: Record<string, string> = {
    'issue:created': 'issue_created',
    'issue:updated': 'issue_updated',
    'issue:transitioned': 'issue_transitioned',
    'issue:commented': 'comment_added',
    'sprint:started': 'sprint_started',
    'sprint:completed': 'sprint_completed',
  };

  const trigger = triggerMap[event.eventType];
  if (!trigger) {
    return;
  }

  const projectId = payload.projectId as string;
  if (!projectId) {
    return;
  }

  // TODO: Call automation service when added to container
  console.log(`[OutboxWorker] Automation trigger: ${trigger} for project ${projectId}`);
};

const notificationProcessor: EventProcessor = async (event) => {
  const notificationService = container.notification;
  const payload = event.payload as Record<string, unknown>;
  
  // Map domain events to notification types
  const notificationMap: Record<string, { type: string; priority: 'low' | 'normal' | 'high' }> = {
    'issue:created': { type: 'issue_created', priority: 'normal' },
    'issue:assigned': { type: 'issue_assigned', priority: 'high' },
    'issue:commented': { type: 'comment_added', priority: 'normal' },
    'issue:transitioned': { type: 'issue_transitioned', priority: 'normal' },
    'sprint:started': { type: 'sprint_started', priority: 'high' },
    'sprint:completed': { type: 'sprint_completed', priority: 'high' },
  };

  const notificationConfig = notificationMap[event.eventType];
  if (!notificationConfig) {
    return;
  }

  const issueId = payload.issueId as string;
  const issueKey = payload.issueKey as string;
  const metadata = event.metadata as Record<string, unknown>;

  if (!issueId) {
    return;
  }

  // Create notification for watchers
  await notificationService.notifyWatchers(
    issueId,
    notificationConfig.type as any,
    `${notificationConfig.type.replace('_', ' ')}: ${issueKey || issueId}`,
    {
      data: payload as any,
      actorId: metadata?.userId as string,
    }
  );
};

const auditProcessor: EventProcessor = async (event) => {
  // Audit events are already stored in domain_events table
  // This processor can be used for additional audit logging (e.g., to external systems)
  
  const payload = event.payload as Record<string, unknown>;
  const metadata = event.metadata as Record<string, unknown>;

  // Log to external audit system if configured
  if (process.env.EXTERNAL_AUDIT_ENDPOINT) {
    try {
      await fetch(process.env.EXTERNAL_AUDIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_AUDIT_TOKEN}`,
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          eventType: event.eventType,
          payload,
          metadata,
        }),
      });
    } catch (error) {
      console.error('[OutboxWorker] Failed to send audit event to external system:', error);
      throw error; // Will trigger retry
    }
  }
};

const processors: Record<OutboxDestination, EventProcessor> = {
  [OutboxDestinations.WEBHOOK]: webhookProcessor,
  [OutboxDestinations.AUTOMATION]: automationProcessor,
  [OutboxDestinations.NOTIFICATION]: notificationProcessor,
  [OutboxDestinations.AUDIT]: auditProcessor,
  [OutboxDestinations.EXTERNAL_SYSTEM]: auditProcessor, // Reuse audit processor for now
};

// =============================================================================
// WORKER IMPLEMENTATION
// =============================================================================

export const outboxWorker = new Worker<OutboxJobData, OutboxJobResult>(
  QUEUE_NAME,
  async (job: Job<OutboxJobData>) => {
    const { type, destination, batchSize = 10, olderThanDays = 30 } = job.data;

    switch (type) {
      case 'process': {
        if (!destination) {
          throw new Error('Destination is required for process job');
        }

        const processor = processors[destination];
        if (!processor) {
          throw new Error(`Unknown destination: ${destination}`);
        }

        const processed = await domainEventService.processPendingOutbox(
          destination,
          processor,
          batchSize
        );

        console.log(`[OutboxWorker] Processed ${processed} ${destination} events`);
        return { processed };
      }

      case 'retry': {
        const allDestinations = Object.values(OutboxDestinations);
        let totalRetried = 0;

        for (const dest of allDestinations) {
          const retried = await domainEventService.retryFailedOutbox(dest);
          totalRetried += retried;
          if (retried > 0) {
            console.log(`[OutboxWorker] Reset ${retried} failed ${dest} events for retry`);
          }
        }

        return { retried: totalRetried };
      }

      case 'cleanup': {
        const cleaned = await domainEventService.cleanup(olderThanDays);
        console.log(`[OutboxWorker] Cleaned up ${cleaned.events} events and ${cleaned.outbox} outbox entries`);
        return { cleaned };
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs in parallel
    limiter: {
      max: 100,
      duration: 1000, // Max 100 jobs per second
    },
  }
);

// =============================================================================
// ERROR HANDLING
// =============================================================================

outboxWorker.on('completed', (job, result) => {
  console.log(`[OutboxWorker] Job ${job.id} completed:`, result);
});

outboxWorker.on('failed', (job, error) => {
  console.error(`[OutboxWorker] Job ${job?.id} failed:`, error);
});

outboxWorker.on('error', (error) => {
  console.error('[OutboxWorker] Worker error:', error);
});

// =============================================================================
// SCHEDULED JOBS
// =============================================================================

/**
 * Schedule recurring outbox processing jobs.
 * Call this once during application startup.
 */
export async function scheduleOutboxJobs(): Promise<void> {
  // Process each destination every 5 seconds
  const destinations = Object.values(OutboxDestinations);
  
  for (const destination of destinations) {
    await outboxQueue.add(
      `process-${destination}`,
      { type: 'process', destination, batchSize: 20 },
      {
        repeat: {
          every: 5000, // Every 5 seconds
        },
        jobId: `process-${destination}`, // Prevent duplicate scheduled jobs
      }
    );
  }

  // Retry failed events every minute
  await outboxQueue.add(
    'retry-failed',
    { type: 'retry' },
    {
      repeat: {
        every: 60000, // Every minute
      },
      jobId: 'retry-failed',
    }
  );

  // Cleanup old events daily
  await outboxQueue.add(
    'cleanup',
    { type: 'cleanup', olderThanDays: 30 },
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
      jobId: 'cleanup',
    }
  );

  console.log('[OutboxWorker] Scheduled outbox processing jobs');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get outbox processing statistics.
 */
export async function getOutboxStats() {
  return domainEventService.getOutboxStats();
}

/**
 * Manually trigger processing for a specific destination.
 */
export async function triggerProcessing(destination: OutboxDestination, batchSize = 50) {
  return outboxQueue.add(
    `manual-process-${destination}`,
    { type: 'process', destination, batchSize },
    { priority: 1 } // High priority
  );
}

/**
 * Manually trigger retry of failed events.
 */
export async function triggerRetry() {
  return outboxQueue.add(
    'manual-retry',
    { type: 'retry' },
    { priority: 1 }
  );
}

/**
 * Graceful shutdown.
 */
export async function shutdownOutboxWorker(): Promise<void> {
  await outboxWorker.close();
  await outboxQueue.close();
  console.log('[OutboxWorker] Shutdown complete');
}
