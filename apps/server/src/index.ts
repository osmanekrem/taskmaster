import 'dotenv/config';
import { trpcServer } from '@hono/trpc-server';
import { createContext } from './lib/context';
import { appRouter } from './routers/index';
import { auth } from './lib/auth';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { honoErrorMiddleware } from '@osmanekrem/error-handler/hono';
import { env } from './config/env';
import { checkDatabaseHealth, closeDatabaseConnections } from './db';
import { closeRedisConnection, checkRedisHealth } from './lib/redis';
import {
  requestLogging,
  devRequestLogging,
  errorTracking,
  setupGlobalErrorHandlers,
  standardRateLimit,
  authRateLimit,
} from './lib/middleware';

// =============================================================================
// STRUCTURED LOGGING
// =============================================================================

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  [key: string]: unknown;
}

type LogInput = {
  level: LogEntry['level'];
  message: string;
} & Record<string, unknown>;

function structuredLog(entry: LogInput): void {
  const { level, message, ...rest } = entry;
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...rest,
  };

  if (env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const { level, message, timestamp, ...rest } = logEntry;
    const colorMap = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[90m',
    };
    const color = colorMap[level] || '';
    const reset = '\x1b[0m';
    console.log(
      `${color}[${level.toUpperCase()}]${reset} ${message}`,
      Object.keys(rest).length > 0 ? rest : '',
    );
  }
}

const logger = {
  info: (message: string, data?: Record<string, unknown>) =>
    structuredLog({ level: 'info', message, ...data }),
  warn: (message: string, data?: Record<string, unknown>) =>
    structuredLog({ level: 'warn', message, ...data }),
  error: (message: string, data?: Record<string, unknown>) =>
    structuredLog({ level: 'error', message, ...data }),
  debug: (message: string, data?: Record<string, unknown>) =>
    structuredLog({ level: 'debug', message, ...data }),
};

// =============================================================================
// GLOBAL ERROR HANDLERS
// =============================================================================

// Setup global uncaught exception and unhandled rejection handlers
setupGlobalErrorHandlers((error, origin) => {
  logger.error(`Fatal error from ${origin}`, {
    error: error.message,
    stack: error.stack,
  });
});

// =============================================================================
// APP SETUP
// =============================================================================

// Extend Hono context types
type Variables = {
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

// Error tracking middleware (must be first to catch all errors)
app.use(
  '*',
  errorTracking({
    includeStackTraces: env.NODE_ENV !== 'production',
    ignoreErrors: ['UNAUTHORIZED', 'NOT_FOUND', /^VALIDATION_/],
  }),
);

// Request logging middleware (using new structured middleware)
if (env.NODE_ENV === 'production') {
  app.use(
    '*',
    requestLogging({
      skipPaths: ['/health', '/ready'],
    }),
  );
} else {
  app.use('*', devRequestLogging());
}

app.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  honoErrorMiddleware({
    logErrors: true,
    includeStack: env.NODE_ENV === 'development',
    sanitizeContext: true,
  }) as any,
);
app.use(
  '/*',
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// =============================================================================
// HEALTH & READINESS ENDPOINTS
// =============================================================================

// Liveness probe - basic check if app is running
app.get('/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe - check if app can serve traffic (DB + Redis connected)
app.get('/ready', async (c: Context) => {
  const checks: Record<
    string,
    { status: 'ok' | 'error'; latency?: number; error?: string }
  > = {};
  let healthy = true;

  // Check database
  const dbStart = Date.now();
  try {
    const dbHealthy = await checkDatabaseHealth();
    checks.database = {
      status: dbHealthy ? 'ok' : 'error',
      latency: Date.now() - dbStart,
    };
    if (!dbHealthy) healthy = false;
  } catch (error) {
    checks.database = {
      status: 'error',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthy = false;
  }

  // Check Redis
  const redisStart = Date.now();
  try {
    const redisHealthy = await checkRedisHealth();
    checks.redis = {
      status: redisHealthy ? 'ok' : 'error',
      latency: Date.now() - redisStart,
    };
    if (!redisHealthy) healthy = false;
  } catch (error) {
    checks.redis = {
      status: 'error',
      latency: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthy = false;
  }

  const response = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  };

  return c.json(response, healthy ? 200 : 503);
});

// =============================================================================
// AUTH & TRPC ROUTES
// =============================================================================

// Rate limit auth endpoints to prevent brute force attacks
app.use('/api/auth/*', authRateLimit());

app.on(['POST', 'GET'], '/api/auth/**', (c: Context) =>
  auth.handler(c.req.raw),
);

// Rate limit tRPC endpoints
app.use('/trpc/*', standardRateLimit());

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts: unknown, context: Context) => {
      return createContext({ context });
    },
  }),
);

app.get('/', (c: Context) => {
  return c.text('OK');
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Give time for in-flight requests to complete
  const shutdownTimeout = 30000; // 30 seconds

  const shutdownPromise = (async () => {
    try {
      // Close database connections
      logger.info('Closing database connections...');
      await closeDatabaseConnections();

      // Close Redis connection
      logger.info('Closing Redis connection...');
      await closeRedisConnection();

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();

  // Force exit after timeout
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      resolve();
    }, shutdownTimeout);
  });

  await Promise.race([shutdownPromise, timeoutPromise]);
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});

// Note: unhandledRejection is now handled by setupGlobalErrorHandlers

// Startup log
logger.info('Server starting', {
  nodeEnv: env.NODE_ENV,
  corsOrigin: env.CORS_ORIGIN,
});

export default app;
