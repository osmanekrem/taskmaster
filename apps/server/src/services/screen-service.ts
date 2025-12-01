import { screenRepository } from '@/repositories/screen-repository';
import { fieldConfigurationRepository } from '@/repositories/field-configuration-repository';
import type {
  Screen,
  NewScreen,
  ScreenTab,
  NewScreenTab,
  ScreenTabField,
  NewScreenTabField,
  ScreenScheme,
  NewScreenScheme,
  ScreenSchemeItem,
  NewScreenSchemeItem,
  ScreenOperation,
  FieldConfiguration,
  NewFieldConfiguration,
  FieldConfigurationItem,
  NewFieldConfigurationItem,
  FieldConfigurationScheme,
  NewFieldConfigurationScheme,
  FieldConfigurationSchemeItem,
  NewFieldConfigurationSchemeItem,
} from '@/db/schema/screens';
import type { Field } from '@/db/schema/field';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resolved field for display on a screen
 * Combines field definition with screen-specific and config-specific settings
 */
export interface ResolvedScreenField {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  fieldIcon: string | null;
  fieldConfig: Record<string, unknown>;
  fieldOptions: Array<{
    id: string;
    name: string;
    icon?: string;
    order: number;
  }>;
  // Screen-level settings
  position: number;
  isRequiredOnScreen: boolean | null; // null = use config setting
  // Config-level settings
  isRequired: boolean;
  isHidden: boolean;
  renderer: string | null;
  defaultValue: string | null;
  descriptionOverride: string | null;
}

/**
 * Resolved screen with all tabs and fields
 */
export interface ResolvedScreen {
  screen: Screen;
  tabs: Array<{
    tab: ScreenTab;
    fields: ResolvedScreenField[];
  }>;
}

// =============================================================================
// SCREEN SERVICE
// =============================================================================

export class ScreenService {
  // ---------------------------------------------------------------------------
  // SCREENS
  // ---------------------------------------------------------------------------

  async getScreen(id: string): Promise<Screen | null> {
    return await screenRepository.findScreenById(id);
  }

  async getAllScreens(): Promise<Screen[]> {
    return await screenRepository.findAllScreens();
  }

  async createScreen(data: Omit<NewScreen, 'id'>): Promise<Screen> {
    return await screenRepository.createScreen(data);
  }

  async updateScreen(
    id: string,
    data: Partial<Omit<NewScreen, 'id'>>,
  ): Promise<Screen> {
    return await screenRepository.updateScreen(id, data);
  }

  async deleteScreen(id: string): Promise<void> {
    return await screenRepository.deleteScreen(id);
  }

  /**
   * Get screen with full structure (tabs and fields)
   */
  async getScreenWithStructure(id: string): Promise<{
    screen: Screen;
    tabs: Array<{
      tab: ScreenTab;
      fields: Array<{
        tabField: ScreenTabField;
        field: Field;
      }>;
    }>;
  } | null> {
    return await screenRepository.findScreenWithStructure(id);
  }

  /**
   * Clone a screen with all its tabs and fields
   */
  async cloneScreen(sourceId: string, newName: string): Promise<Screen | null> {
    const source = await screenRepository.findScreenWithStructure(sourceId);
    if (!source) return null;

    // Create new screen
    const newScreen = await screenRepository.createScreen({
      name: newName,
      description: source.screen.description,
      isSystem: false,
    });

    // Clone tabs and fields
    for (const { tab, fields } of source.tabs) {
      const newTab = await screenRepository.createTab({
        screenId: newScreen.id,
        name: tab.name,
        position: tab.position,
      });

      for (const { tabField } of fields) {
        await screenRepository.addFieldToTab({
          tabId: newTab.id,
          fieldId: tabField.fieldId,
          position: tabField.position,
          isRequiredOverride: tabField.isRequiredOverride,
        });
      }
    }

    return newScreen;
  }

  // ---------------------------------------------------------------------------
  // SCREEN TABS
  // ---------------------------------------------------------------------------

  async getTab(id: string): Promise<ScreenTab | null> {
    return await screenRepository.findTabById(id);
  }

  async getTabsByScreen(screenId: string): Promise<ScreenTab[]> {
    return await screenRepository.findTabsByScreenId(screenId);
  }

