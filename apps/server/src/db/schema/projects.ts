import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { workflows } from './workflows';

// =============================================================================
// PROJECT SETTINGS TYPE
// =============================================================================

export type ProjectSettings = {
  // Issue key settings
  issueKeyPrefix?: string; // Override for issue key (default: project.key)
  nextIssueNumber?: number; // Counter for issue numbering

  // Default values
  defaultAssigneeRule?: 'unassigned' | 'project_lead' | 'component_lead';

  // Features
  enableTimeTracking?: boolean;
  enableSprints?: boolean;
  enableComponents?: boolean;
  enableVersions?: boolean;

  // Notifications
  notifyOnIssueCreate?: boolean;
  notifyOnIssueUpdate?: boolean;
  notifyOnComment?: boolean;
};

// =============================================================================
// PROJECTS
// =============================================================================

export const projects = pgTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Basic info
    name: text('name').notNull(),
    key: text('key').notNull().unique(), // PRJ, TASK, etc. - used in issue keys
    description: text('description'),
    icon: text('icon'),
    color: text('color').default('#6B7280'),

    // Project lead (responsible person)
    leadId: text('lead_id').references(() => user.id, { onDelete: 'set null' }),

    // Default workflow for new issue types
    defaultWorkflowId: text('default_workflow_id').references(
      () => workflows.id,
      { onDelete: 'set null' },
    ),

    // Project settings (JSONB for flexibility)
    settings: jsonb('settings').$type<ProjectSettings>().default({}),

    // Status
    isArchived: boolean('is_archived').default(false),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Optimistic concurrency control
    version: integer('version').notNull().default(1),

    // Audit fields
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('projects_lead_id_idx').on(table.leadId),
    index('projects_is_archived_idx').on(table.isArchived),
    index('projects_archived_lead_idx').on(table.isArchived, table.leadId),
  ],
);

// =============================================================================
// TEMPLATES (for creating new projects)
// =============================================================================

export const templates = pgTable('templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  icon: text('icon'),

  // Template can have a default workflow
  defaultWorkflowId: text('default_workflow_id').references(
    () => workflows.id,
    { onDelete: 'set null' },
  ),

  // Is this a system template?
  isSystem: boolean('is_system').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const projectRelations = relations(projects, ({ one, many }) => ({
  lead: one(user, {
    fields: [projects.leadId],
    references: [user.id],
  }),
  defaultWorkflow: one(workflows, {
    fields: [projects.defaultWorkflowId],
    references: [workflows.id],
  }),
}));

export const templateRelations = relations(templates, ({ one }) => ({
  defaultWorkflow: one(workflows, {
    fields: [templates.defaultWorkflowId],
    references: [workflows.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
