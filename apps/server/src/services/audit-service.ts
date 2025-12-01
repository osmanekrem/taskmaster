/**
 * Audit Service
 *
 * Provides business logic for audit logging and compliance.
 */

import { auditRepository } from '@/repositories/audit-repository';
import type {
  AuditLogFilters,
  AuditLogPagination,
} from '@/repositories/audit-repository';
import {
  type AuditLog,
  type AuditLogInput,
  type AuditCategory,
  type AuditAction,
  type AuditEntityType,
  maskSensitiveFields,
  AUDIT_RETENTION_DAYS,
} from '@/db/schema/audit';
import { throwNotFoundError } from '@/lib/errors';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  requestPath?: string;
  requestMethod?: string;
}

// =============================================================================
// AUDIT SERVICE
// =============================================================================

export class AuditService {
  // ---------------------------------------------------------------------------
  // LOGGING
  // ---------------------------------------------------------------------------

  /**
   * Log an audit event
   */
  async log(
    input: AuditLogInput,
    context: AuditContext = {},
  ): Promise<AuditLog> {
    // Mask sensitive fields
    const maskedOldValues = maskSensitiveFields(input.oldValues ?? null);
    const maskedNewValues = maskSensitiveFields(input.newValues ?? null);

    return await auditRepository().create({
      category: input.category,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      userId: context.userId,
      userName: context.userName,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      oldValues: maskedOldValues,
      newValues: maskedNewValues,
      metadata: {
        requestId: context.requestId,
        requestPath: context.requestPath,
        requestMethod: context.requestMethod,
        ...input.metadata,
      },
      result: input.result ?? 'success',
      errorMessage: input.errorMessage,
      durationMs: input.durationMs?.toString(),
    });
  }

  /**
   * Log multiple audit events in batch
   */
  async logBatch(
    inputs: AuditLogInput[],
    context: AuditContext = {},
  ): Promise<AuditLog[]> {
    const entries = inputs.map((input) => ({
      category: input.category,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      userId: context.userId,
      userName: context.userName,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      oldValues: maskSensitiveFields(input.oldValues ?? null),
      newValues: maskSensitiveFields(input.newValues ?? null),
      metadata: {
        requestId: context.requestId,
        requestPath: context.requestPath,
        requestMethod: context.requestMethod,
        ...input.metadata,
      },
      result: input.result ?? 'success',
      errorMessage: input.errorMessage,
      durationMs: input.durationMs?.toString(),
    }));

    return await auditRepository().createMany(entries);
  }

  // ---------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // ---------------------------------------------------------------------------

