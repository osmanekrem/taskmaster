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

// =============================================================================
// CLASS-BASED REPOSITORY (for DI)
// =============================================================================

export class FieldRepository {
  constructor(private drizzle: DrizzleClientOrTransaction = db) {}

  // ==================== FIELDS ====================

  findMany() {
    return this.drizzle.select().from(fields).orderBy(asc(fields.name));
  }

  findById(id: string) {
    return this.drizzle.query.fields.findFirst({
      where: eq(fields.id, id),
    });
  }

  findByIds(ids: string[]) {
    return this.drizzle.query.fields.findMany({
      where: (fields, { inArray }) => inArray(fields.id, ids),
    });
  }

  async create(input: CreateFieldSchema) {
    const [result] = await this.drizzle
      .insert(fields)
      .values({
        name: input.name,
        slug: input.slug,
        fieldType: input.fieldType,
        icon: input.icon,
        config: input.config ?? {},
        options: input.options ?? [],
      })
      .returning();
    return result;
  }

  async update(input: EditFieldSchema) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.config !== undefined) updateData.config = input.config;
    if (input.options !== undefined) updateData.options = input.options;

    const [result] = await this.drizzle
      .update(fields)
      .set(updateData)
      .where(eq(fields.id, input.fieldId))
      .returning();
    return result;
  }

  async delete(id: string) {
    const [result] = await this.drizzle
      .delete(fields)
      .where(eq(fields.id, id))
      .returning();
    return result;
  }

  // ==================== ISSUE TYPE FIELDS ====================

  findIssueTypeFieldsByIssueTypeId(issueTypeId: string) {
    return this.drizzle
      .select()
      .from(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, issueTypeId))
      .orderBy(asc(issueTypeFields.order));
  }

  findIssueTypeFieldsWithFieldByIssueTypeId(issueTypeId: string) {
    return this.drizzle.query.issueTypeFields.findMany({
      where: eq(issueTypeFields.issueTypeId, issueTypeId),
      orderBy: [asc(issueTypeFields.order)],
      with: {
        field: true,
      },
    });
  }

  findIssueTypeField(issueTypeId: string, fieldId: string) {
    return this.drizzle.query.issueTypeFields.findFirst({
      where: and(
        eq(issueTypeFields.issueTypeId, issueTypeId),
        eq(issueTypeFields.fieldId, fieldId),
      ),
      with: {
        field: true,
      },
    });
  }

  async addFieldToIssueType(input: AddFieldToIssueTypeRequestSchema) {
    const { issueTypeId, fieldId, order, configOverride, optionsOverride } =
      input;
    const [result] = await this.drizzle
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
  }

  async updateIssueTypeField(
    issueTypeId: string,
    fieldId: string,
    input: UpdateIssueTypeFieldSchema,
  ) {
    const updateData: Record<string, unknown> = {};

    if (input.order !== undefined) updateData.order = input.order;
    if (input.configOverride !== undefined)
      updateData.configOverride = input.configOverride;
    if (input.optionsOverride !== undefined)
      updateData.optionsOverride = input.optionsOverride;

    if (Object.keys(updateData).length === 0) return null;

    const [result] = await this.drizzle
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
  }

  async removeFieldFromIssueType(issueTypeId: string, fieldId: string) {
    const [result] = await this.drizzle
      .delete(issueTypeFields)
      .where(
        and(
          eq(issueTypeFields.issueTypeId, issueTypeId),
          eq(issueTypeFields.fieldId, fieldId),
        ),
      )
      .returning();
    return result;
  }

  async removeAllFieldsFromIssueType(issueTypeId: string) {
    return this.drizzle
      .delete(issueTypeFields)
      .where(eq(issueTypeFields.issueTypeId, issueTypeId));
  }

  async updateIssueTypeFieldOrder(id: string, order: number) {
    const [result] = await this.drizzle
      .update(issueTypeFields)
      .set({ order })
      .where(eq(issueTypeFields.id, id))
      .returning();
    return result;
  }
}

// =============================================================================
// FUNCTION-BASED REPOSITORY (backward compatibility)
// =============================================================================

export const fieldRepository = (drizzle: DrizzleClientOrTransaction = db) => {
  const repo = new FieldRepository(drizzle);
  return {
    findMany: () => repo.findMany(),
    findById: (id: string) => repo.findById(id),
    findByIds: (ids: string[]) => repo.findByIds(ids),
    create: (input: CreateFieldSchema) => repo.create(input),
    update: (input: EditFieldSchema) => repo.update(input),
    delete: (id: string) => repo.delete(id),
    findIssueTypeFieldsByIssueTypeId: (issueTypeId: string) =>
      repo.findIssueTypeFieldsByIssueTypeId(issueTypeId),
    findIssueTypeFieldsWithFieldByIssueTypeId: (issueTypeId: string) =>
      repo.findIssueTypeFieldsWithFieldByIssueTypeId(issueTypeId),
    findIssueTypeField: (issueTypeId: string, fieldId: string) =>
      repo.findIssueTypeField(issueTypeId, fieldId),
    addFieldToIssueType: (input: AddFieldToIssueTypeRequestSchema) =>
      repo.addFieldToIssueType(input),
    updateIssueTypeField: (
      issueTypeId: string,
      fieldId: string,
      input: UpdateIssueTypeFieldSchema,
    ) => repo.updateIssueTypeField(issueTypeId, fieldId, input),
    removeFieldFromIssueType: (issueTypeId: string, fieldId: string) =>
      repo.removeFieldFromIssueType(issueTypeId, fieldId),
    removeAllFieldsFromIssueType: (issueTypeId: string) =>
      repo.removeAllFieldsFromIssueType(issueTypeId),
    updateIssueTypeFieldOrder: (id: string, order: number) =>
      repo.updateIssueTypeFieldOrder(id, order),
  };
};
