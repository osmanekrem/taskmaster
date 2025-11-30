import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createFieldSchema,
  editFieldSchema,
  getFieldByIdRequestSchema,
  deleteFieldRequestSchema,
  saveIssueTypeFieldsRequestSchema,
  getIssueTypeFieldsByIssueTypeIdRequestSchema,
  updateIssueTypeFieldOverrideRequestSchema,
  addFieldToIssueTypeRequestSchema,
  removeFieldFromIssueTypeRequestSchema,
} from '@taskmaster/validation';

export const fieldsRouter = router({
  /**
   * Get all fields (global field definitions)
   */
  getFields: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.field.getAllFields();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  /**
   * Get all fields with resolved default config
   */
  getFieldsWithDefaults: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.field.getAllFieldsWithDefaults();
    return successResponse(data, 'Alanlar başarıyla getirildi');
  }),

  /**
   * Get a field by ID
   */
  getFieldById: protectedProcedure
    .input(getFieldByIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getFieldById(input);
      return successResponse(data, 'Alan başarıyla getirildi');
    }),

  /**
   * Create a new field
   */
  createField: protectedProcedure
    .input(createFieldSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.createField(input);
      return successResponse(data, 'Alan başarıyla oluşturuldu');
    }),

  /**
   * Update a field
   */
  editField: protectedProcedure
    .input(editFieldSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.updateField(input);
      return successResponse(data, 'Alan başarıyla güncellendi');
    }),

  /**
   * Delete a field
   */
  deleteField: protectedProcedure
    .input(deleteFieldRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.deleteField(input);
      return successResponse(data, 'Alan başarıyla silindi');
    }),

  // ==================== ISSUE TYPE FIELDS ====================

  /**
   * Get resolved fields for an issue type
   * Returns fields with merged config (base + override)
   */
  getIssueTypeFields: protectedProcedure
    .input(getIssueTypeFieldsByIssueTypeIdRequestSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.field.getResolvedFieldsForIssueType({
        issueTypeId: input.issueTypeId,
      });
      return successResponse(data, 'Issue type alanları başarıyla getirildi');
    }),

  /**
   * Save fields for an issue type
   * Handles adding, removing, and reordering fields
   */
  saveIssueTypeFields: protectedProcedure
    .input(saveIssueTypeFieldsRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.saveIssueTypeFields({
        issueTypeId: input.issueTypeId,
        fields: input.fields,
      });
      return successResponse(data, 'Alanlar başarıyla kaydedildi');
    }),

  /**
   * Update an issue type field's override config
   */
  updateIssueTypeFieldOverride: protectedProcedure
    .input(updateIssueTypeFieldOverrideRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.updateIssueTypeFieldOverride(input);
      return successResponse(data, 'Alan override başarıyla güncellendi');
    }),

  /**
   * Add a field to an issue type
   */
  addFieldToIssueType: protectedProcedure
    .input(addFieldToIssueTypeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.addFieldToIssueType(
        input.issueTypeId,
        input.fieldId,
        input.order ?? 0,
        input.configOverride,
        input.optionsOverride,
      );
      return successResponse(data, 'Alan issue type\'a başarıyla eklendi');
    }),

  /**
   * Remove a field from an issue type
   */
  removeFieldFromIssueType: protectedProcedure
    .input(removeFieldFromIssueTypeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.field.removeFieldFromIssueType(
        input.issueTypeId,
        input.fieldId,
      );
      return successResponse(data, 'Alan issue type\'dan başarıyla kaldırıldı');
    }),
});
