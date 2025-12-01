import { z } from 'zod';

// ============================================================================
// AUDIT VALIDATION SCHEMAS
// ============================================================================

/**
 * Entity types that can be audited
 */
export const auditEntityTypes = [
  'user',
  'session',
  'project',
  'issue',
  'comment',
  'attachment',
  'workflow',
  'status',
  'resolution',
  'issue_type',
  'field',
  'screen',
  'field_configuration',
  'permission_scheme',
  'notification_scheme',
  'role',
  'role_member',
  'sprint',
  'version',
  'component',
  'label',
  'board',
  'filter',
  'worklog',
  'webhook',
  'system_setting',
] as const;

/**
 * Audit action types
 */
export const auditActions = [
  'auth:login',
  'auth:logout',
  'auth:login_failed',
  'auth:password_changed',
  'auth:password_reset_requested',
  'auth:2fa_enabled',
  'auth:2fa_disabled',
  'create',
  'update',
  'delete',
  'view',
  'export',
  'import',
  'permission:grant',
  'permission:revoke',
  'member:add',
  'member:remove',
  'workflow:transition',
  'issue:assign',
  'issue:move',
  'sprint:start',
  'sprint:complete',
  'version:release',
  'webhook:test',
  'webhook:redeliver',
  'admin:impersonate_start',
  'admin:impersonate_end',
  'admin:data_export',
  'admin:system_setting_change',
] as const;

/**
 * Audit category options
 */
export const auditCategories = [
  'authentication',
  'authorization',
  'data_access',
  'data_modification',
  'configuration',
  'administration',
  'security',
] as const;

/**
 * Audit result options
 */
export const auditResults = ['success', 'failure', 'partial'] as const;

/**
 * Schema for audit category
 */
export const auditCategorySchema = z.enum(auditCategories);

/**
 * Schema for audit action
 */
export const auditActionSchema = z.enum(auditActions);

/**
 * Schema for audit entity type
 */
export const auditEntityTypeSchema = z.enum(auditEntityTypes);

/**
 * Schema for audit result
 */
export const auditResultSchema = z.enum(auditResults);

/**
 * Schema for search filters
 */
export const auditSearchFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  entityType: auditEntityTypeSchema.optional(),
  entityId: z.string().optional(),
  action: auditActionSchema.optional(),
  category: auditCategorySchema.optional(),
  ipAddress: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  result: auditResultSchema.optional(),
  search: z.string().optional(),
});

/**
 * Schema for pagination
 */
export const auditPaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Schema for search with pagination
 */
export const auditSearchSchema = auditSearchFiltersSchema.merge(auditPaginationSchema);

/**
 * Schema for audit ID parameter
 */
export const auditIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Schema for entity history query
 */
export const auditEntityHistorySchema = z.object({
  entityType: auditEntityTypeSchema,
  entityId: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Schema for user activity query
 */
export const auditUserActivitySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Schema for IP activity query
 */
export const auditIpActivitySchema = z.object({
  ipAddress: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Schema for login history query
 */
export const auditLoginHistorySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(20),
});

/**
 * Schema for failed logins query
 */
export const auditFailedLoginsSchema = z.object({
  since: z.date(),
  ipAddress: z.string().optional(),
});

/**
 * Schema for my login history
 */
export const auditMyLoginHistorySchema = z
  .object({ limit: z.number().int().min(1).max(20).default(10) })
  .optional();

/**
 * Schema for stats query
 */
export const auditStatsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

/**
 * Schema for export
 */
export const auditExportSchema = auditSearchFiltersSchema.extend({
  limit: z.number().int().min(1).max(10000).default(1000),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditCategory = z.infer<typeof auditCategorySchema>;
export type AuditResult = z.infer<typeof auditResultSchema>;
export type AuditSearchFiltersInput = z.infer<typeof auditSearchFiltersSchema>;
export type AuditPaginationInput = z.infer<typeof auditPaginationSchema>;
export type AuditSearchInput = z.infer<typeof auditSearchSchema>;
export type AuditIdInput = z.infer<typeof auditIdSchema>;
export type AuditEntityHistoryInput = z.infer<typeof auditEntityHistorySchema>;
export type AuditUserActivityInput = z.infer<typeof auditUserActivitySchema>;
export type AuditIpActivityInput = z.infer<typeof auditIpActivitySchema>;
export type AuditLoginHistoryInput = z.infer<typeof auditLoginHistorySchema>;
export type AuditFailedLoginsInput = z.infer<typeof auditFailedLoginsSchema>;
export type AuditMyLoginHistoryInput = z.infer<typeof auditMyLoginHistorySchema>;
export type AuditStatsInput = z.infer<typeof auditStatsSchema>;
export type AuditExportInput = z.infer<typeof auditExportSchema>;
