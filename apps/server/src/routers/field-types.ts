import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createFieldTypeSchema,
  editFieldTypeSchema,
  getFieldTypeByIdRequestSchema,
  getFieldTypeWithOptionsByIdRequestSchema,
  deleteFieldTypeRequestSchema,
} from '@taskmaster/validation';

export const fieldTypesRouter = router({
  getFieldTypes: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.fieldType.getAllFieldTypes();
    return successResponse(data, 'Alan türleri başarıyla getirildi');
  }),

  getFieldTypeById: protectedProcedure
    .input(getFieldTypeByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.fieldType.getFieldTypeById(input);
      return successResponse(data, 'Alan türü başarıyla getirildi');
    }),

  getFieldTypesWithOptions: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.fieldType.getAllFieldTypesWithOptions();
    return successResponse(data, 'Alan türleri başarıyla getirildi');
  }),

  getFieldTypeWithOptionsById: protectedProcedure
    .input(getFieldTypeWithOptionsByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.fieldType.getFieldTypeWithOptionsById(
        input,
      );
      return successResponse(data, 'Alan türü başarıyla getirildi');
    }),

  createFieldType: protectedProcedure
    .input(createFieldTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.fieldType.createFieldType(input);
      return successResponse(data, 'Alan türü başarıyla oluşturuldu');
    }),

  editFieldType: protectedProcedure
    .input(editFieldTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.fieldType.updateFieldType(input);
      return successResponse(data, 'Alan türü başarıyla güncellendi');
    }),

  deleteFieldType: protectedProcedure
    .input(deleteFieldTypeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.fieldType.deleteFieldType(input);
      return successResponse(data, 'Alan türü başarıyla silindi');
    }),
});
