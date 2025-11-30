import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectByIdSchema,
  getProjectByKeySchema,
  deleteProjectSchema,
  archiveProjectSchema,
  addIssueTypeToProjectSchema,
  removeIssueTypeFromProjectSchema,
  updateProjectIssueTypeWorkflowSchema,
  getProjectIssueTypesSchema,
  bulkAddIssueTypesToProjectSchema,
  updateProjectSettingsSchema,
  listProjectsSchema,
} from '@taskmaster/validation';
import { z } from 'zod';

export const projectsRouter = router({
  // =============================================================================
  // PROJECTS
  // =============================================================================

  /**
   * Get all projects
   */
  getProjects: protectedProcedure
    .input(listProjectsSchema.optional())
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.project.getAllProjects(input);
      return successResponse(data, 'Projeler başarıyla getirildi');
    }),

  /**
   * Get a project by ID
   */
  getProjectById: protectedProcedure
    .input(getProjectByIdSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.project.getProjectById(input);
      return successResponse(data, 'Proje başarıyla getirildi');
    }),

  /**
   * Get a project by key
   */
  getProjectByKey: protectedProcedure
    .input(getProjectByKeySchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.project.getProjectByKey(input);
      return successResponse(data, 'Proje başarıyla getirildi');
    }),

  /**
   * Create a new project
   */
  createProject: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.createProject(input);
      return successResponse(data, 'Proje başarıyla oluşturuldu');
    }),

  /**
   * Update a project
   */
  updateProject: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.updateProject(input);
      return successResponse(data, 'Proje başarıyla güncellendi');
    }),

  /**
   * Delete a project
   */
  deleteProject: protectedProcedure
    .input(deleteProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.deleteProject(input);
      return successResponse(data, 'Proje başarıyla silindi');
    }),

  /**
   * Archive/unarchive a project
   */
  archiveProject: protectedProcedure
    .input(archiveProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.archiveProject(input);
      const message = input.isArchived
        ? 'Proje başarıyla arşivlendi'
        : 'Proje arşivden çıkarıldı';
      return successResponse(data, message);
    }),

  /**
   * Update project settings
   */
  updateProjectSettings: protectedProcedure
    .input(updateProjectSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.updateProjectSettings(input);
      return successResponse(data, 'Proje ayarları başarıyla güncellendi');
    }),

  // =============================================================================
  // PROJECT ISSUE TYPES
  // =============================================================================

  /**
   * Get all issue types in a project
   */
  getProjectIssueTypes: protectedProcedure
    .input(getProjectIssueTypesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.project.getProjectIssueTypes(input);
      return successResponse(data, 'Proje issue type\'ları başarıyla getirildi');
    }),

  /**
   * Add an issue type to a project
   */
  addIssueTypeToProject: protectedProcedure
    .input(addIssueTypeToProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.addIssueTypeToProject(input);
      return successResponse(data, 'Issue type projeye başarıyla eklendi');
    }),

  /**
   * Update workflow for an issue type in a project
   */
  updateProjectIssueTypeWorkflow: protectedProcedure
    .input(updateProjectIssueTypeWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.updateProjectIssueTypeWorkflow(input);
      return successResponse(data, 'Issue type workflow\'u başarıyla güncellendi');
    }),

  /**
   * Remove an issue type from a project
   */
  removeIssueTypeFromProject: protectedProcedure
    .input(removeIssueTypeFromProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.removeIssueTypeFromProject(input);
      return successResponse(data, 'Issue type projeden başarıyla kaldırıldı');
    }),

  /**
   * Bulk add issue types to a project
   */
  bulkAddIssueTypesToProject: protectedProcedure
    .input(bulkAddIssueTypesToProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.bulkAddIssueTypesToProject(input);
      return successResponse(data, 'Issue type\'lar projeye başarıyla eklendi');
    }),

  /**
   * Get workflow for a specific issue type in a project
   */
  getWorkflowForIssueType: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      issueTypeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.project.getWorkflowForIssueType(
        input.projectId,
        input.issueTypeId,
      );
      return successResponse(data, 'Workflow başarıyla getirildi');
    }),

  // =============================================================================
  // TEMPLATES
  // =============================================================================

  /**
   * Get all templates
   */
  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.project.getAllTemplates();
    return successResponse(data, 'Template\'ler başarıyla getirildi');
  }),

  /**
   * Create project from template
   */
  createProjectFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      project: createProjectSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.project.createProjectFromTemplate(
        input.templateId,
        input.project,
      );
      return successResponse(data, 'Proje template\'den başarıyla oluşturuldu');
    }),
});
