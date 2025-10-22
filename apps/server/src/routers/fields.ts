import {protectedProcedure, router} from "@/lib/trpc";
import {fieldOptions, fields, selectOptions} from "@/db/schema/field";
import {successResponse} from "@/utils/response";
import {and, eq, exists, sql} from "drizzle-orm";
import {z} from "zod";
import {fieldTypeOptions, fieldTypes} from "@/db/schema/field-types";
import {createFieldSchema, editFieldSchema} from "@/schemas/fields";

export const fieldsRouter = router({
    getFields: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select().from(fields);
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldById: protectedProcedure
        .input(z.object({fieldId: z.string()}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select()
                .from(fields)
                .where(eq(fields.id, input.fieldId));
            return successResponse(data[0], "Alan başarıyla getirildi");
        }),
    getFieldsWithDetails: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db
            .select({
                id: fields.id,
                name: fields.name,
                description: fields.description,
                icon: fields.icon,
                fieldType: {
                    id: fieldTypes.id,
                    name: fieldTypes.name,
                    component: fieldTypes.component,
                    icon: fieldTypes.icon,
                },
                options: sql<
                    Array<{
                        id: string; // fieldOptions.id
                        value: string; // fieldOptions.value
                        name: string; // fieldTypeOptions.name
                        type: string; // fieldTypeOptions.type
                        fieldTypeId: string; // fieldTypeOptions.id
                        key: string; // fieldTypeOptions.key
                    }>
                >`
                    COALESCE(
                json_agg(
                    json_build_object(
                        'id',
                    ${fieldOptions.id},
                    'value',
                    ${fieldOptions.value},
                    'name',
                    ${fieldTypeOptions.name},
                    'type',
                    ${fieldTypeOptions.type},
                    'fieldTypeId',
                    ${fieldTypeOptions.id},
                    'key',
                    ${fieldTypeOptions.key}
                    )
                    )
                    FILTER
                    (
                    WHERE
                    ${fieldOptions.id}
                    IS
                    NOT
                    NULL
                    ),
                    CAST
                    (
                    '[]'
                    AS
                    json
                    )
                    )
                `,
            })
            .from(fields)
            .leftJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id))
            .leftJoin(fieldOptions, eq(fields.id, fieldOptions.fieldId))
            .leftJoin(
                fieldTypeOptions,
                eq(fieldOptions.fieldTypeOptionId, fieldTypeOptions.id)
            )
            .groupBy(fields.id, fieldTypes.id);
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldWithDetailsById: protectedProcedure
        .input(z.object({fieldId: z.string()}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select({
                    id: fields.id,
                    name: fields.name,
                    description: fields.description,
                    icon: fields.icon,
                    fieldType: {
                        id: fieldTypes.id,
                        name: fieldTypes.name,
                        component: fieldTypes.component,
                        icon: fieldTypes.icon,
                    },
                    options: sql<
                        Array<{
                            id: string; // fieldOptions.id
                            value: string; // fieldOptions.value
                            name: string; // fieldTypeOptions.name
                            type: string; // fieldTypeOptions.type
                            fieldTypeId: string; // fieldTypeOptions.id
                            key: string; // fieldTypeOptions.key
                        }>
                    >`
                        COALESCE(
                json_agg(
                    json_build_object(
                        'id',
                        ${fieldOptions.id},
                        'value',
                        ${fieldOptions.value},
                        'name',
                        ${fieldTypeOptions.name},
                        'type',
                        ${fieldTypeOptions.type},
                        'fieldTypeId',
                        ${fieldTypeOptions.id},
                        'key',
                        ${fieldTypeOptions.key}
                        )
                        )
                        FILTER
                        (
                        WHERE
                        ${fieldOptions.id}
                        IS
                        NOT
                        NULL
                        ),
                        CAST
                        (
                        '[]'
                        AS
                        json
                        )
                        )
                    `,
                })
                .from(fields)
                .leftJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id))
                .leftJoin(fieldOptions, eq(fields.id, fieldOptions.fieldId))
                .leftJoin(
                    fieldTypeOptions,
                    eq(fieldOptions.fieldTypeOptionId, fieldTypeOptions.id)
                )
                .where(eq(fields.id, input.fieldId))
                .groupBy(fields.id, fieldTypes.id);
            return successResponse(data[0], "Alan başarıyla getirildi");
        }),
    getFieldsWithFieldType: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db
            .select({
                id: fields.id,
                name: fields.name,
                description: fields.description,
                icon: fields.icon,
                fieldType: {
                    id: fieldTypes.id,
                    name: fieldTypes.name,
                    component: fieldTypes.component,
                    icon: fieldTypes.icon,
                },
            })
            .from(fields)
            .leftJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id));
        return successResponse(data, "Alanlar başarıyla getirildi");
    }),
    getFieldWithFieldTypeById: protectedProcedure
        .input(z.object({fieldId: z.string()}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select({
                    id: fields.id,
                    name: fields.name,
                    description: fields.description,
                    icon: fields.icon,
                    fieldType: {
                        id: fieldTypes.id,
                        name: fieldTypes.name,
                        component: fieldTypes.component,
                        icon: fieldTypes.icon,
                    },
                })
                .from(fields)
                .leftJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id))
                .where(eq(fields.id, input.fieldId));
            return successResponse(data[0], "Alan başarıyla getirildi");
        }),
    createField: protectedProcedure
        .input(createFieldSchema)
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db.insert(fields).values(input).returning();
            const fieldTypeOptionsData = await ctx.db
                .select()
                .from(fieldTypeOptions)
                .where(eq(fieldTypeOptions.fieldTypeId, input.fieldTypeId));
            const fieldOptionsData = fieldTypeOptionsData.map((option) => ({
                fieldId: data[0].id,
                fieldTypeId: option.fieldTypeId,
                fieldTypeOptionId: option.id,
                value:
                    option.type === "string"
                        ? ""
                        : option.type === "number"
                            ? "0"
                            : option.type === "boolean"
                                ? "false"
                                : option.type === "select-options"
                                    ? "false"
                                    : "",
            }));

            await ctx.db.insert(fieldOptions).values(fieldOptionsData);

            return successResponse(data[0], "Alan başarıyla oluşturuldu");
        }),
    deleteField: protectedProcedure
        .input(z.object({fieldId: z.string()}))
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db
                .delete(fields)
                .where(eq(fields.id, input.fieldId))
                .returning();
            return successResponse(data[0], "Alan başarıyla silindi");
        }),
    editField: protectedProcedure
        .input(editFieldSchema)
        .mutation(async ({ctx, input}) => {
            const {fieldId, ...rest} = input;
            const data = await ctx.db
                .update(fields)
                .set(rest)
                .where(eq(fields.id, fieldId))
                .returning();
            return successResponse(data[0], "Alan başarıyla güncellendi");
        }),
    getSelectOptionsByFieldOptionId: protectedProcedure
        .input(z.object({fieldOptionId: z.string()}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select()
                .from(selectOptions)
                .where(eq(selectOptions.fieldOptionId, input.fieldOptionId));
            return successResponse(data, "Seçim seçenekleri başarıyla getirildi");
        }),
    getSelectOptionsByFieldOptionIds: protectedProcedure
        .input(z.object({fieldOptionIds: z.array(z.string())}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select()
                .from(selectOptions)
                .where(
                    exists(
                        ctx.db
                            .select()
                            .from(selectOptions)
                            .where(
                                and(
                                    eq(selectOptions.fieldOptionId, selectOptions.fieldOptionId),
                                    sql`${selectOptions.fieldOptionId}
                                    IN (
                                    ${sql.join(
                                            input.fieldOptionIds.map((id) => sql`${id}`),
                                            sql`, `
                                    )}
                                    )`
                                )
                            )
                    )
                );
            return successResponse(data, "Seçim seçenekleri başarıyla getirildi");
        }),
    saveSelectOptions: protectedProcedure
        .input(
            z.object({
                fieldOptionId: z.string(),
                options: z.array(
                    z.object({
                        id: z.string().optional(),
                        name: z.string(),
                        icon: z.string(),
                        fieldOptionId: z.string(),
                    })
                ),
            })
        )
        .mutation(async ({ctx, input}) => {
            const {fieldOptionId, options} = input;

            // Delete options that are not in the new list
            await ctx.db.delete(selectOptions).where(
                and(
                    eq(selectOptions.fieldOptionId, fieldOptionId),
                    exists(
                        ctx.db
                            .select()
                            .from(selectOptions)
                            .where(
                                and(
                                    eq(selectOptions.fieldOptionId, fieldOptionId),
                                    sql`${selectOptions.id}
                                    NOT IN (
                                    ${sql.join(
                                            options
                                                    .filter((opt) => opt.id)
                                                    .map((opt) => sql`${opt.id}`),
                                            sql`, `
                                    )}
                                    )`
                                )
                            )
                    )
                )
            );

            // Upsert new and existing options
            for (const option of options) {
                if (option.id) {
                    // Update existing option
                    await ctx.db
                        .update(selectOptions)
                        .set({
                            name: option.name,
                            icon: option.icon,
                        })
                        .where(eq(selectOptions.id, option.id));
                } else {
                    // Insert new option
                    await ctx.db.insert(selectOptions).values({
                        name: option.name,
                        icon: option.icon,
                        fieldOptionId: fieldOptionId,
                    });
                }
            }

            const updatedOptions = await ctx.db
                .select()
                .from(selectOptions)
                .where(eq(selectOptions.fieldOptionId, fieldOptionId));

            return successResponse(
                updatedOptions,
                "Seçim seçenekleri başarıyla kaydedildi"
            );
        }),
    updateFieldOptionValue: protectedProcedure
        .input(z.object({
            fieldOptionId: z.string(),
            value: z.string(),
        }))
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db
                .update(fieldOptions)
                .set({value: input.value})
                .where(eq(fieldOptions.id, input.fieldOptionId))
                .returning();
            return successResponse(data[0], "Alan seçeneği değeri başarıyla güncellendi");
        }),
});
