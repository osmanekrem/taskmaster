/**
 * Rate Limiting Middleware
 *
 * Token bucket algorithm implementation using Redis for distributed rate limiting.
 * Falls back to in-memory rate limiting if Redis is unavailable.
 */

import { createMiddleware } from 'hono/factory';
import type { Context, Next } from 'hono';
import { getRedisConnection } from '@/lib/redis';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitConfig {
  /** Maximum number of requests in the time window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Optional prefix for Redis keys */
  keyPrefix?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (c: Context) => boolean;
  /** Custom key generator (default: IP address) */
  keyGenerator?: (c: Context) => string;
  /** Handler when rate limit is exceeded */
  onRateLimitExceeded?: (
    c: Context,
    info: RateLimitInfo,
  ) => Response | Promise<Response>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  retryAfter: number; // Seconds until rate limit resets
}

// =============================================================================
// IN-MEMORY FALLBACK STORE
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60_000);

// =============================================================================
// RATE LIMIT IMPLEMENTATION
// =============================================================================

async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitInfo> {
  const now = Math.floor(Date.now() / 1000);
  const redis = getRedisConnection();

  const multi = redis.multi();

  // Increment counter and set expiry atomically
  multi.incr(key);
  multi.expire(key, config.windowSeconds);
  multi.ttl(key);

  const results = await multi.exec();

  if (!results) {
    throw new Error('Redis transaction failed');
  }

  const count = results[0][1] as number;
  const ttl = results[2][1] as number;

  const remaining = Math.max(0, config.limit - count);
  const reset = now + (ttl > 0 ? ttl : config.windowSeconds);
  const retryAfter = count > config.limit ? ttl : 0;

  return {
    limit: config.limit,
    remaining,
    reset,
    retryAfter,
  };
}

function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitInfo {
  const now = Date.now();
  let entry = memoryStore.get(key);

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    };
    memoryStore.set(key, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, config.limit - entry.count);
  const reset = Math.floor(entry.resetAt / 1000);
  const retryAfter =
    entry.count > config.limit ? Math.ceil((entry.resetAt - now) / 1000) : 0;

  return {
    limit: config.limit,
    remaining,
    reset,
    retryAfter,
  };
}

// =============================================================================
// MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    limit,
    windowSeconds,
    keyPrefix = 'rl',
    skip,
    keyGenerator = (c) => {
      // Use X-Forwarded-For if behind proxy, fallback to remote address
      const forwarded = c.req.header('x-forwarded-for');
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
      return c.req.header('x-real-ip') || 'unknown';
    },
    onRateLimitExceeded,
  } = config;

  return createMiddleware(async (c: Context, next: Next) => {
    // Check if we should skip rate limiting
    if (skip?.(c)) {
      return next();
    }

    const identifier = keyGenerator(c);
    const key = `${keyPrefix}:${identifier}`;

    let info: RateLimitInfo;

    try {
      // Try Redis first
      info = await checkRateLimitRedis(key, { limit, windowSeconds });
    } catch (error) {
      // Fallback to memory
      console.warn('[RateLimit] Redis unavailable, using memory store');
      info = checkRateLimitMemory(key, { limit, windowSeconds });
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', info.limit.toString());
    c.header('X-RateLimit-Remaining', info.remaining.toString());
    c.header('X-RateLimit-Reset', info.reset.toString());

    // Check if rate limit exceeded
    if (info.remaining < 0) {
      c.header('Retry-After', info.retryAfter.toString());

      if (onRateLimitExceeded) {
        return onRateLimitExceeded(c, info);
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            retryAfter: info.retryAfter,
          },
        },
        429,
      );
    }

    return next();
  });
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/**
 * Standard API rate limit: 100 requests per minute
 */
export const standardRateLimit = () =>
  rateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'rl:standard',
  });

/**
 * Strict API rate limit: 20 requests per minute (for sensitive operations)
 */
export const strictRateLimit = () =>
  rateLimit({
    limit: 20,
    windowSeconds: 60,
    keyPrefix: 'rl:strict',
  });

/**
 * Auth rate limit: 5 requests per minute (for login/register)
 */
export const authRateLimit = () =>
  rateLimit({
    limit: 5,
    windowSeconds: 60,
    keyPrefix: 'rl:auth',
  });

/**
 * Upload rate limit: 10 requests per minute
 */
export const uploadRateLimit = () =>
  rateLimit({
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'rl:upload',
  });
