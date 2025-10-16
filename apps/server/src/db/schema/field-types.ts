import {pgTable, text} from "drizzle-orm/pg-core";

export const fieldTypes = pgTable("field-types", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    component: text("component").notNull(),
    icon: text("icon").notNull(),
})

export const fieldTypeOptions = pgTable("field-type-options", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    fieldTypeId: text("field_type_id").notNull().references(
        () => fieldTypes.id,
        {onDelete: "cascade"},
    ),
    name: text("name").notNull(),
    type: text("type").notNull(),
})