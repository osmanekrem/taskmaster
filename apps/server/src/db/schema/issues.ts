import { pgTable, text, timestamp, jsonb, integer, index, unique } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';
import { projects } from './projects';
import { issueTypes } from './issue-types';
import { statuses, resolutions } from './statuses';
import { fields } from './field';

// =============================================================================
// ISSUES - Ana issue tablosu
// =============================================================================

export const issues = pgTable('issues', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Issue Key (DEMO-1, TASK-42, etc.)
  key: text('key').notNull().unique(),
  issueNumber: integer('issue_number').notNull(), // Proje içindeki sıra numarası

  // Project & Type
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  issueTypeId: text('issue_type_id')
    .notNull()
    .references(() => issueTypes.id, { onDelete: 'restrict' }),

  // Status & Resolution
  statusId: text('status_id')
    .notNull()
    .references(() => statuses.id, { onDelete: 'restrict' }),
  resolutionId: text('resolution_id')
    .references(() => resolutions.id, { onDelete: 'set null' }),

  // People
  reporterId: text('reporter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  assigneeId: text('assignee_id')
    .references(() => user.id, { onDelete: 'set null' }),

  // Hierarchy (for subtasks and epic linking)
  parentId: text('parent_id')
    .references((): any => issues.id, { onDelete: 'cascade' }),
  epicId: text('epic_id')
    .references((): any => issues.id, { onDelete: 'set null' }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  dueDate: timestamp('due_date'),
}, (table) => ({
  // Performance indexes
  projectIdx: index('issues_project_idx').on(table.projectId),
  statusIdx: index('issues_status_idx').on(table.statusId),
  assigneeIdx: index('issues_assignee_idx').on(table.assigneeId),
  reporterIdx: index('issues_reporter_idx').on(table.reporterId),
  parentIdx: index('issues_parent_idx').on(table.parentId),
  epicIdx: index('issues_epic_idx').on(table.epicId),
  // Composite indexes for common queries
  projectStatusIdx: index('issues_project_status_idx').on(table.projectId, table.statusId),
  projectTypeIdx: index('issues_project_type_idx').on(table.projectId, table.issueTypeId),
  // Unique constraint: issue number per project
  uniqueProjectIssueNumber: unique('issues_project_number_unique').on(table.projectId, table.issueNumber),
}));

// =============================================================================
// ISSUE FIELD VALUES - Dinamik field değerleri
// =============================================================================

// Herhangi bir field değerini saklayabilecek esnek tip
export type FieldValue = 
  | string 
  | number 
  | boolean 
  | string[] // multi-select
  | { id: string; name: string }[] // user-picker array
  | { url: string; name?: string } // url with optional name
  | null;

export const issueFieldValues = pgTable('issue_field_values', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  issueId: text('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  fieldId: text('field_id')
    .notNull()
    .references(() => fields.id, { onDelete: 'cascade' }),

  // Value stored as JSONB for flexibility
  // Can be: string, number, boolean, array, object, null
  value: jsonb('value').$type<FieldValue>(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  issueIdx: index('issue_field_values_issue_idx').on(table.issueId),
  fieldIdx: index('issue_field_values_field_idx').on(table.fieldId),
  // Each field can only have one value per issue
  uniqueIssueField: unique('issue_field_values_unique').on(table.issueId, table.fieldId),
}));

// =============================================================================
// ISSUE HISTORY - Değişiklik geçmişi (Audit Log)
// =============================================================================

export type HistoryChange = {
  field: string;
  fieldId?: string;
  oldValue: any;
  newValue: any;
};

export const issueHistory = pgTable('issue_history', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  issueId: text('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  
  // Who made the change
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),

  // What changed (array of changes for batch updates)
  changes: jsonb('changes').$type<HistoryChange[]>().notNull(),

  // When
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  issueIdx: index('issue_history_issue_idx').on(table.issueId),
  userIdx: index('issue_history_user_idx').on(table.userId),
  createdAtIdx: index('issue_history_created_at_idx').on(table.createdAt),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const issueRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
  issueType: one(issueTypes, {
    fields: [issues.issueTypeId],
    references: [issueTypes.id],
  }),
  status: one(statuses, {
    fields: [issues.statusId],
    references: [statuses.id],
  }),
  resolution: one(resolutions, {
    fields: [issues.resolutionId],
    references: [resolutions.id],
  }),
  reporter: one(user, {
    fields: [issues.reporterId],
    references: [user.id],
    relationName: 'reporter',
  }),
  assignee: one(user, {
    fields: [issues.assigneeId],
    references: [user.id],
    relationName: 'assignee',
  }),
  parent: one(issues, {
    fields: [issues.parentId],
    references: [issues.id],
    relationName: 'parent',
  }),
  children: many(issues, {
    relationName: 'parent',
  }),
  epic: one(issues, {
    fields: [issues.epicId],
    references: [issues.id],
    relationName: 'epic',
  }),
  epicChildren: many(issues, {
    relationName: 'epic',
  }),
  fieldValues: many(issueFieldValues),
  history: many(issueHistory),
}));

export const issueFieldValueRelations = relations(issueFieldValues, ({ one }) => ({
  issue: one(issues, {
    fields: [issueFieldValues.issueId],
    references: [issues.id],
  }),
  field: one(fields, {
    fields: [issueFieldValues.fieldId],
    references: [fields.id],
  }),
}));

export const issueHistoryRelations = relations(issueHistory, ({ one }) => ({
  issue: one(issues, {
    fields: [issueHistory.issueId],
    references: [issues.id],
  }),
  user: one(user, {
    fields: [issueHistory.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type IssueFieldValue = typeof issueFieldValues.$inferSelect;
export type NewIssueFieldValue = typeof issueFieldValues.$inferInsert;
export type IssueHistory = typeof issueHistory.$inferSelect;
export type NewIssueHistory = typeof issueHistory.$inferInsert;
