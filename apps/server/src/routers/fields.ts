import {protectedProcedure, router} from "@/lib/trpc";
import {fields} from "@/db/schema/field";
import {successResponse} from "@/utils/response";
import {eq, sql} from "drizzle-orm";
import {z} from "zod";
import {fieldTypeOptions, fieldTypes} from "@/db/schema/field-types";
import {createFieldSchema, editFieldSchema} from "@/schemas/fields";

export const fieldsRouter = router({
    getFields: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select().from(fields);
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldById: protectedProcedure.input(z.object({fieldId: z.string()})).query(async ({ctx, input}) => {
        const data = await ctx.db
            .select()
            .from(fields)
            .where(eq(fields.id, input.fieldId));
        return successResponse(data[0], "Alan başarıyla getirildi");
    }),
    getFieldsWithDetails: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select({
            id: fields.id,
            name: fields.name,
            fieldType: {
                id: fieldTypes.id,
                name: fieldTypes.name,
                component: fieldTypes.component,
                icon: fieldTypes.icon,
            },
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
        }).from(fields).leftJoin(
            fieldTypes,
            eq(fields.fieldTypeId, fieldTypes.id)).leftJoin(fieldTypeOptions, eq(fieldTypes.id, fieldTypeOptions.fieldTypeId)).groupBy(fields.id, fieldTypes.id)
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldWithDetailsById: protectedProcedure.input(z.object({fieldId: z.string()})).query(async ({ctx, input}) => {
        const data = await ctx.db.select({
            id: fields.id,
            name: fields.name,
            fieldType: {
                id: fieldTypes.id,
                name: fieldTypes.name,
                component: fieldTypes.component,
                icon: fieldTypes.icon,
            },
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
        }).from(fields).leftJoin(
            fieldTypes,
            eq(fields.fieldTypeId, fieldTypes.id)).leftJoin(fieldTypeOptions, eq(fieldTypes.id, fieldTypeOptions.fieldTypeId)).where(eq(fields.id, input.fieldId)).groupBy(fields.id, fieldTypes.id)
        return successResponse(data[0], "Alan başarıyla getirildi");
    }),
    getFieldsWithFieldType: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select({
            id: fields.id,
            name: fields.name,
            fieldType: {
                id: fieldTypes.id,
                name: fieldTypes.name,
                component: fieldTypes.component,
                icon: fieldTypes.icon,
            }
        }).from(fields).leftJoin(
            fieldTypes,
            eq(fields.fieldTypeId, fieldTypes.id));
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldWithFieldTypeById: protectedProcedure.input(z.object({fieldId: z.string()})).query(async ({ctx, input}) => {
        const data = await ctx.db.select({
            id: fields.id,
            name: fields.name,
            fieldType: {
                id: fieldTypes.id,
                name: fieldTypes.name,
                component: fieldTypes.component,
                icon: fieldTypes.icon,
            }
        }).from(fields).leftJoin(
            fieldTypes,
            eq(fields.fieldTypeId, fieldTypes.id)).where(eq(fields.id, input.fieldId));
        return successResponse(data[0], "Alan başarıyla getirildi");
    }),
    createField: protectedProcedure.input(createFieldSchema).mutation(async ({ctx, input}) => {
        const data = await ctx.db.insert(fields).values({
            name: input.name,
            fieldTypeId: input.fieldTypeId,
        }).returning();
        return successResponse(data[0], "Alan başarıyla oluşturuldu");
    }),
    deleteField: protectedProcedure.input(z.object({fieldId: z.string()})).mutation(async ({ctx, input}) => {
        await ctx.db.delete(fields).where(eq(fields.id, input.fieldId));
        return successResponse(null, "Alan başarıyla silindi");
    }),
    editField: protectedProcedure.input(editFieldSchema).mutation(async ({ctx, input}) => {
        const {fieldId, ...rest} = input
        const data = await ctx.db.update(fields).set(rest).where(eq(fields.id, fieldId)).returning()
        return successResponse(data[0], "Alan başarıyla güncellendi");
    })
})