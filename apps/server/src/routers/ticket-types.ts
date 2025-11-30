import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createTicketTypeSchema,
  editTicketTypeSchema,
  getTicketTypeByIdRequestSchema,
  deleteTicketTypeRequestSchema,
  getFieldsForTicketTypeRequestSchema,
  getIssueTypeWithDetailsByIssueTypeIdRequestSchema,
} from '@taskmaster/validation';
import { requirePermission } from '@/lib/middleware/permission';

export const ticketTypesRouter = router({
  getTicketTypes: protectedProcedure
    .use(requirePermission('issue_type:view'))
    .query(async ({ ctx }) => {
      const data = await ctx.services.ticketType.getAllTicketTypes();
      return successResponse(data, 'Bilet türleri başarıyla getirildi');
    }),

  getTicketTypeById: protectedProcedure
    .input(getTicketTypeByIdRequestSchema)
    .use(requirePermission('issue_type:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.getTicketTypeById(input);
      return successResponse(data, 'Bilet türü başarıyla getirildi');
    }),

  createTicketType: protectedProcedure
    .input(createTicketTypeSchema)
    .use(requirePermission('admin:manage_issue_types'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.createTicketType(input);
      return successResponse(data, 'Bilet türü başarıyla oluşturuldu');
    }),

  editTicketType: protectedProcedure
    .input(editTicketTypeSchema)
    .use(requirePermission('admin:manage_issue_types'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.updateTicketType(input);
      return successResponse(data, 'Bilet türü başarıyla düzenlendi');
    }),

  deleteTicketType: protectedProcedure
    .input(deleteTicketTypeRequestSchema)
    .use(requirePermission('admin:manage_issue_types'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.deleteTicketType(input);
      return successResponse(data, 'Bilet türü başarıyla silindi');
    }),

  /**
   * Get resolved fields for a ticket type
   * Returns fields with merged config (base + override)
   */
  getFieldsForTicketType: protectedProcedure
    .input(getFieldsForTicketTypeRequestSchema)
    .use(requirePermission('issue_type:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.getFieldsForTicketType(input);
      return successResponse(data, 'Bilet türü alanları başarıyla getirildi');
    }),

  /**
   * Get ticket type with resolved field details
   */
  getIssueTypeWithDetailsByIssueTypeId: protectedProcedure
    .input(getIssueTypeWithDetailsByIssueTypeIdRequestSchema)
    .use(requirePermission('issue_type:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.ticketType.getIssueTypeWithDetailsByIssueTypeId(
        input,
      );
      return successResponse(data, 'Bilet türü detayları başarıyla getirildi');
    }),
});
