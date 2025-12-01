/**
 * Error Tracking Middleware
 *
 * Centralized error handling with structured logging,
 * error categorization, and optional external service integration.
 */

import { createMiddleware } from 'hono/factory';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { TRPCError } from '@trpc/server';
import { env } from '@/config/env';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'fatal';
  type: 'error';

  // Error details
  error: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };

  // Request context
  request: {
    method: string;
    path: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
  };

  // User context
  userId?: string;

  // Additional context
  context?: Record<string, unknown>;
}

export interface ErrorTrackingConfig {
  /** Custom error logger */
  logger?: (entry: ErrorLogEntry) => void | Promise<void>;
  /** Include stack traces */
  includeStackTraces?: boolean;
  /** Errors to ignore (by name or message pattern) */
  ignoreErrors?: (string | RegExp)[];
  /** Transform error before logging */
  transformError?: (error: Error) => Error;
  /** External error tracking service hook */
  onError?: (entry: ErrorLogEntry) => void | Promise<void>;
}

// =============================================================================
// ERROR CATEGORIZATION
// =============================================================================

interface CategorizedError {
  statusCode: number;
  code: string;
  message: string;
  isOperational: boolean; // Expected errors vs programming errors
}

function categorizeError(error: unknown): CategorizedError {
  // HTTP Exception (from Hono)
  if (error instanceof HTTPException) {
    return {
      statusCode: error.status,
      code: `HTTP_${error.status}`,
      message: error.message || 'HTTP Error',
      isOperational: true,
    };
  }

  // tRPC Error
  if (error instanceof TRPCError) {
    const statusMap: Record<string, number> = {
      PARSE_ERROR: 400,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_SUPPORTED: 405,
      TIMEOUT: 408,
      CONFLICT: 409,
      PRECONDITION_FAILED: 412,
      PAYLOAD_TOO_LARGE: 413,
      UNPROCESSABLE_CONTENT: 422,
      TOO_MANY_REQUESTS: 429,
      CLIENT_CLOSED_REQUEST: 499,
      INTERNAL_SERVER_ERROR: 500,
    };

    return {
      statusCode: statusMap[error.code] || 500,
      code: error.code,
      message: error.message,
      isOperational: error.code !== 'INTERNAL_SERVER_ERROR',
    };
  }

  // Application error with code
  if (error instanceof Error && 'code' in error) {
    const appError = error as Error & { code: string; statusCode?: number };
    return {
      statusCode: appError.statusCode || 500,
      code: appError.code,
      message: appError.message,
      isOperational: true,
    };
  }

  // Generic Error
  if (error instanceof Error) {
    // Check for common error types
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: error.message,
        isOperational: true,
      };
    }

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return {
        statusCode: 400,
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        isOperational: true,
      };
    }

    // Database errors
    if (
      error.message.includes('unique constraint') ||
      error.message.includes('duplicate key')
    ) {
      return {
        statusCode: 409,
        code: 'DUPLICATE_ERROR',
        message: 'Resource already exists',
        isOperational: true,
      };
    }

    if (
      error.message.includes('foreign key') ||
      error.message.includes('violates')
    ) {
      return {
        statusCode: 400,
        code: 'CONSTRAINT_ERROR',
        message: 'Database constraint violation',
        isOperational: true,
      };
    }
  }

  // Unknown error - treat as internal server error
  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message:
      env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : String(error),
    isOperational: false,
  };
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

const defaultLogger = (entry: ErrorLogEntry) => {
  console.error(JSON.stringify(entry));
};

function shouldIgnoreError(
  error: Error,
  ignorePatterns: (string | RegExp)[],
): boolean {
  for (const pattern of ignorePatterns) {
    if (typeof pattern === 'string') {
      if (error.name === pattern || error.message.includes(pattern)) {
        return true;
      }
    } else if (pattern.test(error.message) || pattern.test(error.name)) {
      return true;
    }
  }
  return false;
}

function getClientIP(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return c.req.header('x-real-ip') || 'unknown';
}

/**
 * Create error tracking middleware
 */
export function errorTracking(config: ErrorTrackingConfig = {}) {
  const {
    logger = defaultLogger,
    includeStackTraces = env.NODE_ENV !== 'production',
    ignoreErrors = [],
    transformError,
    onError,
  } = config;

  return createMiddleware(async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err) {
      let error = err instanceof Error ? err : new Error(String(err));

      // Transform error if configured
      if (transformError) {
        error = transformError(error);
      }

      // Check if error should be ignored
      if (shouldIgnoreError(error, ignoreErrors)) {
        throw err; // Re-throw without logging
      }

      // Categorize the error
      const categorized = categorizeError(error);

      // Get user context
      const session = c.get('session') as { user?: { id: string } } | undefined;
      const userId = session?.user?.id;

      // Get request ID if set by request logging middleware
      const requestId = c.get('requestId') as string | undefined;

      // Create log entry
      const entry: ErrorLogEntry = {
        timestamp: new Date().toISOString(),
        level: categorized.isOperational ? 'error' : 'fatal',
        type: 'error',
        error: {
          name: error.name,
          message: error.message,
          code: categorized.code,
          stack: includeStackTraces ? error.stack : undefined,
        },
        request: {
          method: c.req.method,
          path: c.req.path,
          userAgent: c.req.header('user-agent'),
          ip: getClientIP(c),
          requestId,
        },
        userId,
      };

      // Log the error
      await logger(entry);

      // Call external error tracking hook
      if (onError) {
        try {
          await onError(entry);
        } catch (hookError) {
          // Don't let hook errors break the response
          console.error('Error tracking hook failed:', hookError);
        }
      }

      // Return appropriate error response
      return c.json(
        {
          success: false,
          error: {
            code: categorized.code,
            message: categorized.message,
            ...(requestId && { requestId }),
          },
        },
        categorized.statusCode as any,
      );
    }
  });
}

/**
 * Global error handler for uncaught exceptions
 * Should be registered at process level
 */
export function setupGlobalErrorHandlers(
  onFatalError?: (error: Error, origin: string) => void,
) {
  process.on('uncaughtException', (error, origin) => {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        code: 'UNCAUGHT_EXCEPTION',
        stack: error.stack,
      },
      request: {
        method: 'N/A',
        path: 'N/A',
      },
      context: { origin },
    };

    console.error(JSON.stringify(entry));
    onFatalError?.(error, origin);
  });

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));

    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'fatal',
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        code: 'UNHANDLED_REJECTION',
        stack: error.stack,
      },
      request: {
        method: 'N/A',
        path: 'N/A',
      },
    };

    console.error(JSON.stringify(entry));
    onFatalError?.(error, 'unhandledRejection');
  });
}
