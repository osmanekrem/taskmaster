// =============================================================================
// POST-FUNCTION HANDLERS
// =============================================================================

import type {
  PostFunction,
  PostFunctionResult,
  WorkflowContext,
  SetFieldPostFunction,
  ClearFieldPostFunction,
  CopyFieldValuePostFunction,
  AddCommentPostFunction,
  TriggerNotificationPostFunction,
  FireEventPostFunction,
  SetDueDatePostFunction,
  MoveToSprintPostFunction,
  SetResolutionPostFunction,
} from './types';
import { getContainer } from '@/lib/context';
import { db } from '@/db';
import { projects } from '@/db/schema/projects';
import { issueWatchers } from '@/db/schema/notifications';
import { eq } from 'drizzle-orm';

/**
 * Post-function handler interface
 */
export interface PostFunctionHandler<T extends PostFunction = PostFunction> {
  type: T['type'];
  execute(
    postFunction: T,
    context: WorkflowContext,
    changes: PostFunctionChanges,
  ): Promise<PostFunctionResult>;
}

/**
 * Collected changes from post-function execution
 * These will be applied to the issue after all post-functions run
 */
export interface PostFunctionChanges {
  issueUpdates: Record<string, unknown>;
  fieldsToSet: { fieldId: string; value: unknown }[];
  fieldsToClear: string[];
  comments: { content: string; userId: string }[];
  notifications: { type: string; recipients: string[] }[];
  events: { name: string; data: Record<string, unknown> }[];
  watchers: { add: string[]; remove: string[] };
  sprintChange?: { sprintId: string | null };
}

/**
 * Create a new empty changes object - used per execution to avoid race conditions
 */
export function createEmptyChanges(): PostFunctionChanges {
  return {
    issueUpdates: {},
    fieldsToSet: [],
    fieldsToClear: [],
    comments: [],
    notifications: [],
    events: [],
    watchers: { add: [], remove: [] },
  };
}

// =============================================================================
// HANDLER IMPLEMENTATIONS
// =============================================================================

export const setFieldHandler: PostFunctionHandler<SetFieldPostFunction> = {
  type: 'set_field',
  async execute(postFunction, context, changes): Promise<PostFunctionResult> {
    let value: unknown;

    switch (postFunction.valueFrom) {
      case 'current_user':
        value = context.userId;
        break;
      case 'current_date':
        value = new Date();
        break;
      case 'field':
        if (postFunction.sourceFieldId) {
          value =
            context.fieldValues?.[postFunction.sourceFieldId] ??
            context.issue[
              postFunction.sourceFieldId as keyof typeof context.issue
            ];
        }
        break;
      default:
        value = postFunction.value;
    }

    changes.fieldsToSet.push({
      fieldId: postFunction.fieldId,
      value,
    });

    // Also set on issue updates for built-in fields
    changes.issueUpdates[postFunction.fieldId] = value;

    return {
      success: true,
      postFunctionType: 'set_field',
      changes: { [postFunction.fieldId]: value },
    };
  },
};

export const clearFieldHandler: PostFunctionHandler<ClearFieldPostFunction> = {
  type: 'clear_field',
  async execute(postFunction, _context, changes): Promise<PostFunctionResult> {
    changes.fieldsToClear.push(postFunction.fieldId);
    changes.issueUpdates[postFunction.fieldId] = null;

    return {
      success: true,
      postFunctionType: 'clear_field',
      changes: { [postFunction.fieldId]: null },
    };
  },
};

export const copyFieldValueHandler: PostFunctionHandler<CopyFieldValuePostFunction> =
  {
    type: 'copy_field_value',
    async execute(postFunction, context, changes): Promise<PostFunctionResult> {
      const sourceValue =
        context.fieldValues?.[postFunction.sourceFieldId] ??
        context.issue[postFunction.sourceFieldId as keyof typeof context.issue];

      changes.fieldsToSet.push({
        fieldId: postFunction.targetFieldId,
        value: sourceValue,
      });
      changes.issueUpdates[postFunction.targetFieldId] = sourceValue;

      return {
        success: true,
        postFunctionType: 'copy_field_value',
        changes: { [postFunction.targetFieldId]: sourceValue },
      };
    },
  };

export const assignToReporterHandler: PostFunctionHandler = {
  type: 'assign_to_reporter',
  async execute(_postFunction, context, changes): Promise<PostFunctionResult> {
    const reporterId = context.issue.reporterId;
    changes.issueUpdates.assigneeId = reporterId;

    return {
      success: true,
      postFunctionType: 'assign_to_reporter',
      changes: { assigneeId: reporterId },
    };
  },
};

export const assignToLeadHandler: PostFunctionHandler = {
  type: 'assign_to_lead',
  async execute(_postFunction, context, changes): Promise<PostFunctionResult> {
    // Get project lead from project settings
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, context.projectId),
      columns: { leadId: true },
    });

    if (project?.leadId) {
      changes.issueUpdates.assigneeId = project.leadId;
      return {
        success: true,
        postFunctionType: 'assign_to_lead',
        changes: { assigneeId: project.leadId },
      };
    }

    return {
      success: true,
      postFunctionType: 'assign_to_lead',
      changes: {},
    };
  },
};

