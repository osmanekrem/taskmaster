import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createFieldSchema,
  editFieldSchema,
  getFieldByIdRequestSchema,
  deleteFieldRequestSchema,
  getSelectOptionsByFieldOptionIdRequestSchema,
  getSelectOptionsByFieldOptionIdsRequestSchema,
  saveSelectOptionsRequestSchema,
  updateFieldOptionValueRequestSchema,
  saveIssueTypeFieldsRequestSchema,
} from '@taskmaster/validation';

export const fieldsRouter = router({
  getFields: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.field.getAllFields();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldById: protectedProcedure
    .input(getFieldByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getFieldById(input);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  getFieldsWithDetails: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.field.getAllFieldsWithDetails();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldWithDetailsById: protectedProcedure
    .input(getFieldByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getFieldWithDetailsById(input);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  getFieldsWithFieldType: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.field.getAllFieldsWithDetails();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldWithFieldTypeById: protectedProcedure
    .input(getFieldByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getFieldWithDetailsById(input);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  createField: protectedProcedure
    .input(createFieldSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.createField(input);
      return successResponse(data, 'Alan başarıyla oluşturuldu');
    }),

  deleteField: protectedProcedure
    .input(deleteFieldRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.deleteField(input);
      return successResponse(data, 'Alan başarıyla silindi');
    }),

  editField: protectedProcedure
    .input(editFieldSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.updateField(input);
      return successResponse(data, 'Alan başarıyla güncellendi');
    }),

  getSelectOptionsByFieldOptionId: protectedProcedure
    .input(getSelectOptionsByFieldOptionIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getSelectOptionsByFieldOptionIds({
        fieldOptionIds: [input.fieldOptionId],
      });
      return successResponse(data, 'Seçim seçenekleri başarıyla getirildi');
    }),

  getSelectOptionsByFieldOptionIds: protectedProcedure
    .input(getSelectOptionsByFieldOptionIdsRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getSelectOptionsByFieldOptionIds(
        input,
      );
      return successResponse(data, 'Seçim seçenekleri başarıyla getirildi');
    }),

  saveSelectOptions: protectedProcedure
    .input(saveSelectOptionsRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.saveSelectOptions(input);
      return successResponse(data, 'Seçim seçenekleri başarıyla kaydedildi');
    }),

  updateFieldOptionValue: protectedProcedure
    .input(updateFieldOptionValueRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.updateFieldOptionValue(input);
      return successResponse(
        data,
        'Alan seçeneği değeri başarıyla güncellendi',
      );
    }),

  saveIssueTypeFields: protectedProcedure
    .input(saveIssueTypeFieldsRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.saveIssueTypeFields(input);
      return successResponse(data, 'Alanlar başarıyla kaydedildi');
    }),
});
