// =============================================================================
// BURNDOWN WORKER
// Records daily burndown data for active sprints
// =============================================================================

import { Worker, Queue } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '@/lib/redis';
import { db } from '@/db';
import { sprints } from '@/db/schema/sprints';
import { eq } from 'drizzle-orm';
import { container } from '@/lib/container';
import { logger, formatError } from '@/lib/logger';

const log = logger.burndown;

const QUEUE_NAME = 'burndown';
const JOB_NAME = 'record-burndown';

let burndownQueue: Queue | null = null;
let burndownWorker: Worker | null = null;

/**
 * Get or create the burndown queue
 */
function getBurndownQueue(): Queue {
  if (!burndownQueue) {
    const connection = getRedisConnection();
    if (!connection) {
      throw new Error('Redis connection not available');
    }
    burndownQueue = new Queue(QUEUE_NAME, { connection });
  }
  return burndownQueue;
}

/**
 * Record burndown data for all active sprints
 */
async function recordAllActiveBurndowns(): Promise<void> {
  console.log('[BurndownWorker] Recording burndown data for active sprints...');

  const sprintService = container.sprint;

  // Get all active sprints
  const activeSprints = await db.query.sprints.findMany({
    where: eq(sprints.status, 'active'),
    columns: { id: true, name: true },
  });

  console.log(
    `[BurndownWorker] Found ${activeSprints.length} active sprint(s)`,
  );

  for (const sprint of activeSprints) {
    try {
      await sprintService.recordBurndownData(sprint.id);
      console.log(
        `[BurndownWorker] Recorded burndown for sprint: ${sprint.name}`,
      );
    } catch (error) {
      console.error(
        `[BurndownWorker] Failed to record burndown for sprint ${sprint.name}:`,
        error,
      );
    }
  }

  console.log('[BurndownWorker] Burndown recording complete');
}

/**
 * Start the burndown worker
 * Sets up a repeating job that runs daily at midnight
 */
export async function startBurndownWorker(): Promise<void> {
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.warn(
      '[BurndownWorker] Redis not available, burndown worker disabled',
    );
    return;
  }

  const connection = getRedisConnection();
  if (!connection) {
    console.warn('[BurndownWorker] Redis connection not available');
    return;
  }

  const queue = getBurndownQueue();

  // Create worker to process jobs
  burndownWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === JOB_NAME) {
        await recordAllActiveBurndowns();
      }
    },
    { connection },
  );

  burndownWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Job completed');
  });

  burndownWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: formatError(err) }, 'Job failed');
  });

  // Schedule daily job at midnight (00:00)
  // Remove existing repeatable jobs first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === JOB_NAME) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  // Add new repeatable job - runs at midnight every day
  await queue.add(
    JOB_NAME,
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
      removeOnComplete: { count: 7 }, // Keep last 7 days of history
      removeOnFail: { count: 14 },
    },
  );

  console.log(
    '[BurndownWorker] Started - will record burndown daily at midnight',
  );

  // Also record immediately on startup if there are active sprints
  // This ensures we don't miss data if server was down during scheduled time
  try {
    await recordAllActiveBurndowns();
  } catch (error) {
    console.error('[BurndownWorker] Initial burndown recording failed:', error);
  }
}

/**
 * Stop the burndown worker
 */
export async function stopBurndownWorker(): Promise<void> {
  if (burndownWorker) {
    await burndownWorker.close();
    burndownWorker = null;
  }
  if (burndownQueue) {
    await burndownQueue.close();
    burndownQueue = null;
  }
}

/**
 * Manually trigger burndown recording (for testing or manual invocation)
 */
export async function triggerBurndownRecording(): Promise<void> {
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    // If Redis not available, run directly
    await recordAllActiveBurndowns();
    return;
  }

  const queue = getBurndownQueue();
  await queue.add(JOB_NAME, {}, { removeOnComplete: true });
}
