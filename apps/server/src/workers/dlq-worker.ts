// =============================================================================
// DEAD LETTER QUEUE WORKER
// =============================================================================
// This worker periodically processes pending DLQ entries and retries them
// with exponential backoff.

import { processPendingDLQRetries, cleanupDLQ, getDLQStats } from '@/lib/queue';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dlq-worker');

let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

// Processing interval in milliseconds (default: 5 minutes)
const PROCESS_INTERVAL_MS = 5 * 60 * 1000;

// Cleanup interval in milliseconds (default: 24 hours)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

// How old entries should be before cleanup (in days)
const CLEANUP_OLDER_THAN_DAYS = 30;

/**
 * Process DLQ entries that are ready for retry
 */
async function processDLQ(): Promise<void> {
  if (!isRunning) return;
  
  try {
    const results = await processPendingDLQRetries();
    
    if (results.length > 0) {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      logger.info(
        { processed: results.length, succeeded: successCount, failed: failCount },
        'DLQ processing cycle complete'
      );
    }
  } catch (error) {
    logger.error({ error }, 'Error processing DLQ');
  }
}

/**
 * Cleanup old DLQ entries periodically
 */
async function cleanupOldEntries(): Promise<void> {
  if (!isRunning) return;
  
  try {
    const deleted = await cleanupDLQ(CLEANUP_OLDER_THAN_DAYS);
    
    if (deleted > 0) {
      logger.info(
        { deleted, olderThanDays: CLEANUP_OLDER_THAN_DAYS },
        'DLQ cleanup complete'
      );
    }
  } catch (error) {
    logger.error({ error }, 'Error cleaning up DLQ');
  }
}

/**
 * Log DLQ stats for monitoring
 */
async function logStats(): Promise<void> {
  try {
    const stats = await getDLQStats();
    
    if (stats.pending > 0 || stats.ignored > 0) {
      logger.info(
        { pending: stats.pending, retried: stats.retried, resolved: stats.resolved, ignored: stats.ignored },
        'DLQ stats'
      );
    }
  } catch (error) {
    logger.error({ error }, 'Error getting DLQ stats');
  }
}

/**
 * Start the DLQ worker
 */
export function startDLQWorker(): void {
  if (isRunning) {
    logger.warn('DLQ worker is already running');
    return;
  }
  
  isRunning = true;
  logger.info(
    { processIntervalMs: PROCESS_INTERVAL_MS, cleanupIntervalMs: CLEANUP_INTERVAL_MS },
    'Starting DLQ worker'
  );
  
  // Initial run
  processDLQ();
  logStats();
  
  // Schedule periodic processing
  intervalId = setInterval(async () => {
    await processDLQ();
    await logStats();
  }, PROCESS_INTERVAL_MS);
  
  // Schedule cleanup (less frequent)
  setInterval(cleanupOldEntries, CLEANUP_INTERVAL_MS);
}

/**
 * Stop the DLQ worker
 */
export function stopDLQWorker(): void {
  if (!isRunning) {
    logger.warn('DLQ worker is not running');
    return;
  }
  
  isRunning = false;
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  logger.info('DLQ worker stopped');
}

/**
 * Check if DLQ worker is running
 */
export function isDLQWorkerRunning(): boolean {
  return isRunning;
}

// Export for use in main server startup
export const dlqWorker = {
  start: startDLQWorker,
  stop: stopDLQWorker,
  isRunning: isDLQWorkerRunning,
  process: processDLQ,
  cleanup: cleanupOldEntries,
  getStats: logStats,
};
