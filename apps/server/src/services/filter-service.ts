/**
 * Filter Service
 *
 * Provides business logic for saved filters.
 */

import { filterRepository } from '@/repositories/filter-repository';
import { jqlService } from '@/services/jql-service';
import {
  throwNotFoundError,
  throwForbiddenError,
  throwValidationError,
} from '@/lib/errors';
import type {
  Filter,
  NewFilter,
  FilterShareType,
  FilterSubscriptionSchedule,
} from '@/db/schema/filters';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateFilterInput {
  name: string;
  description?: string;
  jql: string;
  shareType?: FilterShareType;
  sharedGroups?: string[];
  sharedProjects?: string[];
}

export interface UpdateFilterInput {
  name?: string;
  description?: string;
  jql?: string;
  shareType?: FilterShareType;
  sharedGroups?: string[];
  sharedProjects?: string[];
  position?: number;
}

export interface FilterContext {
  userId: string;
  userGroups: string[];
  projectIds: string[];
}

// =============================================================================
// FILTER SERVICE
// =============================================================================

export class FilterService {
  // ---------------------------------------------------------------------------
  // FILTERS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get all filters accessible by the user
   */
  async getAccessibleFilters(ctx: FilterContext): Promise<Filter[]> {
    return await filterRepository().findAccessibleFilters(
      ctx.userId,
      ctx.userGroups,
      ctx.projectIds,
    );
  }

  /**
   * Get filters owned by the user
   */
  async getMyFilters(userId: string): Promise<Filter[]> {
    return await filterRepository().findByOwner(userId);
  }