export const assignToCurrentUserHandler: PostFunctionHandler = {
  type: 'assign_to_current_user',
  async execute(_postFunction, context, changes): Promise<PostFunctionResult> {
    changes.issueUpdates.assigneeId = context.userId;

    return {
      success: true,
      postFunctionType: 'assign_to_current_user',
      changes: { assigneeId: context.userId },
    };
  },
};

export const unassignHandler: PostFunctionHandler = {
  type: 'unassign',
  async execute(_postFunction, _context, changes): Promise<PostFunctionResult> {
    changes.issueUpdates.assigneeId = null;

    return {
      success: true,
      postFunctionType: 'unassign',
      changes: { assigneeId: null },
    };
  },
};

export const setResolutionHandler: PostFunctionHandler<SetResolutionPostFunction> =
  {
    type: 'set_resolution',
    async execute(
      postFunction,
      _context,
      changes,
    ): Promise<PostFunctionResult> {
      changes.issueUpdates.resolutionId = postFunction.resolutionId;

      return {
        success: true,
        postFunctionType: 'set_resolution',
        changes: { resolutionId: postFunction.resolutionId },
      };
    },
  };

export const clearResolutionHandler: PostFunctionHandler = {
  type: 'clear_resolution',
  async execute(_postFunction, _context, changes): Promise<PostFunctionResult> {
    changes.issueUpdates.resolutionId = null;

    return {
      success: true,
      postFunctionType: 'clear_resolution',
      changes: { resolutionId: null },
    };
  },
};

export const addCommentHandler: PostFunctionHandler<AddCommentPostFunction> = {
  type: 'add_comment',
  async execute(postFunction, context, changes): Promise<PostFunctionResult> {
    let content = postFunction.content;

    // Optionally include changes in comment
    if (postFunction.includeChanges) {
      // Changes will be appended later when we know what changed
      content += '\n\n---\n*Automated transition comment*';
    }

    changes.comments.push({
      content,
      userId: context.userId,
    });

    return {
      success: true,
      postFunctionType: 'add_comment',
    };
  },
};

export const addWatcherHandler: PostFunctionHandler = {
  type: 'add_watcher',
  async execute(
    postFunction: any,
    context,
    changes,
  ): Promise<PostFunctionResult> {
    const userId = postFunction.userId || context.userId;
    changes.watchers.add.push(userId);

    return {
      success: true,
      postFunctionType: 'add_watcher',
      changes: { addedWatcher: userId },
    };
  },
};

export const removeWatcherHandler: PostFunctionHandler = {
  type: 'remove_watcher',
  async execute(
    postFunction: any,
    context,
    changes,
  ): Promise<PostFunctionResult> {
    const userId = postFunction.userId || context.userId;
    changes.watchers.remove.push(userId);

    return {
      success: true,
      postFunctionType: 'remove_watcher',
      changes: { removedWatcher: userId },
    };
  },
};

export const triggerNotificationHandler: PostFunctionHandler<TriggerNotificationPostFunction> =
  {
    type: 'trigger_notification',
    async execute(postFunction, context, changes): Promise<PostFunctionResult> {
      // Resolve recipients
      const recipients: string[] = [];

      for (const recipientType of postFunction.recipients) {
        switch (recipientType) {
          case 'assignee':
            if (context.issue.assigneeId) {
              recipients.push(context.issue.assigneeId);
            }
            break;
          case 'reporter':
            if (context.issue.reporterId) {
              recipients.push(context.issue.reporterId);
            }
            break;
          case 'watchers':
            // Get watchers from database
            const watchers = await db.query.issueWatchers.findMany({
              where: eq(issueWatchers.issueId, context.issue.id),
              columns: { userId: true },
            });
            for (const watcher of watchers) {
              if (!recipients.includes(watcher.userId)) {
                recipients.push(watcher.userId);
              }
            }
            break;
          case 'project_lead':
            // Get project lead
            const project = await db.query.projects.findFirst({
              where: eq(projects.id, context.projectId),
              columns: { leadId: true },
            });
            if (project?.leadId && !recipients.includes(project.leadId)) {
              recipients.push(project.leadId);
            }
            break;
          case 'role':
            // Get users with specific role from the project
            if (postFunction.roleId) {
              const container = getContainer();
              const roleMembers = await container.permission.getRoleMembers(
                postFunction.roleId,
              );
              for (const member of roleMembers) {
                if (!recipients.includes(member.userId)) {
                  recipients.push(member.userId);
                }
              }
            }
            break;
        }
      }

      if (recipients.length > 0) {
        changes.notifications.push({
          type: postFunction.notificationType,
          recipients,
        });
      }

      return {
        success: true,
        postFunctionType: 'trigger_notification',
        changes: { notificationRecipients: recipients },
      };
    },
  };

