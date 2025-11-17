import { fieldOptions, fields, selectOptions } from '@/db/schema/field';
import { db } from '@/db';
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import type { EditFieldSchema } from '@/schemas/fields';
import { fieldTypeOptions } from '@/db/schema/field-types';
import {
  issueTypeFieldOptions,
  issueTypeFields,
  issueTypeSelectOptions,
} from '@/db/schema/issue-type-fields';

export const fieldRepository = (
  drizzle: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) => ({
  findMany: () => drizzle.select().from(fields),

  findById: (id: string) =>
    drizzle.query.fields.findFirst({ where: eq(fields.id, id) }),

  findWithDetails: () =>
    drizzle.query.fields.findMany({
      with: {
        fieldType: true,
        options: {
          orderBy: [asc(fieldTypeOptions.order)],
          with: {
            fieldTypeOption: true,
            selectOptions: { orderBy: [asc(selectOptions.order)] },
          },
        },
      },
    }),

  findWithDetailsById: (id: string) =>
    drizzle.query.fields.findFirst({
      where: eq(fields.id, id),
      with: {
        fieldType: true,
        options: {
          orderBy: [asc(fieldTypeOptions.order)],
          with: {
            fieldTypeOption: true,
            selectOptions: { orderBy: [asc(selectOptions.order)] },
          },
        },
      },
    }),

  create: async (values: typeof fields.$inferInsert) => {
    const [result] = await drizzle.insert(fields).values(values).returning();
    return result;
  },

  update: async (id: string, values: EditFieldSchema) => {
    const [result] = await drizzle
      .update(fields)
      .set(values)
      .where(eq(fields.id, id))
      .returning();
    return result;
  },

  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(fields)
      .where(eq(fields.id, id))
      .returning();
    return result;
  },

  findFieldTypeOptionsByTypeId: (fieldTypeId: string) =>
    drizzle
      .select()
      .from(fieldTypeOptions)
      .where(eq(fieldTypeOptions.fieldTypeId, fieldTypeId)),

  createManyFieldOptions: (values: (typeof fieldOptions.$inferInsert)[]) =>
    drizzle.insert(fieldOptions).values(values),

  updateFieldOptionValue: async (id: string, value: string) => {
    const [result] = await drizzle
      .update(fieldOptions)
      .set({ value })
      .where(eq(fieldOptions.id, id))
      .returning();
    return result;
  },

  findSelectOptionsByFieldOptionIds: (ids: string[]) => {
    if (ids.length === 0) return [];
    return drizzle
      .select()
      .from(selectOptions)
      .where(inArray(selectOptions.fieldOptionId, ids))
      .orderBy(asc(selectOptions.order));
  },

  deleteSelectOptionsNotInList: (
    fieldOptionId: string,
    idsToKeep: string[],
  ) => {
    const condition =
      idsToKeep.length > 0
        ? and(
            eq(selectOptions.fieldOptionId, fieldOptionId),
            notInArray(selectOptions.id, idsToKeep),
          )
        : eq(selectOptions.fieldOptionId, fieldOptionId);

    return drizzle.delete(selectOptions).where(condition);
  },

  createManySelectOptions: (values: (typeof selectOptions.$inferInsert)[]) =>
    drizzle.insert(selectOptions).values(values),

  updateSelectOption: (
    id: string,
    values: { name: string; icon: string; order: number },
  ) =>
    drizzle.update(selectOptions).set(values).where(eq(selectOptions.id, id)),

  createIssueTypeField: async (
    issueTypeId: string,
    fieldId: string,
    fieldTypeId: string,
    order: number,
  ) => {
    const [result] = await drizzle
      .insert(issueTypeFields)
      .values({ issueTypeId, fieldId, fieldTypeId, order })
      .returning();
    return result;
  },

  createIssueTypeFieldOption: async (
    issueTypeId: string,
    fieldOptionId: string,
    value: string,
    fieldTypeOptionId: string,
  ) => {
    const [result] = await drizzle
      .insert(issueTypeFieldOptions)
      .values({ issueTypeId, fieldOptionId, value, fieldTypeOptionId })
      .returning();
    return result;
  },

  createIssueTypeSelectOption: async (
    issueTypeFieldOptionId: string,
    name: string,
    icon: string,
    order: number,
  ) => {
    const [result] = await drizzle
      .insert(issueTypeSelectOptions)
      .values({ issueTypeFieldOptionId, name, icon, order })
      .returning();
    return result;
  },

  createManyIssueTypeSelectOptions: async (
    values: (typeof issueTypeSelectOptions.$inferInsert)[],
  ) => {
    const [result] = await drizzle
      .insert(issueTypeSelectOptions)
      .values(values)
      .returning();
    return result;
  },

  deleteIssueTypeField: async (issueTypeId: string, fieldId: string) => {
    const [result] = await drizzle
      .delete(issueTypeFields)
      .where(
        and(
          eq(issueTypeFields.issueTypeId, issueTypeId),
          eq(issueTypeFields.fieldId, fieldId),
        ),
      )
      .returning();
    return result;
  },

  deleteIssueTypeFieldOption: async (
    issueTypeId: string,
    fieldOptionId: string,
  ) => {
    const [result] = await drizzle
      .delete(issueTypeFieldOptions)
      .where(
        and(
          eq(issueTypeFieldOptions.issueTypeId, issueTypeId),
          eq(issueTypeFieldOptions.fieldOptionId, fieldOptionId),
        ),
      )
      .returning();
    return result;
  },

  deleteIssueTypeFieldOptions: async (
    issueTypeId: string,
    fieldOptionIds: string[],
  ) => {
    if (fieldOptionIds.length === 0) return [];
    const [result] = await drizzle
      .delete(issueTypeFieldOptions)
      .where(inArray(issueTypeFieldOptions.fieldOptionId, fieldOptionIds))
      .returning();
    return result;
  },

  deleteIssueTypeSelectOption: async (issueTypeFieldOptionId: string) => {
    const [result] = await drizzle
      .delete(issueTypeSelectOptions)
      .where(
        eq(
          issueTypeSelectOptions.issueTypeFieldOptionId,
          issueTypeFieldOptionId,
        ),
      )
      .returning();
    return result;
  },

  updateIssueTypeFieldOptionValue: async (
    issueTypeId: string,
    fieldOptionId: string,
    value: string,
  ) => {
    const [result] = await drizzle
      .update(issueTypeFieldOptions)
      .set({ value })
      .where(
        and(
          eq(issueTypeFieldOptions.issueTypeId, issueTypeId),
          eq(issueTypeFieldOptions.fieldOptionId, fieldOptionId),
        ),
      )
      .returning();
    return result;
  },

  updateIssueTypeSelectOption: async (
    issueTypeFieldOptionId: string,
    name: string,
    icon: string,
    order: number,
  ) => {
    const [result] = await drizzle
      .update(issueTypeSelectOptions)
      .set({ name, icon, order })
      .where(
        eq(
          issueTypeSelectOptions.issueTypeFieldOptionId,
          issueTypeFieldOptionId,
        ),
      )
      .returning();
    return result;
  },

  findIssueTypeFieldsByIssueTypeId: async (issueTypeId: string) => {
    const result = await drizzle
      .select()
      .from(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, issueTypeId));
    return result;
  },

  findIssueTypeFieldOptionsByIssueTypeId: async (issueTypeId: string) => {
    const result = await drizzle
      .select()
      .from(issueTypeFieldOptions)
      .where(eq(issueTypeFieldOptions.issueTypeId, issueTypeId));
    return result;
  },

  findIssueTypeSelectOptionsByIssueTypeFieldOptionId: async (
    issueTypeFieldOptionId: string,
  ) => {
    const result = await drizzle
      .select()
      .from(issueTypeSelectOptions)
      .where(
        eq(
          issueTypeSelectOptions.issueTypeFieldOptionId,
          issueTypeFieldOptionId,
        ),
      );
    return result;
  },
});
