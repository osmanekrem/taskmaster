import {pgTable, smallint, text} from "drizzle-orm/pg-core";
import {fieldTypeOptions, fieldTypes} from "@/db/schema/field-types";
import {relations} from "drizzle-orm";

export const fields = pgTable("fields", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    fieldTypeId: text("field_type_id")
        .notNull()
        .references(() => fieldTypes.id, {onDelete: "cascade"}),
});

export const fieldOptions = pgTable("field-options", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    fieldId: text("field_id")
        .notNull()
        .references(() => fields.id, {onDelete: "cascade"}),
    fieldTypeId: text("field_type_id")
        .notNull()
        .references(() => fieldTypes.id, {onDelete: "cascade"}),
    fieldTypeOptionId: text("field_type_option_id")
        .notNull()
        .references(() => fieldTypeOptions.id, {onDelete: "cascade"}),
    value: text("value").notNull(),
    order: smallint("order").notNull().default(0)
});

export const selectOptions = pgTable("select-options", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    fieldOptionId: text("field_option_id")
        .notNull()
        .references(() => fieldOptions.id, {onDelete: "cascade"}),
    name: text("name").notNull(),
    icon: text("icon"),
    order: smallint("order").notNull().default(0)
});

export const fieldsRelations = relations(fields, ({one, many}) => ({
    fieldType: one(fieldTypes, {
        fields: [fields.fieldTypeId],
        references: [fieldTypes.id],
    }),
    options: many(fieldOptions),
}));

export const fieldOptionsRelations = relations(fieldOptions, ({one, many}) => ({
    field: one(fields, {
        fields: [fieldOptions.fieldId],
        references: [fields.id],
    }),
    fieldTypeOption: one(fieldTypeOptions, {
        fields: [fieldOptions.fieldTypeOptionId],
        references: [fieldTypeOptions.id],
    }),
    selectOptions: many(selectOptions),
}));

export const selectOptionsRelations = relations(selectOptions, ({one}) => ({
    fieldOption: one(fieldOptions, {
        fields: [selectOptions.fieldOptionId],
        references: [fieldOptions.id],
    }),
}));
