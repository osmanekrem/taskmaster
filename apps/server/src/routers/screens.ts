import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  screenService,
  fieldConfigurationService,
} from '@/services/screen-service';
import { requirePermission } from '@/lib/middleware/permission';
import type { ScreenOperation } from '@/db/schema/screens';
import {
  createScreenSchema,
  updateScreenSchema,
  screenIdSchema,
  createScreenTabSchema,
  updateScreenTabSchema,
  reorderScreenTabsSchema,
  addFieldToTabSchema,
  updateTabFieldSchema,
  reorderTabFieldsSchema,
  createScreenSchemeSchema,
  updateScreenSchemeSchema,
  createScreenSchemeItemSchema,
  updateScreenSchemeItemSchema,
  assignScreenSchemeToProjectSchema,
  resolveScreenSchema,
  cloneScreenSchema,
} from '@taskmaster/validation';

// Alias imports for backward compatibility
const createTabSchema = createScreenTabSchema;
const updateTabSchema = updateScreenTabSchema;
const reorderTabsSchema = reorderScreenTabsSchema;
const createSchemeSchema = createScreenSchemeSchema;
const updateSchemeSchema = updateScreenSchemeSchema;
const createSchemeItemSchema = createScreenSchemeItemSchema;
const updateSchemeItemSchema = updateScreenSchemeItemSchema;
const assignSchemeToProjectSchema = assignScreenSchemeToProjectSchema;

// =============================================================================
// SCREENS ROUTER
// =============================================================================