  async createTab(data: Omit<NewScreenTab, 'id'>): Promise<ScreenTab> {
    return await screenRepository.createTab(data);
  }

  async updateTab(
    id: string,
    data: Partial<Omit<NewScreenTab, 'id'>>,
  ): Promise<ScreenTab> {
    return await screenRepository.updateTab(id, data);
  }

  async deleteTab(id: string): Promise<void> {
    return await screenRepository.deleteTab(id);
  }

  async reorderTabs(
    screenId: string,
    tabOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return await screenRepository.reorderTabs(screenId, tabOrder);
  }

  // ---------------------------------------------------------------------------
  // SCREEN TAB FIELDS
  // ---------------------------------------------------------------------------

  async addFieldToTab(
    data: Omit<NewScreenTabField, 'id'>,
  ): Promise<ScreenTabField> {
    return await screenRepository.addFieldToTab(data);
  }

  async updateTabField(
    id: string,
    data: Partial<Omit<NewScreenTabField, 'id'>>,
  ): Promise<ScreenTabField> {
    return await screenRepository.updateTabField(id, data);
  }

  async removeFieldFromTab(id: string): Promise<void> {
    return await screenRepository.removeFieldFromTab(id);
  }

  async reorderTabFields(
    tabId: string,
    fieldOrder: Array<{ id: string; position: number }>,
  ): Promise<void> {
    return await screenRepository.reorderTabFields(tabId, fieldOrder);
  }

  // ---------------------------------------------------------------------------
  // SCREEN SCHEMES
  // ---------------------------------------------------------------------------

  async getScheme(id: string): Promise<ScreenScheme | null> {
    return await screenRepository.findSchemeById(id);
  }

  async getAllSchemes(): Promise<ScreenScheme[]> {
    return await screenRepository.findAllSchemes();
  }

  async getDefaultScheme(): Promise<ScreenScheme | null> {
    return await screenRepository.findDefaultScheme();
  }

  async createScheme(data: Omit<NewScreenScheme, 'id'>): Promise<ScreenScheme> {
    return await screenRepository.createScheme(data);
  }

  async updateScheme(
    id: string,
    data: Partial<Omit<NewScreenScheme, 'id'>>,
  ): Promise<ScreenScheme> {
    return await screenRepository.updateScheme(id, data);
  }

  async deleteScheme(id: string): Promise<void> {
    return await screenRepository.deleteScheme(id);
  }

  async setDefaultScheme(id: string): Promise<void> {
    return await screenRepository.setDefaultScheme(id);
  }

  // ---------------------------------------------------------------------------
  // SCREEN SCHEME ITEMS
  // ---------------------------------------------------------------------------

  async getSchemeItems(schemeId: string): Promise<ScreenSchemeItem[]> {
    return await screenRepository.findSchemeItemsBySchemeId(schemeId);
  }

  async createSchemeItem(
    data: Omit<NewScreenSchemeItem, 'id'>,
  ): Promise<ScreenSchemeItem> {
    return await screenRepository.createSchemeItem(data);
  }

  async updateSchemeItem(
    id: string,
    data: Partial<Omit<NewScreenSchemeItem, 'id'>>,
  ): Promise<ScreenSchemeItem> {
    return await screenRepository.updateSchemeItem(id, data);
  }

  async deleteSchemeItem(id: string): Promise<void> {
    return await screenRepository.deleteSchemeItem(id);
  }

  // ---------------------------------------------------------------------------
  // PROJECT SCHEME ASSIGNMENT
  // ---------------------------------------------------------------------------

  async assignSchemeToProject(
    projectId: string,
    schemeId: string,
  ): Promise<void> {
    await screenRepository.assignSchemeToProject(projectId, schemeId);
  }

  async removeSchemeFromProject(projectId: string): Promise<void> {
    await screenRepository.removeSchemeFromProject(projectId);
  }

  // ---------------------------------------------------------------------------
  // SCREEN RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Resolve which screen to display for a given context
   */
  async resolveScreen(
    projectId: string,
    issueTypeId: string,
    operation: ScreenOperation,
  ): Promise<Screen | null> {
    return await screenRepository.resolveScreen(
      projectId,
      issueTypeId,
      operation,
    );
  }