  /**
   * Log a successful login
   */
  async logLogin(
    userId: string,
    userName: string,
    userEmail: string,
    context: Omit<AuditContext, 'userId' | 'userName' | 'userEmail'>,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'authentication',
        action: 'auth:login',
        entityType: 'session',
        description: `User ${userName} logged in`,
      },
      { userId, userName, userEmail, ...context },
    );
  }

  /**
   * Log a failed login attempt
   */
  async logFailedLogin(
    email: string,
    reason: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'security',
        action: 'auth:login_failed',
        entityType: 'session',
        description: `Failed login attempt for ${email}: ${reason}`,
        result: 'failure',
        errorMessage: reason,
        metadata: { attemptedEmail: email },
      },
      context,
    );
  }

  /**
   * Log a logout
   */
  async logLogout(context: AuditContext): Promise<AuditLog> {
    return this.log(
      {
        category: 'authentication',
        action: 'auth:logout',
        entityType: 'session',
        description: `User ${context.userName} logged out`,
      },
      context,
    );
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: AuditEntityType,
    entityId: string,
    newValues: Record<string, unknown>,
    context: AuditContext,
    description?: string,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'data_modification',
        action: 'create',
        entityType,
        entityId,
        description: description ?? `Created ${entityType} ${entityId}`,
        newValues,
      },
      context,
    );
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: AuditEntityType,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context: AuditContext,
    description?: string,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'data_modification',
        action: 'update',
        entityType,
        entityId,
        description: description ?? `Updated ${entityType} ${entityId}`,
        oldValues,
        newValues,
      },
      context,
    );
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: AuditEntityType,
    entityId: string,
    oldValues: Record<string, unknown>,
    context: AuditContext,
    description?: string,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'data_modification',
        action: 'delete',
        entityType,
        entityId,
        description: description ?? `Deleted ${entityType} ${entityId}`,
        oldValues,
      },
      context,
    );
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    action: 'permission:grant' | 'permission:revoke',
    targetUserId: string,
    permission: string,
    context: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'authorization',
        action,
        entityType: 'role_member',
        entityId: targetUserId,
        description: `${
          action === 'permission:grant' ? 'Granted' : 'Revoked'
        } ${permission} for user ${targetUserId}`,
        metadata: { permission, targetUserId, ...metadata },
      },
      context,
    );
  }

  /**
   * Log configuration change
   */
  async logConfigChange(
    entityType: AuditEntityType,
    entityId: string,
    oldConfig: Record<string, unknown>,
    newConfig: Record<string, unknown>,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'configuration',
        action: 'update',
        entityType,
        entityId,
        description: `Updated ${entityType} configuration`,
        oldValues: oldConfig,
        newValues: newConfig,
      },
      context,
    );
  }

  /**
   * Log data export
   */
  async logExport(
    entityType: AuditEntityType,
    filters: Record<string, unknown>,
    recordCount: number,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'data_access',
        action: 'export',
        entityType,
        description: `Exported ${recordCount} ${entityType} records`,
        metadata: { filters, recordCount },
      },
      context,
    );
  }

  /**
   * Log sensitive data access
   */
  async logDataAccess(
    entityType: AuditEntityType,
    entityId: string,
    accessedFields: string[],
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.log(
      {
        category: 'data_access',
        action: 'view',
        entityType,
        entityId,
        description: `Accessed sensitive data in ${entityType} ${entityId}`,
        metadata: { accessedFields },
      },
      context,
    );
  }

  // ---------------------------------------------------------------------------
  // QUERY METHODS
  // ---------------------------------------------------------------------------

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog> {
    const log = await auditRepository().findById(id);
    if (!log) {
      throwNotFoundError('NOT_FOUND', { resource: 'audit_log', id });
    }
    return log;
  }

  /**
   * Search audit logs
   */
  async search(
    filters: AuditLogFilters,
    pagination: AuditLogPagination,
  ): Promise<{ data: AuditLog[]; total: number }> {
    return auditRepository().findMany(filters, pagination);
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> {
    return auditRepository().findByEntity(entityType, entityId, pagination);
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> {
    return auditRepository().findByUser(userId, pagination);
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId: string, limit?: number): Promise<AuditLog[]> {
    return auditRepository().getLoginHistory(userId, limit);
  }

  /**
   * Get failed login attempts (security monitoring)
   */
  async getFailedLoginAttempts(
    since: Date,
    ipAddress?: string,
  ): Promise<AuditLog[]> {
    return auditRepository().getFailedLoginAttempts(since, ipAddress);
  }

  /**
   * Get activity from a specific IP address
   */
  async getIpActivity(
    ipAddress: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> {
    return auditRepository().findByIpAddress(ipAddress, pagination);
  }

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get audit statistics for a date range
   */
  async getStats(startDate: Date, endDate: Date) {
    return auditRepository().getStats(startDate, endDate);
  }

  // ---------------------------------------------------------------------------
  // RETENTION
  // ---------------------------------------------------------------------------

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(): Promise<{
    deleted: number;
    byCategory: Record<string, number>;
  }> {
    const results: Record<string, number> = {};
    let totalDeleted = 0;

    for (const [category, days] of Object.entries(AUDIT_RETENTION_DAYS)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const deleted = await auditRepository().deleteOlderThan(
        cutoffDate,
        category as AuditCategory,
      );

      results[category] = deleted;
      totalDeleted += deleted;
    }

    return { deleted: totalDeleted, byCategory: results };
  }

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  /**
   * Export audit logs
   */
  async exportLogs(
    filters: AuditLogFilters,
    limit?: number,
  ): Promise<AuditLog[]> {
    return auditRepository().exportLogs(filters, limit);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const auditService = new AuditService();

// =============================================================================
// AUDIT CONTEXT EXTRACTOR
// =============================================================================

/**
 * Extract audit context from request/context
 */
export function extractAuditContext(ctx: {
  session?: {
    user: { id: string; name: string; email: string };
    session: { id: string };
  } | null;
  req?: {
    headers: Record<string, string | string[] | undefined>;
    ip?: string;
  };
  requestId?: string;
}): AuditContext {
  const user = ctx.session?.user;
  const headers = ctx.req?.headers ?? {};

  // Get IP address (consider X-Forwarded-For for proxied requests)
  const forwardedFor = headers['x-forwarded-for'];
  const ipAddress =
    (typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : forwardedFor?.[0]) ??
    ctx.req?.ip ??
    undefined;

  // Get user agent
  const userAgent =
    typeof headers['user-agent'] === 'string'
      ? headers['user-agent']
      : headers['user-agent']?.[0];

  return {
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    sessionId: ctx.session?.session?.id,
    ipAddress,
    userAgent,
    requestId: ctx.requestId,
  };
}