export const fireEventHandler: PostFunctionHandler<FireEventPostFunction> = {
  type: 'fire_event',
  async execute(postFunction, context, changes): Promise<PostFunctionResult> {
    changes.events.push({
      name: postFunction.eventName,
      data: {
        ...postFunction.eventData,
        issueId: context.issue.id,
        projectId: context.projectId,
        userId: context.userId,
        transitionId: context.transitionId,
      },
    });

    return {
      success: true,
      postFunctionType: 'fire_event',
      changes: { eventFired: postFunction.eventName },
    };
  },
};

export const updateChangeHistoryHandler: PostFunctionHandler = {
  type: 'update_change_history',
  async execute(
    _postFunction,
    _context,
    _changes,
  ): Promise<PostFunctionResult> {
    // This is typically handled automatically by the workflow service
    // But can be used to customize what gets recorded
    return {
      success: true,
      postFunctionType: 'update_change_history',
    };
  },
};

export const setDueDateHandler: PostFunctionHandler<SetDueDatePostFunction> = {
  type: 'set_due_date',
  async execute(postFunction, context, changes): Promise<PostFunctionResult> {
    // Check if we should only set when empty
    if (postFunction.onlyIfEmpty && context.issue.dueDate) {
      return {
        success: true,
        postFunctionType: 'set_due_date',
        changes: {},
      };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + postFunction.daysFromNow);

    changes.issueUpdates.dueDate = dueDate;

    return {
      success: true,
      postFunctionType: 'set_due_date',
      changes: { dueDate },
    };
  },
};

export const moveToSprintHandler: PostFunctionHandler<MoveToSprintPostFunction> =
  {
    type: 'move_to_sprint',
    async execute(
      postFunction,
      _context,
      changes,
    ): Promise<PostFunctionResult> {
      changes.sprintChange = {
        sprintId: postFunction.sprintId || null,
      };

      return {
        success: true,
        postFunctionType: 'move_to_sprint',
        changes: { sprintId: postFunction.sprintId },
      };
    },
  };

// =============================================================================
// POST-FUNCTION REGISTRY
// =============================================================================

const postFunctionHandlers = new Map<string, PostFunctionHandler>();

// Register built-in handlers
postFunctionHandlers.set('set_field', setFieldHandler);
postFunctionHandlers.set('clear_field', clearFieldHandler);
postFunctionHandlers.set('copy_field_value', copyFieldValueHandler);
postFunctionHandlers.set('assign_to_reporter', assignToReporterHandler);
postFunctionHandlers.set('assign_to_lead', assignToLeadHandler);
postFunctionHandlers.set('assign_to_current_user', assignToCurrentUserHandler);
postFunctionHandlers.set('unassign', unassignHandler);
postFunctionHandlers.set('set_resolution', setResolutionHandler);
postFunctionHandlers.set('clear_resolution', clearResolutionHandler);
postFunctionHandlers.set('add_comment', addCommentHandler);
postFunctionHandlers.set('add_watcher', addWatcherHandler);
postFunctionHandlers.set('remove_watcher', removeWatcherHandler);
postFunctionHandlers.set('trigger_notification', triggerNotificationHandler);
postFunctionHandlers.set('fire_event', fireEventHandler);
postFunctionHandlers.set('update_change_history', updateChangeHistoryHandler);
postFunctionHandlers.set('set_due_date', setDueDateHandler);
postFunctionHandlers.set('move_to_sprint', moveToSprintHandler);

/**
 * Register a custom post-function handler
 */
export function registerPostFunctionHandler(
  handler: PostFunctionHandler,
): void {
  postFunctionHandlers.set(handler.type, handler);
}

/**
 * Get a post-function handler by type
 */
export function getPostFunctionHandler(
  type: string,
): PostFunctionHandler | undefined {
  return postFunctionHandlers.get(type);
}

/**
 * Execute all post-functions for a transition
 * Returns the collected changes to apply
 * Uses a local changes object to ensure thread-safety
 */
export async function executePostFunctions(
  postFunctions: PostFunction[],
  context: WorkflowContext,
): Promise<{
  success: boolean;
  results: PostFunctionResult[];
  changes: PostFunctionChanges;
}> {
  // Create a new changes object for this execution - thread-safe
  const changes = createEmptyChanges();

  const results: PostFunctionResult[] = [];

  // Sort by order if specified
  const sortedFunctions = [...postFunctions].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  for (const pf of sortedFunctions) {
    const handler = postFunctionHandlers.get(pf.type);

    if (!handler) {
      results.push({
        success: false,
        postFunctionType: pf.type,
        error: `Unknown post-function type: ${pf.type}`,
      });
      continue;
    }

    try {
      const result = await handler.execute(pf, context, changes);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        postFunctionType: pf.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const success = results.every((r) => r.success);

  return { success, results, changes };
}
