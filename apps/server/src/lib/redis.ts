// =============================================================================
// REDIS CONNECTION
// =============================================================================

import Redis, { type RedisOptions } from 'ioredis';
import { env } from '@/config/env';

/**
 * Get Redis connection options
 */
export function getRedisOptions(): RedisOptions {
  // If REDIS_URL is provided, parse it
  if (env.REDIS_URL) {
    return {
      lazyConnect: true,
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  }

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    lazyConnect: true,
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}

/**
 * Create a new Redis connection
 * Each BullMQ queue needs its own connection
 */
export function createRedisConnection(): Redis {
  if (env.REDIS_URL) {
    return new Redis(env.REDIS_URL, getRedisOptions());
  }
  return new Redis(getRedisOptions());
}

// Shared connection for general use (not for BullMQ)
let sharedConnection: Redis | null = null;

/**
 * Get shared Redis connection
 * Use this for caching, sessions, etc. - NOT for BullMQ
 */
export function getRedisConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = createRedisConnection();

    sharedConnection.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    sharedConnection.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    sharedConnection.on('ready', () => {
      console.log('[Redis] Ready to accept commands');
    });
  }

  return sharedConnection;
}

/**
 * Close shared Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    console.log('[Redis] Connection closed');
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Redis health - used for readiness probe
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}