  /**
   * Get a filter by ID
   */
  async getFilter(id: string, ctx: FilterContext): Promise<Filter> {
    const filter = await filterRepository().findById(id);

    if (!filter) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id });
    }

    // Check access
    if (!this.canAccess(filter, ctx)) {
      throwForbiddenError('FORBIDDEN', { resource: 'filter', id });
    }

    // Record view
    await filterRepository().recordView(id, ctx.userId);

    return filter;
  }

  /**
   * Create a new filter
   */
  async createFilter(
    input: CreateFilterInput,
    userId: string,
  ): Promise<Filter> {
    // Validate JQL
    const validation = jqlService.validate(input.jql);
    if (!validation.isValid) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'jql',
        error: validation.error,
        position: validation.errorPosition,
      });
    }

    const filter = await filterRepository().create({
      name: input.name,
      description: input.description,
      jql: input.jql,
      ownerId: userId,
      shareType: input.shareType || 'private',
      sharedGroups: input.sharedGroups || [],
      sharedProjects: input.sharedProjects || [],
    });

    return filter;
  }

  /**
   * Update a filter
   */
  async updateFilter(
    id: string,
    input: UpdateFilterInput,
    userId: string,
  ): Promise<Filter> {
    const filter = await filterRepository().findById(id);

    if (!filter) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id });
    }

    // Check ownership
    if (filter.ownerId !== userId) {
      throwForbiddenError('FORBIDDEN', { reason: 'Not the owner' });
    }

    // Validate JQL if provided
    if (input.jql) {
      const validation = jqlService.validate(input.jql);
      if (!validation.isValid) {
        throwValidationError('VALIDATION_ERROR', {
          field: 'jql',
          error: validation.error,
          position: validation.errorPosition,
        });
      }
    }

    const updated = await filterRepository().update(id, {
      name: input.name,
      description: input.description,
      jql: input.jql,
      shareType: input.shareType,
      sharedGroups: input.sharedGroups,
      sharedProjects: input.sharedProjects,
      position: input.position,
    });

    return updated;
  }

  /**
   * Delete a filter
   */
  async deleteFilter(id: string, userId: string): Promise<void> {
    const filter = await filterRepository().findById(id);

    if (!filter) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id });
    }

    // Check ownership
    if (filter.ownerId !== userId) {
      throwForbiddenError('FORBIDDEN', { reason: 'Not the owner' });
    }

    await filterRepository().delete(id);
  }

  /**
   * Clone a filter
   */
  async cloneFilter(
    sourceId: string,
    newName: string,
    ctx: FilterContext,
  ): Promise<Filter> {
    const source = await filterRepository().findById(sourceId);

    if (!source) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id: sourceId });
    }

    // Check access
    if (!this.canAccess(source, ctx)) {
      throwForbiddenError('FORBIDDEN', { resource: 'filter', id: sourceId });
    }

    const cloned = await filterRepository().create({
      name: newName,
      description: source.description,
      jql: source.jql,
      ownerId: ctx.userId,
      shareType: 'private',
      sharedGroups: [],
      sharedProjects: [],
    });

    return cloned;
  }

  // ---------------------------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------------------------

  /**
   * Get user's favorite filters
   */
  async getFavoriteFilters(userId: string): Promise<Filter[]> {
    const favorites = await filterRepository().findFavoritesByUser(userId);
    return favorites.map((f) => f.filter);
  }

  /**
   * Add filter to favorites
   */
  async addToFavorites(filterId: string, ctx: FilterContext): Promise<void> {
    const filter = await filterRepository().findById(filterId);

    if (!filter) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id: filterId });
    }

    // Check access
    if (!this.canAccess(filter, ctx)) {
      throwForbiddenError('FORBIDDEN', { resource: 'filter', id: filterId });
    }

    const added = await filterRepository().addFavorite({
      filterId,
      userId: ctx.userId,
    });

    if (added) {
      await filterRepository().incrementFavoriteCount(filterId);
    }
  }

  /**
   * Remove filter from favorites
   */
  async removeFromFavorites(filterId: string, userId: string): Promise<void> {
    const removed = await filterRepository().removeFavorite(filterId, userId);

    if (removed) {
      await filterRepository().decrementFavoriteCount(filterId);
    }
  }

  /**
   * Check if a filter is favorited
   */
  async isFavorited(filterId: string, userId: string): Promise<boolean> {
    return await filterRepository().isFavorited(filterId, userId);
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  /**
   * Get user's filter subscriptions
   */
  async getSubscriptions(userId: string) {
    return await filterRepository().findSubscriptionsByUser(userId);
  }

  /**
   * Subscribe to a filter
   */
  async subscribe(
    filterId: string,
    schedule: FilterSubscriptionSchedule,
    ctx: FilterContext,
  ) {
    const filter = await filterRepository().findById(filterId);

    if (!filter) {
      throwNotFoundError('NOT_FOUND', { resource: 'filter', id: filterId });
    }

    // Check access
    if (!this.canAccess(filter, ctx)) {
      throwForbiddenError('FORBIDDEN', { resource: 'filter', id: filterId });
    }

    return await filterRepository().upsertSubscription({
      filterId,
      userId: ctx.userId,
      schedule,
      isEnabled: true,
    });
  }

  /**
   * Unsubscribe from a filter
   */
  async unsubscribe(filterId: string, userId: string): Promise<void> {
    await filterRepository().deleteSubscription(filterId, userId);
  }

  /**
   * Toggle subscription enabled state
   */
  async toggleSubscription(filterId: string, userId: string, enabled: boolean) {
    const subscription = await filterRepository().findSubscription(
      filterId,
      userId,
    );

    if (!subscription) {
      throwNotFoundError('NOT_FOUND', { resource: 'subscription' });
    }

    return await filterRepository().upsertSubscription({
      filterId,
      userId,
      schedule: subscription.schedule,
      isEnabled: enabled,
    });
  }

  // ---------------------------------------------------------------------------
  // RECENTLY VIEWED
  // ---------------------------------------------------------------------------

  /**
   * Get recently viewed filters
   */
  async getRecentlyViewed(userId: string, limit?: number): Promise<Filter[]> {
    const recent = await filterRepository().findRecentlyViewedByUser(
      userId,
      limit,
    );
    return recent.map((r) => r.filter);
  }

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Search filters by name
   */
  async searchFilters(query: string, ctx: FilterContext): Promise<Filter[]> {
    return await filterRepository().searchByName(
      ctx.userId,
      query,
      ctx.userGroups,
      ctx.projectIds,
    );
  }

  /**
   * Get popular public filters
   */
  async getPopularFilters(limit?: number): Promise<Filter[]> {
    return await filterRepository().findPopularFilters(limit);
  }

  // ---------------------------------------------------------------------------
  // EXECUTE
  // ---------------------------------------------------------------------------

  /**
   * Execute a filter's JQL and return results
   */
  async executeFilter(
    filterId: string,
    ctx: FilterContext,
    options: {
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const filter = await this.getFilter(filterId, ctx);

    return await jqlService.executeSearch(filter.jql, {
      userId: ctx.userId,
      userGroups: ctx.userGroups,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Validate filter's JQL
   */
  async validateFilter(filterId: string, ctx: FilterContext) {
    const filter = await this.getFilter(filterId, ctx);
    return jqlService.validate(filter.jql);
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private canAccess(filter: Filter, ctx: FilterContext): boolean {
    // Owner always has access
    if (filter.ownerId === ctx.userId) {
      return true;
    }

    // Public filters
    if (filter.shareType === 'public') {
      return true;
    }

    // Group shared
    if (
      filter.shareType === 'group' &&
      filter.sharedGroups &&
      ctx.userGroups.some((g) => filter.sharedGroups!.includes(g))
    ) {
      return true;
    }

    // Project shared
    if (
      filter.shareType === 'project' &&
      filter.sharedProjects &&
      ctx.projectIds.some((p) => filter.sharedProjects!.includes(p))
    ) {
      return true;
    }

    return false;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const filterService = new FilterService();
