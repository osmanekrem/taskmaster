/**
 * Request Logging Middleware
 *
 * Structured logging for all HTTP requests with timing,
 * user context, and request/response details.
 */

import { createMiddleware } from 'hono/factory';
import type { Context, Next } from 'hono';
import { env } from '@/config/env';

// =============================================================================
// TYPES
// =============================================================================

export interface RequestLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  type: 'request';

  // Request info
  method: string;
  path: string;
  query?: Record<string, string>;
  userAgent?: string;
  ip?: string;

  // Response info
  status: number;
  duration: number; // milliseconds

  // User context (if authenticated)
  userId?: string;

  // Request ID for correlation
  requestId: string;

  // Error info (if any)
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
}

export interface RequestLoggingConfig {
  /** Skip logging for certain paths (e.g., health checks) */
  skipPaths?: string[];
  /** Log request body for certain paths */
  logBodyPaths?: string[];
  /** Custom logger function (default: console.log JSON) */
  logger?: (entry: RequestLogEntry) => void;
  /** Include query parameters in log */
  includeQuery?: boolean;
  /** Include stack traces in error logs */
  includeStackTraces?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function getClientIP(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return c.req.header('x-real-ip') || 'unknown';
}

function parseQueryParams(url: string): Record<string, string> | undefined {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      // Mask sensitive params
      if (
        ['password', 'token', 'key', 'secret', 'apikey'].includes(
          key.toLowerCase(),
        )
      ) {
        params[key] = '[REDACTED]';
      } else {
        params[key] = value;
      }
    });
    return Object.keys(params).length > 0 ? params : undefined;
  } catch {
    return undefined;
  }
}

function getLogLevel(status: number): 'info' | 'warn' | 'error' {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

const defaultLogger = (entry: RequestLogEntry) => {
  // Use structured JSON logging
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
};

/**
 * Create request logging middleware
 */
export function requestLogging(config: RequestLoggingConfig = {}) {
  const {
    skipPaths = ['/health', '/ready', '/favicon.ico'],
    logger = defaultLogger,
    includeQuery = true,
    includeStackTraces = env.NODE_ENV !== 'production',
  } = config;

  return createMiddleware(async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip logging for certain paths
    if (skipPaths.some((p) => path.startsWith(p))) {
      return next();
    }

    const requestId = generateRequestId();
    const startTime = performance.now();

    // Set request ID header for correlation
    c.header('X-Request-ID', requestId);

    // Store request ID in context for use in other middleware/handlers
    c.set('requestId', requestId);

    let error: { code?: string; message: string; stack?: string } | undefined;

    try {
      await next();
    } catch (err) {
      // Capture error for logging
      if (err instanceof Error) {
        error = {
          message: err.message,
          stack: includeStackTraces ? err.stack : undefined,
        };
        if ('code' in err) {
          error.code = String((err as any).code);
        }
      } else {
        error = { message: String(err) };
      }
      throw err;
    } finally {
      const duration = Math.round(performance.now() - startTime);
      const status = c.res.status;

      // Get user ID if authenticated
      const session = c.get('session') as { user?: { id: string } } | undefined;
      const userId = session?.user?.id;

      const entry: RequestLogEntry = {
        timestamp: new Date().toISOString(),
        level: error ? 'error' : getLogLevel(status),
        type: 'request',
        method: c.req.method,
        path,
        query: includeQuery ? parseQueryParams(c.req.url) : undefined,
        userAgent: c.req.header('user-agent'),
        ip: getClientIP(c),
        status,
        duration,
        userId,
        requestId,
        error,
      };

      // Log the request
      logger(entry);
    }
  });
}

/**
 * Development-friendly colorized logging
 */
export function devRequestLogging() {
  return createMiddleware(async (c: Context, next: Next) => {
    const startTime = performance.now();

    await next();

    const duration = Math.round(performance.now() - startTime);
    const status = c.res.status;

    // Color codes for terminal
    const colors = {
      reset: '\x1b[0m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      dim: '\x1b[2m',
    };

    let statusColor = colors.green;
    if (status >= 400) statusColor = colors.yellow;
    if (status >= 500) statusColor = colors.red;

    const methodPad = c.req.method.padEnd(7);
    const pathPad = c.req.path.substring(0, 50).padEnd(50);

    console.log(
      `${colors.cyan}${methodPad}${colors.reset} ${pathPad} ${statusColor}${status}${colors.reset} ${colors.dim}${duration}ms${colors.reset}`,
    );
  });
}
