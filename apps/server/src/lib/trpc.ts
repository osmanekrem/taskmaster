import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { z, ZodError } from 'zod';
import { errorResponse } from '@/utils/response';
import { toTRPCError } from '@/lib/errors';
import { USER_ROLES } from '@/lib/constants';
import { createHonoError } from '@osmanekrem/error-handler/hono';

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const trpcError = toTRPCError(error);

    return {
      ...errorResponse(
        trpcError.message,
        trpcError.code,
        trpcError.cause instanceof ZodError
          ? z.treeifyError(trpcError.cause)
          : trpcError.cause ?? undefined,
      ),
    };
  },
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw createHonoError('UNAUTHORIZED', 'Authentication required', 401, {
      reason: 'No session',
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const adminProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    // Admin kontrolü
    if (ctx.session?.user.role !== USER_ROLES.USER_MANAGEMENT) {
      throw createHonoError(
        'FORBIDDEN',
        'Bu işlem için user-management yetkisi gerekiyor',
        403,
      );
    }

    return next({ ctx });
  }),
);
