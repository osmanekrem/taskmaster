// =============================================================================
// CONDITION HANDLERS
// =============================================================================

import type {
  Condition,
  ConditionResult,
  WorkflowContext,
  UserInProjectRoleCondition,
  UserHasPermissionCondition,
  ParentStatusCondition,
  SeparationOfDutiesCondition,
} from './types';

/**
 * Condition handler interface
 */
export interface ConditionHandler<T extends Condition = Condition> {
  type: T['type'];
  evaluate(condition: T, context: WorkflowContext): Promise<ConditionResult>;
}

// =============================================================================
// HANDLER IMPLEMENTATIONS
// =============================================================================

export const userInProjectRoleHandler: ConditionHandler<UserInProjectRoleCondition> = {
  type: 'user_in_project_role',
  async evaluate(condition, context): Promise<ConditionResult> {
    // This will be implemented with actual repository lookup
    // For now, placeholder that checks role via permission service
    // TODO: Inject PermissionService
    return {
      passed: false, // Will be determined by actual role check
      conditionType: 'user_in_project_role',
      message: `User must have role ${condition.roleName || condition.roleId}`,
    };
  },
};

export const userIsAssigneeHandler: ConditionHandler = {
  type: 'user_is_assignee',
  async evaluate(_, context): Promise<ConditionResult> {
    const passed = context.issue.assigneeId === context.userId;
    return {
      passed,
      conditionType: 'user_is_assignee',
      message: passed ? undefined : 'Only the assignee can perform this transition',
    };
  },
};

export const userIsReporterHandler: ConditionHandler = {
  type: 'user_is_reporter',
  async evaluate(_, context): Promise<ConditionResult> {
    const passed = context.issue.reporterId === context.userId;
    return {
      passed,
      conditionType: 'user_is_reporter',
      message: passed ? undefined : 'Only the reporter can perform this transition',
    };
  },
};

export const userHasPermissionHandler: ConditionHandler<UserHasPermissionCondition> = {
  type: 'user_has_permission',
  async evaluate(condition, context): Promise<ConditionResult> {
    // TODO: Inject PermissionService and check actual permission
    return {
      passed: false,
      conditionType: 'user_has_permission',
      message: `User must have permission: ${condition.permission}`,
    };
  },
};

export const onlySubtasksHandler: ConditionHandler = {
  type: 'only_subtasks',
  async evaluate(_, context): Promise<ConditionResult> {
    // Subtasks have a parentId
    const passed = context.issue.parentId !== null;
    return {
      passed,
      conditionType: 'only_subtasks',
      message: passed ? undefined : 'This transition is only available for subtasks',
    };
  },
};

export const onlyStandardIssuesHandler: ConditionHandler = {
  type: 'only_standard_issues',
  async evaluate(_, context): Promise<ConditionResult> {
    // Standard issues don't have a parentId
    const passed = context.issue.parentId === null;
    return {
      passed,
      conditionType: 'only_standard_issues',
      message: passed ? undefined : 'This transition is not available for subtasks',
    };
  },
};

export const parentStatusHandler: ConditionHandler<ParentStatusCondition> = {
  type: 'parent_status',
  async evaluate(condition, context): Promise<ConditionResult> {
    if (!context.issue.parentId) {
      return {
        passed: false,
        conditionType: 'parent_status',
        message: 'Issue has no parent',
      };
    }
    // TODO: Lookup parent issue status
    return {
      passed: false,
      conditionType: 'parent_status',
      message: `Parent must be in one of the specified statuses`,
    };
  },
};

export const separationOfDutiesHandler: ConditionHandler<SeparationOfDutiesCondition> = {
  type: 'separation_of_duties',
  async evaluate(condition, context): Promise<ConditionResult> {
    // TODO: Check change history for previous transitions by this user
    return {
      passed: true, // Will be determined by history check
      conditionType: 'separation_of_duties',
      message: `User cannot have performed: ${condition.transitionName}`,
    };
  },
};

// =============================================================================
// CONDITION REGISTRY
// =============================================================================

const conditionHandlers = new Map<string, ConditionHandler>();

// Register built-in handlers
conditionHandlers.set('user_in_project_role', userInProjectRoleHandler);
conditionHandlers.set('user_is_assignee', userIsAssigneeHandler);
conditionHandlers.set('user_is_reporter', userIsReporterHandler);
conditionHandlers.set('user_has_permission', userHasPermissionHandler);
conditionHandlers.set('only_subtasks', onlySubtasksHandler);
conditionHandlers.set('only_standard_issues', onlyStandardIssuesHandler);
conditionHandlers.set('parent_status', parentStatusHandler);
conditionHandlers.set('separation_of_duties', separationOfDutiesHandler);

/**
 * Register a custom condition handler
 */
export function registerConditionHandler(handler: ConditionHandler): void {
  conditionHandlers.set(handler.type, handler);
}

/**
 * Get a condition handler by type
 */
export function getConditionHandler(type: string): ConditionHandler | undefined {
  return conditionHandlers.get(type);
}

/**
 * Evaluate all conditions for a transition
 * Returns false if ANY condition fails (AND logic)
 */
export async function evaluateConditions(
  conditions: Condition[],
  context: WorkflowContext
): Promise<{ allPassed: boolean; results: ConditionResult[] }> {
  const results: ConditionResult[] = [];
  
  for (const condition of conditions) {
    const handler = conditionHandlers.get(condition.type);
    
    if (!handler) {
      results.push({
        passed: false,
        conditionType: condition.type,
        message: `Unknown condition type: ${condition.type}`,
      });
      continue;
    }
    
    const result = await handler.evaluate(condition, context);
    results.push(result);
  }
  
  const allPassed = results.every(r => r.passed);
  
  return { allPassed, results };
}
