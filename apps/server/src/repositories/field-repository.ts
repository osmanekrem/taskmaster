import {fieldOptions, fields, selectOptions} from "@/db/schema/field";
import {db} from "@/db";
import {and, asc, eq, inArray, notInArray} from "drizzle-orm";
import type {EditFieldSchema} from "@/schemas/fields";
import {fieldTypeOptions} from "@/db/schema/field-types";

// Bu bir "factory function" dır. Testlerde sahte (mock) bir db istemcisi enjekte etmemizi sağlar.
export const fieldRepository = (drizzle: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db) => ({
    findMany: () => drizzle.select().from(fields),

    findById: (id: string) => drizzle.query.fields.findFirst({where: eq(fields.id, id)}),

    findWithDetails: () =>
        drizzle.query.fields.findMany({
            with: {
                fieldType: true,
                options: {
                    orderBy: [asc(fieldTypeOptions.order)],
                    with: {
                        fieldTypeOption: true,
                        selectOptions: {orderBy: [asc(selectOptions.order)]},
                    },
                },
            },
        }),

    findWithDetailsById: (id: string) =>
        drizzle.query.fields.findFirst({
            where: eq(fields.id, id),
            with: {
                fieldType: true,
                options: {
                    orderBy: [asc(fieldTypeOptions.order)],
                    with: {
                        fieldTypeOption: true,
                        selectOptions: {orderBy: [asc(selectOptions.order)]},
                    },
                },
            },
        }),

    create: async (values: typeof fields.$inferInsert) => {
        const [result] = await drizzle.insert(fields).values(values).returning();
        return result;
    },

    update: async (id: string, values: EditFieldSchema) => {
        const [result] = await drizzle
            .update(fields)
            .set(values)
            .where(eq(fields.id, id))
            .returning();
        return result;
    },

    delete: async (id: string) => {
        const [result] = await drizzle
            .delete(fields)
            .where(eq(fields.id, id))
            .returning();
        return result;
    },

    findFieldTypeOptionsByTypeId: (fieldTypeId: string) =>
        drizzle
            .select()
            .from(fieldTypeOptions)
            .where(eq(fieldTypeOptions.fieldTypeId, fieldTypeId)),

    createManyFieldOptions: (values: (typeof fieldOptions.$inferInsert)[]) =>
        drizzle.insert(fieldOptions).values(values),

    updateFieldOptionValue: async (id: string, value: string) => {
        const [result] = await drizzle
            .update(fieldOptions)
            .set({value})
            .where(eq(fieldOptions.id, id))
            .returning();
        return result;
    },

    findSelectOptionsByFieldOptionIds: (ids: string[]) => {
        if (ids.length === 0) return [];
        return drizzle.select().from(selectOptions).where(inArray(selectOptions.fieldOptionId, ids)).orderBy(asc(selectOptions.order));
    },

    deleteSelectOptionsNotInList: (fieldOptionId: string, idsToKeep: string[]) => {
        const condition = idsToKeep.length > 0
            ? and(
                eq(selectOptions.fieldOptionId, fieldOptionId),
                notInArray(selectOptions.id, idsToKeep)
            )
            : eq(selectOptions.fieldOptionId, fieldOptionId);

        return drizzle.delete(selectOptions).where(condition);
    },

    createManySelectOptions: (values: (typeof selectOptions.$inferInsert)[]) =>
        drizzle.insert(selectOptions).values(values),

    updateSelectOption: (id: string, values: { name: string; icon: string; order: number }) =>
        drizzle.update(selectOptions).set(values).where(eq(selectOptions.id, id)),
});