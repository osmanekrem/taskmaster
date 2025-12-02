import { pgTable, text, smallint, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { issueTypeFields } from './issue-type-fields';
import { user } from './auth';

// =============================================================================
// ISSUE TYPE HIERARCHY LEVELS
// =============================================================================

/**
 * Hierarchy levels define the structure of issue types:
 * - 0 = Epic level (can contain other issues)
 * - 1 = Standard level (Task, Bug, Story - the main work items)
 * - 2 = Subtask level (belongs to a parent issue)
 */
export type IssueTypeHierarchyLevel = 0 | 1 | 2;

// =============================================================================
// ISSUE TYPES
// =============================================================================

export const issueTypes = pgTable('issue_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),

  // Hierarchy level: 0=Epic, 1=Standard (Task, Bug, Story), 2=Subtask
  hierarchyLevel: smallint('hierarchy_level').notNull().default(1),

  // Timestamps
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

export const issueTypeRelations = relations(issueTypes, ({ many }) => ({
  fields: many(issueTypeFields),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type IssueType = typeof issueTypes.$inferSelect;
export type NewIssueType = typeof issueTypes.$inferInsert;
