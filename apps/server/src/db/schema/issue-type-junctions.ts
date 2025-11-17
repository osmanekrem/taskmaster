import { pgTable, text } from 'drizzle-orm/pg-core';
import { projects, templates } from '@/db/schema/projects';
import { issueTypes } from './issue-types';

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
});

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
});