  /**
   * Get fully resolved screen with merged field configurations
   */
  async getResolvedScreen(
    projectId: string,
    issueTypeId: string,
    operation: ScreenOperation,
  ): Promise<ResolvedScreen | null> {
    // 1. Resolve which screen to use
    const screen = await this.resolveScreen(projectId, issueTypeId, operation);
    if (!screen) return null;

    // 2. Get screen structure
    const structure = await screenRepository.findScreenWithStructure(screen.id);
    if (!structure) return null;

    // 3. Resolve field configurations for each field
    const resolvedTabs = await Promise.all(
      structure.tabs.map(async ({ tab, fields }) => {
        const resolvedFields = await Promise.all(
          fields.map(async ({ tabField, field }) => {
            // Get field behavior from configuration
            const behavior =
              await fieldConfigurationRepository.resolveFieldBehavior(
                projectId,
                issueTypeId,
                field.id,
              );

            return {
              fieldId: field.id,
              fieldName: field.name,
              fieldType: field.fieldType,
              fieldIcon: field.icon,
              fieldConfig: field.config as Record<string, unknown>,
              fieldOptions:
                (field.options as Array<{
                  id: string;
                  name: string;
                  icon?: string;
                  order: number;
                }>) ?? [],
              // Screen-level
              position: tabField.position,
              isRequiredOnScreen: tabField.isRequiredOverride,
              // Config-level
              isRequired: behavior.isRequired,
              isHidden: behavior.isHidden,
              renderer: behavior.renderer,
              defaultValue: behavior.defaultValue,
              descriptionOverride: behavior.descriptionOverride,
            } satisfies ResolvedScreenField;
          }),
        );

        // Filter out hidden fields and sort by position
        const visibleFields = resolvedFields
          .filter((f) => !f.isHidden)
          .sort((a, b) => a.position - b.position);

        return { tab, fields: visibleFields };
      }),
    );

    return { screen, tabs: resolvedTabs };
  }
}

// =============================================================================
// FIELD CONFIGURATION SERVICE
// =============================================================================

export class FieldConfigurationService {
  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATIONS
  // ---------------------------------------------------------------------------

  async getConfiguration(id: string): Promise<FieldConfiguration | null> {
    return await fieldConfigurationRepository.findConfigById(id);
  }

  async getAllConfigurations(): Promise<FieldConfiguration[]> {
    return await fieldConfigurationRepository.findAllConfigs();
  }

  async getDefaultConfiguration(): Promise<FieldConfiguration | null> {
    return await fieldConfigurationRepository.findDefaultConfig();
  }

  async createConfiguration(
    data: Omit<NewFieldConfiguration, 'id'>,
  ): Promise<FieldConfiguration> {
    return await fieldConfigurationRepository.createConfig(data);
  }

  async updateConfiguration(
    id: string,
    data: Partial<Omit<NewFieldConfiguration, 'id'>>,
  ): Promise<FieldConfiguration> {
    return await fieldConfigurationRepository.updateConfig(id, data);
  }

  async deleteConfiguration(id: string): Promise<void> {
    return await fieldConfigurationRepository.deleteConfig(id);
  }

