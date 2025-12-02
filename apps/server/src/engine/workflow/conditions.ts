// =============================================================================
// CONDITION HANDLERS
// =============================================================================

import type {
  Condition,
  ConditionResult,
  WorkflowContext,
  UserInProjectRoleCondition,
  UserInGroupCondition,
  UserHasPermissionCondition,
  ParentStatusCondition,
  SeparationOfDutiesCondition,
} from './types';
import type { Permission } from '@/db/schema/permissions';
import { getContainer } from '@/lib/context';
import { db } from '@/db';
import { issues, changeGroups, changeItems } from '@/db/schema/issues';
import { eq, and, desc } from 'drizzle-orm';

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

export const userInProjectRoleHandler: ConditionHandler<UserInProjectRoleCondition> =
  {
    type: 'user_in_project_role',
    async evaluate(condition, context): Promise<ConditionResult> {
      const container = getContainer();

      // Get user's roles in the project
      const userRoles = await container.permission.getUserRoles(
        context.userId,
        context.projectId,
      );

      const hasRole = userRoles.some(
        (r) =>
          r.roleId === condition.roleId || r.role.name === condition.roleName,
      );

      return {
        passed: hasRole,
        conditionType: 'user_in_project_role',
        message: hasRole
          ? undefined
          : `User must have role: ${condition.roleName || condition.roleId}`,
      };
    },
  };

export const userInGroupHandler: ConditionHandler<UserInGroupCondition> = {
  type: 'user_in_group',
  async evaluate(condition, context): Promise<ConditionResult> {
    const container = getContainer();

    // Get user's groups
    const userGroups = await container.group.getUserGroups(context.userId);

    const inGroup = userGroups.some(
      (g) =>
        g.groupId === condition.groupId || g.group.name === condition.groupName,
    );

    return {
      passed: inGroup,
      conditionType: 'user_in_group',
      message: inGroup
        ? undefined
        : `User must be a member of group: ${
            condition.groupName || condition.groupId
          }`,
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
      message: passed
        ? undefined
        : 'Only the assignee can perform this transition',
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
      message: passed
        ? undefined
        : 'Only the reporter can perform this transition',
    };
  },
};

export const userHasPermissionHandler: ConditionHandler<UserHasPermissionCondition> =
  {
    type: 'user_has_permission',
    async evaluate(condition, context): Promise<ConditionResult> {
      const container = getContainer();

      const hasPermission = await container.permission.hasPermission(
        context.userId,
        condition.permission as Permission,
        context.projectId,
      );

      return {
        passed: hasPermission,
        conditionType: 'user_has_permission',
        message: hasPermission
          ? undefined
          : `User must have permission: ${condition.permission}`,
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
      message: passed
        ? undefined
        : 'This transition is only available for subtasks',
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
      message: passed
        ? undefined
        : 'This transition is not available for subtasks',
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

    // Get parent issue status
    const parent = await db.query.issues.findFirst({
      where: eq(issues.id, context.issue.parentId),
      columns: { statusId: true },
    });

    if (!parent) {
      return {
        passed: false,
        conditionType: 'parent_status',
        message: 'Parent issue not found',
      };
    }

    const passed = condition.statusIds.includes(parent.statusId);

    return {
      passed,
      conditionType: 'parent_status',
      message: passed
        ? undefined
        : 'Parent issue must be in one of the allowed statuses',
    };
  },
};

export const separationOfDutiesHandler: ConditionHandler<SeparationOfDutiesCondition> =
  {
    type: 'separation_of_duties',
    async evaluate(condition, context): Promise<ConditionResult> {
      // Check if user has performed the specified transition on this issue
      // We use change_groups and change_items to track status transitions

      // Find all status transitions for this issue by this user
      const statusTransitions = await db
        .select({
          changeGroupId: changeGroups.id,
          userId: changeGroups.userId,
          action: changeGroups.action,
          createdAt: changeGroups.createdAt,
          oldValue: changeItems.oldValue,
          newValue: changeItems.newValue,
          oldString: changeItems.oldString,
          newString: changeItems.newString,
        })
        .from(changeGroups)
        .innerJoin(changeItems, eq(changeItems.changeGroupId, changeGroups.id))
        .where(
          and(
            eq(changeGroups.issueId, context.issue.id),
            eq(changeGroups.userId, context.userId),
            eq(changeItems.field, 'Status'),
          ),
        )
        .orderBy(desc(changeGroups.createdAt));

      // If user hasn't made any status changes, they pass
      if (statusTransitions.length === 0) {
        return {
          passed: true,
          conditionType: 'separation_of_duties',
        };
      }

      // Check if any of the user's previous transitions match the restricted transition name
      // The transition name is typically stored as the newString (the status they transitioned TO)
      // or we can match against a pattern like "To {StatusName}"
      const restrictedTransitionLower = condition.transitionName.toLowerCase();

      const hasPerformedRestrictedTransition = statusTransitions.some((t) => {
        // Check if the transition matches by:
        // 1. Exact match on newString (status name)
        // 2. Match on transition pattern "To {Status}"
        const newStatusName = t.newString?.toLowerCase() || '';
        const transitionPattern = `to ${newStatusName}`;

        return (
          newStatusName === restrictedTransitionLower ||
          transitionPattern === restrictedTransitionLower ||
          restrictedTransitionLower.includes(newStatusName)
        );
      });

      const passed = !hasPerformedRestrictedTransition;

      return {
        passed,
        conditionType: 'separation_of_duties',
        message: passed
          ? undefined
          : `User cannot perform this transition after: ${condition.transitionName}`,
      };
    },
  };

// =============================================================================
// CONDITION REGISTRY
// =============================================================================

const conditionHandlers = new Map<string, ConditionHandler>();

// Register built-in handlers
conditionHandlers.set('user_in_project_role', userInProjectRoleHandler);
conditionHandlers.set('user_in_group', userInGroupHandler);
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
export function getConditionHandler(
  type: string,
): ConditionHandler | undefined {
  return conditionHandlers.get(type);
}

/**
 * Evaluate all conditions for a transition
 * Returns false if ANY condition fails (AND logic)
 */
export async function evaluateConditions(
  conditions: Condition[],
  context: WorkflowContext,
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

  const allPassed = results.every((r) => r.passed);

  return { allPassed, results };
}
