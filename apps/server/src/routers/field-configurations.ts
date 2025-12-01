import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { fieldConfigurationService } from '@/services/screen-service';
import { requirePermission } from '@/lib/middleware/permission';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Configuration schemas
const createConfigSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const updateConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

const configIdSchema = z.object({
  id: z.string().uuid(),
});

// Configuration item schemas
const createConfigItemSchema = z.object({
  configId: z.string().uuid(),
  fieldId: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

const updateConfigItemSchema = z.object({
  id: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

const upsertConfigItemSchema = z.object({
  configId: z.string().uuid(),
  fieldId: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

// Scheme schemas
const createSchemeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const updateSchemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// Scheme item schemas
const createSchemeItemSchema = z.object({
  schemeId: z.string().uuid(),
  issueTypeId: z.string().uuid().optional().nullable(),
  configId: z.string().uuid(),
});

const updateSchemeItemSchema = z.object({
  id: z.string().uuid(),
  configId: z.string().uuid(),
});

// Project assignment schema
const assignSchemeToProjectSchema = z.object({
  projectId: z.string().uuid(),
  schemeId: z.string().uuid(),
});

// Resolution schema
const resolveConfigSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
});

const resolveFieldBehaviorSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
  fieldId: z.string().uuid(),
});

// Clone schema
const cloneConfigSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

// =============================================================================
// FIELD CONFIGURATIONS ROUTER
// =============================================================================

export const fieldConfigurationsRouter = router({
  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get all field configurations
   */
  getConfigurations: protectedProcedure
    .use(requirePermission('admin:manage_fields'))
    .query(async () => {
      const data = await fieldConfigurationService.getAllConfigurations();
      return successResponse(
        data,
        'Alan konfigürasyonları başarıyla getirildi',
      );
    }),

  /**
   * Get a field configuration by ID
   */
  getConfigurationById: protectedProcedure
    .input(configIdSchema)
    .use(requirePermission('admin:manage_fields'))
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.getConfiguration(input.id);
      return successResponse(data, 'Alan konfigürasyonu başarıyla getirildi');
    }),

  /**
   * Get default field configuration
   */
  getDefaultConfiguration: protectedProcedure
    .use(requirePermission('admin:manage_fields'))
    .query(async () => {
      const data = await fieldConfigurationService.getDefaultConfiguration();
      return successResponse(
        data,
        'Varsayılan alan konfigürasyonu başarıyla getirildi',
      );
    }),

  /**
   * Create a new field configuration
   */
  createConfiguration: protectedProcedure
    .input(createConfigSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const data = await fieldConfigurationService.createConfiguration(input);
      return successResponse(data, 'Alan konfigürasyonu başarıyla oluşturuldu');
    }),

  /**
   * Update a field configuration
   */
  updateConfiguration: protectedProcedure
    .input(updateConfigSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await fieldConfigurationService.updateConfiguration(
        id,
        updateData,
      );
      return successResponse(data, 'Alan konfigürasyonu başarıyla güncellendi');
    }),

  /**
   * Delete a field configuration
   */
  deleteConfiguration: protectedProcedure
    .input(configIdSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.deleteConfiguration(input.id);
      return successResponse(null, 'Alan konfigürasyonu başarıyla silindi');
    }),

  /**
   * Set default field configuration
   */
  setDefaultConfiguration: protectedProcedure
    .input(configIdSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.setDefaultConfiguration(input.id);
      return successResponse(
        null,
        'Varsayılan alan konfigürasyonu başarıyla ayarlandı',
      );
    }),

  /**
   * Clone a field configuration
   */
  cloneConfiguration: protectedProcedure
    .input(cloneConfigSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const data = await fieldConfigurationService.cloneConfiguration(
        input.sourceId,
        input.newName,
      );
      return successResponse(data, 'Alan konfigürasyonu başarıyla klonlandı');
    }),

  // ---------------------------------------------------------------------------
  // CONFIGURATION ITEMS
  // ---------------------------------------------------------------------------

  /**
   * Get items for a field configuration
   */
  getConfigurationItems: protectedProcedure
    .input(z.object({ configId: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.getConfigurationItems(
        input.configId,
      );
      return successResponse(data, 'Konfigürasyon öğeleri başarıyla getirildi');
    }),

  /**
   * Create a new configuration item
   */
  createConfigurationItem: protectedProcedure
    .input(createConfigItemSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const data = await fieldConfigurationService.createConfigurationItem(
        input,
      );
      return successResponse(data, 'Konfigürasyon öğesi başarıyla oluşturuldu');
    }),

  /**
   * Update a configuration item
   */
  updateConfigurationItem: protectedProcedure
    .input(updateConfigItemSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await fieldConfigurationService.updateConfigurationItem(
        id,
        updateData,
      );
      return successResponse(data, 'Konfigürasyon öğesi başarıyla güncellendi');
    }),

  /**
   * Delete a configuration item
   */
  deleteConfigurationItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.deleteConfigurationItem(input.id);
      return successResponse(null, 'Konfigürasyon öğesi başarıyla silindi');
    }),

  /**
   * Upsert a configuration item (create or update)
   */
  upsertConfigurationItem: protectedProcedure
    .input(upsertConfigItemSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const { configId, fieldId, ...itemData } = input;
      const data = await fieldConfigurationService.upsertConfigurationItem(
        configId,
        fieldId,
        itemData,
      );
      return successResponse(data, 'Konfigürasyon öğesi başarıyla kaydedildi');
    }),

  // ---------------------------------------------------------------------------
  // FIELD CONFIGURATION SCHEMES
  // ---------------------------------------------------------------------------

  /**
   * Get all field configuration schemes
   */
  getSchemes: protectedProcedure
    .use(requirePermission('admin:manage_fields'))
    .query(async () => {
      const data = await fieldConfigurationService.getAllSchemes();
      return successResponse(
        data,
        'Alan konfigürasyon şemaları başarıyla getirildi',
      );
    }),

  /**
   * Get a scheme by ID
   */
  getSchemeById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.getScheme(input.id);
      return successResponse(
        data,
        'Alan konfigürasyon şeması başarıyla getirildi',
      );
    }),

  /**
   * Get default scheme
   */
  getDefaultScheme: protectedProcedure
    .use(requirePermission('admin:manage_fields'))
    .query(async () => {
      const data = await fieldConfigurationService.getDefaultScheme();
      return successResponse(
        data,
        'Varsayılan alan konfigürasyon şeması başarıyla getirildi',
      );
    }),

  /**
   * Create a new scheme
   */
  createScheme: protectedProcedure
    .input(createSchemeSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const data = await fieldConfigurationService.createScheme(input);
      return successResponse(
        data,
        'Alan konfigürasyon şeması başarıyla oluşturuldu',
      );
    }),

  /**
   * Update a scheme
   */
  updateScheme: protectedProcedure
    .input(updateSchemeSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await fieldConfigurationService.updateScheme(id, updateData);
      return successResponse(
        data,
        'Alan konfigürasyon şeması başarıyla güncellendi',
      );
    }),

  /**
   * Delete a scheme
   */
  deleteScheme: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.deleteScheme(input.id);
      return successResponse(
        null,
        'Alan konfigürasyon şeması başarıyla silindi',
      );
    }),

  /**
   * Set default scheme
   */
  setDefaultScheme: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.setDefaultScheme(input.id);
      return successResponse(
        null,
        'Varsayılan alan konfigürasyon şeması başarıyla ayarlandı',
      );
    }),

  // ---------------------------------------------------------------------------
  // SCHEME ITEMS
  // ---------------------------------------------------------------------------

  /**
   * Get items for a scheme
   */
  getSchemeItems: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.getSchemeItems(
        input.schemeId,
      );
      return successResponse(data, 'Şema öğeleri başarıyla getirildi');
    }),

  /**
   * Create a new scheme item
   */
  createSchemeItem: protectedProcedure
    .input(createSchemeItemSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const data = await fieldConfigurationService.createSchemeItem(input);
      return successResponse(data, 'Şema öğesi başarıyla oluşturuldu');
    }),

  /**
   * Update a scheme item
   */
  updateSchemeItem: protectedProcedure
    .input(updateSchemeItemSchema)
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await fieldConfigurationService.updateSchemeItem(
        id,
        updateData,
      );
      return successResponse(data, 'Şema öğesi başarıyla güncellendi');
    }),

  /**
   * Delete a scheme item
   */
  deleteSchemeItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .use(requirePermission('admin:manage_fields'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.deleteSchemeItem(input.id);
      return successResponse(null, 'Şema öğesi başarıyla silindi');
    }),

  // ---------------------------------------------------------------------------
  // PROJECT ASSIGNMENT
  // ---------------------------------------------------------------------------

  /**
   * Assign a scheme to a project
   */
  assignSchemeToProject: protectedProcedure
    .input(assignSchemeToProjectSchema)
    .use(requirePermission('admin:manage_projects'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.assignSchemeToProject(
        input.projectId,
        input.schemeId,
      );
      return successResponse(null, 'Alan konfigürasyon şeması projeye atandı');
    }),

  /**
   * Remove scheme from a project
   */
  removeSchemeFromProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .use(requirePermission('admin:manage_projects'))
    .mutation(async ({ input }) => {
      await fieldConfigurationService.removeSchemeFromProject(input.projectId);
      return successResponse(
        null,
        'Alan konfigürasyon şeması projeden kaldırıldı',
      );
    }),

  // ---------------------------------------------------------------------------
  // RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Resolve which field configuration to use for a given context
   */
  resolveConfiguration: protectedProcedure
    .input(resolveConfigSchema)
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.resolveFieldConfiguration(
        input.projectId,
        input.issueTypeId,
      );
      return successResponse(data, 'Alan konfigürasyonu başarıyla çözümlendi');
    }),

  /**
   * Resolve field behavior for a specific field in context
   */
  resolveFieldBehavior: protectedProcedure
    .input(resolveFieldBehaviorSchema)
    .query(async ({ input }) => {
      const data = await fieldConfigurationService.resolveFieldBehavior(
        input.projectId,
        input.issueTypeId,
        input.fieldId,
      );
      return successResponse(data, 'Alan davranışı başarıyla çözümlendi');
    }),
});
