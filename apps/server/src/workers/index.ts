// =============================================================================
// WORKERS INDEX
// Starts all background workers
// =============================================================================

import { startNotificationWorker } from './notification-worker';
import { startEmailWorker } from './email-worker';
import { startBurndownWorker } from './burndown-worker';
import { startWebhookWorker } from './webhook-worker';
import { isRedisAvailable } from '@/lib/redis';

/**
 * Start all workers
 * Call this on server startup
 */
export async function startWorkers(): Promise<void> {
  // Check if Redis is available
  const redisAvailable = await isRedisAvailable();

  if (!redisAvailable) {
    console.warn('[Workers] Redis is not available, workers will not start');
    console.warn('[Workers] Notifications and emails will not be processed');
    return;
  }

  console.log('[Workers] Starting background workers...');

  // Start workers
  startNotificationWorker();
  startEmailWorker();
  await startBurndownWorker();
  startWebhookWorker();

  console.log('[Workers] All workers started');
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
