import {pgTable, text} from "drizzle-orm/pg-core";
import {projects, templates} from "@/db/schema/projects";
import {fields} from "@/db/schema/field";

export const issueTypes = pgTable("issue_types", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
});

export const templateIssueTypes = pgTable("template_issue_types", {
    id: text("id").primaryKey(),
    templateId: text("template_id")
        .notNull()
        .references(() => templates.id, {onDelete: "cascade"}),
    issueTypeId: text("issue_type_id")
        .notNull()
        .references(() => issueTypes.id, {onDelete: "cascade"}),
});

export const projectIssueTypes = pgTable("project_issue_types", {
    id: text("id").primaryKey(),
    projectId: text("project_id")
        .notNull()
        .references(() => projects.id, {onDelete: "cascade"}),
    issueTypeId: text("issue_type_id")
        .notNull()
        .references(() => issueTypes.id, {onDelete: "cascade"}),
});

export const fieldIssueTypes = pgTable("field_issue_types", {
    id: text("id").primaryKey(),
    issueTypeId: text("issue_type_id")
        .notNull()
        .references(() => issueTypes.id, {onDelete: "cascade"}),
    fieldId: text("field_id")
        .notNull()
        .references(() => fields.id, {onDelete: "cascade"}),
});