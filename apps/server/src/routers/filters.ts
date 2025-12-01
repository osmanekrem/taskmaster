import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { filterService } from '@/services/filter-service';
import { jqlService } from '@/services/jql-service';
import { requirePermission } from '@/lib/middleware/permission';
import {
  createFilterSchema,
  updateFilterSchema,
  filterIdSchema,
  cloneFilterSchema,
  subscribeToFilterSchema,
  executeFilterSchema,
  searchJqlSchema,
  validateJqlSchema,
  searchFiltersSchema,
  buildJqlSchema,
} from '@taskmaster/validation';

// Alias for backward compatibility
const subscribeSchema = subscribeToFilterSchema;

// =============================================================================
// HELPER: CREATE FILTER CONTEXT
// =============================================================================

function createFilterContext(ctx: {
  session: { user: { id: string } } | null;
}) {
  return {
    userId: ctx.session!.user.id,
    userGroups: [], // TODO: Get from user session when groups are implemented
    projectIds: [], // TODO: Get from user's accessible projects
  };
}

// =============================================================================
// FILTERS ROUTER
// =============================================================================

export const filtersRouter = router({
  // ---------------------------------------------------------------------------
  // FILTERS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get all accessible filters
   */
  getFilters: protectedProcedure
    .use(requirePermission('filter:view'))
    .query(async ({ ctx }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.getAccessibleFilters(filterCtx);
      return successResponse(data, 'Filtreler başarıyla getirildi');
    }),

  /**
   * Get my filters
   */
  getMyFilters: protectedProcedure
    .use(requirePermission('filter:view'))
    .query(async ({ ctx }) => {
      const data = await filterService.getMyFilters(ctx.session!.user.id);
      return successResponse(data, 'Filtreleriniz başarıyla getirildi');
    }),

  /**
   * Get a filter by ID
   */
  getFilterById: protectedProcedure
    .input(filterIdSchema)
    .use(requirePermission('filter:view'))
    .query(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.getFilter(input.id, filterCtx);
      return successResponse(data, 'Filtre başarıyla getirildi');
    }),

  /**
   * Create a new filter
   */
  createFilter: protectedProcedure
    .input(createFilterSchema)
    .use(requirePermission('filter:create'))
    .mutation(async ({ ctx, input }) => {
      const data = await filterService.createFilter(
        input,
        ctx.session!.user.id,
      );
      return successResponse(data, 'Filtre başarıyla oluşturuldu');
    }),

  /**
   * Update a filter
   */
  updateFilter: protectedProcedure
    .input(updateFilterSchema)
    .use(requirePermission('filter:edit'))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const data = await filterService.updateFilter(
        id,
        updateData,
        ctx.session!.user.id,
      );
      return successResponse(data, 'Filtre başarıyla güncellendi');
    }),

  /**
   * Delete a filter
   */
  deleteFilter: protectedProcedure
    .input(filterIdSchema)
    .use(requirePermission('filter:delete'))
    .mutation(async ({ ctx, input }) => {
      await filterService.deleteFilter(input.id, ctx.session!.user.id);
      return successResponse(null, 'Filtre başarıyla silindi');
    }),

  /**
   * Clone a filter
   */
  cloneFilter: protectedProcedure
    .input(cloneFilterSchema)
    .use(requirePermission('filter:create'))
    .mutation(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.cloneFilter(
        input.sourceId,
        input.newName,
        filterCtx,
      );
      return successResponse(data, 'Filtre başarıyla klonlandı');
    }),

  // ---------------------------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------------------------

  /**
   * Get favorite filters
   */
  getFavorites: protectedProcedure
    .use(requirePermission('filter:view'))
    .query(async ({ ctx }) => {
      const data = await filterService.getFavoriteFilters(ctx.session!.user.id);
      return successResponse(data, 'Favori filtreler başarıyla getirildi');
    }),

  /**
   * Add to favorites
   */
  addToFavorites: protectedProcedure
    .input(filterIdSchema)
    .use(requirePermission('filter:view'))
    .mutation(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      await filterService.addToFavorites(input.id, filterCtx);
      return successResponse(null, 'Filtre favorilere eklendi');
    }),

  /**
   * Remove from favorites
   */
  removeFromFavorites: protectedProcedure
    .input(filterIdSchema)
    .use(requirePermission('filter:view'))
    .mutation(async ({ ctx, input }) => {
      await filterService.removeFromFavorites(input.id, ctx.session!.user.id);
      return successResponse(null, 'Filtre favorilerden kaldırıldı');
    }),

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  /**
   * Get subscriptions
   */
  getSubscriptions: protectedProcedure
    .use(requirePermission('filter:view'))
    .query(async ({ ctx }) => {
      const data = await filterService.getSubscriptions(ctx.session!.user.id);
      return successResponse(data, 'Abonelikler başarıyla getirildi');
    }),

  /**
   * Subscribe to a filter
   */
  subscribe: protectedProcedure
    .input(subscribeSchema)
    .use(requirePermission('filter:view'))
    .mutation(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.subscribe(
        input.filterId,
        input.schedule,
        filterCtx,
      );
      return successResponse(data, 'Filtreye abone olundu');
    }),

  /**
   * Unsubscribe from a filter
   */
  unsubscribe: protectedProcedure
    .input(filterIdSchema)
    .use(requirePermission('filter:view'))
    .mutation(async ({ ctx, input }) => {
      await filterService.unsubscribe(input.id, ctx.session!.user.id);
      return successResponse(null, 'Abonelik iptal edildi');
    }),

  // ---------------------------------------------------------------------------
  // RECENTLY VIEWED
  // ---------------------------------------------------------------------------

  /**
   * Get recently viewed filters
   */
  getRecentlyViewed: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }))
    .use(requirePermission('filter:view'))
    .query(async ({ ctx, input }) => {
      const data = await filterService.getRecentlyViewed(
        ctx.session!.user.id,
        input.limit,
      );
      return successResponse(
        data,
        'Son görüntülenen filtreler başarıyla getirildi',
      );
    }),

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Search filters by name
   */
  searchFilters: protectedProcedure
    .input(searchFiltersSchema)
    .use(requirePermission('filter:view'))
    .query(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.searchFilters(input.query, filterCtx);
      return successResponse(data, 'Filtreler başarıyla arandı');
    }),

  /**
   * Get popular filters
   */
  getPopularFilters: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).optional() }))
    .use(requirePermission('filter:view'))
    .query(async ({ input }) => {
      const data = await filterService.getPopularFilters(input.limit);
      return successResponse(data, 'Popüler filtreler başarıyla getirildi');
    }),

  // ---------------------------------------------------------------------------
  // EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Execute a saved filter
   */
  executeFilter: protectedProcedure
    .input(executeFilterSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const filterCtx = createFilterContext(ctx);
      const data = await filterService.executeFilter(
        input.filterId,
        filterCtx,
        {
          limit: input.limit,
          offset: input.offset,
        },
      );
      return successResponse(data, 'Filtre başarıyla çalıştırıldı');
    }),

  /**
   * Execute raw JQL
   */
  executeJql: protectedProcedure
    .input(searchJqlSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const data = await jqlService.executeSearch(input.jql, {
        userId: ctx.session!.user.id,
        limit: input.limit,
        offset: input.offset,
      });
      return successResponse(data, 'JQL başarıyla çalıştırıldı');
    }),

  /**
   * Validate JQL
   */
  validateJql: protectedProcedure
    .input(validateJqlSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      const data = jqlService.validate(input.jql);
      return successResponse(data, 'JQL doğrulama tamamlandı');
    }),

  /**
   * Build JQL from filters
   */
  buildJql: protectedProcedure
    .input(buildJqlSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      // Convert string dates to Date objects
      const filters = {
        ...input,
        createdAfter: input.createdAfter
          ? new Date(input.createdAfter)
          : undefined,
        createdBefore: input.createdBefore
          ? new Date(input.createdBefore)
          : undefined,
        updatedAfter: input.updatedAfter
          ? new Date(input.updatedAfter)
          : undefined,
        updatedBefore: input.updatedBefore
          ? new Date(input.updatedBefore)
          : undefined,
        dueAfter: input.dueAfter ? new Date(input.dueAfter) : undefined,
        dueBefore: input.dueBefore ? new Date(input.dueBefore) : undefined,
      };
      const jql = jqlService.buildJQL(filters);
      return successResponse({ jql }, 'JQL başarıyla oluşturuldu');
    }),
});
