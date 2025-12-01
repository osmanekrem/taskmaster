/**
 * Worklog Service
 *
 * Provides business logic for time tracking and worklogs.
 */

import { worklogRepository } from '@/repositories/worklog-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import {
  throwNotFoundError,
  throwForbiddenError,
  throwValidationError,
} from '@/lib/errors';
import {
  parseTimeFormat,
  formatTimeSpent,
  isValidTimeFormat,
  type TimeConfig,
} from '@/lib/time-format';
import { db } from '@/db';
import type { Worklog, IssueTimeTracking } from '@/db/schema/time-tracking';

// Issue repository instance
const issueRepo = new IssueRepository();

// =============================================================================
// TYPES
// =============================================================================

export interface CreateWorklogInput {
  issueId: string;
  timeSpent: string; // e.g., "2h 30m"
  startedAt: Date;
  description?: string;
  billable?: boolean;
  activityType?: string;
  remainingEstimate?: string; // Optional: adjust remaining
}

export interface UpdateWorklogInput {
  timeSpent?: string;
  startedAt?: Date;
  description?: string;
  billable?: boolean;
  activityType?: string;
}

export interface SetEstimateInput {
  issueId: string;
  originalEstimate?: string;
  remainingEstimate?: string;
}

export interface TimeTrackingContext {
  userId: string;
  projectId?: string;
}

export interface WorklogSummary {
  totalTimeSpent: number;
  totalTimeSpentFormatted: string;
  worklogCount: number;
  issueCount: number;
}

// =============================================================================
// WORKLOG SERVICE
// =============================================================================

export class WorklogService {
  private config: TimeConfig = {
    workingHoursPerDay: 8,
    workingDaysPerWeek: 5,
  };

  // ---------------------------------------------------------------------------
  // WORKLOGS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get worklogs for an issue
   */
  async getWorklogsForIssue(issueId: string): Promise<Worklog[]> {
    const issue = await issueRepo.findById(issueId);
    if (!issue) {
      throwNotFoundError('NOT_FOUND', { resource: 'issue', id: issueId });
    }

    return await worklogRepository().findByIssue(issueId);
  }

  /**
   * Get worklogs by user
   */
  async getWorklogsByUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Worklog[]> {
    return await worklogRepository().findByUser(userId, options);
  }

