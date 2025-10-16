import {protectedProcedure, router} from "@/lib/trpc";
import {fieldTypeOptions, fieldTypes} from "@/db/schema/field-types";
import {successResponse} from "@/utils/response";
import {eq, sql} from "drizzle-orm";
import {z} from "zod";
import {createFieldTypeSchema, editFieldTypeSchema} from "@/schemas/field-types";

export const fieldTypesRouter = router({
    getFieldTypes: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select().from(fieldTypes);
        return successResponse(data, "Alan türleri başarıyla getirildi");
    }),
    getFieldTypeById: protectedProcedure.input(z.object({fieldTypeId: z.string()})).query(async ({ctx, input}) => {
        const data = await ctx.db
            .select()
            .from(fieldTypes)
            .where(eq(fieldTypes.id, input.fieldTypeId));
        return successResponse(data[0], "Alan türü başarıyla getirildi");
    }),
    getFieldTypesWithOptions: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select({
            id: fieldTypes.id,
            name: fieldTypes.name,
            component: fieldTypes.component,
            icon: fieldTypes.icon,
            options: sql<Array<{
                id: number;
                name: string;
                type: string;
            }>>`
                COALESCE(
                json_agg(
                    json_build_object(
                        'id',
                ${fieldTypeOptions.id},
                'name',
                ${fieldTypeOptions.name},
                'type',
                ${fieldTypeOptions.type}
                )
                )
                FILTER
                (
                WHERE
                ${fieldTypeOptions.id}
                IS
                NOT
                NULL
                ),
                '[]'
                :
                :
                json
                )
            `
        }).from(fieldTypes).leftJoin(
            fieldTypeOptions,
            eq(fieldTypes.id, fieldTypeOptions.fieldTypeId)
        ).groupBy(fieldTypes.id)
        return successResponse(data, "Alan türleri başarıyla getirildi");
    }),
    getFieldTypeWithOptionsById: protectedProcedure.input(z.object({fieldTypeId: z.string()})).query(async ({
                                                                                                                ctx,
                                                                                                                input
                                                                                                            }) => {
        const data = await ctx.db.select({
            id: fieldTypes.id,
            name: fieldTypes.name,
            component: fieldTypes.component,
            icon: fieldTypes.icon,
            options: sql<Array<{
                id: number;
                name: string;
                type: string;
            }>>`
                COALESCE(
                json_agg(
                    json_build_object(
                        'id',
                ${fieldTypeOptions.id},
                'name',
                ${fieldTypeOptions.name},
                'type',
                ${fieldTypeOptions.type}
                )
                )
                FILTER
                (
                WHERE
                ${fieldTypeOptions.id}
                IS
                NOT
                NULL
                ),
                '[]'
                :
                :
                json
                )
            `
        }).from(fieldTypes).leftJoin(
            fieldTypeOptions,
            eq(fieldTypes.id, fieldTypeOptions.fieldTypeId)
        ).where(eq(fieldTypes.id, input.fieldTypeId)).groupBy(fieldTypes.id)
        return successResponse(data[0], "Alan türü başarıyla getirildi");
    }),
    createFieldType: protectedProcedure.input(createFieldTypeSchema).mutation(async ({ctx, input}) => {
        const data = await ctx.db.insert(fieldTypes).values(input).returning();
        return successResponse(data[0], "Alan türü başarıyla oluşturuldu");
    }),
    editFieldType: protectedProcedure.input(editFieldTypeSchema).mutation(async ({ctx, input}) => {
        const {fieldTypeId, ...rest} = input;
        const data = await ctx.db.update(fieldTypes).set(rest).where(eq(fieldTypes.id, fieldTypeId)).returning();
        return successResponse(data[0], "Alan türü başarıyla güncellendi");
    }),
    deleteFieldType: protectedProcedure.input(z.object({fieldTypeId: z.string()})).mutation(async ({ctx, input}) => {
        const data = await ctx.db.delete(fieldTypes).where(eq(fieldTypes.id, input.fieldTypeId)).returning();
        return successResponse(data[0], "Alan türü başarıyla silindi");
    }),
})