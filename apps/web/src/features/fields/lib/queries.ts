import { trpc } from '@/utils/trpc';

// Field Type Queries
export const getFieldTypesQuery = trpc.fieldTypes.getFieldTypes.queryOptions();

export const getFieldTypeQuery = (fieldTypeId: string) =>
  trpc.fieldTypes.getFieldTypeById.queryOptions({ fieldTypeId });

export const getFieldTypesWithOptionsQuery =
  trpc.fieldTypes.getFieldTypesWithOptions.queryOptions();

// Field Queries
export const getFieldsQuery = trpc.fields.getFields.queryOptions();

export const getFieldQuery = (fieldId: string) =>
  trpc.fields.getFieldById.queryOptions({ fieldId });

export const getFieldsWithDefaultsQuery =
  trpc.fields.getFieldsWithDefaults.queryOptions();

// Single field with defaults (uses getFieldById which returns field with config)
export const getFieldWithDefaultsQuery = (fieldId: string) => ({
  ...trpc.fields.getFieldById.queryOptions({ fieldId }),
  enabled: !!fieldId,
});

// Issue Type Field Queries
export const getIssueTypeFieldsQuery = (issueTypeId: string) => ({
  ...trpc.fields.getIssueTypeFields.queryOptions({ issueTypeId }),
  enabled: !!issueTypeId,
});

// Legacy queries for backward compatibility
export const getFieldsWithDetailsQuery = getFieldsWithDefaultsQuery;
export const getFieldsWithFieldTypeQuery = getFieldsWithDefaultsQuery;

export const getFieldWithDetailsQuery = (fieldId: string) => ({
  ...trpc.fields.getFieldById.queryOptions({ fieldId }),
  enabled: !!fieldId,
});

export const getFieldWithFieldTypeQuery = (fieldId: string) =>
  trpc.fields.getFieldById.queryOptions({ fieldId });
