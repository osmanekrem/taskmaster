import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import {
  auditEntityTypes,
  auditActions,
  type AuditEntityType,
  type AuditAction,
} from '@taskmaster/constants';

// Re-export for backwards compatibility
export { auditEntityTypes, auditActions };
export type { AuditEntityType, AuditAction };

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Audit log category for grouping
 */
export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'administration'
  | 'security';

/**
 * Audit log category enum for DB
 */
export const auditCategoryEnum = pgEnum('audit_category', [
  'authentication',
  'authorization',
  'data_access',
  'data_modification',
  'configuration',
  'administration',
  'security',
]);

// =============================================================================
// AUDIT LOGS TABLE
// =============================================================================

/**
 * Audit logs for compliance and security
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * Category of the audit event
     */
    category: auditCategoryEnum('category').notNull(),

    /**
     * The action performed
     */
    action: text('action').notNull().$type<AuditAction>(),

    /**
     * Type of entity affected
     */
    entityType: text('entity_type').notNull().$type<AuditEntityType>(),

    /**
     * ID of the entity affected
     */
    entityId: text('entity_id'),

    /**
     * Human-readable description of what happened
     */
    description: text('description'),

    /**
     * User who performed the action (null for system actions)
     */
    userId: text('user_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    /**
     * Username at the time of the action (preserved even if user deleted)
     */
    userName: text('user_name'),

    /**
     * User's email at the time of the action
     */
    userEmail: text('user_email'),

    /**
     * IP address of the request
     */
    ipAddress: text('ip_address'),

    /**
     * User agent string
     */
    userAgent: text('user_agent'),

    /**
     * Session ID if available
     */
    sessionId: text('session_id'),

    /**
     * Previous values before the change
     */
    oldValues: jsonb('old_values').$type<Record<string, unknown>>(),

    /**
     * New values after the change
     */
    newValues: jsonb('new_values').$type<Record<string, unknown>>(),

    /**
     * Additional metadata
     */
    metadata: jsonb('metadata').$type<{
      // Request info
      requestId?: string;
      requestPath?: string;
      requestMethod?: string;

      // Context
      projectId?: string;
      projectKey?: string;
      issueId?: string;
      issueKey?: string;

      // Additional context
      [key: string]: unknown;
    }>(),

    /**
     * Result of the action
     */
    result: text('result')
      .$type<'success' | 'failure' | 'partial'>()
      .default('success'),

    /**
     * Error message if the action failed
     */
    errorMessage: text('error_message'),

    /**
     * Duration of the action in milliseconds
     */
    durationMs: text('duration_ms'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // Find logs by user
    index('audit_logs_user_id_idx').on(table.userId),
    // Find logs by entity
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    // Find logs by action
    index('audit_logs_action_idx').on(table.action),
    // Find logs by category
    index('audit_logs_category_idx').on(table.category),
    // Time-based queries (for retention and analysis)
    index('audit_logs_created_at_idx').on(table.createdAt),
    // Find logs by IP address (security analysis)
    index('audit_logs_ip_address_idx').on(table.ipAddress),
    // Compound index for common query patterns
    index('audit_logs_entity_action_idx').on(
      table.entityType,
      table.action,
      table.createdAt,
    ),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(user, {
    fields: [auditLogs.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// =============================================================================
// AUDIT LOG INPUT TYPE
// =============================================================================

/**
 * Input for creating an audit log entry
 */
export interface AuditLogInput {
  category: AuditCategory;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  result?: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  durationMs?: number;
}

// =============================================================================
// FIELD MASKING CONFIGURATION
// =============================================================================

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
 * Mask sensitive fields in an object
 */
export function maskSensitiveFields(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!obj) return null;

  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((f) => lowerKey.includes(f.toLowerCase()))) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveFields(masked[key] as Record<string, unknown>);
    }
  }
  return masked;
}

// =============================================================================
// RETENTION CONFIGURATION
// =============================================================================

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
