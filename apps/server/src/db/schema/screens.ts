import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { fields } from './field';
import { issueTypes } from './issue-types';
import { projects } from './projects';

// =============================================================================
// SCREENS - Ekran tanımları
// =============================================================================

/**
 * Screens - Form layout definitions
 *
 * A screen defines the layout of fields for a specific operation.
 * Screens are reusable and can be assigned to multiple issue types/operations.
 */
export const screens = pgTable('screens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),

  // System screens cannot be deleted (e.g., "Default Screen")
  isSystem: boolean('is_system').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// SCREEN TABS - Ekran sekmeleri
// =============================================================================

/**
 * Screen Tabs - Organize fields into logical groups
 *
 * Each screen can have multiple tabs (e.g., "Details", "Description", "Settings")
 */
export const screenTabs = pgTable(
  'screen_tabs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    screenId: text('screen_id')
      .notNull()
      .references(() => screens.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    screenIdIdx: index('screen_tabs_screen_id_idx').on(table.screenId),
  }),
);

// =============================================================================
// SCREEN TAB FIELDS - Sekmede gösterilen alanlar
// =============================================================================

/**
 * Screen Tab Fields - Fields displayed in a tab
 *
 * Maps fields to screen tabs with positioning and optional overrides
 */
export const screenTabFields = pgTable(
  'screen_tab_fields',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tabId: text('tab_id')
      .notNull()
      .references(() => screenTabs.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),

    // Override isRequired from field configuration for this screen
    isRequiredOverride: boolean('is_required_override'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tabIdIdx: index('screen_tab_fields_tab_id_idx').on(table.tabId),
    uniqueTabField: unique('screen_tab_fields_unique').on(
      table.tabId,
      table.fieldId,
    ),
  }),
);

// =============================================================================
// SCREEN SCHEMES - Ekran şemaları
// =============================================================================

/**
 * Screen Schemes - Map screens to issue type + operation combinations
 *
 * Determines which screen to show for:
 * - create: Creating a new issue
 * - edit: Editing an existing issue
 * - view: Viewing issue details
 */
export const screenSchemes = pgTable('screen_schemes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),

  // Default scheme used when no other scheme is assigned
  isDefault: boolean('is_default').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// SCREEN SCHEME ITEMS - Issue type + operation → screen mapping
// =============================================================================

/**
 * Screen Scheme Items - Define which screen to use
 *
 * - issueTypeId: null means "default for all issue types"
 * - operation: 'create', 'edit', or 'view'
 */
export const screenSchemeItems = pgTable(
  'screen_scheme_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schemeId: text('scheme_id')
      .notNull()
      .references(() => screenSchemes.id, { onDelete: 'cascade' }),

    // Nullable - null means default for all issue types not explicitly mapped
    issueTypeId: text('issue_type_id').references(() => issueTypes.id, {
      onDelete: 'cascade',
    }),

    operation: text('operation').notNull(), // 'create' | 'edit' | 'view'

    screenId: text('screen_id')
      .notNull()
      .references(() => screens.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    schemeIdIdx: index('screen_scheme_items_scheme_id_idx').on(table.schemeId),
    // Unique constraint: one screen per (scheme, issueType, operation)
    uniqueSchemeItem: unique('screen_scheme_items_unique').on(
      table.schemeId,
      table.issueTypeId,
      table.operation,
    ),
  }),
);

// =============================================================================
// PROJECT SCREEN SCHEMES - Project → scheme mapping
// =============================================================================

/**
 * Project Screen Schemes - Assign screen schemes to projects
 *
 * Each project can have one screen scheme.
 * If not assigned, uses the default scheme.
 */
export const projectScreenSchemes = pgTable(
  'project_screen_schemes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    schemeId: text('scheme_id')
      .notNull()
      .references(() => screenSchemes.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueProjectScheme: unique('project_screen_schemes_unique').on(
      table.projectId,
    ),
  }),
);

// =============================================================================
// FIELD CONFIGURATIONS - Alan konfigürasyonları
// =============================================================================

/**
 * Field Configurations - Global field behavior settings
 *
 * Define how fields behave across the system:
 * - Required/optional
 * - Hidden/visible
 * - Custom renderers
 * - Default values
 */
