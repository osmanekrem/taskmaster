/**
 * Audit Logs Router
 *
 * API endpoints for audit log viewing and management.
 */

import { router, protectedProcedure, adminProcedure } from '@/lib/trpc';
import { z } from 'zod';
import { auditService } from '@/services/audit-service';
import { successResponse } from '@/utils/response';
import {
  auditActions,
  auditEntityTypes,
  type AuditAction,
  type AuditEntityType,
  type AuditCategory,
} from '@/db/schema/audit';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const auditCategorySchema = z.enum([
  'authentication',
  'authorization',
  'data_access',
  'data_modification',
  'configuration',
  'administration',
  'security',
]);

const auditActionSchema = z.enum([...auditActions] as [
  AuditAction,
  ...AuditAction[],
]);
const auditEntityTypeSchema = z.enum([...auditEntityTypes] as [
  AuditEntityType,
  ...AuditEntityType[],
]);

const searchFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  entityType: auditEntityTypeSchema.optional(),
  entityId: z.string().optional(),
  action: auditActionSchema.optional(),
  category: auditCategorySchema.optional(),
  ipAddress: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  result: z.enum(['success', 'failure', 'partial']).optional(),
  search: z.string().optional(),
});

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const searchSchema = searchFiltersSchema.merge(paginationSchema);

const idSchema = z.object({
  id: z.string().uuid(),
});

