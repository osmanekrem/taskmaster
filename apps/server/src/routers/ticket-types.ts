import { protectedProcedure, router } from "@/lib/trpc";
import { successResponse } from "@/utils/response";
import {
    createTicketTypeRequestSchema,
    editTicketTypeRequestSchema,
} from "@/schemas/ticket-types";
import { z } from "zod";
import { ticketTypeService } from "@/services/ticket-type-service";
import { db } from "@/db";

export const ticketTypesRouter = router({
    getTicketTypes: protectedProcedure.query(async () => {
        const service = ticketTypeService(db);
        const data = await service.getAllTicketTypes();
        return successResponse(data, "Bilet türleri başarıyla getirildi");
    }),
    
    getTicketTypeById: protectedProcedure
        .input(z.object({ ticketTypeId: z.string() }))
        .query(async ({ input }) => {
            const service = ticketTypeService(db);
            const data = await service.getTicketTypeById(input.ticketTypeId);
            return successResponse(data, "Bilet türü başarıyla getirildi");
        }),
    
    createTicketType: protectedProcedure
        .input(createTicketTypeRequestSchema)
        .mutation(async ({ input }) => {
            const service = ticketTypeService(db);
            const data = await service.createTicketType(input);
            return successResponse(data, "Bilet türü başarıyla oluşturuldu");
        }),
    
    editTicketType: protectedProcedure
        .input(editTicketTypeRequestSchema)
        .mutation(async ({ input }) => {
            const service = ticketTypeService(db);
            const { ticketTypeId, ...rest } = input;
            const data = await service.updateTicketType(ticketTypeId, rest);
            return successResponse(data, "Bilet türü başarıyla düzenlendi");
        }),
    
    deleteTicketType: protectedProcedure
        .input(z.object({ ticketTypeId: z.string() }))
        .mutation(async ({ input }) => {
            const service = ticketTypeService(db);
            const data = await service.deleteTicketType(input.ticketTypeId);
            return successResponse(data, "Bilet türü başarıyla silindi");
        }),
    
    getFieldsForTicketType: protectedProcedure
        .input(z.object({ ticketTypeId: z.string() }))
        .query(async ({ input }) => {
            const service = ticketTypeService(db);
            const data = await service.getFieldsForTicketType(input.ticketTypeId);
            return data;
        }),
});
