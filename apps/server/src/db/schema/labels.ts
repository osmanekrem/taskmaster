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

// Default label colors
export const LABEL_COLORS = {
  RED: '#EF4444',
  ORANGE: '#F97316',
  AMBER: '#F59E0B',
  YELLOW: '#EAB308',
  LIME: '#84CC16',
  GREEN: '#22C55E',
  EMERALD: '#10B981',
  TEAL: '#14B8A6',
  CYAN: '#06B6D4',
  SKY: '#0EA5E9',
  BLUE: '#3B82F6',
  INDIGO: '#6366F1',
  VIOLET: '#8B5CF6',
  PURPLE: '#A855F7',
  FUCHSIA: '#D946EF',
  PINK: '#EC4899',
  ROSE: '#F43F5E',
  GRAY: '#6B7280',
} as const;

// Default labels that can be created for new projects
export const DEFAULT_LABELS = [
  {
    name: 'bug',
    color: LABEL_COLORS.RED,
    description: "Something isn't working",
  },
  {
    name: 'enhancement',
    color: LABEL_COLORS.BLUE,
    description: 'New feature or request',
  },
  {
    name: 'documentation',
    color: LABEL_COLORS.PURPLE,
    description: 'Improvements or additions to documentation',
  },
  {
    name: 'duplicate',
    color: LABEL_COLORS.GRAY,
    description: 'This issue already exists',
  },
  {
    name: 'good first issue',
    color: LABEL_COLORS.GREEN,
    description: 'Good for newcomers',
  },
  {
    name: 'help wanted',
    color: LABEL_COLORS.YELLOW,
    description: 'Extra attention is needed',
  },
  {
    name: 'invalid',
    color: LABEL_COLORS.GRAY,
    description: "This doesn't seem right",
  },
  {
    name: 'question',
    color: LABEL_COLORS.CYAN,
    description: 'Further information is requested',
  },
  {
    name: 'wontfix',
    color: LABEL_COLORS.GRAY,
    description: 'This will not be worked on',
  },
  {
    name: 'priority: high',
    color: LABEL_COLORS.RED,
    description: 'High priority issue',
  },
  {
    name: 'priority: medium',
    color: LABEL_COLORS.ORANGE,
    description: 'Medium priority issue',
  },
  {
    name: 'priority: low',
    color: LABEL_COLORS.TEAL,
    description: 'Low priority issue',
  },
] as const;
