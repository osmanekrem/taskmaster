import { eq, and, isNull, inArray, asc, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  screens,
  screenTabs,
  screenTabFields,
  screenSchemes,
  screenSchemeItems,
  projectScreenSchemes,
  type Screen,
  type NewScreen,
  type ScreenTab,
  type NewScreenTab,
  type ScreenTabField,
  type NewScreenTabField,
  type ScreenScheme,
  type NewScreenScheme,
  type ScreenSchemeItem,
  type NewScreenSchemeItem,
  type ProjectScreenScheme,
  type NewProjectScreenScheme,
  type ScreenOperation,
} from '@/db/schema/screens';
import { fields } from '@/db/schema/field';

// =============================================================================
// SCREEN REPOSITORY
// =============================================================================

export class ScreenRepository {
  // ---------------------------------------------------------------------------
  // SCREENS
  // ---------------------------------------------------------------------------

  async findScreenById(id: string): Promise<Screen | null> {
    const result = await db
      .select()
      .from(screens)
      .where(eq(screens.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findAllScreens(): Promise<Screen[]> {
    return await db.select().from(screens).orderBy(asc(screens.name));
  }

  async createScreen(data: NewScreen): Promise<Screen> {
    const [result] = await db.insert(screens).values(data).returning();
    return result;
  }

  async updateScreen(
    id: string,
    data: Partial<Omit<NewScreen, 'id'>>,
  ): Promise<Screen> {
    const [result] = await db
      .update(screens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(screens.id, id))
      .returning();
    return result;
  }

  async deleteScreen(id: string): Promise<void> {
    // Check if screen is system screen
    const screen = await this.findScreenById(id);
    if (screen?.isSystem) {
      throw new Error('Cannot delete system screen');
    }
    await db.delete(screens).where(eq(screens.id, id));
  }

  // ---------------------------------------------------------------------------
  // SCREEN WITH FULL STRUCTURE
  // ---------------------------------------------------------------------------

  async findScreenWithStructure(id: string): Promise<{
    screen: Screen;
    tabs: Array<{
      tab: ScreenTab;
      fields: Array<{
        tabField: ScreenTabField;
        field: typeof fields.$inferSelect;
      }>;
    }>;
  } | null> {
    const screen = await this.findScreenById(id);
    if (!screen) return null;

    const tabs = await db
      .select()
      .from(screenTabs)
      .where(eq(screenTabs.screenId, id))
      .orderBy(asc(screenTabs.position));

    const tabIds = tabs.map((t) => t.id);
    if (tabIds.length === 0) {
      return { screen, tabs: [] };
    }

    const tabFields = await db
      .select({
        tabField: screenTabFields,
        field: fields,
      })
      .from(screenTabFields)
      .innerJoin(fields, eq(screenTabFields.fieldId, fields.id))
      .where(inArray(screenTabFields.tabId, tabIds))
      .orderBy(asc(screenTabFields.position));

    const tabsWithFields = tabs.map((tab) => ({
      tab,
      fields: tabFields.filter((tf) => tf.tabField.tabId === tab.id),
    }));

    return { screen, tabs: tabsWithFields };
  }

  // ---------------------------------------------------------------------------
  // SCREEN TABS
  // ---------------------------------------------------------------------------

  async findTabById(id: string): Promise<ScreenTab | null> {
    const result = await db
      .select()
      .from(screenTabs)
      .where(eq(screenTabs.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findTabsByScreenId(screenId: string): Promise<ScreenTab[]> {
    return await db
      .select()
      .from(screenTabs)
      .where(eq(screenTabs.screenId, screenId))
      .orderBy(asc(screenTabs.position));
  }

  async createTab(data: NewScreenTab): Promise<ScreenTab> {
    const [result] = await db.insert(screenTabs).values(data).returning();
    return result;
  }

  async updateTab(
    id: string,
    data: Partial<Omit<NewScreenTab, 'id'>>,
  ): Promise<ScreenTab> {
    const [result] = await db
      .update(screenTabs)
      .set(data)
      .where(eq(screenTabs.id, id))
      .returning();
    return result;
  }

  async deleteTab(id: string): Promise<void> {
    await db.delete(screenTabs).where(eq(screenTabs.id, id));
  }

  async reorderTabs(
    screenId: string,
    tabOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, position } of tabOrder) {
        await tx
          .update(screenTabs)
          .set({ position })
          .where(and(eq(screenTabs.id, id), eq(screenTabs.screenId, screenId)));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // SCREEN TAB FIELDS
  // ---------------------------------------------------------------------------

  async findTabFieldById(id: string): Promise<ScreenTabField | null> {
    const result = await db
      .select()
      .from(screenTabFields)
      .where(eq(screenTabFields.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findTabFieldsByTabId(tabId: string): Promise<
    Array<{
      tabField: ScreenTabField;
      field: typeof fields.$inferSelect;
    }>
  > {
    return await db
      .select({
        tabField: screenTabFields,
        field: fields,
      })
      .from(screenTabFields)
      .innerJoin(fields, eq(screenTabFields.fieldId, fields.id))
      .where(eq(screenTabFields.tabId, tabId))
      .orderBy(asc(screenTabFields.position));
  }

  async addFieldToTab(data: NewScreenTabField): Promise<ScreenTabField> {
    const [result] = await db.insert(screenTabFields).values(data).returning();
    return result;
  }

  async updateTabField(
    id: string,
    data: Partial<Omit<NewScreenTabField, 'id'>>,
  ): Promise<ScreenTabField> {
    const [result] = await db
      .update(screenTabFields)
      .set(data)
      .where(eq(screenTabFields.id, id))
      .returning();
    return result;
  }

  async removeFieldFromTab(id: string): Promise<void> {
    await db.delete(screenTabFields).where(eq(screenTabFields.id, id));
  }

  async reorderTabFields(
    tabId: string,
    fieldOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const { id, position } of fieldOrder) {
        await tx
          .update(screenTabFields)
          .set({ position })
          .where(
            and(eq(screenTabFields.id, id), eq(screenTabFields.tabId, tabId)),
          );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // SCREEN SCHEMES
  // ---------------------------------------------------------------------------

  async findSchemeById(id: string): Promise<ScreenScheme | null> {
    const result = await db
      .select()
      .from(screenSchemes)
      .where(eq(screenSchemes.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findAllSchemes(): Promise<ScreenScheme[]> {
    return await db
      .select()
      .from(screenSchemes)
      .orderBy(asc(screenSchemes.name));
  }

  async findDefaultScheme(): Promise<ScreenScheme | null> {
    const result = await db
      .select()
      .from(screenSchemes)
      .where(eq(screenSchemes.isDefault, true))
      .limit(1);
    return result[0] ?? null;
  }

  async createScheme(data: NewScreenScheme): Promise<ScreenScheme> {
    const [result] = await db.insert(screenSchemes).values(data).returning();
    return result;
  }

  async updateScheme(
    id: string,
    data: Partial<Omit<NewScreenScheme, 'id'>>,
  ): Promise<ScreenScheme> {
    const [result] = await db
      .update(screenSchemes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(screenSchemes.id, id))
      .returning();
    return result;
  }

  async deleteScheme(id: string): Promise<void> {
    const scheme = await this.findSchemeById(id);
    if (scheme?.isDefault) {
      throw new Error('Cannot delete default screen scheme');
    }
    await db.delete(screenSchemes).where(eq(screenSchemes.id, id));
  }

  async setDefaultScheme(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear existing default
      await tx
        .update(screenSchemes)
        .set({ isDefault: false })
        .where(eq(screenSchemes.isDefault, true));
      // Set new default
      await tx
        .update(screenSchemes)
        .set({ isDefault: true })
        .where(eq(screenSchemes.id, id));
    });
  }

  // ---------------------------------------------------------------------------
  // SCREEN SCHEME ITEMS
  // ---------------------------------------------------------------------------

  async findSchemeItemById(id: string): Promise<ScreenSchemeItem | null> {
    const result = await db
      .select()
      .from(screenSchemeItems)
      .where(eq(screenSchemeItems.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findSchemeItemsBySchemeId(
    schemeId: string,
  ): Promise<ScreenSchemeItem[]> {
    return await db
      .select()
      .from(screenSchemeItems)
      .where(eq(screenSchemeItems.schemeId, schemeId));
  }

  async findSchemeItem(
    schemeId: string,
    issueTypeId: string | null,
    operation: ScreenOperation,
  ): Promise<ScreenSchemeItem | null> {
    const result = await db
      .select()
      .from(screenSchemeItems)
      .where(
        and(
          eq(screenSchemeItems.schemeId, schemeId),
          issueTypeId
            ? eq(screenSchemeItems.issueTypeId, issueTypeId)
            : isNull(screenSchemeItems.issueTypeId),
          eq(screenSchemeItems.operation, operation),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async createSchemeItem(data: NewScreenSchemeItem): Promise<ScreenSchemeItem> {
    const [result] = await db
      .insert(screenSchemeItems)
      .values(data)
      .returning();
    return result;
  }

  async updateSchemeItem(
    id: string,
    data: Partial<Omit<NewScreenSchemeItem, 'id'>>,
  ): Promise<ScreenSchemeItem> {
    const [result] = await db
      .update(screenSchemeItems)
      .set(data)
      .where(eq(screenSchemeItems.id, id))
      .returning();
    return result;
  }

  async deleteSchemeItem(id: string): Promise<void> {
    await db.delete(screenSchemeItems).where(eq(screenSchemeItems.id, id));
  }

  // ---------------------------------------------------------------------------
  // PROJECT SCREEN SCHEMES
  // ---------------------------------------------------------------------------

  async findProjectScheme(
    projectId: string,
  ): Promise<ProjectScreenScheme | null> {
    const result = await db
      .select()
      .from(projectScreenSchemes)
      .where(eq(projectScreenSchemes.projectId, projectId))
      .limit(1);
    return result[0] ?? null;
  }

  async assignSchemeToProject(
    projectId: string,
    schemeId: string,
  ): Promise<ProjectScreenScheme> {
    // Use upsert pattern
    const existing = await this.findProjectScheme(projectId);
    if (existing) {
      const [result] = await db
        .update(projectScreenSchemes)
        .set({ schemeId })
        .where(eq(projectScreenSchemes.projectId, projectId))
        .returning();
      return result;
    }
    const [result] = await db
      .insert(projectScreenSchemes)
      .values({ projectId, schemeId })
      .returning();
    return result;
  }

  async removeSchemeFromProject(projectId: string): Promise<void> {
    await db
      .delete(projectScreenSchemes)
      .where(eq(projectScreenSchemes.projectId, projectId));
  }

  // ---------------------------------------------------------------------------
  // SCREEN RESOLUTION - Get the right screen for a context
  // ---------------------------------------------------------------------------

  /**
   * Get the screen to display for a given project, issue type, and operation
   *
   * Resolution order:
   * 1. Specific mapping for issue type in project's scheme
   * 2. Default mapping (issueTypeId = null) in project's scheme
   * 3. Specific mapping in default scheme
   * 4. Default mapping in default scheme
   */
  async resolveScreen(
    projectId: string,
    issueTypeId: string,
    operation: ScreenOperation,
  ): Promise<Screen | null> {
    // Get project's scheme
    const projectScheme = await this.findProjectScheme(projectId);
    const schemeId = projectScheme?.schemeId;

    if (schemeId) {
      // Try specific issue type mapping
      const specificItem = await this.findSchemeItem(
        schemeId,
        issueTypeId,
        operation,
      );
      if (specificItem) {
        return await this.findScreenById(specificItem.screenId);
      }

      // Try default mapping (issueTypeId = null)
      const defaultItem = await this.findSchemeItem(schemeId, null, operation);
      if (defaultItem) {
        return await this.findScreenById(defaultItem.screenId);
      }
    }

    // Fall back to default scheme
    const defaultScheme = await this.findDefaultScheme();
    if (defaultScheme) {
      // Try specific issue type mapping in default scheme
      const specificItem = await this.findSchemeItem(
        defaultScheme.id,
        issueTypeId,
        operation,
      );
      if (specificItem) {
        return await this.findScreenById(specificItem.screenId);
      }

      // Try default mapping in default scheme
      const defaultItem = await this.findSchemeItem(
        defaultScheme.id,
        null,
        operation,
      );
      if (defaultItem) {
        return await this.findScreenById(defaultItem.screenId);
      }
    }

    return null;
  }
}

export const screenRepository = new ScreenRepository();
