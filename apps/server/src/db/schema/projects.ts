import {pgTable, text, timestamp} from "drizzle-orm/pg-core";

export const projects = pgTable('projects', {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
})

export const templates = pgTable('templates', {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
})

