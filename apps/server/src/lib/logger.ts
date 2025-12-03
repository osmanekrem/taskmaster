/**
 * Structured Logger
 * 
 * Centralized logging using pino for:
 * - Structured JSON logging in production
 * - Pretty printing in development
 * - Child loggers for context-aware logging
 * - Request/Response logging middleware
 */

import pino from 'pino';
import { env } from '@/config/env';

// =============================================================================
// LOGGER CONFIGURATION
// =============================================================================

const isDevelopment = env.NODE_ENV === 'development';

/**
 * Create the base logger with appropriate configuration
 */
const baseLogger = pino({
  level: env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// =============================================================================
// CHILD LOGGERS
// =============================================================================

/**
 * Create a child logger with a specific component context
 */
export function createLogger(component: string) {
  return baseLogger.child({ component });
}

// Pre-created loggers for common components
export const logger = {
  // Core
  app: createLogger('app'),
  http: createLogger('http'),
  db: createLogger('db'),
  redis: createLogger('redis'),
  
  // Workers
  worker: createLogger('worker'),
  queue: createLogger('queue'),
  outbox: createLogger('outbox'),
  notification: createLogger('notification'),
  burndown: createLogger('burndown'),
  email: createLogger('email'),
  
  // Services
  auth: createLogger('auth'),
  issue: createLogger('issue'),
  project: createLogger('project'),
  sprint: createLogger('sprint'),
  workflow: createLogger('workflow'),
  automation: createLogger('automation'),
  webhook: createLogger('webhook'),
  
  // Infrastructure
  storage: createLogger('storage'),
  events: createLogger('events'),
  sse: createLogger('sse'),
};

// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================

export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(context: RequestLogContext) {
  return baseLogger.child({
    component: 'http',
    ...context,
  });
}

// =============================================================================
// ERROR LOGGING HELPER
// =============================================================================

/**
 * Format error for logging with stack trace in development
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const result: Record<string, unknown> = {
      message: error.message,
      name: error.name,
    };
    
    if (isDevelopment && error.stack) {
      result.stack = error.stack;
    }
    
    if (error.cause) {
      result.cause = formatError(error.cause);
    }
    
    return result;
  }
  return { error: String(error) };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { baseLogger };
export default logger;
