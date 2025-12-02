import { getFieldTypeList, getFieldType, getDefaultConfig, FIELD_TYPES } from '@taskmaster/constants';
import type { GetFieldTypeByIdRequestSchema, GetFieldTypeWithOptionsByIdRequestSchema } from '@taskmaster/validation';

/**
 * Field type service - reads from constants instead of database
 * Field types are static and defined in @taskmaster/constants
 */
export class FieldTypeService {
  /**
   * Get all field types
   */
  getAllFieldTypes() {
    return getFieldTypeList();
  }

  /**
   * Get a field type by ID
   */
  getFieldTypeById(input: GetFieldTypeByIdRequestSchema) {
    const fieldType = getFieldType(input.fieldTypeId);
    return fieldType || null;
  }

  /**
   * Get all field types with their config schemas
   */
  getAllFieldTypesWithOptions() {
    return getFieldTypeList().map((ft) => ({
      ...ft,
      defaultConfig: getDefaultConfig(ft.id),
      configSchema: FIELD_TYPES[ft.id as keyof typeof FIELD_TYPES]?.configSchema || {},
    }));
  }

  /**
   * Get a field type by ID with its config schema
   */
  getFieldTypeWithOptionsById(input: GetFieldTypeWithOptionsByIdRequestSchema) {
    const fieldType = getFieldType(input.fieldTypeId);
    if (!fieldType) return null;

    return {
      ...fieldType,
      defaultConfig: getDefaultConfig(input.fieldTypeId),
      configSchema: FIELD_TYPES[input.fieldTypeId as keyof typeof FIELD_TYPES]?.configSchema || {},
    };
  }
}

// Singleton instance for backward compatibility during migration
export const fieldTypeService = new FieldTypeService();