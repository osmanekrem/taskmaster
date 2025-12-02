// =============================================================================
// LABELS SCHEMA
// Flexible tagging system for issues
// =============================================================================

import {
  pgTable,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { issues } from './issues';
import { user } from './auth';

// =============================================================================
// LABELS
// =============================================================================

/**
 * Labels for categorizing and filtering issues
 * Can be project-specific or global
 */
export const labels = pgTable(
  'labels',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Project association (null = global label)
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),

    // Label details
    name: varchar('name', { length: 100 }).notNull(),

    // Color for display (hex code)
    color: varchar('color', { length: 7 }).default('#6B7280').notNull(),

    // Description
    description: varchar('description', { length: 255 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Audit fields
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    // Index for project queries
    index('labels_project_id_idx').on(table.projectId),

    // Index for name searches
    index('labels_name_idx').on(table.name),

    // Unique constraint: label name per project (or globally if projectId is null)
    // Note: PostgreSQL unique constraints treat NULL values as distinct
  ],
);

// =============================================================================
// ISSUE LABELS (junction table)
// =============================================================================

/**
 * Many-to-many relationship between issues and labels
 */
export const issueLabels = pgTable(
  'issue_labels',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Issue reference - with proper foreign key
    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Label reference
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('issue_labels_issue_id_idx').on(table.issueId),
    index('issue_labels_label_id_idx').on(table.labelId),
    unique('issue_labels_unique').on(table.issueId, table.labelId),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, {
    fields: [labels.projectId],
    references: [projects.id],
  }),
  issueLabels: many(issueLabels),
}));

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  label: one(labels, {
    fields: [issueLabels.labelId],
    references: [labels.id],
  }),
  issue: one(issues, {
    fields: [issueLabels.issueId],
    references: [issues.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type IssueLabel = typeof issueLabels.$inferSelect;
export type NewIssueLabel = typeof issueLabels.$inferInsert;

// Re-export constants from constants package
export { LABEL_COLORS, DEFAULT_LABELS } from '@taskmaster/constants';
