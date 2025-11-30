// =============================================================================
// VERSIONS SCHEMA
// Project versions/releases for tracking fix versions and affected versions
// =============================================================================

import { pgTable, uuid, varchar, text, timestamp, date, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';

// =============================================================================
// ENUMS
// =============================================================================

export const versionStatusEnum = pgEnum('version_status', [
  'unreleased',
  'released',
  'archived',
]);

// =============================================================================
// VERSIONS
// =============================================================================

/**
 * Project versions for tracking releases
 * Examples: v1.0.0, Sprint 1, Q1 2024 Release
 */
export const versions = pgTable('versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Project association
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // Version details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // Status
  status: versionStatusEnum('status').default('unreleased').notNull(),
  
  // Dates
  startDate: date('start_date'),
  releaseDate: date('release_date'),
  
  // Ordering
  sortOrder: varchar('sort_order', { length: 10 }).default('0'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Index for project queries
  index('versions_project_id_idx').on(table.projectId),
  
  // Index for status queries
  index('versions_status_idx').on(table.status),
  
  // Unique constraint: version name per project
  unique('versions_project_name_unique').on(table.projectId, table.name),
]);

// =============================================================================
// ISSUE FIX VERSIONS (junction table)
// =============================================================================

/**
 * Fix versions for issues - versions where the issue will be fixed
 */
export const issueFixVersions = pgTable('issue_fix_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Issue reference
  issueId: uuid('issue_id').notNull(),
  
  // Version reference
  versionId: uuid('version_id').notNull().references(() => versions.id, { onDelete: 'cascade' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('issue_fix_versions_issue_id_idx').on(table.issueId),
  index('issue_fix_versions_version_id_idx').on(table.versionId),
  unique('issue_fix_versions_unique').on(table.issueId, table.versionId),
]);

// =============================================================================
// ISSUE AFFECTED VERSIONS (junction table)
// =============================================================================

/**
 * Affected versions for issues - versions where the issue was found
 */
export const issueAffectedVersions = pgTable('issue_affected_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Issue reference
  issueId: uuid('issue_id').notNull(),
  
  // Version reference
  versionId: uuid('version_id').notNull().references(() => versions.id, { onDelete: 'cascade' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('issue_affected_versions_issue_id_idx').on(table.issueId),
  index('issue_affected_versions_version_id_idx').on(table.versionId),
  unique('issue_affected_versions_unique').on(table.issueId, table.versionId),
]);

// =============================================================================
// RELATIONS
// =============================================================================

export const versionsRelations = relations(versions, ({ one, many }) => ({
  project: one(projects, {
    fields: [versions.projectId],
    references: [projects.id],
  }),
  fixVersionIssues: many(issueFixVersions),
  affectedVersionIssues: many(issueAffectedVersions),
}));

export const issueFixVersionsRelations = relations(issueFixVersions, ({ one }) => ({
  version: one(versions, {
    fields: [issueFixVersions.versionId],
    references: [versions.id],
  }),
}));

export const issueAffectedVersionsRelations = relations(issueAffectedVersions, ({ one }) => ({
  version: one(versions, {
    fields: [issueAffectedVersions.versionId],
    references: [versions.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type Version = typeof versions.$inferSelect;
export type NewVersion = typeof versions.$inferInsert;
export type VersionStatus = typeof versionStatusEnum.enumValues[number];
export type IssueFixVersion = typeof issueFixVersions.$inferSelect;
export type NewIssueFixVersion = typeof issueFixVersions.$inferInsert;
export type IssueAffectedVersion = typeof issueAffectedVersions.$inferSelect;
export type NewIssueAffectedVersion = typeof issueAffectedVersions.$inferInsert;
