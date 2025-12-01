// =============================================================================
// JOB QUEUE INFRASTRUCTURE
// =============================================================================

import { Queue, Worker, Job, QueueEvents, type JobsOptions } from 'bullmq';
import { createRedisConnection, getRedisOptions } from '@/lib/redis';
import { env } from '@/config/env';
import { QUEUE_NAMES } from '@taskmaster/constants';

// Re-export for backwards compatibility
export { QUEUE_NAMES };
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// =============================================================================
// JOB TYPES
// =============================================================================

// Notification jobs
export interface NotificationJobData {
  type: 
    | 'issue_created' 
    | 'issue_updated' 
    | 'issue_status_changed' 
    | 'issue_assigned' 
    | 'issue_unassigned'
    | 'issue_commented' 
    | 'issue_mentioned'
    | 'issue_deleted'
    | 'comment_replied'
    | 'comment_mentioned'
    | 'watching_issue_updated'
    | 'watching_issue_commented'
    | 'watching_issue_status_changed'
    | 'added_as_watcher'
    | 'removed_as_watcher'
    | 'sprint_started'
    | 'sprint_completed'
    | 'workflow_transition';
  issueId?: string;
  projectId: string;
  userId: string; // User who triggered the action
  recipients: string[]; // User IDs to notify
  data: Record<string, unknown>;
}

// Email jobs
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

// Webhook jobs
export interface WebhookJobData {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: unknown;
  secret?: string; // For HMAC signing
  retryCount?: number;
}

// Automation jobs
export interface AutomationJobData {
  ruleId: string;
  triggerId: string;
  issueId: string;
  userId: string;
  context: Record<string, unknown>;
}

// Union type for all job data
export type JobData = NotificationJobData | EmailJobData | WebhookJobData | AutomationJobData;

// =============================================================================
// QUEUE REGISTRY
// =============================================================================

const queues = new Map<QueueName, Queue>();
const workers = new Map<QueueName, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Get or create a queue
 */
export function getQueue<T = JobData>(name: QueueName): Queue<T> {
  if (!queues.has(name)) {
    const queue = new Queue<T>(name, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 60 * 60, // Keep for 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 7 * 24 * 60 * 60, // Keep for 7 days
        },
      },
    });
    
    queues.set(name, queue as Queue);
  }
  
  return queues.get(name) as Queue<T>;
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(name: QueueName): QueueEvents {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, {
      connection: createRedisConnection(),
    });
    queueEvents.set(name, events);
  }
  
  return queueEvents.get(name)!;
}

// =============================================================================
// WORKER REGISTRATION
// =============================================================================

export type JobProcessor<T = JobData> = (job: Job<T>) => Promise<void>;

/**
 * Register a worker for a queue
 */
export function registerWorker<T = JobData>(
  name: QueueName,
  processor: JobProcessor<T>,
  options?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
  }
): Worker<T> {
  if (workers.has(name)) {
    console.warn(`[Queue] Worker for ${name} already registered, replacing...`);
    workers.get(name)?.close();
  }
  
  const worker = new Worker<T>(name, processor, {
    connection: createRedisConnection(),
    concurrency: options?.concurrency ?? 5,
    limiter: options?.limiter,
  });
  
  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[Queue:${name}] Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`[Queue:${name}] Job ${job?.id} failed:`, err.message);
  });
  
  worker.on('error', (err) => {
    console.error(`[Queue:${name}] Worker error:`, err.message);
  });
  
  workers.set(name, worker as Worker);
  console.log(`[Queue] Worker registered for ${name}`);
  
  return worker;
}

// =============================================================================
// JOB HELPERS
// =============================================================================

/**
 * Add a notification job
 */
export async function addNotificationJob(
  data: NotificationJobData,
  options?: JobsOptions
): Promise<Job<NotificationJobData>> {
  const queue = getQueue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION);
  return queue.add('notify', data, {
    priority: getPriorityForNotificationType(data.type),
    ...options,
  });
}

/**
 * Add an email job
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: JobsOptions
): Promise<Job<EmailJobData>> {
  const queue = getQueue<EmailJobData>(QUEUE_NAMES.EMAIL);
  return queue.add('send', data, options);
}

/**
 * Add a webhook job
 */
export async function addWebhookJob(
  data: WebhookJobData,
  options?: JobsOptions
): Promise<Job<WebhookJobData>> {
  const queue = getQueue<WebhookJobData>(QUEUE_NAMES.WEBHOOK);
  return queue.add('call', data, {
    attempts: data.retryCount ?? 3,
    ...options,
  });
}

/**
 * Add an automation job
 */
export async function addAutomationJob(
  data: AutomationJobData,
  options?: JobsOptions
): Promise<Job<AutomationJobData>> {
  const queue = getQueue<AutomationJobData>(QUEUE_NAMES.AUTOMATION);
  return queue.add('execute', data, options);
}

/**
 * Add multiple jobs in bulk
 */
export async function addBulkJobs<T = JobData>(
  name: QueueName,
  jobs: { name: string; data: T; opts?: JobsOptions }[]
): Promise<Job<T>[]> {
  const queue = getQueue<T>(name);
  // @ts-expect-error - BullMQ type inference issue with generic jobs
  return queue.addBulk(jobs) as unknown as Promise<Job<T>[]>;
}

// =============================================================================
// PRIORITY HELPERS
// =============================================================================

function getPriorityForNotificationType(type: NotificationJobData['type']): number {
  // Lower number = higher priority
  switch (type) {
    case 'issue_mentioned':
    case 'comment_mentioned':
      return 1;
    case 'issue_assigned':
      return 2;
    case 'issue_commented':
      return 3;
    case 'issue_status_changed':
      return 4;
    case 'issue_created':
    case 'issue_updated':
      return 5;
    case 'sprint_started':
    case 'sprint_completed':
      return 6;
    case 'watching_issue_updated':
    case 'watching_issue_commented':
    case 'watching_issue_status_changed':
      return 7;
    default:
      return 5;
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Close all queues and workers
 */
export async function closeAllQueues(): Promise<void> {
  console.log('[Queue] Closing all queues and workers...');
  
  // Close workers first
  for (const [name, worker] of workers) {
    await worker.close();
    console.log(`[Queue] Worker ${name} closed`);
  }
  workers.clear();
  
  // Close queue events
  for (const [name, events] of queueEvents) {
    await events.close();
  }
  queueEvents.clear();
  
  // Close queues
  for (const [name, queue] of queues) {
    await queue.close();
    console.log(`[Queue] Queue ${name} closed`);
  }
  queues.clear();
  
  console.log('[Queue] All queues closed');
}

// =============================================================================
// QUEUE STATS
// =============================================================================

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

/**
 * Get stats for all registered queues
 */
export async function getAllQueueStats(): Promise<QueueStats[]> {
  const stats: QueueStats[] = [];
  
  for (const [name, queue] of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    const isPaused = await queue.isPaused();
    
    stats.push({
      name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    });
  }
  
  return stats;
}

/**
 * Get stats for a specific queue
 */
export async function getQueueStats(name: QueueName): Promise<QueueStats> {
  const queue = getQueue(name);
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  const isPaused = await queue.isPaused();
  
  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
  };
}
