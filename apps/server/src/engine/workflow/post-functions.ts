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

/**
 * Post-function handler interface
 */
export interface PostFunctionHandler<T extends PostFunction = PostFunction> {
  type: T['type'];
  execute(postFunction: T, context: WorkflowContext): Promise<PostFunctionResult>;
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

// Global changes collector - will be reset per transition execution
let pendingChanges: PostFunctionChanges = createEmptyChanges();

function createEmptyChanges(): PostFunctionChanges {
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

export function resetPendingChanges(): void {
  pendingChanges = createEmptyChanges();
}

export function getPendingChanges(): PostFunctionChanges {
  return pendingChanges;
}

// =============================================================================
// HANDLER IMPLEMENTATIONS
// =============================================================================

export const setFieldHandler: PostFunctionHandler<SetFieldPostFunction> = {
  type: 'set_field',
  async execute(postFunction, context): Promise<PostFunctionResult> {
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
          value = context.fieldValues?.[postFunction.sourceFieldId] 
            ?? context.issue[postFunction.sourceFieldId as keyof typeof context.issue];
        }
        break;
      default:
        value = postFunction.value;
    }
    
    pendingChanges.fieldsToSet.push({
      fieldId: postFunction.fieldId,
      value,
    });
    
    // Also set on issue updates for built-in fields
    pendingChanges.issueUpdates[postFunction.fieldId] = value;
    
    return {
      success: true,
      postFunctionType: 'set_field',
      changes: { [postFunction.fieldId]: value },
    };
  },
};

export const clearFieldHandler: PostFunctionHandler<ClearFieldPostFunction> = {
  type: 'clear_field',
  async execute(postFunction): Promise<PostFunctionResult> {
    pendingChanges.fieldsToClear.push(postFunction.fieldId);
    pendingChanges.issueUpdates[postFunction.fieldId] = null;
    
    return {
      success: true,
      postFunctionType: 'clear_field',
      changes: { [postFunction.fieldId]: null },
    };
  },
};

export const copyFieldValueHandler: PostFunctionHandler<CopyFieldValuePostFunction> = {
  type: 'copy_field_value',
  async execute(postFunction, context): Promise<PostFunctionResult> {
    const sourceValue = context.fieldValues?.[postFunction.sourceFieldId] 
      ?? context.issue[postFunction.sourceFieldId as keyof typeof context.issue];
    
    pendingChanges.fieldsToSet.push({
      fieldId: postFunction.targetFieldId,
      value: sourceValue,
    });
    pendingChanges.issueUpdates[postFunction.targetFieldId] = sourceValue;
    
    return {
      success: true,
      postFunctionType: 'copy_field_value',
      changes: { [postFunction.targetFieldId]: sourceValue },
    };
  },
};

export const assignToReporterHandler: PostFunctionHandler = {
  type: 'assign_to_reporter',
  async execute(_, context): Promise<PostFunctionResult> {
    const reporterId = context.issue.reporterId;
    pendingChanges.issueUpdates.assigneeId = reporterId;
    
    return {
      success: true,
      postFunctionType: 'assign_to_reporter',
      changes: { assigneeId: reporterId },
    };
  },
};

export const assignToLeadHandler: PostFunctionHandler = {
  type: 'assign_to_lead',
  async execute(): Promise<PostFunctionResult> {
    // TODO: Get project lead from project settings
    // For now, return success but no change
    return {
      success: true,
      postFunctionType: 'assign_to_lead',
      changes: {},
    };
  },
};

export const assignToCurrentUserHandler: PostFunctionHandler = {
  type: 'assign_to_current_user',
  async execute(_, context): Promise<PostFunctionResult> {
    pendingChanges.issueUpdates.assigneeId = context.userId;
    
    return {
      success: true,
      postFunctionType: 'assign_to_current_user',
      changes: { assigneeId: context.userId },
    };
  },
};

export const unassignHandler: PostFunctionHandler = {
  type: 'unassign',
  async execute(): Promise<PostFunctionResult> {
    pendingChanges.issueUpdates.assigneeId = null;
    
    return {
      success: true,
      postFunctionType: 'unassign',
      changes: { assigneeId: null },
    };
  },
};