export const fieldConfigurations = pgTable('field_configurations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),

  // Default configuration used when no other is assigned
  isDefault: boolean('is_default').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// FIELD CONFIGURATION ITEMS - Field-level configuration
// =============================================================================

/**
 * Field Configuration Items - Per-field settings within a configuration
 *
 * Each item defines behavior for a specific field:
 * - isRequired: Field must have a value
 * - isHidden: Field is not shown on screens
 * - renderer: Custom renderer key (for special field display)
 * - defaultValue: Default value when creating issues
 * - descriptionOverride: Replace field description
 */
export const fieldConfigurationItems = pgTable(
  'field_configuration_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    configId: text('config_id')
      .notNull()
      .references(() => fieldConfigurations.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),

    // Field behavior
    isRequired: boolean('is_required').default(false).notNull(),
    isHidden: boolean('is_hidden').default(false).notNull(),

    // Custom renderer (e.g., 'wiki-editor', 'code-block', 'markdown')
    renderer: text('renderer'),

    // Default value (JSON to support any type)
    defaultValue: text('default_value'),

    // Override the field's description
    descriptionOverride: text('description_override'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    configIdIdx: index('field_config_items_config_id_idx').on(table.configId),
    uniqueConfigField: unique('field_config_items_unique').on(
      table.configId,
      table.fieldId,
    ),
  }),
);

// =============================================================================
// FIELD CONFIGURATION SCHEMES - Issue type → config mapping
// =============================================================================

/**
 * Field Configuration Schemes - Map configurations to issue types
 *
 * Determines which field configuration to use for each issue type.
 */
export const fieldConfigurationSchemes = pgTable(
  'field_configuration_schemes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),

    isDefault: boolean('is_default').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
);

/**
 * Field Configuration Scheme Items - Issue type → config mapping
 */
export const fieldConfigurationSchemeItems = pgTable(
  'field_configuration_scheme_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    schemeId: text('scheme_id')
      .notNull()
      .references(() => fieldConfigurationSchemes.id, { onDelete: 'cascade' }),

    // Nullable - null means default for all issue types
    issueTypeId: text('issue_type_id').references(() => issueTypes.id, {
      onDelete: 'cascade',
    }),

    configId: text('config_id')
      .notNull()
      .references(() => fieldConfigurations.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    schemeIdIdx: index('field_config_scheme_items_scheme_id_idx').on(
      table.schemeId,
    ),
    uniqueSchemeItem: unique('field_config_scheme_items_unique').on(
      table.schemeId,
      table.issueTypeId,
    ),
  }),
);

/**
 * Project Field Configuration Schemes - Project → scheme mapping
 */
export const projectFieldConfigurationSchemes = pgTable(
  'project_field_configuration_schemes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    schemeId: text('scheme_id')
      .notNull()
      .references(() => fieldConfigurationSchemes.id, { onDelete: 'restrict' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueProjectScheme: unique('project_field_config_schemes_unique').on(
      table.projectId,
    ),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const screenRelations = relations(screens, ({ many }) => ({
  tabs: many(screenTabs),
  schemeItems: many(screenSchemeItems),
}));

export const screenTabRelations = relations(screenTabs, ({ one, many }) => ({
  screen: one(screens, {
    fields: [screenTabs.screenId],
    references: [screens.id],
  }),
  fields: many(screenTabFields),
}));

export const screenTabFieldRelations = relations(
  screenTabFields,
  ({ one }) => ({
    tab: one(screenTabs, {
      fields: [screenTabFields.tabId],
      references: [screenTabs.id],
    }),
    field: one(fields, {
      fields: [screenTabFields.fieldId],
      references: [fields.id],
    }),
  }),
);

export const screenSchemeRelations = relations(screenSchemes, ({ many }) => ({
  items: many(screenSchemeItems),
  projectSchemes: many(projectScreenSchemes),
}));

export const screenSchemeItemRelations = relations(
  screenSchemeItems,
  ({ one }) => ({
    scheme: one(screenSchemes, {
      fields: [screenSchemeItems.schemeId],
      references: [screenSchemes.id],
    }),
    issueType: one(issueTypes, {
      fields: [screenSchemeItems.issueTypeId],
      references: [issueTypes.id],
    }),
    screen: one(screens, {
      fields: [screenSchemeItems.screenId],
      references: [screens.id],
    }),
  }),
);

export const projectScreenSchemeRelations = relations(
  projectScreenSchemes,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectScreenSchemes.projectId],
      references: [projects.id],
    }),
    scheme: one(screenSchemes, {
      fields: [projectScreenSchemes.schemeId],
      references: [screenSchemes.id],
    }),
  }),
);

