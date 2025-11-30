import { db } from '@/db';
import { fieldRepository } from '@/repositories/field-repository';
import type {
  CreateFieldSchema,
  EditFieldSchema,
  GetFieldByIdRequestSchema,
  DeleteFieldRequestSchema,
} from '@taskmaster/validation';
import { throwNotFoundError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type { FieldConfig, FieldSelectOption } from '@/db/schema/field';
import {
  resolveFieldConfig,
  resolveFieldsForIssueType,
  type ResolvedField,
} from './field-config-resolver';
import { getDefaultConfig } from '@taskmaster/constants';

// Input types for service methods - exported for type inference
export interface SaveIssueTypeFieldsInput {
  issueTypeId: string;
  fields: Array<{
    id: string;
    configOverride?: FieldConfig | null;
    optionsOverride?: FieldSelectOption[] | null;
  }>;
}

export interface UpdateIssueTypeFieldInput {
  issueTypeId: string;
  fieldId: string;
  configOverride?: FieldConfig | null;
  optionsOverride?: FieldSelectOption[] | null;
}

export interface GetIssueTypeFieldsInput {
  issueTypeId: string;
}

export const fieldService = (drizzle: DrizzleClientOrTransaction = db) => {
  const repository = fieldRepository(drizzle);

  return {
    /**
     * Get all fields (without issue type context)
     */
    getAllFields: () => repository.findMany(),

    /**
     * Get a field by ID (without issue type context)
     */
    getFieldById: async (input: GetFieldByIdRequestSchema) => {
      const field = await repository.findById(input.fieldId);
      if (!field) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId: input.fieldId });
      }
      return field;
    },

    /**
     * Get all fields with resolved default config
     */
    getAllFieldsWithDefaults: async () => {
      const fields = await repository.findMany();
      return fields.map((field) => {
        const { config, options } = resolveFieldConfig(field);
        return { ...field, config, options };
      });
    },

    /**
     * Create a new field
     */
    createField: async (data: CreateFieldSchema) => {
      // Get default config for the field type
      const defaultConfig = getDefaultConfig(data.fieldType);

      return await repository.create({
        name: data.name,
        fieldType: data.fieldType,
        icon: data.icon,
        config: data.config ?? defaultConfig,
        options: data.options ?? [],
      });
    },

    /**
     * Update a field
     */
    updateField: async (data: EditFieldSchema) => {
      const existingField = await repository.findById(data.fieldId);
      if (!existingField) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId: data.fieldId });
      }

      const { fieldId, ...updateData } = data;
      return await repository.update(fieldId, updateData);
    },

    /**
     * Delete a field
     */
    deleteField: async (input: DeleteFieldRequestSchema) => {
      const existingField = await repository.findById(input.fieldId);
      if (!existingField) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId: input.fieldId });
      }

      return await repository.delete(input.fieldId);
    },

    /**
     * Get resolved fields for an issue type
     * Returns fields with merged config (base + override)
     */
    getResolvedFieldsForIssueType: async (
      input: GetIssueTypeFieldsInput,
    ): Promise<ResolvedField[]> => {
      const issueTypeFields =
        await repository.findIssueTypeFieldsWithFieldByIssueTypeId(
          input.issueTypeId,
        );

      return resolveFieldsForIssueType(issueTypeFields);
    },

    /**
     * Get raw issue type fields (without resolved config)
     */
    getIssueTypeFieldsByIssueTypeId: async (input: GetIssueTypeFieldsInput) => {
      return await repository.findIssueTypeFieldsByIssueTypeId(input.issueTypeId);
    },

    /**
     * Save fields for an issue type
     * Handles adding new fields and removing fields not in the list
     */
    saveIssueTypeFields: async (input: SaveIssueTypeFieldsInput) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        // Get existing fields for this issue type
        const existingIssueTypeFields =
          await repo.findIssueTypeFieldsByIssueTypeId(input.issueTypeId);

        const existingFieldIds = new Set(
          existingIssueTypeFields.map((f) => f.fieldId),
        );
        const incomingFieldIds = new Set(input.fields.map((f) => f.id));

        // Remove fields not in incoming list
        const fieldsToRemove = existingIssueTypeFields.filter(
          (f) => !incomingFieldIds.has(f.fieldId),
        );
        for (const field of fieldsToRemove) {
          await repo.removeFieldFromIssueType(input.issueTypeId, field.fieldId);
        }

        // Add new fields or update existing ones
        for (let index = 0; index < input.fields.length; index++) {
          const field = input.fields[index];

          if (existingFieldIds.has(field.id)) {
            // Update existing field
            await repo.updateIssueTypeField(input.issueTypeId, field.id, {
              order: index,
              configOverride: field.configOverride,
              optionsOverride: field.optionsOverride,
            });
          } else {
            // Add new field
            await repo.addFieldToIssueType(input.issueTypeId, field.id, {
              order: index,
              configOverride: field.configOverride,
              optionsOverride: field.optionsOverride,
            });
          }
        }

        // Return resolved fields
        const updatedIssueTypeFields =
          await repo.findIssueTypeFieldsWithFieldByIssueTypeId(input.issueTypeId);

        return resolveFieldsForIssueType(updatedIssueTypeFields);
      });
    },

    /**
     * Update a single issue type field's override config
     */
    updateIssueTypeFieldOverride: async (input: UpdateIssueTypeFieldInput) => {
      const issueTypeField = await repository.findIssueTypeField(
        input.issueTypeId,
        input.fieldId,
      );

      if (!issueTypeField) {
        throwNotFoundError('ISSUE_TYPE_FIELD_NOT_FOUND', {
          issueTypeId: input.issueTypeId,
          fieldId: input.fieldId,
        });
      }

      return await repository.updateIssueTypeField(
        input.issueTypeId,
        input.fieldId,
        {
          configOverride: input.configOverride,
          optionsOverride: input.optionsOverride,
        },
      );
    },

    /**
     * Add a field to an issue type
     */
    addFieldToIssueType: async (
      issueTypeId: string,
      fieldId: string,
      order: number,
      configOverride?: FieldConfig | null,
      optionsOverride?: FieldSelectOption[] | null,
    ) => {
      // Check if field exists
      const field = await repository.findById(fieldId);
      if (!field) {
        throwNotFoundError('FIELD_NOT_FOUND', { fieldId });
      }

      // Check if already assigned
      const existing = await repository.findIssueTypeField(issueTypeId, fieldId);
      if (existing) {
        throw new Error('Field is already assigned to this issue type');
      }

      return await repository.addFieldToIssueType(issueTypeId, fieldId, {
        order,
        configOverride,
        optionsOverride,
      });
    },

    /**
     * Remove a field from an issue type
     */
    removeFieldFromIssueType: async (issueTypeId: string, fieldId: string) => {
      const issueTypeField = await repository.findIssueTypeField(
        issueTypeId,
        fieldId,
      );

      if (!issueTypeField) {
        throwNotFoundError('ISSUE_TYPE_FIELD_NOT_FOUND', {
          issueTypeId,
          fieldId,
        });
      }

      return await repository.removeFieldFromIssueType(issueTypeId, fieldId);
    },
  };
};
