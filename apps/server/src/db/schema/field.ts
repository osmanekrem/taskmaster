import { pgTable, smallint, text } from "drizzle-orm/pg-core";
import { fieldTypeOptions, fieldTypes } from "@/db/schema/field-types";

export const fields = pgTable("fields", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  fieldTypeId: text("field_type_id")
    .notNull()
    .references(() => fieldTypes.id, { onDelete: "cascade" }),
});

export const fieldOptions = pgTable("field-options", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fieldId: text("field_id")
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  fieldTypeId: text("field_type_id")
    .notNull()
    .references(() => fieldTypes.id, { onDelete: "cascade" }),
  fieldTypeOptionId: text("field_type_option_id")
    .notNull()
    .references(() => fieldTypeOptions.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

export const selectOptions = pgTable("select-options", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fieldOptionId: text("field_option_id")
    .notNull()
    .references(() => fieldOptions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  order: smallint("order").notNull(),
});
