import {integer, pgTable, text} from "drizzle-orm/pg-core";

export const workflows = pgTable("workflows", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
})

export const templateWorkflows = pgTable("template_workflows", {
    id: text("id").primaryKey(),
    templateId: text("template_id")
        .notNull()
        .references(() => workflows.id, {onDelete: "cascade"}),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, {onDelete: "cascade"}),
})

export const projectWorkflows = pgTable("project_workflows", {
    id: text("id").primaryKey(),
    projectId: text("project_id")
        .notNull()
        .references(() => workflows.id, {onDelete: "cascade"}),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, {onDelete: "cascade"}),
})

export const workflowSteps = pgTable("workflow_steps", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, {onDelete: "cascade"}),
    sortOrder: integer("sort_order").notNull(),
})