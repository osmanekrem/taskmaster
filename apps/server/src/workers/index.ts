// =============================================================================
// WORKERS INDEX
// Starts all background workers
// =============================================================================

import { startNotificationWorker } from './notification-worker';
import { startEmailWorker } from './email-worker';
import { startBurndownWorker } from './burndown-worker';
import { startWebhookWorker } from './webhook-worker';
import { scheduleOutboxJobs } from './outbox-worker';
import { dlqWorker } from './dlq-worker';
import { isRedisAvailable } from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const logger = createLogger('workers');

/**
 * Start all workers
 * Call this on server startup
 */
export async function startWorkers(): Promise<void> {
  // Check if Redis is available
  const redisAvailable = await isRedisAvailable();

  if (!redisAvailable) {
    logger.warn('Redis is not available, workers will not start');
    logger.warn('Notifications and emails will not be processed');
    return;
  }

  logger.info('Starting background workers...');

  // Start workers
  startNotificationWorker();
  startEmailWorker();
  await startBurndownWorker();
  startWebhookWorker();
  await scheduleOutboxJobs();
  dlqWorker.start();

  logger.info('All workers started');
}

/**
 * Stop all workers
 */
export function stopWorkers(): void {
  logger.info('Stopping background workers...');
  dlqWorker.stop();
  logger.info('Workers stopped');
}

/**
 * Check if workers can run (Redis is available)
 */
export async function canRunWorkers(): Promise<boolean> {
  return isRedisAvailable();
}

// Re-export worker starters for individual use
export { startNotificationWorker } from './notification-worker';
export { startEmailWorker } from './email-worker';
export {
  startBurndownWorker,
  triggerBurndownRecording,
} from './burndown-worker';
export { startWebhookWorker, triggerWebhooks } from './webhook-worker';
export { 
  scheduleOutboxJobs, 
  getOutboxStats, 
  triggerProcessing, 
  triggerRetry 
} from './outbox-worker';
export { dlqWorker } from './dlq-worker';
