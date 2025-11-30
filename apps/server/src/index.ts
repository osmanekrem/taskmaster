import 'dotenv/config';
import { trpcServer } from '@hono/trpc-server';
import { createContext } from './lib/context';
import { appRouter } from './routers/index';
import { auth } from './lib/auth';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { honoErrorMiddleware } from '@osmanekrem/error-handler/hono';
import { env } from './config/env';

const app = new Hono();

app.use(logger());
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

app.on(['POST', 'GET'], '/api/auth/**', (c: Context) => auth.handler(c.req.raw));

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

export default app;
