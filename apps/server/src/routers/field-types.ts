import { protectedProcedure, router } from "@/lib/trpc";
import { successResponse } from "@/utils/response";
import { z } from "zod";
import { createFieldTypeSchema, editFieldTypeSchema } from "@taskmaster/validation";
import { fieldTypeService } from "@/services/field-type-service";
import { db } from "@/db";

export const fieldTypesRouter = router({
    getFieldTypes: protectedProcedure.query(async () => {
        const service = fieldTypeService(db);
        const data = await service.getAllFieldTypes();
        return successResponse(data, "Alan türleri başarıyla getirildi");
    }),
    
    getFieldTypeById: protectedProcedure
        .input(z.object({ fieldTypeId: z.string() }))
        .query(async ({ input }) => {
            const service = fieldTypeService(db);
            const data = await service.getFieldTypeById(input.fieldTypeId);
            return successResponse(data, "Alan türü başarıyla getirildi");
        }),
    
    getFieldTypesWithOptions: protectedProcedure.query(async () => {
        const service = fieldTypeService(db);
        const data = await service.getAllFieldTypesWithOptions();
        return successResponse(data, "Alan türleri başarıyla getirildi");
    }),
    
    getFieldTypeWithOptionsById: protectedProcedure
        .input(z.object({ fieldTypeId: z.string() }))
        .query(async ({ input }) => {
            const service = fieldTypeService(db);
            const data = await service.getFieldTypeWithOptionsById(input.fieldTypeId);
            return successResponse(data, "Alan türü başarıyla getirildi");
        }),
    
    createFieldType: protectedProcedure
        .input(createFieldTypeSchema)
        .mutation(async ({ input }) => {
            const service = fieldTypeService(db);
            const data = await service.createFieldType(input);
            return successResponse(data, "Alan türü başarıyla oluşturuldu");
        }),
    
    editFieldType: protectedProcedure
        .input(editFieldTypeSchema)
        .mutation(async ({ input }) => {
            const service = fieldTypeService(db);
            const { fieldTypeId, ...rest } = input;
            const data = await service.updateFieldType(fieldTypeId, rest);
            return successResponse(data, "Alan türü başarıyla güncellendi");
        }),
    
    deleteFieldType: protectedProcedure
        .input(z.object({ fieldTypeId: z.string() }))
        .mutation(async ({ input }) => {
            const service = fieldTypeService(db);
            const data = await service.deleteFieldType(input.fieldTypeId);
            return successResponse(data, "Alan türü başarıyla silindi");
        }),
});