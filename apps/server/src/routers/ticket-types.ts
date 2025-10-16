import { protectedProcedure, router } from "@/lib/trpc";
import { issueTypes } from "@/db/schema/issue-types";
import { successResponse } from "@/utils/response";
import {
  createTicketTypeRequestSchema,
  editTicketTypeRequestSchema,
} from "@/schemas/ticket-types";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const ticketTypesRouter = router({
  getTicketTypes: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.db.select().from(issueTypes);
    return successResponse(data, "Bilet türleri başarıyla getirildi");
  }),
  getTicketTypeById: protectedProcedure
    .input(z.object({ ticketTypeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db
        .select()
        .from(issueTypes)
        .where(eq(issueTypes.id, input.ticketTypeId));
      return successResponse(data[0], "Bilet türü başarıyla getirildi");
    }),
  createTicketType: protectedProcedure
    .input(createTicketTypeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db.insert(issueTypes).values(input).returning();
      return successResponse(data, "Bilet türü başarıyla oluşturuldu");
    }),
  editTicketType: protectedProcedure
    .input(editTicketTypeRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db
        .update(issueTypes)
        .set(input)
        .where(eq(issueTypes.id, input.ticketTypeId))
        .returning();
      return successResponse(data, "Bilet türü başarıyla düzenlendi");
    }),
  deleteTicketType: protectedProcedure
    .input(z.object({ ticketTypeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db
        .delete(issueTypes)
        .where(eq(issueTypes.id, input.ticketTypeId))
        .returning();
      return successResponse(data, "Bilet türü başarıyla silindi");
    }),
});
