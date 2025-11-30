import { db } from '@/db';
import { fieldRepository } from '@/repositories/field-repository';
import type {
  CreateFieldSchema,
  EditFieldSchema,
  GetFieldByIdRequestSchema,
  DeleteFieldRequestSchema,
  SaveIssueTypeFieldsRequestSchema,
  UpdateIssueTypeFieldOverrideRequestSchema,
  GetIssueTypeFieldsByIssueTypeIdRequestSchema,
  AddFieldToIssueTypeRequestSchema,
  RemoveFieldFromIssueTypeRequestSchema,
} from '@taskmaster/validation';
import { throwNotFoundError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import {
  resolveFieldConfig,
  resolveFieldsForIssueType,
  type ResolvedField,
} from './field-config-resolver';
import { getDefaultConfig } from '@taskmaster/constants';

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

      return await repository.update(data);
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
      input: GetIssueTypeFieldsByIssueTypeIdRequestSchema,
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
    getIssueTypeFieldsByIssueTypeId: async (input: GetIssueTypeFieldsByIssueTypeIdRequestSchema) => {
      return await repository.findIssueTypeFieldsByIssueTypeId(input.issueTypeId);
    },

    /**
     * Save fields for an issue type
     * Handles adding new fields and removing fields not in the list
     */
    saveIssueTypeFields: async (input: SaveIssueTypeFieldsRequestSchema) => {
      return await drizzle.transaction(async (tx) => {
        const repo = fieldRepository(tx);

        // Get existing fields for this issue type
        const existingIssueTypeFields =
          await repo.findIssueTypeFieldsByIssueTypeId(input.issueTypeId);

        const existingFieldIds = new Set(
          existingIssueTypeFields.map((f) => f.fieldId),
        );
        const incomingFieldIds = new Set(input.fields.map((f) => f.fieldId));

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
          const order = field.order ?? index;

          if (existingFieldIds.has(field.fieldId)) {
            // Update existing field
            await repo.updateIssueTypeField(input.issueTypeId, field.fieldId, {
              order,
              configOverride: field.configOverride,
              optionsOverride: field.optionsOverride,
            });
          } else {
            // Add new field
            await repo.addFieldToIssueType({
              issueTypeId: input.issueTypeId,
              fieldId: field.fieldId,
              order,
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
    updateIssueTypeFieldOverride: async (input: UpdateIssueTypeFieldOverrideRequestSchema) => {
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
      input: AddFieldToIssueTypeRequestSchema,
    ) => {
      const { issueTypeId, fieldId, order = 0, configOverride, optionsOverride } = input;
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

      return await repository.addFieldToIssueType({
        issueTypeId,
        fieldId,
        order,
        configOverride,
        optionsOverride,
      });
    },

    /**
     * Remove a field from an issue type
     */
    removeFieldFromIssueType: async (input: RemoveFieldFromIssueTypeRequestSchema) => {
      const { issueTypeId, fieldId } = input;
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