export const fieldConfigurationRelations = relations(
  fieldConfigurations,
  ({ many }) => ({
    items: many(fieldConfigurationItems),
    schemeItems: many(fieldConfigurationSchemeItems),
  }),
);

export const fieldConfigurationItemRelations = relations(
  fieldConfigurationItems,
  ({ one }) => ({
    configuration: one(fieldConfigurations, {
      fields: [fieldConfigurationItems.configId],
      references: [fieldConfigurations.id],
    }),
    field: one(fields, {
      fields: [fieldConfigurationItems.fieldId],
      references: [fields.id],
    }),
  }),
);

export const fieldConfigurationSchemeRelations = relations(
  fieldConfigurationSchemes,
  ({ many }) => ({
    items: many(fieldConfigurationSchemeItems),
    projectSchemes: many(projectFieldConfigurationSchemes),
  }),
);

export const fieldConfigurationSchemeItemRelations = relations(
  fieldConfigurationSchemeItems,
  ({ one }) => ({
    scheme: one(fieldConfigurationSchemes, {
      fields: [fieldConfigurationSchemeItems.schemeId],
      references: [fieldConfigurationSchemes.id],
    }),
    issueType: one(issueTypes, {
      fields: [fieldConfigurationSchemeItems.issueTypeId],
      references: [issueTypes.id],
    }),
    configuration: one(fieldConfigurations, {
      fields: [fieldConfigurationSchemeItems.configId],
      references: [fieldConfigurations.id],
    }),
  }),
);

export const projectFieldConfigurationSchemeRelations = relations(
  projectFieldConfigurationSchemes,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectFieldConfigurationSchemes.projectId],
      references: [projects.id],
    }),
    scheme: one(fieldConfigurationSchemes, {
      fields: [projectFieldConfigurationSchemes.schemeId],
      references: [fieldConfigurationSchemes.id],
    }),
  }),
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Screen = typeof screens.$inferSelect;
export type NewScreen = typeof screens.$inferInsert;

export type ScreenTab = typeof screenTabs.$inferSelect;
export type NewScreenTab = typeof screenTabs.$inferInsert;

export type ScreenTabField = typeof screenTabFields.$inferSelect;
export type NewScreenTabField = typeof screenTabFields.$inferInsert;

export type ScreenScheme = typeof screenSchemes.$inferSelect;
export type NewScreenScheme = typeof screenSchemes.$inferInsert;

export type ScreenSchemeItem = typeof screenSchemeItems.$inferSelect;
export type NewScreenSchemeItem = typeof screenSchemeItems.$inferInsert;

export type ProjectScreenScheme = typeof projectScreenSchemes.$inferSelect;
export type NewProjectScreenScheme = typeof projectScreenSchemes.$inferInsert;

export type FieldConfiguration = typeof fieldConfigurations.$inferSelect;
export type NewFieldConfiguration = typeof fieldConfigurations.$inferInsert;

export type FieldConfigurationItem =
  typeof fieldConfigurationItems.$inferSelect;
export type NewFieldConfigurationItem =
  typeof fieldConfigurationItems.$inferInsert;

export type FieldConfigurationScheme =
  typeof fieldConfigurationSchemes.$inferSelect;
export type NewFieldConfigurationScheme =
  typeof fieldConfigurationSchemes.$inferInsert;

export type FieldConfigurationSchemeItem =
  typeof fieldConfigurationSchemeItems.$inferSelect;
export type NewFieldConfigurationSchemeItem =
  typeof fieldConfigurationSchemeItems.$inferInsert;

export type ProjectFieldConfigurationScheme =
  typeof projectFieldConfigurationSchemes.$inferSelect;
export type NewProjectFieldConfigurationScheme =
  typeof projectFieldConfigurationSchemes.$inferInsert;

// Operation type for screen scheme items
export type ScreenOperation = 'create' | 'edit' | 'view';
