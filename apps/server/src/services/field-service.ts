import { db } from '@/db';
import { fieldRepository } from '@/repositories/field-repository';
import {
  type CreateFieldSchema,
  type EditFieldSchema,
  type SelectOptionSchema,
  type FieldWithDetailsSchema,
} from '@/schemas/fields';

export const fieldService = (
  drizzle: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) => {
  const repository = fieldRepository(drizzle);

  return {
    getAllFields: () => repository.findMany(),

    getFieldById: (id: string) => repository.findById(id),

    getAllFieldsWithDetails: () => repository.findWithDetails(),

    getFieldWithDetailsById: (id: string) => repository.findWithDetailsById(id),

    createField: async (data: CreateFieldSchema) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        // Create the field
        const newField = await repo.create(data);

        // Get related field type options
        const relatedFieldTypeOptions = await repo.findFieldTypeOptionsByTypeId(
          newField.fieldTypeId,
        );

        // Create field options with default values
        if (relatedFieldTypeOptions.length > 0) {
          const newFieldOptions = relatedFieldTypeOptions.map((option) => ({
            fieldId: newField.id,
            fieldTypeId: option.fieldTypeId,
            fieldTypeOptionId: option.id,
            value:
              option.type === 'string'
                ? ''
                : option.type === 'number'
                ? '0'
                : option.type === 'boolean'
                ? 'false'
                : '',
            order: option.order,
          }));

          await repo.createManyFieldOptions(newFieldOptions);
        }

        return newField;
      });
    },

    updateField: async (id: string, data: Omit<EditFieldSchema, 'fieldId'>) => {
      const existingField = await repository.findById(id);
      if (!existingField) {
        throw new Error('Alan bulunamadı');
      }

      return await repository.update(id, data as EditFieldSchema);
    },

    deleteField: async (id: string) => {
      const existingField = await repository.findById(id);
      if (!existingField) {
        throw new Error('Alan bulunamadı');
      }

      return await repository.delete(id);
    },

    updateFieldOptionValue: async (fieldOptionId: string, value: string) => {
      return await repository.updateFieldOptionValue(fieldOptionId, value);
    },

    getSelectOptionsByFieldOptionIds: (fieldOptionIds: string[]) =>
      repository.findSelectOptionsByFieldOptionIds(fieldOptionIds),

    saveSelectOptions: async (
      fieldOptionId: string,
      options: SelectOptionSchema[],
    ) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        const incomingOptionIds = options
          .map((opt) => opt.id)
          .filter((id): id is string => !!id);

        // Delete options that are not in the incoming list
        await repo.deleteSelectOptionsNotInList(
          fieldOptionId,
          incomingOptionIds,
        );

        // Insert new options
        const optionsToInsert = options
          .filter((opt) => !opt.id)
          .map((opt) => ({
            name: opt.name,
            icon: opt.icon || '',
            fieldOptionId,
            order: opt.order,
          }));

        if (optionsToInsert.length > 0) {
          await repo.createManySelectOptions(optionsToInsert);
        }

        // Update existing options
        const optionsToUpdate = options.filter((opt) => !!opt.id);
        for (const option of optionsToUpdate) {
          await repo.updateSelectOption(option.id!, {
            name: option.name,
            icon: option.icon || '',
            order: option.order,
          });
        }

        return await repo.findSelectOptionsByFieldOptionIds([fieldOptionId]);
      });
    },

    saveIssueTypeFields: async (
      issueTypeId: string,
      fields: FieldWithDetailsSchema[],
    ) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        const existingFields = await repo.findIssueTypeFieldsByIssueTypeId(
          issueTypeId,
        );

        for (const field of existingFields) {
          if (!field?.id) continue;
          if (!fields.some((f) => f?.id === field.id)) {
            await repo.deleteIssueTypeField(issueTypeId, field.id);

            const deletedField = fields.find((f) => f?.id === field.id);
            if (deletedField) {
              await repo.deleteIssueTypeFieldOptions(
                deletedField.options
                  .map((o) => o?.id)
                  .filter((id): id is string => !!id) || [],
              );
            }
          } else {
            const existingField = fields.find((f) => f?.id === field.id);
            if (existingField) {
              existingField.options?.forEach(async (option) => {
                await repo.updateIssueTypeFieldOptionValue(
                  field.id,
                  option.id!,
                  option.value,
                );
                option.selectOptions?.forEach(async (selectOption) => {
                  await repo.updateIssueTypeSelectOption(
                    option.id!,
                    selectOption.name,
                    selectOption.icon || '',
                    selectOption.order,
                  );
                });
              });
            }
          }
        }

        for (const [index, field] of fields.entries()) {
          if (!field?.id) continue;
          if (!existingFields.some((f) => f?.id === field.id)) {
            const newField = await repo.createIssueTypeField(
              issueTypeId,
              field.id,
              index,
            );
            field.options?.forEach(async (option: any) => {
              await repo
                .createIssueTypeFieldOption(
                  newField.id,
                  option.id,
                  option.value,
                )
                .then(async (result) => {
                  if (result) {
                    await repo.createManyIssueTypeSelectOptions(
                      option.selectOptions?.map(
                        (selectOption: SelectOptionSchema) => ({
                          fieldOptionId: result.id,
                          name: selectOption.name,
                          icon: selectOption.icon || '',
                          order: selectOption.order || 0,
                        }),
                      ),
                    );
                  }
                });
            });
          }
        }
        return await repo.findIssueTypeFieldsByIssueTypeId(issueTypeId);
      });
    },

    getIssueTypeFieldsByIssueTypeId: async (issueTypeId: string) => {
      return await repository.findIssueTypeFieldsByIssueTypeId(issueTypeId);
    },
  };
};
