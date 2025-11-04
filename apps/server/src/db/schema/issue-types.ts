import { pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { projects, templates } from '@/db/schema/projects';
import { fieldOptions, fields } from '@/db/schema/field';
import { relations } from 'drizzle-orm';
import { fieldTypeOptions, fieldTypes } from './field-types';

export const issueTypes = pgTable('issue_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
});

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

export const issueTypeFields = pgTable('issue_type_fields', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  issueTypeId: text('issue_type_id')
    .notNull()
    .references(() => issueTypes.id, { onDelete: 'cascade' }),
  fieldId: text('field_id')
    .notNull()
    .references(() => fields.id, { onDelete: 'cascade' }),
  fieldTypeId: text('field_type_id')
    .notNull()
    .references(() => fieldTypes.id, { onDelete: 'cascade' }),
  order: smallint('order').notNull().default(0),
});

export const issueTypeFieldOptions = pgTable('issue_type_field_options', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  issueTypeId: text('issue_type_id')
    .notNull()
    .references(() => issueTypes.id, { onDelete: 'cascade' }),
  fieldOptionId: text('field_option_id')
    .notNull()
    .references(() => fieldOptions.id, { onDelete: 'cascade' }),
  fieldTypeOptionId: text('field_type_option_id')
    .notNull()
    .references(() => fieldTypeOptions.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  order: smallint('order').notNull().default(0),
});

export const issueTypeSelectOptions = pgTable('issue_type_select_options', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  issueTypeFieldOptionId: text('issue_type_field_option_id')
    .notNull()
    .references(() => issueTypeFieldOptions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  order: smallint('order').notNull().default(0),
});

export const issueTypeRelations = relations(issueTypes, ({ many }) => ({
  fields: many(issueTypeFields),
}));

export const issueTypeFieldRelations = relations(
  issueTypeFields,
  ({ many, one }) => ({
    fieldType: one(fieldTypes, {
      fields: [issueTypeFields.fieldTypeId],
      references: [fieldTypes.id],
    }),
    fieldOptions: many(issueTypeFieldOptions),
    field: one(fields, {
      fields: [issueTypeFields.fieldId],
      references: [fields.id],
    }),
    issueType: one(issueTypes, {
      fields: [issueTypeFields.issueTypeId],
      references: [issueTypes.id],
    }),
  }),
);

export const issueTypeFieldOptionRelations = relations(
  issueTypeFieldOptions,
  ({ many, one }) => ({
    selectOptions: many(issueTypeSelectOptions),
    fieldOption: one(fieldOptions, {
      fields: [issueTypeFieldOptions.fieldOptionId],
      references: [fieldOptions.id],
    }),
    fieldTypeOption: one(fieldTypeOptions, {
      fields: [issueTypeFieldOptions.fieldTypeOptionId],
      references: [fieldTypeOptions.id],
    }),
    issueType: one(issueTypes, {
      fields: [issueTypeFieldOptions.issueTypeId],
      references: [issueTypes.id],
    }),
    issueTypeField: one(issueTypeFields, {
      fields: [issueTypeFieldOptions.id],
      references: [issueTypeFields.id],
    }),
  }),
);

export const issueTypeSelectOptionRelations = relations(
  issueTypeSelectOptions,
  ({ one }) => ({
    issueTypeFieldOption: one(issueTypeFieldOptions, {
      fields: [issueTypeSelectOptions.issueTypeFieldOptionId],
      references: [issueTypeFieldOptions.id],
    }),
  }),
);
