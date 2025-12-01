import { t } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import type { Permission } from '@/db/schema/permissions';
import { getContainer } from '@/lib/context';
import { db } from '@/db';
import { issues } from '@/db/schema/issues';
import { issueComments } from '@/db/schema/comments';
import { issueAttachments } from '@/db/schema/comments';
import { eq } from 'drizzle-orm';

/**
 * Permission middleware factory
 * Creates a middleware that checks if the user has the required permission
 */
export const requirePermission = (
  permission: Permission,
  getProjectId?: (input: unknown) => string | undefined,
) => {
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
      projectId,
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
export const requireAnyPermission = (
  permissions: Permission[],
  getProjectId?: (input: unknown) => string | undefined,
) => {
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
      projectId,
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
 * Ownership check types
 */
export type OwnershipType = 'issue' | 'comment' | 'attachment';

/**
 * Check if user is owner of an entity
 */
async function checkOwnership(
  entityType: OwnershipType,
  entityId: string,
  userId: string,
): Promise<{ isOwner: boolean; projectId?: string }> {
  switch (entityType) {
    case 'issue': {
      const issue = await db.query.issues.findFirst({
        where: eq(issues.id, entityId),
        columns: { reporterId: true, assigneeId: true, projectId: true },
      });
      if (!issue) return { isOwner: false };
      // Issue owner = reporter or assignee
      return {
        isOwner: issue.reporterId === userId || issue.assigneeId === userId,
        projectId: issue.projectId,
      };
    }
    case 'comment': {
      const comment = await db.query.issueComments.findFirst({
        where: eq(issueComments.id, entityId),
        columns: { authorId: true },
        with: {
          issue: {
            columns: { projectId: true },
          },
        },
      });
      if (!comment) return { isOwner: false };
      return {
        isOwner: comment.authorId === userId,
        projectId: comment.issue?.projectId,
      };
    }
    case 'attachment': {
      const attachment = await db.query.issueAttachments.findFirst({
        where: eq(issueAttachments.id, entityId),
        columns: { uploaderId: true },
        with: {
          issue: {
            columns: { projectId: true },
          },
        },
      });
      if (!attachment) return { isOwner: false };
      return {
        isOwner: attachment.uploaderId === userId,
        projectId: attachment.issue?.projectId,
      };
    }
    default:
      return { isOwner: false };
  }
}

/**
 * Ownership-aware permission middleware
 *
 * Checks:
 * 1. If user has the "full" permission (e.g., issue:edit), allow
 * 2. If user has the "own" permission (e.g., issue:edit_own), check ownership
 *
 * @param fullPermission - The permission that allows any entity (e.g., 'issue:edit')
 * @param ownPermission - The permission that allows only owned entities (e.g., 'issue:edit_own')
 * @param entityType - The type of entity to check ownership for
 * @param getEntityId - Function to extract entity ID from input
 */
export const requireOwnershipPermission = (
  fullPermission: Permission,
  ownPermission: Permission,
  entityType: OwnershipType,
  getEntityId: (input: unknown) => string | undefined,
) => {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const container = getContainer();
    const userId = ctx.session.user.id;
    const entityId = getEntityId(input);

    if (!entityId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Entity ID is required',
      });
    }

    // Get ownership info (includes projectId for scoped permission check)
    const { isOwner, projectId } = await checkOwnership(
      entityType,
      entityId,
      userId,
    );

    // Check if user has the full permission (can edit/delete any)
    const hasFullPermission = await container.permission.hasPermission(
      userId,
      fullPermission,
      projectId,
    );

    if (hasFullPermission) {
      return next({ ctx });
    }

    // Check if user has the "own" permission
    const hasOwnPermission = await container.permission.hasPermission(
      userId,
      ownPermission,
      projectId,
    );

    if (!hasOwnPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Permission denied: requires ${fullPermission} or ${ownPermission}`,
      });
    }

    // User has "own" permission, check ownership
    if (!isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You can only ${
          fullPermission.split(':')[1]
        } your own ${entityType}`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Project access middleware - checks if user has access to the project
 */
export const requireProjectAccess = (
  getProjectId: (input: unknown) => string | undefined,
) => {
  return t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const projectId = getProjectId(input);

    if (!projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Project ID is required',
      });
    }

    const container = getContainer();

    const hasAccess = await container.permission.hasProjectAccess(
      ctx.session.user.id,
      projectId,
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
  fromProjectId: (input: unknown) =>
    (input as { projectId?: string })?.projectId,
  fromId: (input: unknown) => (input as { id?: string })?.id,
  fromInput: (input: unknown) =>
    (input as { projectId?: string; id?: string })?.projectId ??
    (input as { id?: string })?.id,
};

/**
 * Helper for extracting entity IDs from various input shapes
 */
export const extractEntityId = {
  fromId: (input: unknown) => (input as { id?: string })?.id,
  fromIssueId: (input: unknown) => (input as { issueId?: string })?.issueId,
  fromCommentId: (input: unknown) =>
    (input as { commentId?: string })?.commentId,
};
