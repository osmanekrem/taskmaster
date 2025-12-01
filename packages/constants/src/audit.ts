// =============================================================================
// AUDIT CONSTANTS
// =============================================================================

/**
 * Entity types that can be audited
 */
export const auditEntityTypes = [
  // Auth
  'user',
  'session',

  // Projects & Issues
  'project',
  'issue',
  'comment',
  'attachment',

  // Configuration
  'workflow',
  'status',
  'resolution',
  'issue_type',
  'field',
  'screen',
  'field_configuration',

  // Teams & Permissions
  'permission_scheme',
  'notification_scheme',
  'role',
  'role_member',

  // Sprints & Versions
  'sprint',
  'version',
  'component',
  'label',

  // Boards & Filters
  'board',
  'filter',

  // Time Tracking
  'worklog',

  // Webhooks
  'webhook',

  // System
  'system_setting',
] as const;

export type AuditEntityType = (typeof auditEntityTypes)[number];

/**
 * Audit action types
 */
export const auditActions = [
  // Authentication
  'auth:login',
  'auth:logout',
  'auth:login_failed',
  'auth:password_changed',
  'auth:password_reset_requested',
  'auth:2fa_enabled',
  'auth:2fa_disabled',

  // CRUD
  'create',
  'update',
  'delete',
  'view', // For sensitive data access
  'export',
  'import',

  // Specific actions
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

  // Admin actions
  'admin:impersonate_start',
  'admin:impersonate_end',
  'admin:data_export',
  'admin:system_setting_change',
] as const;

export type AuditAction = (typeof auditActions)[number];

/**
 * Audit log categories
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

export type AuditCategory = (typeof auditCategories)[number];

/**
 * Fields that should be masked in audit logs for security
 */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'apiKey',
  'accessToken',
  'refreshToken',
  'privateKey',
  'creditCard',
  'ssn',
  'socialSecurityNumber',
] as const;

/**
 * Default retention periods by category (in days)
 */
export const AUDIT_RETENTION_DAYS: Record<AuditCategory, number> = {
  authentication: 365, // 1 year
  authorization: 365,
  data_access: 90, // 3 months
  data_modification: 365,
  configuration: 730, // 2 years
  administration: 730,
  security: 730,
};
