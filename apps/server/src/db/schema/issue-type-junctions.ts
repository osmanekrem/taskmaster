import { pgTable, text, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects, templates } from '@/db/schema/projects';
import { issueTypes } from './issue-types';
import { workflows } from './workflows';

// =============================================================================
// TEMPLATE - ISSUE TYPE JUNCTION
// =============================================================================

export const templateIssueTypes = pgTable('template_issue_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  templateId: text('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  issueTypeId: text('issue_type_id')
    .notNull()
    .references(() => issueTypes.id, { onDelete: 'cascade' }),
  // Workflow to use for this issue type in this template
  workflowId: text('workflow_id')
    .references(() => workflows.id, { onDelete: 'set null' }),
}, (table) => ({
  uniqueTemplateIssueType: unique('template_issue_types_unique').on(table.templateId, table.issueTypeId),
}));

// =============================================================================
// PROJECT - ISSUE TYPE JUNCTION
// =============================================================================

export const projectIssueTypes = pgTable('project_issue_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  issueTypeId: text('issue_type_id')
    .notNull()
    .references(() => issueTypes.id, { onDelete: 'cascade' }),
  // Workflow to use for this issue type in this project
  // If null, uses project's default workflow
  workflowId: text('workflow_id')
    .references(() => workflows.id, { onDelete: 'set null' }),
}, (table) => ({
  uniqueProjectIssueType: unique('project_issue_types_unique').on(table.projectId, table.issueTypeId),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const templateIssueTypeRelations = relations(templateIssueTypes, ({ one }) => ({
  template: one(templates, {
    fields: [templateIssueTypes.templateId],
    references: [templates.id],
  }),
  issueType: one(issueTypes, {
    fields: [templateIssueTypes.issueTypeId],
    references: [issueTypes.id],
  }),
  workflow: one(workflows, {
    fields: [templateIssueTypes.workflowId],
    references: [workflows.id],
  }),
}));

export const projectIssueTypeRelations = relations(projectIssueTypes, ({ one }) => ({
  project: one(projects, {
    fields: [projectIssueTypes.projectId],
    references: [projects.id],
  }),
  issueType: one(issueTypes, {
    fields: [projectIssueTypes.issueTypeId],
    references: [issueTypes.id],
  }),
  workflow: one(workflows, {
    fields: [projectIssueTypes.workflowId],
    references: [workflows.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TemplateIssueType = typeof templateIssueTypes.$inferSelect;
export type NewTemplateIssueType = typeof templateIssueTypes.$inferInsert;
export type ProjectIssueType = typeof projectIssueTypes.$inferSelect;
export type NewProjectIssueType = typeof projectIssueTypes.$inferInsert;
