/**
 * Webhook Worker
 *
 * BullMQ worker for processing webhook deliveries and retries.
 */

import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from '@/lib/redis';
import { webhookService } from '@/services/webhook-service';
import type { WebhookEvent } from '@/db/schema/webhooks';

// =============================================================================
// QUEUE CONFIGURATION
// =============================================================================

const QUEUE_NAME = 'webhooks';

// Create Redis connection for BullMQ
const redisConnection = createRedisConnection();

// Create queue instance
export const webhookQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // We handle retries ourselves for better control
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 60 * 60 * 24, // Remove after 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs
      age: 60 * 60 * 24 * 7, // Remove after 7 days
    },
  },
});

// =============================================================================
// JOB TYPES
// =============================================================================

export interface WebhookJobData {
  type: 'trigger' | 'retry';
  event?: WebhookEvent;
  projectId?: string;
  entityId?: string;
  entityType?: string;
  data?: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(input: {
  event: WebhookEvent;
  projectId?: string;
  entityId?: string;
  entityType?: string;
  data: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}): Promise<void> {
  await webhookQueue.add('trigger', {
    type: 'trigger',
    ...input,
  });
}

/**
 * Schedule retry processing
 */
export async function scheduleRetryProcessing(): Promise<void> {
  await webhookQueue.add(
    'retry',
    {
      type: 'retry',
    },
    {
      delay: 60000, // Process retries every minute
      repeat: {
        every: 60000, // Every minute
      },
      jobId: 'webhook-retry-scheduler', // Prevent duplicate jobs
    },
  );
}

// =============================================================================
// WORKER
// =============================================================================

export function startWebhookWorker(): Worker {
  const workerRedisConnection = createRedisConnection();

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      console.log(
        `[WebhookWorker] Processing job ${job.id} (${job.data.type})`,
      );

      try {
        switch (job.data.type) {
          case 'trigger':
            if (job.data.event && job.data.data) {
              const count = await webhookService.triggerWebhooks({
                event: job.data.event,
                projectId: job.data.projectId,
                entityId: job.data.entityId,
                entityType: job.data.entityType,
                data: job.data.data,
                user: job.data.user,
              });
              console.log(
                `[WebhookWorker] Triggered ${count} webhooks for ${job.data.event}`,
              );
            }
            break;

          case 'retry':
            const retryCount = await webhookService.retryPendingDeliveries();
            if (retryCount > 0) {
              console.log(
                `[WebhookWorker] Retried ${retryCount} pending deliveries`,
              );
            }
            break;

          default:
            console.warn(`[WebhookWorker] Unknown job type: ${job.data.type}`);
        }
      } catch (error) {
        console.error(`[WebhookWorker] Error processing job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: workerRedisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently
    },
  );

  worker.on('completed', (job) => {
    console.log(`[WebhookWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[WebhookWorker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[WebhookWorker] Worker error:', err);
  });

  // Start the retry scheduler
  scheduleRetryProcessing().catch((err) => {
    console.error('[WebhookWorker] Failed to schedule retry processing:', err);
  });

  console.log('[WebhookWorker] Worker started');
  return worker;
}

// =============================================================================
// EVENT INTEGRATION HELPERS
// =============================================================================

/**
 * Create webhook event data for issue events
 */
export function createIssueWebhookData(
  issue: {
    id: string;
    key: string;
    summary: string;
    description?: string | null;
    status: { id: string; name: string };
    issueType: { id: string; name: string };
    priority?: string | null;
    assignee?: { id: string; name: string; email: string } | null;
    reporter?: { id: string; name: string; email: string } | null;
    projectId: string;
  },
  changelog?: Array<{
    field: string;
    fieldType: string;
    from: string | null;
    to: string | null;
  }>,
) {
  return {
    issue: {
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      description: issue.description ?? undefined,
      status: issue.status,
      issueType: issue.issueType,
      priority: issue.priority ?? undefined,
      assignee: issue.assignee ?? undefined,
      reporter: issue.reporter ?? undefined,
    },
    changelog,
  };
}

/**
 * Create webhook event data for comment events
 */
export function createCommentWebhookData(
  comment: {
    id: string;
    body: string;
    author: { id: string; name: string; email: string };
    createdAt: Date;
    updatedAt: Date;
  },
  issue: {
    id: string;
    key: string;
    summary: string;
    projectId: string;
  },
) {
  return {
    comment: {
      id: comment.id,
      body: comment.body,
      author: comment.author,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    },
    issue: {
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
    },
  };
}

/**
 * Create webhook event data for sprint events
 */
export function createSprintWebhookData(
  sprint: {
    id: string;
    name: string;
    goal?: string | null;
    status: string;
    startDate?: Date | null;
    endDate?: Date | null;
  },
  project: {
    id: string;
    key: string;
    name: string;
  },
) {
  return {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal ?? undefined,
      state: sprint.status,
      startDate: sprint.startDate?.toISOString(),
      endDate: sprint.endDate?.toISOString(),
    },
    project,
  };
}

/**
 * Create webhook event data for version events
 */
export function createVersionWebhookData(
  version: {
    id: string;
    name: string;
    description?: string | null;
    released: boolean;
    releaseDate?: Date | null;
  },
  project: {
    id: string;
    key: string;
    name: string;
  },
) {
  return {
    version: {
      id: version.id,
      name: version.name,
      description: version.description ?? undefined,
      released: version.released,
      releaseDate: version.releaseDate?.toISOString(),
    },
    project,
  };
}
