import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

// =============================================================================
// STATUS CATEGORIES (for reporting and board columns)
// =============================================================================

// Status categories are used for:
// 1. Reporting: "All done issues", "All in-progress issues"
// 2. Board columns: Auto-mapping statuses to board sections
// 3. Resolution: Only 'done' category statuses can have resolution

export type StatusCategory = 'todo' | 'in_progress' | 'done';

// =============================================================================
// STATUSES (Global status definitions)
// =============================================================================

/**
 * Statuses are global definitions that can be used across workflows.
 * Each workflow can include any subset of these statuses.
 *
 * Examples:
 * - Open (backlog category)
 * - In Progress (in_progress category)
 * - In Review (in_progress category)
 * - Done (done category)
 * - Cancelled (done category)
 */
export const statuses = pgTable('statuses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),

  // Category for reporting and board grouping
  // Values: 'backlog', 'in_progress', 'done'
  category: text('category').notNull().default('todo'),

  // Visual properties
  color: text('color').default('#6B7280'), // Gray default
  icon: text('icon'),

  // System statuses can't be deleted
  isSystem: boolean('is_system').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Audit fields
  createdBy: text('created_by').references(() => user.id, {
    onDelete: 'set null',
  }),
  updatedBy: text('updated_by').references(() => user.id, {
    onDelete: 'set null',
  }),
});

// =============================================================================
// RESOLUTIONS (Why an issue was closed)
// =============================================================================

/**
 * Resolutions indicate why an issue was closed/resolved.
 * Only issues in 'done' category status can have a resolution.
 *
 * Examples:
 * - Done (work completed successfully)
 * - Won't Do (decided not to do this)
 * - Duplicate (duplicate of another issue)
 * - Cannot Reproduce (for bugs)
 * - Incomplete (not enough info)
 */
export const resolutions = pgTable('resolutions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),

  // Default resolution when transitioning to done status
  isDefault: boolean('is_default').default(false),

  // System resolutions can't be deleted
  isSystem: boolean('is_system').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // Audit fields
  createdBy: text('created_by').references(() => user.id, {
    onDelete: 'set null',
  }),
  updatedBy: text('updated_by').references(() => user.id, {
    onDelete: 'set null',
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Status = typeof statuses.$inferSelect;
export type NewStatus = typeof statuses.$inferInsert;
export type Resolution = typeof resolutions.$inferSelect;
export type NewResolution = typeof resolutions.$inferInsert;
