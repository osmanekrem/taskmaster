import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '@/db';
import {
  fieldConfigurations,
  fieldConfigurationItems,
  fieldConfigurationSchemes,
  fieldConfigurationSchemeItems,
  projectFieldConfigurationSchemes,
  type FieldConfiguration,
  type NewFieldConfiguration,
  type FieldConfigurationItem,
  type NewFieldConfigurationItem,
  type FieldConfigurationScheme,
  type NewFieldConfigurationScheme,
  type FieldConfigurationSchemeItem,
  type NewFieldConfigurationSchemeItem,
  type ProjectFieldConfigurationScheme,
} from '@/db/schema/screens';
import { fields } from '@/db/schema/field';

// =============================================================================
// FIELD CONFIGURATION REPOSITORY
// =============================================================================

export class FieldConfigurationRepository {
  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATIONS
  // ---------------------------------------------------------------------------

  async findConfigById(id: string): Promise<FieldConfiguration | null> {
    const result = await db
      .select()
      .from(fieldConfigurations)
      .where(eq(fieldConfigurations.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findAllConfigs(): Promise<FieldConfiguration[]> {
    return await db
      .select()
      .from(fieldConfigurations)
      .orderBy(asc(fieldConfigurations.name));
  }

  async findDefaultConfig(): Promise<FieldConfiguration | null> {
    const result = await db
      .select()
      .from(fieldConfigurations)
      .where(eq(fieldConfigurations.isDefault, true))
      .limit(1);
    return result[0] ?? null;
  }

  async createConfig(data: NewFieldConfiguration): Promise<FieldConfiguration> {
    const [result] = await db
      .insert(fieldConfigurations)
      .values(data)
      .returning();
    return result;
  }

  async updateConfig(
    id: string,
    data: Partial<Omit<NewFieldConfiguration, 'id'>>,
  ): Promise<FieldConfiguration> {
    const [result] = await db
      .update(fieldConfigurations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fieldConfigurations.id, id))
      .returning();
    return result;
  }

  async deleteConfig(id: string): Promise<void> {
    const config = await this.findConfigById(id);
    if (config?.isDefault) {
      throw new Error('Cannot delete default field configuration');
    }
    await db.delete(fieldConfigurations).where(eq(fieldConfigurations.id, id));
  }

  async setDefaultConfig(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(fieldConfigurations)
        .set({ isDefault: false })
        .where(eq(fieldConfigurations.isDefault, true));
      await tx
        .update(fieldConfigurations)
        .set({ isDefault: true })
        .where(eq(fieldConfigurations.id, id));
    });
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION ITEMS
  // ---------------------------------------------------------------------------

  async findConfigItemById(id: string): Promise<FieldConfigurationItem | null> {
    const result = await db
      .select()
      .from(fieldConfigurationItems)
      .where(eq(fieldConfigurationItems.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findConfigItemsByConfigId(configId: string): Promise<
    Array<{
      item: FieldConfigurationItem;
      field: typeof fields.$inferSelect;
    }>
  > {
    return await db
      .select({
        item: fieldConfigurationItems,
        field: fields,
      })
      .from(fieldConfigurationItems)
      .innerJoin(fields, eq(fieldConfigurationItems.fieldId, fields.id))
      .where(eq(fieldConfigurationItems.configId, configId))
      .orderBy(asc(fields.name));
  }

  async findConfigItemByField(
    configId: string,
    fieldId: string,
  ): Promise<FieldConfigurationItem | null> {
    const result = await db
      .select()
      .from(fieldConfigurationItems)
      .where(
        and(
          eq(fieldConfigurationItems.configId, configId),
          eq(fieldConfigurationItems.fieldId, fieldId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async createConfigItem(
    data: NewFieldConfigurationItem,
  ): Promise<FieldConfigurationItem> {
    const [result] = await db
      .insert(fieldConfigurationItems)
      .values(data)
      .returning();
    return result;
  }

  async updateConfigItem(
    id: string,
    data: Partial<Omit<NewFieldConfigurationItem, 'id'>>,
  ): Promise<FieldConfigurationItem> {
    const [result] = await db
      .update(fieldConfigurationItems)
      .set(data)
      .where(eq(fieldConfigurationItems.id, id))
      .returning();
    return result;
  }

  async deleteConfigItem(id: string): Promise<void> {
    await db
      .delete(fieldConfigurationItems)
      .where(eq(fieldConfigurationItems.id, id));
  }

  async upsertConfigItem(
    configId: string,
    fieldId: string,
    data: Omit<NewFieldConfigurationItem, 'configId' | 'fieldId'>,
  ): Promise<FieldConfigurationItem> {
    const existing = await this.findConfigItemByField(configId, fieldId);
    if (existing) {
      return await this.updateConfigItem(existing.id, data);
    }
    return await this.createConfigItem({ ...data, configId, fieldId });
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION SCHEMES
  // ---------------------------------------------------------------------------

  async findSchemeById(id: string): Promise<FieldConfigurationScheme | null> {
    const result = await db
      .select()
      .from(fieldConfigurationSchemes)
      .where(eq(fieldConfigurationSchemes.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findAllSchemes(): Promise<FieldConfigurationScheme[]> {
    return await db
      .select()
      .from(fieldConfigurationSchemes)
      .orderBy(asc(fieldConfigurationSchemes.name));
  }

  async findDefaultScheme(): Promise<FieldConfigurationScheme | null> {
    const result = await db
      .select()
      .from(fieldConfigurationSchemes)
      .where(eq(fieldConfigurationSchemes.isDefault, true))
      .limit(1);
    return result[0] ?? null;
  }

  async createScheme(
    data: NewFieldConfigurationScheme,
  ): Promise<FieldConfigurationScheme> {
    const [result] = await db
      .insert(fieldConfigurationSchemes)
      .values(data)
      .returning();
    return result;
  }

  async updateScheme(
    id: string,
    data: Partial<Omit<NewFieldConfigurationScheme, 'id'>>,
  ): Promise<FieldConfigurationScheme> {
    const [result] = await db
      .update(fieldConfigurationSchemes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fieldConfigurationSchemes.id, id))
      .returning();
    return result;
  }

  async deleteScheme(id: string): Promise<void> {
    const scheme = await this.findSchemeById(id);
    if (scheme?.isDefault) {
      throw new Error('Cannot delete default field configuration scheme');
    }
    await db
      .delete(fieldConfigurationSchemes)
      .where(eq(fieldConfigurationSchemes.id, id));
  }

  async setDefaultScheme(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(fieldConfigurationSchemes)
        .set({ isDefault: false })
        .where(eq(fieldConfigurationSchemes.isDefault, true));
      await tx
        .update(fieldConfigurationSchemes)
        .set({ isDefault: true })
        .where(eq(fieldConfigurationSchemes.id, id));
    });
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION SCHEME ITEMS
  // ---------------------------------------------------------------------------

  async findSchemeItemById(
    id: string,
  ): Promise<FieldConfigurationSchemeItem | null> {
    const result = await db
      .select()
      .from(fieldConfigurationSchemeItems)
      .where(eq(fieldConfigurationSchemeItems.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findSchemeItemsBySchemeId(
    schemeId: string,
  ): Promise<FieldConfigurationSchemeItem[]> {
    return await db
      .select()
      .from(fieldConfigurationSchemeItems)
      .where(eq(fieldConfigurationSchemeItems.schemeId, schemeId));
  }

  async findSchemeItem(
    schemeId: string,
    issueTypeId: string | null,
  ): Promise<FieldConfigurationSchemeItem | null> {
    const result = await db
      .select()
      .from(fieldConfigurationSchemeItems)
      .where(
        and(
          eq(fieldConfigurationSchemeItems.schemeId, schemeId),
          issueTypeId
            ? eq(fieldConfigurationSchemeItems.issueTypeId, issueTypeId)
            : isNull(fieldConfigurationSchemeItems.issueTypeId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async createSchemeItem(
    data: NewFieldConfigurationSchemeItem,
  ): Promise<FieldConfigurationSchemeItem> {
    const [result] = await db
      .insert(fieldConfigurationSchemeItems)
      .values(data)
      .returning();
    return result;
  }

  async updateSchemeItem(
    id: string,
    data: Partial<Omit<NewFieldConfigurationSchemeItem, 'id'>>,
  ): Promise<FieldConfigurationSchemeItem> {
    const [result] = await db
      .update(fieldConfigurationSchemeItems)
      .set(data)
      .where(eq(fieldConfigurationSchemeItems.id, id))
      .returning();
    return result;
  }

  async deleteSchemeItem(id: string): Promise<void> {
    await db
      .delete(fieldConfigurationSchemeItems)
      .where(eq(fieldConfigurationSchemeItems.id, id));
  }

  // ---------------------------------------------------------------------------
  // PROJECT FIELD CONFIGURATION SCHEMES
  // ---------------------------------------------------------------------------

  async findProjectScheme(
    projectId: string,
  ): Promise<ProjectFieldConfigurationScheme | null> {
    const result = await db
      .select()
      .from(projectFieldConfigurationSchemes)
      .where(eq(projectFieldConfigurationSchemes.projectId, projectId))
      .limit(1);
    return result[0] ?? null;
  }

  async assignSchemeToProject(
    projectId: string,
    schemeId: string,
  ): Promise<ProjectFieldConfigurationScheme> {
    const existing = await this.findProjectScheme(projectId);
    if (existing) {
      const [result] = await db
        .update(projectFieldConfigurationSchemes)
        .set({ schemeId })
        .where(eq(projectFieldConfigurationSchemes.projectId, projectId))
        .returning();
      return result;
    }
    const [result] = await db
      .insert(projectFieldConfigurationSchemes)
      .values({ projectId, schemeId })
      .returning();
    return result;
  }

  async removeSchemeFromProject(projectId: string): Promise<void> {
    await db
      .delete(projectFieldConfigurationSchemes)
      .where(eq(projectFieldConfigurationSchemes.projectId, projectId));
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Get the field configuration for a given project and issue type
   *
   * Resolution order:
   * 1. Specific mapping for issue type in project's scheme
   * 2. Default mapping (issueTypeId = null) in project's scheme
   * 3. Specific mapping in default scheme
   * 4. Default mapping in default scheme
   * 5. Default field configuration
   */
  async resolveFieldConfiguration(
    projectId: string,
    issueTypeId: string,
  ): Promise<FieldConfiguration | null> {
    // Get project's scheme
    const projectScheme = await this.findProjectScheme(projectId);
    const schemeId = projectScheme?.schemeId;

    if (schemeId) {
      // Try specific issue type mapping
      const specificItem = await this.findSchemeItem(schemeId, issueTypeId);
      if (specificItem) {
        return await this.findConfigById(specificItem.configId);
      }

      // Try default mapping
      const defaultItem = await this.findSchemeItem(schemeId, null);
      if (defaultItem) {
        return await this.findConfigById(defaultItem.configId);
      }
    }

    // Fall back to default scheme
    const defaultScheme = await this.findDefaultScheme();
    if (defaultScheme) {
      const specificItem = await this.findSchemeItem(
        defaultScheme.id,
        issueTypeId,
      );
      if (specificItem) {
        return await this.findConfigById(specificItem.configId);
      }

      const defaultItem = await this.findSchemeItem(defaultScheme.id, null);
      if (defaultItem) {
        return await this.findConfigById(defaultItem.configId);
      }
    }

    // Fall back to default configuration
    return await this.findDefaultConfig();
  }

  /**
   * Get field behavior for a specific field in context
   */
  async resolveFieldBehavior(
    projectId: string,
    issueTypeId: string,
    fieldId: string,
  ): Promise<{
    isRequired: boolean;
    isHidden: boolean;
    renderer: string | null;
    defaultValue: string | null;
    descriptionOverride: string | null;
  }> {
    const config = await this.resolveFieldConfiguration(projectId, issueTypeId);
    if (!config) {
      return {
        isRequired: false,
        isHidden: false,
        renderer: null,
        defaultValue: null,
        descriptionOverride: null,
      };
    }

    const item = await this.findConfigItemByField(config.id, fieldId);
    if (!item) {
      return {
        isRequired: false,
        isHidden: false,
        renderer: null,
        defaultValue: null,
        descriptionOverride: null,
      };
    }

    return {
      isRequired: item.isRequired,
      isHidden: item.isHidden,
      renderer: item.renderer,
      defaultValue: item.defaultValue,
      descriptionOverride: item.descriptionOverride,
    };
  }
}

export const fieldConfigurationRepository = new FieldConfigurationRepository();
