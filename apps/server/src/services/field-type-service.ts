import { db } from "@/db";
import { fieldTypeRepository } from "@/repositories/field-type-repository";
import type {
  CreateFieldTypeSchema,
  EditFieldTypeSchema,
  GetFieldTypeByIdRequestSchema,
  GetFieldTypeWithOptionsByIdRequestSchema,
  DeleteFieldTypeRequestSchema,
} from "@taskmaster/validation";
import { throwNotFoundError } from "@/lib/errors";
import type { DrizzleClient } from "@/lib/types/db";

export const fieldTypeService = (drizzle: DrizzleClient = db) => {
    const repository = fieldTypeRepository(drizzle);

    return {
        getAllFieldTypes: () => repository.findMany(),

        getFieldTypeById: (input: GetFieldTypeByIdRequestSchema) =>
            repository.findById(input.fieldTypeId),

        getAllFieldTypesWithOptions: () => repository.findWithOptions(),

        getFieldTypeWithOptionsById: (input: GetFieldTypeWithOptionsByIdRequestSchema) =>
            repository.findWithOptionsById(input.fieldTypeId),

        createFieldType: async (data: CreateFieldTypeSchema) => {
            return await repository.create(data);
        },

        updateFieldType: async (data: EditFieldTypeSchema) => {
            const existingFieldType = await repository.findById(data.fieldTypeId);
            if (!existingFieldType) {
                throwNotFoundError("FIELD_TYPE_NOT_FOUND", { fieldTypeId: data.fieldTypeId });
            }

            const { fieldTypeId, ...updateData } = data;
            return await repository.update(fieldTypeId, updateData);
        },

        deleteFieldType: async (input: DeleteFieldTypeRequestSchema) => {
            const existingFieldType = await repository.findById(input.fieldTypeId);
            if (!existingFieldType) {
                throwNotFoundError("FIELD_TYPE_NOT_FOUND", { fieldTypeId: input.fieldTypeId });
            }

            return await repository.delete(input.fieldTypeId);
        },
    };
};