  /**
   * Get worklogs in date range
   */
  async getWorklogsByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: { userId?: string; issueId?: string; projectId?: string },
  ): Promise<Worklog[]> {
    return await worklogRepository().findByDateRange(
      startDate,
      endDate,
      filters,
    );
  }

  /**
   * Get a worklog by ID
   */
  async getWorklog(id: string): Promise<Worklog> {
    const worklog = await worklogRepository().findById(id);
    if (!worklog) {
      throwNotFoundError('NOT_FOUND', { resource: 'worklog', id });
    }
    return worklog;
  }

  /**
   * Create a new worklog
   */
  async createWorklog(
    input: CreateWorklogInput,
    ctx: TimeTrackingContext,
  ): Promise<Worklog> {
    // Validate issue exists
    const issue = await issueRepo.findById(input.issueId);
    if (!issue) {
      throwNotFoundError('NOT_FOUND', { resource: 'issue', id: input.issueId });
    }

    // Validate time format
    if (!isValidTimeFormat(input.timeSpent)) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'timeSpent',
        error: 'Invalid time format. Use format like "2h 30m"',
      });
    }

    // Load project settings
    await this.loadProjectConfig(ctx.projectId || issue.projectId);

    const timeSpentSeconds = parseTimeFormat(input.timeSpent, this.config);
    if (timeSpentSeconds <= 0) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'timeSpent',
        error: 'Time spent must be greater than 0',
      });
    }

    return await db.transaction(async (tx) => {
      const repo = worklogRepository(tx);

      // Create worklog
      const worklog = await repo.create({
        issueId: input.issueId,
        userId: ctx.userId,
        timeSpentSeconds,
        startedAt: input.startedAt,
        description: input.description,
        billable: input.billable ?? true,
        activityType: input.activityType,
      });

      // Ensure time tracking record exists
      let timeTracking = await repo.getIssueTimeTracking(input.issueId);
      if (!timeTracking) {
        timeTracking = await repo.upsertIssueTimeTracking({
          issueId: input.issueId,
          originalEstimateSeconds: 0,
          remainingEstimateSeconds: 0,
          timeSpentSeconds: 0,
        });
      }

      // Update time spent
      await repo.incrementTimeSpent(input.issueId, timeSpentSeconds);

      // Handle remaining estimate adjustment
      if (input.remainingEstimate) {
        if (!isValidTimeFormat(input.remainingEstimate)) {
          throwValidationError('VALIDATION_ERROR', {
            field: 'remainingEstimate',
            error: 'Invalid time format',
          });
        }
        const remainingSeconds = parseTimeFormat(
          input.remainingEstimate,
          this.config,
        );
        await repo.updateRemainingEstimate(input.issueId, remainingSeconds);
      } else {
        // Auto-reduce remaining estimate
        const newRemaining = Math.max(
          0,
          (timeTracking.remainingEstimateSeconds || 0) - timeSpentSeconds,
        );
        await repo.updateRemainingEstimate(input.issueId, newRemaining);
      }

      return worklog;
    });
  }

  /**
   * Update a worklog
   */
  async updateWorklog(
    id: string,
    input: UpdateWorklogInput,
    ctx: TimeTrackingContext,
  ): Promise<Worklog> {
    const worklog = await worklogRepository().findById(id);
    if (!worklog) {
      throwNotFoundError('NOT_FOUND', { resource: 'worklog', id });
    }

    // Check ownership
    if (worklog.userId !== ctx.userId) {
      throwForbiddenError('FORBIDDEN', {
        reason: 'Can only edit your own worklogs',
      });
    }

    // Load project settings
    await this.loadProjectConfig(ctx.projectId);

    return await db.transaction(async (tx) => {
      const repo = worklogRepository(tx);
      const oldTimeSpent = worklog.timeSpentSeconds;
      let newTimeSpent = oldTimeSpent;

      // Parse new time if provided
      if (input.timeSpent) {
        if (!isValidTimeFormat(input.timeSpent)) {
          throwValidationError('VALIDATION_ERROR', {
            field: 'timeSpent',
            error: 'Invalid time format',
          });
        }
        newTimeSpent = parseTimeFormat(input.timeSpent, this.config);
        if (newTimeSpent <= 0) {
          throwValidationError('VALIDATION_ERROR', {
            field: 'timeSpent',
            error: 'Time spent must be greater than 0',
          });
        }
      }

      // Update worklog
      const updated = await repo.update(id, {
        timeSpentSeconds: newTimeSpent,
        startedAt: input.startedAt,
        description: input.description,
        billable: input.billable,
        activityType: input.activityType,
      });

      // Adjust time tracking if time changed
      if (newTimeSpent !== oldTimeSpent) {
        const difference = newTimeSpent - oldTimeSpent;
        if (difference > 0) {
          await repo.incrementTimeSpent(worklog.issueId, difference);
        } else {
          await repo.decrementTimeSpent(worklog.issueId, Math.abs(difference));
        }
      }

      return updated;
    });
  }

  /**
   * Delete a worklog
   */
  async deleteWorklog(id: string, ctx: TimeTrackingContext): Promise<void> {
    const worklog = await worklogRepository().findById(id);
    if (!worklog) {
      throwNotFoundError('NOT_FOUND', { resource: 'worklog', id });
    }

    // Check ownership (or admin permission in the future)
    if (worklog.userId !== ctx.userId) {
      throwForbiddenError('FORBIDDEN', {
        reason: 'Can only delete your own worklogs',
      });
    }

    await db.transaction(async (tx) => {
      const repo = worklogRepository(tx);

      // Delete worklog
      await repo.delete(id);

      // Decrease time spent
      await repo.decrementTimeSpent(worklog.issueId, worklog.timeSpentSeconds);
    });
  }

  // ---------------------------------------------------------------------------
  // TIME TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Get time tracking for an issue
   */
  async getTimeTracking(issueId: string): Promise<IssueTimeTracking | null> {
    const issue = await issueRepo.findById(issueId);
    if (!issue) {
      throwNotFoundError('NOT_FOUND', { resource: 'issue', id: issueId });
    }

    return await worklogRepository().getIssueTimeTracking(issueId);
  }

  /**
   * Get time tracking with formatted values
   */
  async getTimeTrackingFormatted(issueId: string, ctx?: TimeTrackingContext) {
    await this.loadProjectConfig(ctx?.projectId);

    const tracking = await this.getTimeTracking(issueId);

    return {
      originalEstimate: tracking?.originalEstimateSeconds || 0,
      originalEstimateFormatted: formatTimeSpent(
        tracking?.originalEstimateSeconds || 0,
        this.config,
        { compact: true },
      ),
      remainingEstimate: tracking?.remainingEstimateSeconds || 0,
      remainingEstimateFormatted: formatTimeSpent(
        tracking?.remainingEstimateSeconds || 0,
        this.config,
        { compact: true },
      ),
      timeSpent: tracking?.timeSpentSeconds || 0,
      timeSpentFormatted: formatTimeSpent(
        tracking?.timeSpentSeconds || 0,
        this.config,
        { compact: true },
      ),
    };
  }

  /**
   * Set original estimate
   */
  async setOriginalEstimate(
    issueId: string,
    estimate: string,
    ctx: TimeTrackingContext,
  ): Promise<IssueTimeTracking> {
    const issue = await issueRepo.findById(issueId);
    if (!issue) {
      throwNotFoundError('NOT_FOUND', { resource: 'issue', id: issueId });
    }

    if (!isValidTimeFormat(estimate)) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'originalEstimate',
        error: 'Invalid time format',
      });
    }

    await this.loadProjectConfig(ctx.projectId || issue.projectId);
    const seconds = parseTimeFormat(estimate, this.config);

    // Get or create time tracking
    const existing = await worklogRepository().getIssueTimeTracking(issueId);

    // Check if we should copy to remaining
    const settings = await worklogRepository().getSettings(issue.projectId);
    const shouldCopyToRemaining =
      settings?.copyEstimateToRemaining !== false &&
      !existing?.timeSpentSeconds;

    return await worklogRepository().upsertIssueTimeTracking({
      issueId,
      originalEstimateSeconds: seconds,
      remainingEstimateSeconds: shouldCopyToRemaining
        ? seconds
        : existing?.remainingEstimateSeconds || 0,
      timeSpentSeconds: existing?.timeSpentSeconds || 0,
    });
  }

  /**
   * Set remaining estimate
   */
  async setRemainingEstimate(
    issueId: string,
    estimate: string,
    ctx: TimeTrackingContext,
  ): Promise<void> {
    const issue = await issueRepo.findById(issueId);
    if (!issue) {
      throwNotFoundError('NOT_FOUND', { resource: 'issue', id: issueId });
    }

    if (!isValidTimeFormat(estimate)) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'remainingEstimate',
        error: 'Invalid time format',
      });
    }

    await this.loadProjectConfig(ctx.projectId || issue.projectId);
    const seconds = parseTimeFormat(estimate, this.config);

    // Ensure time tracking exists
    const existing = await worklogRepository().getIssueTimeTracking(issueId);
    if (!existing) {
      await worklogRepository().upsertIssueTimeTracking({
        issueId,
        originalEstimateSeconds: 0,
        remainingEstimateSeconds: seconds,
        timeSpentSeconds: 0,
      });
    } else {
      await worklogRepository().updateRemainingEstimate(issueId, seconds);
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARIES & REPORTS
  // ---------------------------------------------------------------------------

  /**
   * Get worklog summary for a user in date range
   */
  async getUserWorklogSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WorklogSummary> {
    const summary = await worklogRepository().getSummaryByUser(
      userId,
      startDate,
      endDate,
    );

    return {
      totalTimeSpent: summary?.totalTimeSpent || 0,
      totalTimeSpentFormatted: formatTimeSpent(
        summary?.totalTimeSpent || 0,
        this.config,
        {
          compact: true,
        },
      ),
      worklogCount: summary?.worklogCount || 0,
      issueCount: summary?.issueCount || 0,
    };
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get time tracking settings
   */
  async getSettings(projectId?: string) {
    return await worklogRepository().getSettings(projectId);
  }

  /**
   * Update time tracking settings
   */
  async updateSettings(
    projectId: string | null,
    settings: {
      workingHoursPerDay?: number;
      workingDaysPerWeek?: number;
      defaultTimeUnit?: string;
      copyEstimateToRemaining?: boolean;
      activityTypes?: string[];
    },
  ) {
    return await worklogRepository().upsertSettings({
      projectId: projectId ?? undefined,
      workingHoursPerDay: settings.workingHoursPerDay,
      workingDaysPerWeek: settings.workingDaysPerWeek,
      defaultTimeUnit: settings.defaultTimeUnit,
      copyEstimateToRemaining: settings.copyEstimateToRemaining,
      activityTypes: settings.activityTypes,
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async loadProjectConfig(projectId?: string): Promise<void> {
    const settings = await worklogRepository().getSettings(projectId);
    if (settings) {
      this.config = {
        workingHoursPerDay: settings.workingHoursPerDay,
        workingDaysPerWeek: settings.workingDaysPerWeek,
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const worklogService = new WorklogService();
