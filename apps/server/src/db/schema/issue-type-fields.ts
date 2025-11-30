import { pgTable, smallint, text, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { fields } from '@/db/schema/field';
import { relations } from 'drizzle-orm';
import { issueTypes } from './issue-types';

/**
 * Issue Type Fields - Field'ların issue type'lara atanması
 * 
 * Bir field bir issue type'a atandığında bu tabloya kayıt eklenir.
 * configOverride: Field'ın bu issue type için özelleştirilmiş config'i (sadece değişen key'ler)
 * optionsOverride: Select tipi field'lar için bu issue type'a özel seçenekler (null = field'ın options'ını kullan)
 */
export const issueTypeFields = pgTable(
  'issue_type_fields',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    issueTypeId: text('issue_type_id')
      .notNull()
      .references(() => issueTypes.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    order: smallint('order').notNull().default(0),

    // Config override (JSON, nullable)
    // Sadece bu issue type için değişen config key'leri
    // Örnek: { isRequired: true } - sadece required değişti, diğerleri field'dan alınır
    configOverride: jsonb('config_override'),

    // Options override (JSON array, nullable)
    // null = field'ın varsayılan options'ını kullan
    // array = bu issue type için tamamen farklı options
    optionsOverride: jsonb('options_override'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    // Bir field bir issue type'ta sadece bir kere olabilir
    uniqueIssueTypeField: unique().on(table.issueTypeId, table.fieldId),
  }),
);

export const issueTypeFieldRelations = relations(issueTypeFields, ({ one }) => ({
  field: one(fields, {
    fields: [issueTypeFields.fieldId],
    references: [fields.id],
  }),
  issueType: one(issueTypes, {
    fields: [issueTypeFields.issueTypeId],
    references: [issueTypes.id],
  }),
}));

// Type exports
export type IssueTypeField = typeof issueTypeFields.$inferSelect;
export type NewIssueTypeField = typeof issueTypeFields.$inferInsert;

