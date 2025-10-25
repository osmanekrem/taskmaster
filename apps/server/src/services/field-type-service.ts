import { db } from "@/db";
import { fieldTypeRepository } from "@/repositories/field-type-repository";
import type { CreateFieldTypeSchema, EditFieldTypeSchema } from "@/schemas/field-types";

type DrizzleClient = typeof db;

export const fieldTypeService = (drizzle: DrizzleClient = db) => {
    const repository = fieldTypeRepository(drizzle);

    return {
        getAllFieldTypes: () => repository.findMany(),

        getFieldTypeById: (id: string) => repository.findById(id),

        getAllFieldTypesWithOptions: () => repository.findWithOptions(),

        getFieldTypeWithOptionsById: (id: string) => repository.findWithOptionsById(id),

        createFieldType: async (data: CreateFieldTypeSchema) => {
            return await repository.create(data);
        },

        updateFieldType: async (id: string, data: Omit<EditFieldTypeSchema, 'fieldTypeId'>) => {
            const existingFieldType = await repository.findById(id);
            if (!existingFieldType) {
                throw new Error("Alan türü bulunamadı");
            }

            return await repository.update(id, data);
        },

        deleteFieldType: async (id: string) => {
            const existingFieldType = await repository.findById(id);
            if (!existingFieldType) {
                throw new Error("Alan türü bulunamadı");
            }

            return await repository.delete(id);
        },
    };
};

