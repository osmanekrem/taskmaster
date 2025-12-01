import {
  auditLogs,
  type AuditLog,
  type NewAuditLog,
  type AuditAction,
  type AuditEntityType,
  type AuditCategory,
} from '@/db/schema/audit';
import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, or, ilike, inArray } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

// =============================================================================
// AUDIT REPOSITORY
// =============================================================================

export interface AuditLogFilters {
  userId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure' | 'partial';
  search?: string;
}

export interface AuditLogPagination {
  limit: number;
  offset: number;
}

export const auditRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create an audit log entry
   */
  create: async (data: NewAuditLog): Promise<AuditLog> => {
    const [result] = await drizzle.insert(auditLogs).values(data).returning();
    return result;
  },

  /**
   * Batch create audit log entries
   */
  createMany: async (data: NewAuditLog[]): Promise<AuditLog[]> => {
    if (data.length === 0) return [];
    const result = await drizzle.insert(auditLogs).values(data).returning();
    return result;
  },

  /**
   * Find audit log by ID
   */
  findById: async (id: string): Promise<AuditLog | null> => {
    const result = await drizzle.query.auditLogs.findFirst({
      where: eq(auditLogs.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return result ?? null;
  },

  /**
   * Find audit logs with filters and pagination
   */
  findMany: async (
    filters: AuditLogFilters = {},
    pagination: AuditLogPagination = { limit: 50, offset: 0 },
  ): Promise<{ data: AuditLog[]; total: number }> => {
    const conditions = buildConditions(filters);

    // Get total count
    const [{ count }] = await drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get data
    const data = await drizzle.query.auditLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit: pagination.limit,
      offset: pagination.offset,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return { data, total: count };
  },

  /**
   * Find logs for a specific entity
   */
  findByEntity: async (
    entityType: AuditEntityType,
    entityId: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> => {
    return drizzle.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId),
      ),
      orderBy: [desc(auditLogs.createdAt)],
      limit: pagination?.limit ?? 100,
      offset: pagination?.offset ?? 0,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Find logs for a specific user
   */
  findByUser: async (
    userId: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> => {
    return drizzle.query.auditLogs.findMany({
      where: eq(auditLogs.userId, userId),
      orderBy: [desc(auditLogs.createdAt)],
      limit: pagination?.limit ?? 100,
      offset: pagination?.offset ?? 0,
    });
  },

  /**
   * Find logs by IP address (security analysis)
   */
  findByIpAddress: async (
    ipAddress: string,
    pagination?: AuditLogPagination,
  ): Promise<AuditLog[]> => {
    return drizzle.query.auditLogs.findMany({
      where: eq(auditLogs.ipAddress, ipAddress),
      orderBy: [desc(auditLogs.createdAt)],
      limit: pagination?.limit ?? 100,
      offset: pagination?.offset ?? 0,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get login history for a user
   */
  getLoginHistory: async (userId: string, limit = 20): Promise<AuditLog[]> => {
    return drizzle.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.userId, userId),
        inArray(auditLogs.action, [
          'auth:login',
          'auth:logout',
          'auth:login_failed',
        ]),
      ),
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
  },

  /**
   * Get failed login attempts (security monitoring)
   */
  getFailedLoginAttempts: async (
    since: Date,
    ipAddress?: string,
  ): Promise<AuditLog[]> => {
    const conditions = [
      eq(auditLogs.action, 'auth:login_failed'),
      gte(auditLogs.createdAt, since),
    ];

    if (ipAddress) {
      conditions.push(eq(auditLogs.ipAddress, ipAddress));
    }

    return drizzle.query.auditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(auditLogs.createdAt)],
      limit: 1000,
    });
  },

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get audit log statistics
   */
  getStats: async (
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalLogs: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
    byResult: Record<string, number>;
  }> => {
    const [totalResult] = await drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate),
        ),
      );

    const categoryStats = await drizzle
      .select({
        category: auditLogs.category,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate),
        ),
      )
      .groupBy(auditLogs.category);

    const actionStats = await drizzle
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate),
        ),
      )
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const resultStats = await drizzle
      .select({
        result: auditLogs.result,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, startDate),
          lte(auditLogs.createdAt, endDate),
        ),
      )
      .groupBy(auditLogs.result);

    return {
      totalLogs: totalResult.count,
      byCategory: Object.fromEntries(
        categoryStats.map((s) => [s.category, s.count]),
      ),
      byAction: Object.fromEntries(actionStats.map((s) => [s.action, s.count])),
      byResult: Object.fromEntries(
        resultStats.map((s) => [s.result ?? 'unknown', s.count]),
      ),
    };
  },

  // ---------------------------------------------------------------------------
  // RETENTION
  // ---------------------------------------------------------------------------

  /**
   * Delete old audit logs based on retention policy
   */
  deleteOlderThan: async (
    date: Date,
    category?: AuditCategory,
  ): Promise<number> => {
    const conditions = [lte(auditLogs.createdAt, date)];

    if (category) {
      conditions.push(eq(auditLogs.category, category));
    }

    const result = await drizzle
      .delete(auditLogs)
      .where(and(...conditions))
      .returning();

    return result.length;
  },

  /**
   * Export audit logs to JSON
   */
  exportLogs: async (
    filters: AuditLogFilters,
    limit = 10000,
  ): Promise<AuditLog[]> => {
    const conditions = buildConditions(filters);

    return drizzle.query.auditLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
    });
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildConditions(filters: AuditLogFilters) {
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }

  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  if (filters.category) {
    conditions.push(eq(auditLogs.category, filters.category));
  }

  if (filters.ipAddress) {
    conditions.push(eq(auditLogs.ipAddress, filters.ipAddress));
  }

  if (filters.result) {
    conditions.push(eq(auditLogs.result, filters.result));
  }

  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(auditLogs.description, `%${filters.search}%`),
        ilike(auditLogs.userName, `%${filters.search}%`),
        ilike(auditLogs.userEmail, `%${filters.search}%`),
      ),
    );
  }

  return conditions;
}
