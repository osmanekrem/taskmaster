import { db } from '@/db';
import { fieldRepository } from '@/repositories/field-repository';
import {
  type CreateFieldSchema,
  type EditFieldSchema,
  type SelectOptionSchema,
  type GetFieldByIdRequestSchema,
  type DeleteFieldRequestSchema,
  type UpdateFieldOptionValueRequestSchema,
  type GetSelectOptionsByFieldOptionIdsRequestSchema,
  type SaveSelectOptionsRequestSchema,
  type SaveIssueTypeFieldsRequestSchema,
  type GetIssueTypeFieldsByIssueTypeIdRequestSchema,
} from '@taskmaster/validation';
import { throwNotFoundError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

export const fieldService = (drizzle: DrizzleClientOrTransaction = db) => {
  const repository = fieldRepository(drizzle);

  return {
    getAllFields: () => repository.findMany(),

    getFieldById: (input: GetFieldByIdRequestSchema) =>
      repository.findById(input.fieldId),

    getAllFieldsWithDetails: () => repository.findWithDetails(),

    getFieldWithDetailsById: (input: GetFieldByIdRequestSchema) =>
      repository.findWithDetailsById(input.fieldId),

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

    updateField: async (data: EditFieldSchema) => {
      const existingField = await repository.findById(data.fieldId);
      if (!existingField) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId: data.fieldId });
      }

      const { fieldId, ...updateData } = data;
      return await repository.update(fieldId, updateData);
    },

    deleteField: async (input: DeleteFieldRequestSchema) => {
      const existingField = await repository.findById(input.fieldId);
      if (!existingField) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId: input.fieldId });
      }

      return await repository.delete(input.fieldId);
    },

    updateFieldOptionValue: async (
      input: UpdateFieldOptionValueRequestSchema,
    ) => {
      return await repository.updateFieldOptionValue(
        input.fieldOptionId,
        input.value,
      );
    },

    getSelectOptionsByFieldOptionIds: (
      input: GetSelectOptionsByFieldOptionIdsRequestSchema,
    ) => repository.findSelectOptionsByFieldOptionIds(input.fieldOptionIds),

    saveSelectOptions: async (input: SaveSelectOptionsRequestSchema) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        const incomingOptionIds = input.options
          .map((opt) => opt.id)
          .filter((id): id is string => !!id);

        // Delete options that are not in the incoming list
        await repo.deleteSelectOptionsNotInList(
          input.fieldOptionId,
          incomingOptionIds,
        );

        // Insert new options
        const optionsToInsert = input.options
          .filter((opt) => !opt.id)
          .map((opt) => ({
            name: opt.name,
            icon: opt.icon || '',
            fieldOptionId: input.fieldOptionId,
            order: opt.order,
          }));

        if (optionsToInsert.length > 0) {
          await repo.createManySelectOptions(optionsToInsert);
        }

        // Update existing options
        const optionsToUpdate = input.options.filter((opt) => !!opt.id);
        for (const option of optionsToUpdate) {
          await repo.updateSelectOption(option.id!, {
            name: option.name,
            icon: option.icon || '',
            order: option.order,
          });
        }

        return await repo.findSelectOptionsByFieldOptionIds([
          input.fieldOptionId,
        ]);
      });
    },

    saveIssueTypeFields: async (input: SaveIssueTypeFieldsRequestSchema) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        const existingFields = await repo.findIssueTypeFieldsByIssueTypeId(
          input.issueTypeId,
        );

        // Get incoming field template IDs as a Set for efficient lookup
        const incomingFieldIds = new Set(
          input.fields.map((f) => f?.id).filter((id): id is string => !!id),
        );

        // Delete fields that are not in the incoming list
        // Compare fieldId (field template ID) from existingFields with id from incoming fields
        for (const existingField of existingFields) {
          if (!existingField?.fieldId) continue;
          if (!incomingFieldIds.has(existingField.fieldId)) {
            // Delete the issue type field (cascade will delete options and select options)
            await repo.deleteIssueTypeField(
              input.issueTypeId,
              existingField.fieldId,
            );
          }
        }

        // Process each incoming field
        for (const [index, field] of input.fields.entries()) {
          if (!field?.id) continue;

          // Find existing issue type field by field template ID
          const existingIssueTypeField = existingFields.find(
            (f) => f.fieldId === field.id,
          );

          if (existingIssueTypeField) {
            // Update existing field: update order and options
            // Note: We don't update the order in the database here since there's no update method
            // If order update is needed, we'd need to add an update method to the repository

            // Update field options
            if (field.options) {
              for (const option of field.options) {
                if (!option.id) continue;

                // Update option value using issueTypeFieldOption ID (not template fieldOptionId)
                await repo.updateIssueTypeFieldOptionValueById(
                  option.id,
                  option.value,
                );

                // Handle select options: delete, create, update
                if (option.selectOptions) {
                  const incomingSelectOptionIds = option.selectOptions
                    .map((so) => so.id)
                    .filter((id): id is string => !!id);

                  // Delete select options not in the incoming list
                  // option.id is the issueTypeFieldOption ID
                  await repo.deleteIssueTypeSelectOptionsNotInList(
                    option.id,
                    incomingSelectOptionIds,
                  );

                  // Process each select option
                  for (const selectOption of option.selectOptions) {
                    if (selectOption.id) {
                      // Update existing select option
                      await repo.updateIssueTypeSelectOptionById(
                        selectOption.id,
                        selectOption.name,
                        selectOption.icon || '',
                        selectOption.order,
                      );
                    } else {
                      // Create new select option
                      // option.id is the issueTypeFieldOption ID
                      await repo.createIssueTypeSelectOption(
                        option.id,
                        selectOption.name,
                        selectOption.icon || '',
                        selectOption.order,
                      );
                    }
                  }
                }
              }
            }
          } else {
            // Create new issue type field
            const newIssueTypeField = await repo.createIssueTypeField(
              input.issueTypeId,
              field.id,
              index,
            );

            // Create field options
            if (field.options) {
              for (const option of field.options) {
                if (!option.id) continue;

                const newFieldOption = await repo.createIssueTypeFieldOption(
                  newIssueTypeField.id,
                  option.id,
                  option.value,
                );

                // Create select options if they exist
                if (option.selectOptions && option.selectOptions.length > 0) {
                  await repo.createManyIssueTypeSelectOptions(
                    option.selectOptions.map(
                      (selectOption: SelectOptionSchema) => ({
                        fieldOptionId: newFieldOption.id,
                        name: selectOption.name,
                        icon: selectOption.icon || '',
                        order: selectOption.order || 0,
                      }),
                    ),
                  );
                }
              }
            }
          }
        }

        return await repo.findIssueTypeFieldsByIssueTypeId(input.issueTypeId);
      });
    },

    getIssueTypeFieldsByIssueTypeId: async (
      input: GetIssueTypeFieldsByIssueTypeIdRequestSchema,
    ) => {
      return await repository.findIssueTypeFieldsByIssueTypeId(
        input.issueTypeId,
      );
    },
  };
};
