import { issueTypes } from '@/db/schema/issue-types';
import {
  issueTypeFieldOptions,
  issueTypeFields,
  issueTypeSelectOptions,
} from '@/db/schema/issue-type-fields';
import { db } from '@/db';
import { asc, eq, sql } from 'drizzle-orm';
import type {
  CreateTicketTypeRequestSchema,
  EditTicketTypeRequestSchema,
} from '@/schemas/ticket-types';
import { fieldOptions, fields, selectOptions } from '@/db/schema/field';
import { fieldTypes } from '@/db/schema/field-types';

type DrizzleClient = typeof db;

export const ticketTypeRepository = (drizzle: DrizzleClient = db) => ({
  findMany: () => drizzle.select().from(issueTypes),

  findById: (id: string) =>
    drizzle.query.issueTypes.findFirst({
      where: eq(issueTypes.id, id),
    }),

  findFieldsForTicketType: async (ticketTypeId: string) => {
    // CTE: Her bir fieldOption için selectOptions'ları toplar.
    const optionsWithSelectOptions = drizzle
      .$with('options_with_select_options')
      .as(
        drizzle
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
                        )`.as('selectOptions'),
          })
          .from(selectOptions)
          .groupBy(selectOptions.fieldOptionId),
      );

    // CTE: Her bir field için options'ları toplar.
    const fieldsWithOptions = drizzle.$with('fields_with_options').as(
      drizzle
        .with(optionsWithSelectOptions)
        .select({
          fieldId: fieldOptions.fieldId,
          options: sql<
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
                        )`.as('fieldOptions'),
        })
        .from(fieldOptions)
        .leftJoin(
          optionsWithSelectOptions,
          eq(fieldOptions.id, optionsWithSelectOptions.fieldOptionId),
        )
        .groupBy(fieldOptions.fieldId),
    );

    // Ana sorgu
    return await drizzle
      .with(fieldsWithOptions)
      .select({
        field: {
          id: fields.id,
          name: fields.name,
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
        options: sql`coalesce(
                ${fieldsWithOptions.options},
                CAST
                (
                '[]'
                AS
                json
                )
                )`.as('options'),
      })
      .from(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, ticketTypeId))
      .innerJoin(fields, eq(issueTypeFields.fieldId, fields.id))
      .innerJoin(issueTypes, eq(issueTypeFields.issueTypeId, issueTypes.id))
      .innerJoin(fieldTypes, eq(fields.fieldTypeId, fieldTypes.id))
      .leftJoin(fieldsWithOptions, eq(fields.id, fieldsWithOptions.fieldId));
  },

  create: async (values: CreateTicketTypeRequestSchema) => {
    const [result] = await drizzle
      .insert(issueTypes)
      .values(values)
      .returning();
    return result;
  },

  update: async (
    id: string,
    values: Omit<EditTicketTypeRequestSchema, 'ticketTypeId'>,
  ) => {
    const [result] = await drizzle
      .update(issueTypes)
      .set(values)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  },

  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(issueTypes)
      .where(eq(issueTypes.id, id))
      .returning();
    return result;
  },

  findIssueTypeWithDetailsByIssueTypeId: async (issueTypeId: string) => {
    return await drizzle.query.issueTypes.findFirst({
      where: eq(issueTypes.id, issueTypeId),
      with: {
        fields: {
          orderBy: [asc(issueTypeFields.order)],
          with: {
            field: {
              with: {
                fieldType: true,
              },
            },
            options: {
              orderBy: [asc(issueTypeFieldOptions.order)],
              with: {
                fieldTypeOption: true,
                selectOptions: {
                  orderBy: [asc(issueTypeSelectOptions.order)],
                },
              },
            },
          },
        },
      },
    });
  },
});
