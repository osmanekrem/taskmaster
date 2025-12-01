// =============================================================================
// EVENT-QUEUE BRIDGE
// =============================================================================
// Connects the in-memory EventBus to the persistent job queue system.
// This ensures events are processed asynchronously with retry capability.
//
// Architecture:
// 1. EventBus: In-process, immediate, fire-and-forget
// 2. Queue: Persistent, async, with retry and dead-letter support
// 3. Bridge: Maps events to appropriate queue jobs
//
// Usage:
// Call initializeEventQueueBridge() once at application startup
// =============================================================================

import {
  eventBus,
  type IssueEventPayload,
  type SprintEventPayload,
  type CommentEventPayload,
  type ProjectEventPayload,
  type EventType,
} from '@/lib/events/event-bus';
import {
  addNotificationJob,
  addWebhookJob,
  type NotificationJobData,
} from '@/lib/queue';
import { db } from '@/db';
import { issueWatchers } from '@/db/schema/notifications';
import { eq, and, ne } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

interface EventToJobMapping {
  event: EventType;
  handler: (payload: unknown) => Promise<void>;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Get watchers for an issue (excluding the actor)
 */
async function getIssueWatchers(
  issueId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const watchers = await db.query.issueWatchers.findMany({
    where: excludeUserId
      ? and(
          eq(issueWatchers.issueId, issueId),
          ne(issueWatchers.userId, excludeUserId),
        )
      : eq(issueWatchers.issueId, issueId),
    columns: { userId: true },
  });
  return watchers.map((w) => w.userId);
}

/**
 * Handle issue:created event
 */
async function handleIssueCreated(payload: IssueEventPayload): Promise<void> {
  const { issueId, projectId, actorId, issueKey } = payload;

  // Get watchers (for now, no watchers on new issues)
  // The reporter is auto-added as watcher in the service

  // Create notification job for webhook integrations
  // This can be extended to notify external systems
  console.log(`[EventBridge] Issue created: ${issueKey}`);
}

/**
 * Handle issue:updated event
 */
async function handleIssueUpdated(payload: IssueEventPayload): Promise<void> {
  const { issueId, projectId, actorId, issueKey, changes } = payload;

  // Get watchers excluding the actor
  const recipients = await getIssueWatchers(issueId, actorId || undefined);

  if (recipients.length > 0) {
    await addNotificationJob({
      type: 'watching_issue_updated',
      issueId,
      projectId,
      userId: actorId || 'system',
      recipients,
      data: {
        issueKey,
        changes,
      },
    });
  }
}

/**
 * Handle issue:transitioned event
 */
async function handleIssueTransitioned(
  payload: IssueEventPayload,
): Promise<void> {
  const { issueId, projectId, actorId, issueKey, statusId, changes } = payload;

  const recipients = await getIssueWatchers(issueId, actorId || undefined);

  if (recipients.length > 0) {
    await addNotificationJob({
      type: 'watching_issue_status_changed',
      issueId,
      projectId,
      userId: actorId || 'system',
      recipients,
      data: {
        issueKey,
        statusId,
        changes,
      },
    });
  }
}

/**
 * Handle issue:assigned event
 */
async function handleIssueAssigned(payload: IssueEventPayload): Promise<void> {
  const { issueId, projectId, actorId, issueKey, changes } = payload;
  const assigneeId = changes?.assigneeId?.to as string | undefined;

  if (!assigneeId) return;

  // Notify the assignee
  await addNotificationJob({
    type: 'issue_assigned',
    issueId,
    projectId,
    userId: actorId || 'system',
    recipients: [assigneeId],
    data: {
      issueKey,
      actorId,
    },
  });

  // Notify watchers (excluding actor and assignee)
  const watchers = await getIssueWatchers(issueId, actorId || undefined);
  const watchersExcludingAssignee = watchers.filter((w) => w !== assigneeId);

  if (watchersExcludingAssignee.length > 0) {
    await addNotificationJob({
      type: 'watching_issue_updated',
      issueId,
      projectId,
      userId: actorId || 'system',
      recipients: watchersExcludingAssignee,
      data: {
        issueKey,
        changes: { assignee: changes?.assigneeId },
      },
    });
  }
}

/**
 * Handle issue:commented event
 */
async function handleIssueCommented(payload: IssueEventPayload): Promise<void> {
  const { issueId, projectId, actorId, issueKey, commentId } = payload;

  const recipients = await getIssueWatchers(issueId, actorId || undefined);

  if (recipients.length > 0) {
    await addNotificationJob({
      type: 'watching_issue_commented',
      issueId,
      projectId,
      userId: actorId || 'system',
      recipients,
      data: {
        issueKey,
        commentId,
      },
    });
  }
}

/**
 * Handle comment:created event
 */
async function handleCommentCreated(
  payload: CommentEventPayload,
): Promise<void> {
  const { issueId, projectId, actorId, issueKey, commentId, parentCommentId } =
    payload;

  // If this is a reply, notify the parent comment author
  if (parentCommentId) {
    // Get parent comment author
    const parentComment = await db.query.issueComments.findFirst({
      where: eq(
        (
          await import('@/db/schema/comments')
        ).issueComments.id,
        parentCommentId,
      ),
      columns: { authorId: true },
    });

    if (parentComment && parentComment.authorId !== actorId) {
      await addNotificationJob({
        type: 'comment_replied',
        issueId,
        projectId,
        userId: actorId || 'system',
        recipients: [parentComment.authorId],
        data: {
          issueKey,
          commentId,
          parentCommentId,
        },
      });
    }
  }

  // Notify watchers (handled by issue:commented)
}

/**
 * Handle sprint:started event
 */
async function handleSprintStarted(payload: SprintEventPayload): Promise<void> {
  const { sprintId, projectId, actorId } = payload;

  // Get all users in the project (simplified - in real app, get project members)
  console.log(`[EventBridge] Sprint started: ${sprintId}`);

  // TODO: Get project members and notify them
  // await addNotificationJob({
  //   type: 'sprint_started',
  //   projectId,
  //   userId: actorId || 'system',
  //   recipients: projectMembers,
  //   data: { sprintId },
  // });
}

/**
 * Handle sprint:completed event
 */
async function handleSprintCompleted(
  payload: SprintEventPayload,
): Promise<void> {
  const { sprintId, projectId, actorId } = payload;

  console.log(`[EventBridge] Sprint completed: ${sprintId}`);

  // TODO: Notify project members
}

// =============================================================================
// EVENT MAPPINGS
// =============================================================================

const eventMappings: EventToJobMapping[] = [
  {
    event: 'issue:created',
    handler: handleIssueCreated as (p: unknown) => Promise<void>,
  },
  {
    event: 'issue:updated',
    handler: handleIssueUpdated as (p: unknown) => Promise<void>,
  },
  {
    event: 'issue:transitioned',
    handler: handleIssueTransitioned as (p: unknown) => Promise<void>,
  },
  {
    event: 'issue:assigned',
    handler: handleIssueAssigned as (p: unknown) => Promise<void>,
  },
  {
    event: 'issue:commented',
    handler: handleIssueCommented as (p: unknown) => Promise<void>,
  },
  {
    event: 'comment:created',
    handler: handleCommentCreated as (p: unknown) => Promise<void>,
  },
  {
    event: 'sprint:started',
    handler: handleSprintStarted as (p: unknown) => Promise<void>,
  },
  {
    event: 'sprint:completed',
    handler: handleSprintCompleted as (p: unknown) => Promise<void>,
  },
];

// =============================================================================
// BRIDGE INITIALIZATION
// =============================================================================

let isInitialized = false;
const unsubscribers: Array<() => void> = [];

/**
 * Initialize the event-queue bridge
 * Should be called once at application startup
 */
export function initializeEventQueueBridge(): void {
  if (isInitialized) {
    console.warn('[EventBridge] Already initialized');
    return;
  }

  console.log('[EventBridge] Initializing event-queue bridge...');

  for (const mapping of eventMappings) {
    const unsubscribe = eventBus.on(mapping.event, async (payload) => {
      try {
        await mapping.handler(payload);
      } catch (error) {
        console.error(`[EventBridge] Error handling ${mapping.event}:`, error);
        // Don't throw - events should be fire-and-forget
        // Failed jobs will be retried by the queue system
      }
    });

    unsubscribers.push(unsubscribe);
  }

  isInitialized = true;
  console.log(
    `[EventBridge] Initialized with ${eventMappings.length} event handlers`,
  );
}

/**
 * Shutdown the event-queue bridge
 * Should be called during application shutdown
 */
export function shutdownEventQueueBridge(): void {
  if (!isInitialized) {
    return;
  }

  console.log('[EventBridge] Shutting down...');

  for (const unsubscribe of unsubscribers) {
    unsubscribe();
  }

  unsubscribers.length = 0;
  isInitialized = false;

  console.log('[EventBridge] Shutdown complete');
}

/**
 * Check if the bridge is initialized
 */
export function isEventQueueBridgeInitialized(): boolean {
  return isInitialized;
}
