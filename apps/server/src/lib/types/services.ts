// =============================================================================
// SERVICE INTERFACES
// =============================================================================
// Interfaces for services that may have multiple implementations
// or need to be mocked in tests

import type {
  NotificationType,
  NotificationData,
  WatchReason,
  NotificationChannel,
} from '@/db/schema';

// =============================================================================
// NOTIFICATION SERVICE INTERFACE
// =============================================================================

export interface INotificationService {
  // Watcher Management
  watchIssue(
    issueId: string,
    userId: string,
    reason?: WatchReason,
  ): Promise<unknown>;
  unwatchIssue(issueId: string, userId: string): Promise<void>;
  toggleWatch(
    issueId: string,
    userId: string,
    reason?: WatchReason,
  ): Promise<{ isWatching: boolean }>;
  isWatching(issueId: string, userId: string): Promise<boolean>;
  getIssueWatchers(issueId: string): Promise<unknown[]>;
  autoWatch(
    issueId: string,
    userId: string,
    reason: WatchReason,
  ): Promise<void>;

  // Notification Dispatch
  notify(
    userId: string,
    type: NotificationType,
    title: string,
    options?: {
      content?: string;
      data?: NotificationData;
      issueId?: string;
      commentId?: string;
      actorId?: string;
      groupKey?: string;
      channel?: NotificationChannel;
    },
  ): Promise<unknown>;

  notifyWatchers(
    issueId: string,
    type: NotificationType,
    title: string,
    options?: {
      content?: string;
      data?: NotificationData;
      commentId?: string;
      actorId?: string;
      groupKey?: string;
      excludeUserIds?: string[];
    },
  ): Promise<unknown[]>;

  notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    options?: {
      content?: string;
      data?: NotificationData;
      issueId?: string;
      commentId?: string;
      actorId?: string;
      groupKey?: string;
    },
  ): Promise<unknown[]>;

  // Notification Events
  notifyIssueAssigned(
    issueId: string,
    assigneeId: string,
    actorId: string,
    issueData: { key: string; title: string },
    actorData: { name: string; email: string },
  ): Promise<void>;

  notifyStatusChanged(
    issueId: string,
    actorId: string,
    issueData: { key: string; title: string },
    statusData: { oldStatus: string; newStatus: string },
    actorData: { name: string; email: string },
  ): Promise<void>;

  notifyCommentAdded(
    issueId: string,
    commentId: string,
    actorId: string,
    issueData: { key: string; title: string },
    commentPreview: string,
    actorData: { name: string; email: string },
  ): Promise<void>;
}

// =============================================================================
// WORKFLOW SERVICE INTERFACE
// =============================================================================

export interface TransitionResult {
  success: boolean;
  errors?: string[];
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  issueUpdates?: Record<string, unknown>;
  comments?: Array<{ content: string; userId: string }>;
  watchers?: { add: string[]; remove: string[] };
  sprintChange?: { sprintId: string | null };
  notifications?: Array<{ type: string; recipients: string[] }>;
}

export interface IWorkflowService {
  executeTransition(params: {
    issueId: string;
    userId: string;
    workflowId: string;
    transitionId: string;
    resolutionId?: string;
    comment?: string;
  }): Promise<TransitionResult>;
}
