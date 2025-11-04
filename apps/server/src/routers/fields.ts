import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { z } from 'zod';
import {
  createFieldSchema,
  editFieldSchema,
  selectOptionSchema,
  fieldWithDetailsSchema,
} from '@/schemas/fields';
import { fieldService } from '@/services/field-service';
import { db } from '@/db';

export const fieldsRouter = router({
  getFields: protectedProcedure.query(async () => {
    const service = fieldService(db);
    const data = await service.getAllFields();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldById: protectedProcedure
    .input(z.object({ fieldId: z.string() }))
    .query(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.getFieldById(input.fieldId);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  getFieldsWithDetails: protectedProcedure.query(async () => {
    const service = fieldService(db);
    const data = await service.getAllFieldsWithDetails();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldWithDetailsById: protectedProcedure
    .input(z.object({ fieldId: z.string() }))
    .query(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.getFieldWithDetailsById(input.fieldId);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  getFieldsWithFieldType: protectedProcedure.query(async () => {
    const service = fieldService(db);
    const data = await service.getAllFieldsWithDetails();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  getFieldWithFieldTypeById: protectedProcedure
    .input(z.object({ fieldId: z.string() }))
    .query(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.getFieldWithDetailsById(input.fieldId);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  createField: protectedProcedure
    .input(createFieldSchema)
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.createField(input);
      return successResponse(data, 'Alan başarıyla oluşturuldu');
    }),

  deleteField: protectedProcedure
    .input(z.object({ fieldId: z.string() }))
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.deleteField(input.fieldId);
      return successResponse(data, 'Alan başarıyla silindi');
    }),

  editField: protectedProcedure
    .input(editFieldSchema)
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const { fieldId, ...rest } = input;
      const data = await service.updateField(fieldId, rest);
      return successResponse(data, 'Alan başarıyla güncellendi');
    }),

  getSelectOptionsByFieldOptionId: protectedProcedure
    .input(z.object({ fieldOptionId: z.string() }))
    .query(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.getSelectOptionsByFieldOptionIds([
        input.fieldOptionId,
      ]);
      return successResponse(data, 'Seçim seçenekleri başarıyla getirildi');
    }),

  getSelectOptionsByFieldOptionIds: protectedProcedure
    .input(z.object({ fieldOptionIds: z.array(z.string()) }))
    .query(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.getSelectOptionsByFieldOptionIds(
        input.fieldOptionIds,
      );
      return successResponse(data, 'Seçim seçenekleri başarıyla getirildi');
    }),

  saveSelectOptions: protectedProcedure
    .input(
      z.object({
        fieldOptionId: z.string(),
        options: z.array(selectOptionSchema),
      }),
    )
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.saveSelectOptions(
        input.fieldOptionId,
        input.options,
      );
      return successResponse(data, 'Seçim seçenekleri başarıyla kaydedildi');
    }),

  updateFieldOptionValue: protectedProcedure
    .input(
      z.object({
        fieldOptionId: z.string(),
        value: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.updateFieldOptionValue(
        input.fieldOptionId,
        input.value,
      );
      return successResponse(
        data,
        'Alan seçeneği değeri başarıyla güncellendi',
      );
    }),

  saveIssueTypeFields: protectedProcedure
    .input(
      z.object({
        issueTypeId: z.string(),
        fields: z.array(fieldWithDetailsSchema),
      }),
    )
    .mutation(async ({ input }) => {
      const service = fieldService(db);
      const data = await service.saveIssueTypeFields(
        input.issueTypeId,
        input.fields,
      );
      return successResponse(data, 'Alanlar başarıyla kaydedildi');
    }),
});

export type FieldWithDetails = any;