  async setDefaultConfiguration(id: string): Promise<void> {
    return await fieldConfigurationRepository.setDefaultConfig(id);
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION ITEMS
  // ---------------------------------------------------------------------------

  async getConfigurationItems(configId: string): Promise<
    Array<{
      item: FieldConfigurationItem;
      field: Field;
    }>
  > {
    return await fieldConfigurationRepository.findConfigItemsByConfigId(
      configId,
    );
  }

  async createConfigurationItem(
    data: Omit<NewFieldConfigurationItem, 'id'>,
  ): Promise<FieldConfigurationItem> {
    return await fieldConfigurationRepository.createConfigItem(data);
  }

  async updateConfigurationItem(
    id: string,
    data: Partial<Omit<NewFieldConfigurationItem, 'id'>>,
  ): Promise<FieldConfigurationItem> {
    return await fieldConfigurationRepository.updateConfigItem(id, data);
  }

  async deleteConfigurationItem(id: string): Promise<void> {
    return await fieldConfigurationRepository.deleteConfigItem(id);
  }

  async upsertConfigurationItem(
    configId: string,
    fieldId: string,
    data: Omit<NewFieldConfigurationItem, 'configId' | 'fieldId'>,
  ): Promise<FieldConfigurationItem> {
    return await fieldConfigurationRepository.upsertConfigItem(
      configId,
      fieldId,
      data,
    );
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION SCHEMES
  // ---------------------------------------------------------------------------

  async getScheme(id: string): Promise<FieldConfigurationScheme | null> {
    return await fieldConfigurationRepository.findSchemeById(id);
  }

  async getAllSchemes(): Promise<FieldConfigurationScheme[]> {
    return await fieldConfigurationRepository.findAllSchemes();
  }

  async getDefaultScheme(): Promise<FieldConfigurationScheme | null> {
    return await fieldConfigurationRepository.findDefaultScheme();
  }

  async createScheme(
    data: Omit<NewFieldConfigurationScheme, 'id'>,
  ): Promise<FieldConfigurationScheme> {
    return await fieldConfigurationRepository.createScheme(data);
  }

  async updateScheme(
    id: string,
    data: Partial<Omit<NewFieldConfigurationScheme, 'id'>>,
  ): Promise<FieldConfigurationScheme> {
    return await fieldConfigurationRepository.updateScheme(id, data);
  }

  async deleteScheme(id: string): Promise<void> {
    return await fieldConfigurationRepository.deleteScheme(id);
  }

  async setDefaultScheme(id: string): Promise<void> {
    return await fieldConfigurationRepository.setDefaultScheme(id);
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION SCHEME ITEMS
  // ---------------------------------------------------------------------------

  async getSchemeItems(
    schemeId: string,
  ): Promise<FieldConfigurationSchemeItem[]> {
    return await fieldConfigurationRepository.findSchemeItemsBySchemeId(
      schemeId,
    );
  }

  async createSchemeItem(
    data: Omit<NewFieldConfigurationSchemeItem, 'id'>,
  ): Promise<FieldConfigurationSchemeItem> {
    return await fieldConfigurationRepository.createSchemeItem(data);
  }

  async updateSchemeItem(
    id: string,
    data: Partial<Omit<NewFieldConfigurationSchemeItem, 'id'>>,
  ): Promise<FieldConfigurationSchemeItem> {
    return await fieldConfigurationRepository.updateSchemeItem(id, data);
  }

  async deleteSchemeItem(id: string): Promise<void> {
    return await fieldConfigurationRepository.deleteSchemeItem(id);
  }

  // ---------------------------------------------------------------------------
  // PROJECT SCHEME ASSIGNMENT
  // ---------------------------------------------------------------------------

  async assignSchemeToProject(
    projectId: string,
    schemeId: string,
  ): Promise<void> {
    await fieldConfigurationRepository.assignSchemeToProject(
      projectId,
      schemeId,
    );
  }

  async removeSchemeFromProject(projectId: string): Promise<void> {
    await fieldConfigurationRepository.removeSchemeFromProject(projectId);
  }

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION RESOLUTION
  // ---------------------------------------------------------------------------

  async resolveFieldConfiguration(
    projectId: string,
    issueTypeId: string,
  ): Promise<FieldConfiguration | null> {
    return await fieldConfigurationRepository.resolveFieldConfiguration(
      projectId,
      issueTypeId,
    );
  }

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
    return await fieldConfigurationRepository.resolveFieldBehavior(
      projectId,
      issueTypeId,
      fieldId,
    );
  }

  /**
   * Clone a field configuration with all its items
   */
  async cloneConfiguration(
    sourceId: string,
    newName: string,
  ): Promise<FieldConfiguration | null> {
    const source = await fieldConfigurationRepository.findConfigById(sourceId);
    if (!source) return null;

    const items = await fieldConfigurationRepository.findConfigItemsByConfigId(
      sourceId,
    );

    // Create new configuration
    const newConfig = await fieldConfigurationRepository.createConfig({
      name: newName,
      description: source.description,
      isDefault: false,
    });

    // Clone items
    for (const { item } of items) {
      await fieldConfigurationRepository.createConfigItem({
        configId: newConfig.id,
        fieldId: item.fieldId,
        isRequired: item.isRequired,
        isHidden: item.isHidden,
        renderer: item.renderer,
        defaultValue: item.defaultValue,
        descriptionOverride: item.descriptionOverride,
      });
    }

    return newConfig;
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

export const screenService = new ScreenService();
export const fieldConfigurationService = new FieldConfigurationService();
