import {pgTable, text} from "drizzle-orm/pg-core";
import {fieldTypes} from "@/db/schema/field-types";

export const fields = pgTable("fields", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    fieldTypeId: text("field_type_id").notNull().references(
        () => fieldTypes.id,
        {onDelete: "cascade"},
    ),
})

