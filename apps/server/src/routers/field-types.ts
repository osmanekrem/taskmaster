import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { getFieldTypeList, getFieldType, getDefaultConfig, FIELD_TYPES } from '@taskmaster/constants';
import { getFieldTypeByIdRequestSchema } from '@taskmaster/validation';
import { requirePermission } from '@/lib/middleware/permission';

export const fieldTypesRouter = router({
  /**
   * Get all available field types from constants
   */
  getFieldTypes: protectedProcedure
    .use(requirePermission('field:view'))
    .query(async () => {
      const data = getFieldTypeList();
      return successResponse(data, 'Alan türleri başarıyla getirildi');
    }),

  /**
   * Get a field type by ID with its config schema
   */
  getFieldTypeById: protectedProcedure
    .input(getFieldTypeByIdRequestSchema)
    .use(requirePermission('field:view'))
    .query(async ({ input }) => {
      const fieldType = getFieldType(input.fieldTypeId);
      if (!fieldType) {
        return successResponse(null, 'Alan türü bulunamadı');
      }

      const defaultConfig = getDefaultConfig(input.fieldTypeId);
      return successResponse(
        {
          ...fieldType,
          defaultConfig,
        },
        'Alan türü başarıyla getirildi',
      );
    }),

  /**
   * Get all field types with their config schemas
   */
  getFieldTypesWithOptions: protectedProcedure
    .use(requirePermission('field:view'))
    .query(async () => {
      const fieldTypes = getFieldTypeList().map((ft) => ({
        ...ft,
        defaultConfig: getDefaultConfig(ft.id),
        configSchema: FIELD_TYPES[ft.id as keyof typeof FIELD_TYPES]?.configSchema || {},
      }));
      return successResponse(fieldTypes, 'Alan türleri başarıyla getirildi');
    }),
});
