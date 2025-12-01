// =============================================================================
// STATUS REPOSITORY
// Repository for statuses and resolutions
// =============================================================================

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
import type { Status, Resolution } from '@/db/schema/statuses';

// =============================================================================
// STATUS REPOSITORY CLASS
// =============================================================================

export class StatusRepository {
  constructor(private readonly drizzle: DrizzleClientOrTransaction = db) {}

  // ===========================================================================
  // STATUSES
  // ===========================================================================

  async findAllStatuses(): Promise<Status[]> {
    return this.drizzle.select().from(statuses).orderBy(asc(statuses.name));
  }

  async findStatusById(id: string): Promise<Status | undefined> {
    return this.drizzle.query.statuses.findFirst({
      where: eq(statuses.id, id),
    });
  }

  async findStatusByName(name: string): Promise<Status | undefined> {
    return this.drizzle.query.statuses.findFirst({
      where: eq(statuses.name, name),
    });
  }

  async findStatusesByCategory(category: string): Promise<Status[]> {
    return this.drizzle
      .select()
      .from(statuses)
      .where(eq(statuses.category, category))
      .orderBy(asc(statuses.name));
  }

  async createStatus(input: CreateStatusSchema): Promise<Status> {
    const [result] = await this.drizzle
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
  }

  async updateStatus(input: UpdateStatusSchema): Promise<Status> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;

    const [result] = await this.drizzle
      .update(statuses)
      .set(updateData)
      .where(eq(statuses.id, input.statusId))
      .returning();
    return result;
  }

  async deleteStatus(id: string): Promise<Status | undefined> {
    const [result] = await this.drizzle
      .delete(statuses)
      .where(eq(statuses.id, id))
      .returning();
    return result;
  }

  // ===========================================================================
  // RESOLUTIONS
  // ===========================================================================

  async findAllResolutions(): Promise<Resolution[]> {
    return this.drizzle
      .select()
      .from(resolutions)
      .orderBy(asc(resolutions.name));
  }

  async findResolutionById(id: string): Promise<Resolution | undefined> {
    return this.drizzle.query.resolutions.findFirst({
      where: eq(resolutions.id, id),
    });
  }

  async findResolutionByName(name: string): Promise<Resolution | undefined> {
    return this.drizzle.query.resolutions.findFirst({
      where: eq(resolutions.name, name),
    });
  }

  async findDefaultResolution(): Promise<Resolution | undefined> {
    return this.drizzle.query.resolutions.findFirst({
      where: eq(resolutions.isDefault, true),
    });
  }

  async createResolution(input: CreateResolutionSchema): Promise<Resolution> {
    const [result] = await this.drizzle
      .insert(resolutions)
      .values({
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
        isSystem: false,
      })
      .returning();
    return result;
  }

  async updateResolution(input: UpdateResolutionSchema): Promise<Resolution> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

    const [result] = await this.drizzle
      .update(resolutions)
      .set(updateData)
      .where(eq(resolutions.id, input.resolutionId))
      .returning();
    return result;
  }

  async deleteResolution(id: string): Promise<Resolution | undefined> {
    const [result] = await this.drizzle
      .delete(resolutions)
      .where(eq(resolutions.id, id))
      .returning();
    return result;
  }

  async clearDefaultResolution(): Promise<void> {
    await this.drizzle
      .update(resolutions)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(resolutions.isDefault, true));
  }

  // ===========================================================================
  // TRANSACTION SUPPORT
  // ===========================================================================

  withTransaction(tx: DrizzleClientOrTransaction): StatusRepository {
    return new StatusRepository(tx);
  }
}

// =============================================================================
// FACTORY FUNCTION (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use `new StatusRepository()` instead
 */
export const statusRepository = (drizzle: DrizzleClientOrTransaction = db) => {
  const repo = new StatusRepository(drizzle);

  return {
    // Statuses
    findAllStatuses: () => repo.findAllStatuses(),
    findStatusById: (id: string) => repo.findStatusById(id),
    findStatusByName: (name: string) => repo.findStatusByName(name),
    findStatusesByCategory: (category: string) =>
      repo.findStatusesByCategory(category),
    createStatus: (input: CreateStatusSchema) => repo.createStatus(input),
    updateStatus: (input: UpdateStatusSchema) => repo.updateStatus(input),
    deleteStatus: (id: string) => repo.deleteStatus(id),

    // Resolutions
    findAllResolutions: () => repo.findAllResolutions(),
    findResolutionById: (id: string) => repo.findResolutionById(id),
    findResolutionByName: (name: string) => repo.findResolutionByName(name),
    findDefaultResolution: () => repo.findDefaultResolution(),
    createResolution: (input: CreateResolutionSchema) =>
      repo.createResolution(input),
    updateResolution: (input: UpdateResolutionSchema) =>
      repo.updateResolution(input),
    deleteResolution: (id: string) => repo.deleteResolution(id),
    clearDefaultResolution: () => repo.clearDefaultResolution(),
  };
};
