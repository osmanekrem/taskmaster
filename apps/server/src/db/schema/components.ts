// =============================================================================
// COMPONENTS SCHEMA
// Project components for organizing issues
// =============================================================================

import { pgTable, uuid, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { user } from './auth';

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Project components for categorizing issues
 * Examples: Backend, Frontend, API, Database, Auth
 */
export const components = pgTable('components', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Project association
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  // Component details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // Component lead (optional)
  leadId: uuid('lead_id').references(() => user.id, { onDelete: 'set null' }),
  
  // Default assignee for issues in this component (optional)
  defaultAssigneeId: uuid('default_assignee_id').references(() => user.id, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Index for project queries
  index('components_project_id_idx').on(table.projectId),
  
  // Index for lead queries
  index('components_lead_id_idx').on(table.leadId),
  
  // Unique constraint: component name per project
  unique('components_project_name_unique').on(table.projectId, table.name),
]);

// =============================================================================
// ISSUE COMPONENTS (junction table)
// =============================================================================

/**
 * Many-to-many relationship between issues and components
 */
export const issueComponents = pgTable('issue_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Issue reference (imported dynamically to avoid circular deps)
  issueId: uuid('issue_id').notNull(),
  
  // Component reference
  componentId: uuid('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Indexes for queries
  index('issue_components_issue_id_idx').on(table.issueId),
  index('issue_components_component_id_idx').on(table.componentId),
  
  // Unique constraint: each issue-component pair
  unique('issue_components_unique').on(table.issueId, table.componentId),
]);

// =============================================================================
// RELATIONS
// =============================================================================

export const componentsRelations = relations(components, ({ one, many }) => ({
  project: one(projects, {
    fields: [components.projectId],
    references: [projects.id],
  }),
  lead: one(user, {
    fields: [components.leadId],
    references: [user.id],
    relationName: 'componentLead',
  }),
  defaultAssignee: one(user, {
    fields: [components.defaultAssigneeId],
    references: [user.id],
    relationName: 'componentDefaultAssignee',
  }),
  issueComponents: many(issueComponents),
}));

export const issueComponentsRelations = relations(issueComponents, ({ one }) => ({
  component: one(components, {
    fields: [issueComponents.componentId],
    references: [components.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type Component = typeof components.$inferSelect;
export type NewComponent = typeof components.$inferInsert;
export type IssueComponent = typeof issueComponents.$inferSelect;
export type NewIssueComponent = typeof issueComponents.$inferInsert;
