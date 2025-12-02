import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { issues } from './issues';

// =============================================================================
// ISSUE TIME TRACKING - Issue bazlı zaman bilgisi
// =============================================================================

/**
 * Issue time tracking summary
 * Stores aggregated time tracking data per issue
 */
export const issueTimeTracking = pgTable(
  'issue_time_tracking',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Issue reference (one-to-one)
    issueId: text('issue_id')
      .notNull()
      .unique()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Original estimate (in seconds)
    // Set when issue is created or manually updated
    originalEstimateSeconds: integer('original_estimate_seconds')
      .default(0)
      .notNull(),

    // Remaining estimate (in seconds)
    // Decreases as work is logged, can be manually adjusted
    remainingEstimateSeconds: integer('remaining_estimate_seconds')
      .default(0)
      .notNull(),

    // Total time spent (in seconds)
    // Sum of all worklogs
    timeSpentSeconds: integer('time_spent_seconds').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('issue_time_tracking_issue_idx').on(table.issueId)],
);

// =============================================================================
// WORKLOGS - İş kayıtları
// =============================================================================

/**
 * Worklog entries
 * Individual time entries logged against issues
 */
export const worklogs = pgTable(
  'worklogs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Issue reference
    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // User who logged the work
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    // Time spent in seconds
    timeSpentSeconds: integer('time_spent_seconds').notNull(),

    // When the work was performed
    startedAt: timestamp('started_at').notNull(),

    // Description of work done
    description: text('description'),

    // Billable flag (for invoicing/reporting)
    billable: boolean('billable').default(true).notNull(),

    // Activity type (development, review, testing, etc.)
    activityType: text('activity_type'),

    // Soft delete
    isDeleted: boolean('is_deleted').default(false),
    deletedAt: timestamp('deleted_at'),
    deletedBy: text('deleted_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Optimistic concurrency control
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('worklogs_issue_idx').on(table.issueId),
    index('worklogs_user_idx').on(table.userId),
    index('worklogs_started_at_idx').on(table.startedAt),
    index('worklogs_issue_user_idx').on(table.issueId, table.userId),
  ],
);

// =============================================================================
// TIME TRACKING CONFIGURATION - Proje bazlı ayarlar
// =============================================================================

/**
 * Time tracking settings per project
 * Allows customization of time units and working hours
 */
export const timeTrackingSettings = pgTable(
  'time_tracking_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Project reference (nullable = global default)
    projectId: text('project_id'),

    // Working hours per day (default: 8)
    workingHoursPerDay: integer('working_hours_per_day').default(8).notNull(),

    // Working days per week (default: 5)
    workingDaysPerWeek: integer('working_days_per_week').default(5).notNull(),

    // Default time unit for display ('hour' | 'day' | 'week')
    defaultTimeUnit: text('default_time_unit').default('hour').notNull(),

    // Whether to copy remaining estimate from original on creation
    copyEstimateToRemaining: boolean('copy_estimate_to_remaining')
      .default(true)
      .notNull(),

    // Activity types available for this project
    activityTypes: text('activity_types')
      .array()
      .default(['development', 'review', 'testing', 'documentation', 'meeting'])
      .notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('time_tracking_settings_project_unique').on(table.projectId),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const issueTimeTrackingRelations = relations(
  issueTimeTracking,
  ({ one }) => ({
    issue: one(issues, {
      fields: [issueTimeTracking.issueId],
      references: [issues.id],
    }),
  }),
);

export const worklogsRelations = relations(worklogs, ({ one }) => ({
  issue: one(issues, {
    fields: [worklogs.issueId],
    references: [issues.id],
  }),
  user: one(user, {
    fields: [worklogs.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type IssueTimeTracking = typeof issueTimeTracking.$inferSelect;
export type NewIssueTimeTracking = typeof issueTimeTracking.$inferInsert;
export type Worklog = typeof worklogs.$inferSelect;
export type NewWorklog = typeof worklogs.$inferInsert;
export type TimeTrackingSettings = typeof timeTrackingSettings.$inferSelect;
export type NewTimeTrackingSettings = typeof timeTrackingSettings.$inferInsert;