export const screensRouter = router({
  // ---------------------------------------------------------------------------
  // SCREENS
  // ---------------------------------------------------------------------------

  /**
   * Get all screens
   */
  getScreens: protectedProcedure
    .use(requirePermission('admin:manage_screens'))
    .query(async () => {
      const data = await screenService.getAllScreens();
      return successResponse(data, 'Ekranlar başarıyla getirildi');
    }),

  /**
   * Get a screen by ID
   */
  getScreenById: protectedProcedure
    .input(screenIdSchema)
    .use(requirePermission('admin:manage_screens'))
    .query(async ({ input }) => {
      const data = await screenService.getScreen(input.id);
      return successResponse(data, 'Ekran başarıyla getirildi');
    }),

  /**
   * Get screen with full structure (tabs and fields)
   */
  getScreenWithStructure: protectedProcedure
    .input(screenIdSchema)
    .use(requirePermission('admin:manage_screens'))
    .query(async ({ input }) => {
      const data = await screenService.getScreenWithStructure(input.id);
      return successResponse(data, 'Ekran yapısı başarıyla getirildi');
    }),

  /**
   * Create a new screen
   */
  createScreen: protectedProcedure
    .input(createScreenSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.createScreen(input);
      return successResponse(data, 'Ekran başarıyla oluşturuldu');
    }),

  /**
   * Update a screen
   */
  updateScreen: protectedProcedure
    .input(updateScreenSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await screenService.updateScreen(id, updateData);
      return successResponse(data, 'Ekran başarıyla güncellendi');
    }),

  /**
   * Delete a screen
   */
  deleteScreen: protectedProcedure
    .input(screenIdSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.deleteScreen(input.id);
      return successResponse(null, 'Ekran başarıyla silindi');
    }),

  /**
   * Clone a screen
   */
  cloneScreen: protectedProcedure
    .input(cloneScreenSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.cloneScreen(
        input.sourceId,
        input.newName,
      );
      return successResponse(data, 'Ekran başarıyla klonlandı');
    }),

  // ---------------------------------------------------------------------------
  // SCREEN TABS
  // ---------------------------------------------------------------------------

  /**
   * Get tabs for a screen
   */
  getTabs: protectedProcedure
    .input(screenIdSchema)
    .use(requirePermission('admin:manage_screens'))
    .query(async ({ input }) => {
      const data = await screenService.getTabsByScreen(input.id);
      return successResponse(data, 'Sekmeler başarıyla getirildi');
    }),

  /**
   * Create a new tab
   */
  createTab: protectedProcedure
    .input(createTabSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.createTab(input);
      return successResponse(data, 'Sekme başarıyla oluşturuldu');
    }),

  /**
   * Update a tab
   */
  updateTab: protectedProcedure
    .input(updateTabSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await screenService.updateTab(id, updateData);
      return successResponse(data, 'Sekme başarıyla güncellendi');
    }),

  /**
   * Delete a tab
   */
  deleteTab: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.deleteTab(input.id);
      return successResponse(null, 'Sekme başarıyla silindi');
    }),

  /**
   * Reorder tabs
   */
  reorderTabs: protectedProcedure
    .input(reorderTabsSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.reorderTabs(input.screenId, input.tabOrder);
      return successResponse(null, 'Sekmeler başarıyla sıralandı');
    }),

  // ---------------------------------------------------------------------------
  // SCREEN TAB FIELDS
  // ---------------------------------------------------------------------------

  /**
   * Add a field to a tab
   */
  addFieldToTab: protectedProcedure
    .input(addFieldToTabSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.addFieldToTab(input);
      return successResponse(data, 'Alan sekmeye eklendi');
    }),

  /**
   * Update a tab field
   */
  updateTabField: protectedProcedure
    .input(updateTabFieldSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await screenService.updateTabField(id, updateData);
      return successResponse(data, 'Sekme alanı güncellendi');
    }),

  /**
   * Remove a field from a tab
   */
  removeFieldFromTab: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.removeFieldFromTab(input.id);
      return successResponse(null, 'Alan sekmeden kaldırıldı');
    }),

  /**
   * Reorder tab fields
   */
  reorderTabFields: protectedProcedure
    .input(reorderTabFieldsSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.reorderTabFields(input.tabId, input.fieldOrder);
      return successResponse(null, 'Alanlar başarıyla sıralandı');
    }),

  // ---------------------------------------------------------------------------
  // SCREEN SCHEMES
  // ---------------------------------------------------------------------------

  /**
   * Get all screen schemes
   */
  getSchemes: protectedProcedure
    .use(requirePermission('admin:manage_screens'))
    .query(async () => {
      const data = await screenService.getAllSchemes();
      return successResponse(data, 'Ekran şemaları başarıyla getirildi');
    }),

  /**
   * Get a screen scheme by ID
   */
  getSchemeById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .query(async ({ input }) => {
      const data = await screenService.getScheme(input.id);
      return successResponse(data, 'Ekran şeması başarıyla getirildi');
    }),

  /**
   * Get default screen scheme
   */
  getDefaultScheme: protectedProcedure
    .use(requirePermission('admin:manage_screens'))
    .query(async () => {
      const data = await screenService.getDefaultScheme();
      return successResponse(
        data,
        'Varsayılan ekran şeması başarıyla getirildi',
      );
    }),

  /**
   * Create a new screen scheme
   */
  createScheme: protectedProcedure
    .input(createSchemeSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.createScheme(input);
      return successResponse(data, 'Ekran şeması başarıyla oluşturuldu');
    }),

  /**
   * Update a screen scheme
   */
  updateScheme: protectedProcedure
    .input(updateSchemeSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await screenService.updateScheme(id, updateData);
      return successResponse(data, 'Ekran şeması başarıyla güncellendi');
    }),

  /**
   * Delete a screen scheme
   */
  deleteScheme: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.deleteScheme(input.id);
      return successResponse(null, 'Ekran şeması başarıyla silindi');
    }),

  /**
   * Set default screen scheme
   */
  setDefaultScheme: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.setDefaultScheme(input.id);
      return successResponse(
        null,
        'Varsayılan ekran şeması başarıyla ayarlandı',
      );
    }),

  // ---------------------------------------------------------------------------
  // SCREEN SCHEME ITEMS
  // ---------------------------------------------------------------------------

  /**
   * Get items for a screen scheme
   */
  getSchemeItems: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .query(async ({ input }) => {
      const data = await screenService.getSchemeItems(input.schemeId);
      return successResponse(data, 'Şema öğeleri başarıyla getirildi');
    }),

  /**
   * Create a new scheme item
   */
  createSchemeItem: protectedProcedure
    .input(createSchemeItemSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const data = await screenService.createSchemeItem(input);
      return successResponse(data, 'Şema öğesi başarıyla oluşturuldu');
    }),

  /**
   * Update a scheme item
   */
  updateSchemeItem: protectedProcedure
    .input(updateSchemeItemSchema)
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await screenService.updateSchemeItem(id, updateData);
      return successResponse(data, 'Şema öğesi başarıyla güncellendi');
    }),

  /**
   * Delete a scheme item
   */
  deleteSchemeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_screens'))
    .mutation(async ({ input }) => {
      await screenService.deleteSchemeItem(input.id);
      return successResponse(null, 'Şema öğesi başarıyla silindi');
    }),

  // ---------------------------------------------------------------------------
  // PROJECT ASSIGNMENT
  // ---------------------------------------------------------------------------

  /**
   * Assign a screen scheme to a project
   */
  assignSchemeToProject: protectedProcedure
    .input(assignSchemeToProjectSchema)
    .use(requirePermission('admin:manage_projects'))
    .mutation(async ({ input }) => {
      await screenService.assignSchemeToProject(
        input.projectId,
        input.schemeId,
      );
      return successResponse(null, 'Ekran şeması projeye atandı');
    }),

  /**
   * Remove screen scheme from a project
   */
  removeSchemeFromProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .use(requirePermission('admin:manage_projects'))
    .mutation(async ({ input }) => {
      await screenService.removeSchemeFromProject(input.projectId);
      return successResponse(null, 'Ekran şeması projeden kaldırıldı');
    }),

  // ---------------------------------------------------------------------------
  // SCREEN RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Resolve which screen to use for a given context
   */
  resolveScreen: protectedProcedure
    .input(resolveScreenSchema)
    .query(async ({ input }) => {
      const data = await screenService.resolveScreen(
        input.projectId,
        input.issueTypeId,
        input.operation as ScreenOperation,
      );
      return successResponse(data, 'Ekran başarıyla çözümlendi');
    }),

  /**
   * Get fully resolved screen with all fields and configurations
   */
  getResolvedScreen: protectedProcedure
    .input(resolveScreenSchema)
    .query(async ({ input }) => {
      const data = await screenService.getResolvedScreen(
        input.projectId,
        input.issueTypeId,
        input.operation as ScreenOperation,
      );
      return successResponse(data, 'Ekran yapısı başarıyla getirildi');
    }),
});
