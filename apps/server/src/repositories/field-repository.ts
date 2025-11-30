import { fields } from '@/db/schema/field';
import { issueTypeFields } from '@/db/schema/issue-type-fields';
import { db } from '@/db';
import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type {
  CreateFieldSchema,
  EditFieldSchema,
  AddFieldToIssueTypeRequestSchema,
  UpdateIssueTypeFieldSchema,
} from '@taskmaster/validation';

export const fieldRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // ==================== FIELDS ====================
  
  findMany: () => 
    drizzle
      .select()
      .from(fields)
      .orderBy(asc(fields.name)),

  findById: (id: string) =>
    drizzle.query.fields.findFirst({ 
      where: eq(fields.id, id) 
    }),

  findByIds: (ids: string[]) =>
    drizzle.query.fields.findMany({
      where: (fields, { inArray }) => inArray(fields.id, ids),
    }),

  create: async (input: CreateFieldSchema) => {
    const [result] = await drizzle
      .insert(fields)
      .values({
        name: input.name,
        fieldType: input.fieldType,
        icon: input.icon,
        config: input.config ?? {},
        options: input.options ?? [],
      })
      .returning();
    return result;
  },

  update: async (input: EditFieldSchema) => {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.options !== undefined) updateData.options = input.options;

    const [result] = await drizzle
      .update(fields)
      .set(updateData)
      .where(eq(fields.id, input.fieldId))
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

  // ==================== ISSUE TYPE FIELDS ====================

  findIssueTypeFieldsByIssueTypeId: (issueTypeId: string) =>
    drizzle
      .select()
      .from(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, issueTypeId))
      .orderBy(asc(issueTypeFields.order)),

  findIssueTypeFieldsWithFieldByIssueTypeId: (issueTypeId: string) =>
    drizzle.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, issueTypeId),
      orderBy: [asc(issueTypeFields.order)],
      with: {
        field: true,
      },
    }),

  findIssueTypeField: (issueTypeId: string, fieldId: string) =>
    drizzle.query.issueTypeFields.findFirst({
      where: and(
        eq(issueTypeFields.issueTypeId, issueTypeId),
        eq(issueTypeFields.fieldId, fieldId),
      ),
      with: {
        field: true,
      },
    }),

  addFieldToIssueType: async (
    input: AddFieldToIssueTypeRequestSchema
  ) => {
    const { issueTypeId, fieldId, order, configOverride, optionsOverride } = input;
    const [result] = await drizzle
      .insert(issueTypeFields)
      .values({
        issueTypeId,
        fieldId,
        order: order ?? 0,
        configOverride,
        optionsOverride,
      })
      .returning();
    return result;
  },

  updateIssueTypeField: async (
    issueTypeId: string, 
    fieldId: string, 
    input: UpdateIssueTypeFieldSchema
  ) => {
    const updateData: Record<string, unknown> = {};
    
    if (input.order !== undefined) updateData.order = input.order;
    if (input.configOverride !== undefined) updateData.configOverride = input.configOverride;
    if (input.optionsOverride !== undefined) updateData.optionsOverride = input.optionsOverride;

    if (Object.keys(updateData).length === 0) return null;

    const [result] = await drizzle
      .update(issueTypeFields)
      .set(updateData)
      .where(
        and(
          eq(issueTypeFields.issueTypeId, issueTypeId),
          eq(issueTypeFields.fieldId, fieldId),
        ),
      )
      .returning();
    return result;
  },

  removeFieldFromIssueType: async (issueTypeId: string, fieldId: string) => {
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

  removeAllFieldsFromIssueType: async (issueTypeId: string) => {
    return drizzle
      .delete(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, issueTypeId));
  },

  updateIssueTypeFieldOrder: async (id: string, order: number) => {
    const [result] = await drizzle
      .update(issueTypeFields)
      .set({ order })
      .where(eq(issueTypeFields.id, id))
      .returning();
    return result;
  },
});

