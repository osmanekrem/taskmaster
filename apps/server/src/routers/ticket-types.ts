import {protectedProcedure, router} from "@/lib/trpc";
import {fieldIssueTypes, issueTypes} from "@/db/schema/issue-types";
import {successResponse} from "@/utils/response";
import {
    createTicketTypeRequestSchema,
    editTicketTypeRequestSchema,
} from "@/schemas/ticket-types";
import {z} from "zod";
import {eq, sql} from "drizzle-orm";
import {fieldOptions, fields, selectOptions} from "@/db/schema/field";
import {fieldTypes} from "@/db/schema/field-types";

export const ticketTypesRouter = router({
    getTicketTypes: protectedProcedure.query(async ({ctx}) => {
        const data = await ctx.db.select().from(issueTypes);
        return successResponse(data, "Bilet türleri başarıyla getirildi");
    }),
    getTicketTypeById: protectedProcedure
        .input(z.object({ticketTypeId: z.string()}))
        .query(async ({ctx, input}) => {
            const data = await ctx.db
                .select()
                .from(issueTypes)
                .where(eq(issueTypes.id, input.ticketTypeId));
            return successResponse(data[0], "Bilet türü başarıyla getirildi");
        }),
    createTicketType: protectedProcedure
        .input(createTicketTypeRequestSchema)
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db.insert(issueTypes).values(input).returning();
            return successResponse(data, "Bilet türü başarıyla oluşturuldu");
        }),
    editTicketType: protectedProcedure
        .input(editTicketTypeRequestSchema)
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db
                .update(issueTypes)
                .set(input)
                .where(eq(issueTypes.id, input.ticketTypeId))
                .returning();
            return successResponse(data, "Bilet türü başarıyla düzenlendi");
        }),
    deleteTicketType: protectedProcedure
        .input(z.object({ticketTypeId: z.string()}))
        .mutation(async ({ctx, input}) => {
            const data = await ctx.db
                .delete(issueTypes)
                .where(eq(issueTypes.id, input.ticketTypeId))
                .returning();
            return successResponse(data, "Bilet türü başarıyla silindi");
        }),
    getFieldsForTicketType: protectedProcedure
        .input(z.object({ticketTypeId: z.string()}))
        .query(async ({ctx, input}) => {

            // 1. CTE: Her bir fieldOption için selectOptions'ları toplar.
            const optionsWithSelectOptions = ctx.db
                .$with("options_with_select_options")
                .as(
                    ctx.db
                        .select({
                            fieldOptionId: selectOptions.fieldOptionId,
                            selectOptions: sql<
                                { id: string; name: string; icon: string | null }[]
                            >`coalesce(json_agg(json_build_object('id',
                            ${selectOptions.id},
                            'name',
                            ${selectOptions.name},
                            'icon',
                            ${selectOptions.icon}
                            )
                            ),
                            CAST
                            (
                            '[]'
                            AS
                            json
                            )
                            )`.as("selectOptions"),
                            //                                                                                                                                     ^^^ DÜZELTME: Kapanış parantezi buraya eklendi.
                        })
                        .from(selectOptions)
                        .groupBy(selectOptions.fieldOptionId)
                );

            // 2. CTE: Her bir field için fieldOptions'ları toplar.
            const fieldsWithOptions = ctx.db
                .$with("fields_with_options")
                .as(
                    ctx.db
                        .with(optionsWithSelectOptions)
                        .select({
                            fieldId: fieldOptions.fieldId,
                            fieldOptions: sql<
                                { id: string; value: string; selectOptions: any[] }[]
                            >`coalesce(json_agg(json_build_object('id',
                            ${fieldOptions.id},
                            'value',
                            ${fieldOptions.value},
                            'selectOptions',
                            ${optionsWithSelectOptions.selectOptions}
                            )
                            ),
                            CAST
                            (
                            '[]'
                            AS
                            json
                            )
                            )`.as("fieldOptions"),
                            //                                                                                                                                                                                    ^^^ DÜZELTME: Kapanış parantezi buraya eklendi.
                        })
                        .from(fieldOptions)
                        .leftJoin(
                            optionsWithSelectOptions,
                            eq(fieldOptions.id, optionsWithSelectOptions.fieldOptionId)
                        )
                        .groupBy(fieldOptions.fieldId)
                );

            // Ana sorgu
            const data = await ctx.db
                .with(fieldsWithOptions)
                .select({
                    field: {
                        id: fields.id,
                        name: fields.name,
                        description: fields.description,
                        icon: fields.icon,
                    },
                    fieldType: {
                        id: fieldTypes.id,
                        name: fieldTypes.name,
                        component: fieldTypes.component,
                        icon: fieldTypes.icon,
                    },
                    ticketType: {
                        id: issueTypes.id,
                        name: issueTypes.name,
                        description: issueTypes.description,
                        icon: issueTypes.icon,
                    },
                    fieldOptions: sql`coalesce(
                    ${fieldsWithOptions.fieldOptions},
                    CAST
                    (
                    '[]'
                    AS
                    json
                    )
                    )`.as("fieldOptions"),
                    //                                                                                  ^^^ DÜZELTME: Kapanış parantezi buraya eklendi.
                })
                .from(fieldIssueTypes)
                .where(eq(fieldIssueTypes.issueTypeId, input.ticketTypeId))
                .innerJoin(fields, eq(fieldIssueTypes.fieldId, fields.id))
                .innerJoin(issueTypes, eq(fieldIssueTypes.issueTypeId, issueTypes.id))
                .innerJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id))
                .leftJoin(fieldsWithOptions, eq(fields.id, fieldsWithOptions.fieldId));

            return data;
        })
});
