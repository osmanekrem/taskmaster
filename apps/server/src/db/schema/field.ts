import { pgTable, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { issueTypeFields } from './issue-type-fields';
import { user } from './auth';

/**
 * Fields - Global field tanımları
 *
 * Her field tek bir kaynak olarak burada tanımlanır.
 * slug: Field'ın unique identifier'ı (örn: 'summary', 'story_points', 'priority')
 * config: Field'ın varsayılan konfigürasyonu (isRequired, placeholder, vb.)
 * options: Select tipi field'lar için varsayılan seçenekler
 */
export const fields = pgTable(
  'fields',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(), // Unique identifier for cache sync
    fieldType: text('field_type').notNull(), // 'text-input', 'single-select', etc.
    icon: text('icon'),

    // Varsayılan konfigürasyon (JSON)
    // Örnek: { isRequired: false, placeholder: 'Enter text...', description: '' }
    config: jsonb('config').notNull().default({}),

    // Select tipi field'lar için varsayılan seçenekler (JSON array)
    // Örnek: [{ id: '1', name: 'Option 1', icon: '🔵', order: 0 }]
    options: jsonb('options').default([]),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    // Audit fields
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    slugIdx: index('fields_slug_idx').on(table.slug),
  }),
);

export const fieldsRelations = relations(fields, ({ many }) => ({
  issueTypeFields: many(issueTypeFields),
}));

// Type exports
export type Field = typeof fields.$inferSelect;
export type NewField = typeof fields.$inferInsert;

// Option type for select fields
export interface FieldSelectOption {
  id: string;
  name: string;
  icon?: string;
  order: number;
}

// Config type (dynamic based on field type)
export type FieldConfig = Record<string, unknown>;