const entityHistorySchema = z.object({
  entityType: auditEntityTypeSchema,
  entityId: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const userActivitySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const ipActivitySchema = z.object({
  ipAddress: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const loginHistorySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(20),
});

const failedLoginsSchema = z.object({
  since: z.date(),
  ipAddress: z.string().optional(),
});

const statsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

const exportSchema = searchFiltersSchema.extend({
  limit: z.number().int().min(1).max(10000).default(1000),
});

// =============================================================================
// ROUTER
// =============================================================================

export const auditRouter = router({
  // ---------------------------------------------------------------------------
  // QUERY ENDPOINTS
  // ---------------------------------------------------------------------------

  /**
   * Search audit logs
   */
  search: adminProcedure.input(searchSchema).query(async ({ input }) => {
    const { limit, offset, ...filters } = input;
    const result = await auditService.search(filters, { limit, offset });
    return successResponse(result, 'Audit kayıtları başarıyla getirildi');
  }),

  /**
   * Get audit log by ID
   */
  getById: adminProcedure.input(idSchema).query(async ({ input }) => {
    const data = await auditService.getById(input.id);
    return successResponse(data, 'Audit kaydı başarıyla getirildi');
  }),

  /**
   * Get entity history
   */
  getEntityHistory: adminProcedure
    .input(entityHistorySchema)
    .query(async ({ input }) => {
      const { entityType, entityId, limit, offset } = input;
      const data = await auditService.getEntityHistory(entityType, entityId, {
        limit,
        offset,
      });
      return successResponse(data, 'Varlık geçmişi başarıyla getirildi');
    }),

  /**
   * Get user activity
   */
  getUserActivity: adminProcedure
    .input(userActivitySchema)
    .query(async ({ input }) => {
      const { userId, limit, offset } = input;
      const data = await auditService.getUserActivity(userId, {
        limit,
        offset,
      });
      return successResponse(data, 'Kullanıcı aktivitesi başarıyla getirildi');
    }),

  /**
   * Get IP address activity
   */
  getIpActivity: adminProcedure
    .input(ipActivitySchema)
    .query(async ({ input }) => {
      const { ipAddress, limit, offset } = input;
      const data = await auditService.getIpActivity(ipAddress, {
        limit,
        offset,
      });
      return successResponse(data, 'IP aktivitesi başarıyla getirildi');
    }),

  /**
   * Get login history for a user
   */
  getLoginHistory: adminProcedure
    .input(loginHistorySchema)
    .query(async ({ input }) => {
      const data = await auditService.getLoginHistory(
        input.userId,
        input.limit,
      );
      return successResponse(data, 'Giriş geçmişi başarıyla getirildi');
    }),

  /**
   * Get failed login attempts (security monitoring)
   */
  getFailedLogins: adminProcedure
    .input(failedLoginsSchema)
    .query(async ({ input }) => {
      const data = await auditService.getFailedLoginAttempts(
        input.since,
        input.ipAddress,
      );
      return successResponse(
        data,
        'Başarısız giriş denemeleri başarıyla getirildi',
      );
    }),

  /**
   * Get my login history (for regular users)
   */
  getMyLoginHistory: protectedProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(20).default(10) })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        return successResponse([], 'Giriş geçmişi');
      }
      const data = await auditService.getLoginHistory(
        userId,
        input?.limit ?? 10,
      );
      return successResponse(data, 'Giriş geçmişi başarıyla getirildi');
    }),

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  /**
   * Get audit statistics
   */
  getStats: adminProcedure.input(statsSchema).query(async ({ input }) => {
    const data = await auditService.getStats(input.startDate, input.endDate);
    return successResponse(data, 'Audit istatistikleri başarıyla getirildi');
  }),

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  /**
   * Export audit logs
   */
  export: adminProcedure.input(exportSchema).mutation(async ({ input }) => {
    const { limit, ...filters } = input;
    const data = await auditService.exportLogs(filters, limit);
    return successResponse(data, 'Audit kayıtları başarıyla dışa aktarıldı');
  }),

  // ---------------------------------------------------------------------------
  // RETENTION
  // ---------------------------------------------------------------------------

  /**
   * Apply retention policy (delete old logs)
   */
  applyRetention: adminProcedure.mutation(async () => {
    const result = await auditService.applyRetentionPolicy();
    return successResponse(result, `${result.deleted} audit kaydı temizlendi`);
  }),

  // ---------------------------------------------------------------------------
  // METADATA
  // ---------------------------------------------------------------------------

  /**
   * Get available audit actions
   */
  getActions: protectedProcedure.query(async () => {
    // Group actions by category
    const grouped = {
      authentication: auditActions.filter((a) => a.startsWith('auth:')),
      crud: ['create', 'update', 'delete', 'view', 'export', 'import'].filter(
        (a) => auditActions.includes(a as AuditAction),
      ),
      permission: auditActions.filter((a) => a.startsWith('permission:')),
      member: auditActions.filter((a) => a.startsWith('member:')),
      workflow: auditActions.filter(
        (a) =>
          a.startsWith('workflow:') ||
          a.startsWith('issue:') ||
          a.startsWith('sprint:') ||
          a.startsWith('version:'),
      ),
      webhook: auditActions.filter((a) => a.startsWith('webhook:')),
      admin: auditActions.filter((a) => a.startsWith('admin:')),
    };

    return successResponse(
      { actions: auditActions, grouped },
      'Audit aksiyonları başarıyla getirildi',
    );
  }),

  /**
   * Get available entity types
   */
  getEntityTypes: protectedProcedure.query(async () => {
    // Group entity types
    const grouped = {
      auth: ['user', 'session'].filter((e) =>
        auditEntityTypes.includes(e as AuditEntityType),
      ),
      project: ['project', 'issue', 'comment', 'attachment'].filter((e) =>
        auditEntityTypes.includes(e as AuditEntityType),
      ),
      configuration: [
        'workflow',
        'status',
        'resolution',
        'issue_type',
        'field',
        'screen',
        'field_configuration',
      ].filter((e) => auditEntityTypes.includes(e as AuditEntityType)),
      permissions: [
        'permission_scheme',
        'notification_scheme',
        'role',
        'role_member',
      ].filter((e) => auditEntityTypes.includes(e as AuditEntityType)),
      planning: ['sprint', 'version', 'component', 'label'].filter((e) =>
        auditEntityTypes.includes(e as AuditEntityType),
      ),
      other: ['board', 'filter', 'worklog', 'webhook', 'system_setting'].filter(
        (e) => auditEntityTypes.includes(e as AuditEntityType),
      ),
    };

    return successResponse(
      { entityTypes: auditEntityTypes, grouped },
      'Varlık türleri başarıyla getirildi',
    );
  }),
});
