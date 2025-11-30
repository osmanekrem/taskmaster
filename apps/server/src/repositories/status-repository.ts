import { statuses, resolutions } from '@/db/schema/statuses';
import { db } from '@/db';
import { eq, asc } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type {
  CreateStatusSchema,
  UpdateStatusSchema,
  CreateResolutionSchema,
  UpdateResolutionSchema,
} from '@taskmaster/validation';

export const statusRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // =============================================================================
  // STATUSES
  // =============================================================================

  findAllStatuses: () =>
    drizzle
      .select()
      .from(statuses)
      .orderBy(asc(statuses.name)),

  findStatusById: (id: string) =>
    drizzle.query.statuses.findFirst({
      where: eq(statuses.id, id),
    }),

  findStatusByName: (name: string) =>
    drizzle.query.statuses.findFirst({
      where: eq(statuses.name, name),
    }),

  findStatusesByCategory: (category: string) =>
    drizzle
      .select()
      .from(statuses)
      .where(eq(statuses.category, category))
      .orderBy(asc(statuses.name)),

  createStatus: async (input: CreateStatusSchema) => {
    const [result] = await drizzle
      .insert(statuses)
      .values({
        name: input.name,
        description: input.description,
        category: input.category,
        color: input.color ?? '#6B7280',
        icon: input.icon,
        isSystem: false,
      })
      .returning();
    return result;
  },

  updateStatus: async (input: UpdateStatusSchema) => {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;

    const [result] = await drizzle
      .update(statuses)
      .set(updateData)
      .where(eq(statuses.id, input.statusId))
      .returning();
    return result;
  },

  deleteStatus: async (id: string) => {
    const [result] = await drizzle
      .delete(statuses)
      .where(eq(statuses.id, id))
      .returning();
    return result;
  },

  // =============================================================================
  // RESOLUTIONS
  // =============================================================================

  findAllResolutions: () =>
    drizzle
      .select()
      .from(resolutions)
      .orderBy(asc(resolutions.name)),

  findResolutionById: (id: string) =>
    drizzle.query.resolutions.findFirst({
      where: eq(resolutions.id, id),
    }),

  findResolutionByName: (name: string) =>
    drizzle.query.resolutions.findFirst({
      where: eq(resolutions.name, name),
    }),

  findDefaultResolution: () =>
    drizzle.query.resolutions.findFirst({
      where: eq(resolutions.isDefault, true),
    }),

  createResolution: async (input: CreateResolutionSchema) => {
    const [result] = await drizzle
      .insert(resolutions)
      .values({
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
        isSystem: false,
      })
      .returning();
    return result;
  },

  updateResolution: async (input: UpdateResolutionSchema) => {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

    const [result] = await drizzle
      .update(resolutions)
      .set(updateData)
      .where(eq(resolutions.id, input.resolutionId))
      .returning();
    return result;
  },

  deleteResolution: async (id: string) => {
    const [result] = await drizzle
      .delete(resolutions)
      .where(eq(resolutions.id, id))
      .returning();
    return result;
  },

  // Clear default flag from all resolutions
  clearDefaultResolution: async () => {
    await drizzle
      .update(resolutions)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(resolutions.isDefault, true));
  },
});
