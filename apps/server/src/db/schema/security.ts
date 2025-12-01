import { relations } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { projects } from './projects';
import { projectRoles } from './permissions';
import { fields } from './field';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Security level member types
 */
export const securityLevelMemberTypeEnum = pgEnum('security_level_member_type', [
  'user', // Specific user
  'group', // User group
  'project_role', // Project role
  'reporter', // Issue reporter
  'assignee', // Current assignee
  'project_lead', // Project lead
  'current_user', // Currently logged in user
  'custom_field', // Users from a custom field (user picker)
]);

// ============================================================================
// SECURITY SCHEMES
// ============================================================================

/**
 * Issue security schemes
 * Similar to Jira's security schemes - container for security levels
 */
export const issueSecuritySchemes = pgTable('issue_security_schemes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  
  name: text('name').notNull(),
  description: text('description'),
  
  /**
   * Default scheme used when creating new projects
   */
  isDefault: boolean('is_default').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ============================================================================
// SECURITY LEVELS
// ============================================================================

/**
 * Security levels within a scheme
 * Each level defines who can see issues with this security level
 */
export const securityLevels = pgTable('security_levels', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  
  schemeId: text('scheme_id')
    .notNull()
    .references(() => issueSecuritySchemes.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  description: text('description'),
  
  /**
   * Sort order within the scheme
   */
  sortOrder: integer('sort_order').default(0).notNull(),
  
  /**
   * Whether this is the default level for the scheme
   */
  isDefault: boolean('is_default').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('security_levels_scheme_idx').on(table.schemeId),
  index('security_levels_sort_idx').on(table.schemeId, table.sortOrder),
]);

// ============================================================================
// SECURITY LEVEL MEMBERS
// ============================================================================

/**
 * Members who can access issues with a security level
 * Multiple member entries can be added to a security level
 */
export const securityLevelMembers = pgTable('security_level_members', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  
  levelId: text('level_id')
    .notNull()
    .references(() => securityLevels.id, { onDelete: 'cascade' }),
  
  /**
   * Type of member that can access
   */
  memberType: securityLevelMemberTypeEnum('member_type').notNull(),
  
  /**
   * For user, group, project_role types - the specific ID
   * Null for reporter, assignee, project_lead, current_user
   */
  memberId: text('member_id'),
  
  /**
   * For custom_field type - reference to the user picker field
   */
  customFieldId: text('custom_field_id')
    .references(() => fields.id, { onDelete: 'cascade' }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('security_level_members_level_idx').on(table.levelId),
  index('security_level_members_member_idx').on(table.memberType, table.memberId),
]);

// ============================================================================
// PROJECT SECURITY SCHEMES
// ============================================================================

/**
 * Assigns a security scheme to a project
 */
export const projectSecuritySchemes = pgTable('project_security_schemes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  
  schemeId: text('scheme_id')
    .notNull()
    .references(() => issueSecuritySchemes.id, { onDelete: 'restrict' }),
  
  /**
   * Default security level for new issues (optional)
   */
  defaultLevelId: text('default_level_id')
    .references(() => securityLevels.id, { onDelete: 'set null' }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // One scheme per project
  unique('project_security_schemes_project_unique').on(table.projectId),
  index('project_security_schemes_scheme_idx').on(table.schemeId),
]);

// ============================================================================
// RELATIONS
// ============================================================================

export const issueSecuritySchemesRelations = relations(issueSecuritySchemes, ({ many }) => ({
  levels: many(securityLevels),
  projectSchemes: many(projectSecuritySchemes),
}));

export const securityLevelsRelations = relations(securityLevels, ({ one, many }) => ({
  scheme: one(issueSecuritySchemes, {
    fields: [securityLevels.schemeId],
    references: [issueSecuritySchemes.id],
  }),
  members: many(securityLevelMembers),
}));

export const securityLevelMembersRelations = relations(securityLevelMembers, ({ one }) => ({
  level: one(securityLevels, {
    fields: [securityLevelMembers.levelId],
    references: [securityLevels.id],
  }),
  customField: one(fields, {
    fields: [securityLevelMembers.customFieldId],
    references: [fields.id],
  }),
}));

export const projectSecuritySchemesRelations = relations(projectSecuritySchemes, ({ one }) => ({
  project: one(projects, {
    fields: [projectSecuritySchemes.projectId],
    references: [projects.id],
  }),
  scheme: one(issueSecuritySchemes, {
    fields: [projectSecuritySchemes.schemeId],
    references: [issueSecuritySchemes.id],
  }),
  defaultLevel: one(securityLevels, {
    fields: [projectSecuritySchemes.defaultLevelId],
    references: [securityLevels.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type IssueSecurityScheme = typeof issueSecuritySchemes.$inferSelect;
export type InsertIssueSecurityScheme = typeof issueSecuritySchemes.$inferInsert;

export type SecurityLevel = typeof securityLevels.$inferSelect;
export type InsertSecurityLevel = typeof securityLevels.$inferInsert;

export type SecurityLevelMember = typeof securityLevelMembers.$inferSelect;
export type InsertSecurityLevelMember = typeof securityLevelMembers.$inferInsert;

export type ProjectSecurityScheme = typeof projectSecuritySchemes.$inferSelect;
export type InsertProjectSecurityScheme = typeof projectSecuritySchemes.$inferInsert;

export type SecurityLevelMemberType = (typeof securityLevelMemberTypeEnum.enumValues)[number];

// ============================================================================
// TYPE EXPORTS FOR REPOSITORY
// ============================================================================

export type SecuritySchemeWithLevels = IssueSecurityScheme & {
  levels: (SecurityLevel & {
    members: SecurityLevelMember[];
  })[];
};

export type SecurityLevelWithMembers = SecurityLevel & {
  members: SecurityLevelMember[];
};
