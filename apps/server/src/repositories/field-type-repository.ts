import { fieldTypeOptions, fieldTypes } from "@/db/schema/field-types";
import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import type { CreateFieldTypeSchema, EditFieldTypeSchema } from "@taskmaster/validation";

type DrizzleClient = typeof db;

export const fieldTypeRepository = (drizzle: DrizzleClient = db) => ({
    findMany: () => drizzle.select().from(fieldTypes),

    findById: (id: string) => 
        drizzle.query.fieldTypes.findFirst({ 
            where: eq(fieldTypes.id, id) 
        }),

    findWithOptions: () =>
        drizzle.query.fieldTypes.findMany({
            with: {
                options: {
                    orderBy: [asc(fieldTypeOptions.order)],
                },
            },
        }),

    findWithOptionsById: (id: string) =>
        drizzle.query.fieldTypes.findFirst({
            where: eq(fieldTypes.id, id),
            with: {
                options: {
                    orderBy: [asc(fieldTypeOptions.order)],
                },
            },
        }),

    create: async (values: CreateFieldTypeSchema) => {
        const [result] = await drizzle
            .insert(fieldTypes)
            .values(values)
            .returning();
        return result;
    },

    update: async (id: string, values: Omit<EditFieldTypeSchema, 'fieldTypeId'>) => {
        const [result] = await drizzle
            .update(fieldTypes)
            .set(values)
            .where(eq(fieldTypes.id, id))
            .returning();
        return result;
    },

    delete: async (id: string) => {
        const [result] = await drizzle
            .delete(fieldTypes)
            .where(eq(fieldTypes.id, id))
            .returning();
        return result;
    },
});