export const setResolutionHandler: PostFunctionHandler<SetResolutionPostFunction> = {
  type: 'set_resolution',
  async execute(postFunction): Promise<PostFunctionResult> {
    pendingChanges.issueUpdates.resolutionId = postFunction.resolutionId;
    
    return {
      success: true,
      postFunctionType: 'set_resolution',
      changes: { resolutionId: postFunction.resolutionId },
    };
  },
};

export const clearResolutionHandler: PostFunctionHandler = {
  type: 'clear_resolution',
  async execute(): Promise<PostFunctionResult> {
    pendingChanges.issueUpdates.resolutionId = null;
    
    return {
      success: true,
      postFunctionType: 'clear_resolution',
      changes: { resolutionId: null },
    };
  },
};

export const addCommentHandler: PostFunctionHandler<AddCommentPostFunction> = {
  type: 'add_comment',
  async execute(postFunction, context): Promise<PostFunctionResult> {
    let content = postFunction.content;
    
    // Optionally include changes in comment
    if (postFunction.includeChanges) {
      // Changes will be appended later when we know what changed
      content += '\n\n---\n*Automated transition comment*';
    }
    
    pendingChanges.comments.push({
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
  async execute(postFunction: any, context): Promise<PostFunctionResult> {
    const userId = postFunction.userId || context.userId;
    pendingChanges.watchers.add.push(userId);
    
    return {
      success: true,
      postFunctionType: 'add_watcher',
      changes: { addedWatcher: userId },
    };
  },
};

export const removeWatcherHandler: PostFunctionHandler = {
  type: 'remove_watcher',
  async execute(postFunction: any, context): Promise<PostFunctionResult> {
    const userId = postFunction.userId || context.userId;
    pendingChanges.watchers.remove.push(userId);
    
    return {
      success: true,
      postFunctionType: 'remove_watcher',
      changes: { removedWatcher: userId },
    };
  },
};

export const triggerNotificationHandler: PostFunctionHandler<TriggerNotificationPostFunction> = {
  type: 'trigger_notification',
  async execute(postFunction, context): Promise<PostFunctionResult> {
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
          // TODO: Get watchers from database
          break;
        case 'project_lead':
          // TODO: Get project lead
          break;
        case 'role':
          // TODO: Get users with specific role
          break;
      }
    }
    
    if (recipients.length > 0) {
      pendingChanges.notifications.push({
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
  async execute(postFunction, context): Promise<PostFunctionResult> {
    pendingChanges.events.push({
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
  async execute(_, context): Promise<PostFunctionResult> {
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
  async execute(postFunction, context): Promise<PostFunctionResult> {
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
    
    pendingChanges.issueUpdates.dueDate = dueDate;
    
    return {
      success: true,
      postFunctionType: 'set_due_date',
      changes: { dueDate },
    };
  },
};

export const moveToSprintHandler: PostFunctionHandler<MoveToSprintPostFunction> = {
  type: 'move_to_sprint',
  async execute(postFunction): Promise<PostFunctionResult> {
    pendingChanges.sprintChange = {
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
export function registerPostFunctionHandler(handler: PostFunctionHandler): void {
  postFunctionHandlers.set(handler.type, handler);
}

/**
 * Get a post-function handler by type
 */
export function getPostFunctionHandler(type: string): PostFunctionHandler | undefined {
  return postFunctionHandlers.get(type);
}

/**
 * Execute all post-functions for a transition
 * Returns the collected changes to apply
 */
export async function executePostFunctions(
  postFunctions: PostFunction[],
  context: WorkflowContext
): Promise<{ success: boolean; results: PostFunctionResult[]; changes: PostFunctionChanges }> {
  // Reset pending changes
  resetPendingChanges();
  
  const results: PostFunctionResult[] = [];
  
  // Sort by order if specified
  const sortedFunctions = [...postFunctions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
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
      const result = await handler.execute(pf, context);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        postFunctionType: pf.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  const success = results.every(r => r.success);
  
  return { success, results, changes: getPendingChanges() };
}
