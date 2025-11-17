import { trpc } from '@/utils/trpc';

export const getFieldTypesQuery = trpc.fieldTypes.getFieldTypes.queryOptions();

export const getFieldTypeQuery = (fieldTypeId: string) =>
  trpc.fieldTypes.getFieldTypeById.queryOptions({ fieldTypeId });

export const getFieldsQuery = trpc.fields.getFields.queryOptions();

export const getFieldQuery = (fieldId: string) =>
  trpc.fields.getFieldById.queryOptions({ fieldId });

export const getFieldsWithDetailsQuery =
  trpc.fields.getFieldsWithDetails.queryOptions();

export const getFieldWithDetailsQuery = (fieldId: string) => {
  const options = trpc.fields.getFieldWithDetailsById.queryOptions({ fieldId });
  return {
    ...options,
    enabled: !!fieldId && options.enabled !== false,
  };
};

export const getFieldsWithFieldTypeQuery =
  trpc.fields.getFieldsWithFieldType.queryOptions();

export const getFieldWithFieldTypeQuery = (fieldId: string) =>
  trpc.fields.getFieldWithFieldTypeById.queryOptions({ fieldId });

export const getSelectOptionsByFieldOptionIdsQuery = (
  fieldOptionIds: string[],
) =>
  trpc.fields.getSelectOptionsByFieldOptionIds.queryOptions({ fieldOptionIds });

export const getSelectOptionsByFieldOptionIdQuery = (fieldOptionId: string) =>
  trpc.fields.getSelectOptionsByFieldOptionId.queryOptions({ fieldOptionId });
