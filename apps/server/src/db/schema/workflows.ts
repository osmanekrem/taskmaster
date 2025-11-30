import { integer, pgTable, text, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects, templates } from "./projects";
import { statuses } from "./statuses";

// =============================================================================
// WORKFLOWS
// =============================================================================

export const workflows = pgTable("workflows", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// WORKFLOW - TEMPLATE/PROJECT JUNCTIONS
// =============================================================================

export const templateWorkflows = pgTable("template_workflows", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id")
        .notNull()
        .references(() => templates.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, { onDelete: "cascade" }),
});

export const projectWorkflows = pgTable("project_workflows", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, { onDelete: "cascade" }),
});

// =============================================================================
// WORKFLOW STATUSES (which statuses are in this workflow)
// =============================================================================

export const workflowStatuses = pgTable("workflow_statuses", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, { onDelete: "cascade" }),
    statusId: text("status_id")
        .notNull()
        .references(() => statuses.id, { onDelete: "cascade" }),
    isInitial: boolean("is_initial").default(false),
    sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ({
    uniqueWorkflowStatus: unique("workflow_statuses_unique").on(table.workflowId, table.statusId),
}));

// =============================================================================
// WORKFLOW TRANSITIONS
// =============================================================================

export const workflowTransitions = pgTable("workflow_transitions", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    
    // NULL = global transition (from any status)
    fromStatusId: text("from_status_id")
        .references(() => statuses.id, { onDelete: "cascade" }),
    toStatusId: text("to_status_id")
        .notNull()
        .references(() => statuses.id, { onDelete: "cascade" }),
    
    // Transition rules (JSONB for flexibility)
    // Conditions: Who can execute this transition
    // Example: [{ type: 'user_in_project_role', roleId: 'xxx' }]
    conditions: jsonb("conditions").default([]),
    
    // Validators: What must be true before transition
    // Example: [{ type: 'field_required', fieldId: 'xxx' }]
    validators: jsonb("validators").default([]),
    
    // Post Functions: What happens after transition
    // Example: [{ type: 'set_field', fieldId: 'xxx', value: 'yyy' }]
    postFunctions: jsonb("post_functions").default([]),
    
    // Screen to show during transition (Phase 11)
    screenId: text("screen_id"),
    
    sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ({
    uniqueTransition: unique("workflow_transitions_unique").on(table.workflowId, table.fromStatusId, table.toStatusId),
}));

// =============================================================================
// RELATIONS
// =============================================================================

export const workflowRelations = relations(workflows, ({ many }) => ({
    statuses: many(workflowStatuses),
    transitions: many(workflowTransitions),
    templateWorkflows: many(templateWorkflows),
    projectWorkflows: many(projectWorkflows),
}));

export const workflowStatusRelations = relations(workflowStatuses, ({ one }) => ({
    workflow: one(workflows, {
        fields: [workflowStatuses.workflowId],
        references: [workflows.id],
    }),
    status: one(statuses, {
        fields: [workflowStatuses.statusId],
        references: [statuses.id],
    }),
}));

export const workflowTransitionRelations = relations(workflowTransitions, ({ one }) => ({
    workflow: one(workflows, {
        fields: [workflowTransitions.workflowId],
        references: [workflows.id],
    }),
    fromStatus: one(statuses, {
        fields: [workflowTransitions.fromStatusId],
        references: [statuses.id],
    }),
    toStatus: one(statuses, {
        fields: [workflowTransitions.toStatusId],
        references: [statuses.id],
    }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowStatus = typeof workflowStatuses.$inferSelect;
export type NewWorkflowStatus = typeof workflowStatuses.$inferInsert;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;
export type NewWorkflowTransition = typeof workflowTransitions.$inferInsert;