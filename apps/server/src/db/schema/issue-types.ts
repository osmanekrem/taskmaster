import { pgTable, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { issueTypeFields } from './issue-type-fields';

export const issueTypes = pgTable('issue_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
});

export const issueTypeRelations = relations(issueTypes, ({ many }) => ({
  fields: many(issueTypeFields),
}));
