import { t } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import type { Permission } from '@/db/schema/permissions';
import { getContainer } from '@/lib/context';

/**
 * Permission middleware factory
 * Creates a middleware that checks if the user has the required permission
 */
export const requirePermission = (permission: Permission, getProjectId?: (input: unknown) => string | undefined) => {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const container = getContainer();
    const projectId = getProjectId ? getProjectId(input) : undefined;

    const hasPermission = await container.permission.hasPermission(
      ctx.session.user.id,
      permission,
      projectId
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Permission middleware that checks for any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[], getProjectId?: (input: unknown) => string | undefined) => {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const container = getContainer();
    const projectId = getProjectId ? getProjectId(input) : undefined;

    const hasAny = await container.permission.hasAnyPermission(
      ctx.session.user.id,
      permissions,
      projectId
    );

    if (!hasAny) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: requires one of ${permissions.join(', ')}`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Project access middleware - checks if user has access to the project
 */
export const requireProjectAccess = (getProjectId: (input: unknown) => string) => {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const container = getContainer();
    const projectId = getProjectId(input);

    const hasAccess = await container.permission.hasProjectAccess(
      ctx.session.user.id,
      projectId
    );

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      });
    }

    return next({ ctx });
  });
};

/**
 * Helper type for extracting projectId from various input shapes
 */
export const extractProjectId = {
  fromProjectId: (input: unknown) => (input as { projectId?: string })?.projectId,
  fromId: (input: unknown) => (input as { id?: string })?.id,
  fromInput: (input: unknown) => (input as { projectId?: string; id?: string })?.projectId ?? (input as { id?: string })?.id,
};
