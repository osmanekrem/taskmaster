/**
 * JQL Built-in Functions
 *
 * Implements standard JQL functions like currentUser(), now(), startOfDay(), etc.
 */

import type { Expression, Literal, FunctionCall } from './ast';

// =============================================================================
// FUNCTION CONTEXT
// =============================================================================

/**
 * Context provided to JQL functions during evaluation
 */
export interface FunctionContext {
  currentUserId: string | null;
  currentUserEmail: string | null;
  currentUserGroups: string[];
  timezone: string;
  now: Date;
}

// =============================================================================
// FUNCTION DEFINITIONS
// =============================================================================

export type JQLFunctionHandler = (
  args: Expression[],
  context: FunctionContext,
) => Expression | null;

export interface JQLFunctionDefinition {
  name: string;
  description: string;
  minArgs: number;
  maxArgs: number;
  handler: JQLFunctionHandler;
}

// =============================================================================
// DATE/TIME FUNCTIONS
// =============================================================================

/**
 * now() - Returns current timestamp
 */
const nowFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'Literal',
    valueType: 'date',
    value: context.now.toISOString(),
    raw: 'now()',
  } as Literal;
};

/**
 * startOfDay(offset?) - Returns start of day
 * @param offset - Optional offset in days (e.g., -1 for yesterday)
 */
const startOfDayFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  // Apply offset if provided
  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setDate(date.getDate() + offset);
  }

  date.setHours(0, 0, 0, 0);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `startOfDay(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * endOfDay(offset?) - Returns end of day
 */
const endOfDayFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setDate(date.getDate() + offset);
  }

  date.setHours(23, 59, 59, 999);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `endOfDay(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * startOfWeek(offset?) - Returns start of week (Monday)
 */
const startOfWeekFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setDate(date.getDate() + offset * 7);
  }

  // Get Monday of current week
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `startOfWeek(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * endOfWeek(offset?) - Returns end of week (Sunday)
 */
const endOfWeekFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setDate(date.getDate() + offset * 7);
  }

  // Get Sunday of current week
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : 7);
  date.setDate(diff);
  date.setHours(23, 59, 59, 999);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `endOfWeek(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * startOfMonth(offset?) - Returns start of month
 */
const startOfMonthFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setMonth(date.getMonth() + offset);
  }

  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `startOfMonth(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * endOfMonth(offset?) - Returns end of month
 */
const endOfMonthFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setMonth(date.getMonth() + offset);
  }

  // Go to next month and back one day
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `endOfMonth(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * startOfYear(offset?) - Returns start of year
 */
const startOfYearFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setFullYear(date.getFullYear() + offset);
  }

  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `startOfYear(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

/**
 * endOfYear(offset?) - Returns end of year
 */
const endOfYearFunction: JQLFunctionHandler = (args, context) => {
  const date = new Date(context.now);

  if (args.length > 0 && args[0].type === 'Literal') {
    const offset = Number(args[0].value);
    date.setFullYear(date.getFullYear() + offset);
  }

  date.setMonth(11, 31);
  date.setHours(23, 59, 59, 999);

  return {
    type: 'Literal',
    valueType: 'date',
    value: date.toISOString(),
    raw: `endOfYear(${args.map((a) => (a as Literal).raw).join(', ')})`,
  } as Literal;
};

// =============================================================================
// USER FUNCTIONS
// =============================================================================

/**
 * currentUser() - Returns current user's ID
 */
const currentUserFunction: JQLFunctionHandler = (args, context) => {
  if (!context.currentUserId) {
    return null;
  }

  return {
    type: 'Literal',
    valueType: 'string',
    value: context.currentUserId,
    raw: 'currentUser()',
  } as Literal;
};

/**
 * membersOf(group) - Returns user IDs of group members
 * Note: This returns a special marker that SQL builder will handle
 */
const membersOfFunction: JQLFunctionHandler = (args, context) => {
  if (args.length === 0) return null;

  const groupArg = args[0];
  if (groupArg.type !== 'Literal') return null;

  // Return a function call node that SQL builder will process
  return {
    type: 'FunctionCall',
    name: 'membersOf',
    arguments: args,
  } as FunctionCall;
};

// =============================================================================
// PROJECT FUNCTIONS
// =============================================================================

/**
 * projectsLeadByUser(user?) - Returns projects led by user
 */
const projectsLeadByUserFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'FunctionCall',
    name: 'projectsLeadByUser',
    arguments:
      args.length > 0
        ? args
        : [
            {
              type: 'Literal',
              valueType: 'string',
              value: context.currentUserId || '',
              raw: 'currentUser()',
            } as Literal,
          ],
  } as FunctionCall;
};

/**
 * componentsLeadByUser(user?) - Returns components led by user
 */
const componentsLeadByUserFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'FunctionCall',
    name: 'componentsLeadByUser',
    arguments:
      args.length > 0
        ? args
        : [
            {
              type: 'Literal',
              valueType: 'string',
              value: context.currentUserId || '',
              raw: 'currentUser()',
            } as Literal,
          ],
  } as FunctionCall;
};

// =============================================================================
// SPRINT FUNCTIONS
// =============================================================================

/**
 * openSprints() - Returns active sprints
 */
const openSprintsFunction: JQLFunctionHandler = () => {
  return {
    type: 'FunctionCall',
    name: 'openSprints',
    arguments: [],
  } as FunctionCall;
};

/**
 * closedSprints() - Returns completed sprints
 */
const closedSprintsFunction: JQLFunctionHandler = () => {
  return {
    type: 'FunctionCall',
    name: 'closedSprints',
    arguments: [],
  } as FunctionCall;
};

/**
 * futureSprints() - Returns planned sprints
 */
const futureSprintsFunction: JQLFunctionHandler = () => {
  return {
    type: 'FunctionCall',
    name: 'futureSprints',
    arguments: [],
  } as FunctionCall;
};

// =============================================================================
// ISSUE RELATIONSHIP FUNCTIONS
// =============================================================================

/**
 * linkedIssues(issueKey?, linkType?) - Returns issues linked to given issue
 * Usage: issue IN linkedIssues()
 *        issue IN linkedIssues("PROJ-123")
 *        issue IN linkedIssues("PROJ-123", "blocks")
 */
const linkedIssuesFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'FunctionCall',
    name: 'linkedIssues',
    arguments: args,
  } as FunctionCall;
};

/**
 * votedIssues() - Returns issues voted by current user
 * Usage: issue IN votedIssues()
 */
const votedIssuesFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'FunctionCall',
    name: 'votedIssues',
    arguments:
      args.length > 0
        ? args
        : [
            {
              type: 'Literal',
              valueType: 'string',
              value: context.currentUserId || '',
              raw: 'currentUser()',
            } as Literal,
          ],
  } as FunctionCall;
};

/**
 * watchedIssues() - Returns issues watched by current user
 * Usage: issue IN watchedIssues()
 */
const watchedIssuesFunction: JQLFunctionHandler = (args, context) => {
  return {
    type: 'FunctionCall',
    name: 'watchedIssues',
    arguments:
      args.length > 0
        ? args
        : [
            {
              type: 'Literal',
              valueType: 'string',
              value: context.currentUserId || '',
              raw: 'currentUser()',
            } as Literal,
          ],
  } as FunctionCall;
};

/**
 * subtasksOf(issueKey) - Returns subtasks of given issue
 * Usage: issue IN subtasksOf("PROJ-123")
 */
const subtasksOfFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'subtasksOf',
    arguments: args,
  } as FunctionCall;
};

/**
 * parentOf(issueKey) - Returns parent of given issue
 * Usage: issue IN parentOf("PROJ-123")
 */
const parentOfFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'parentOf',
    arguments: args,
  } as FunctionCall;
};

/**
 * epicIssues(epicKey) - Returns issues in given epic
 * Usage: issue IN epicIssues("PROJ-100")
 */
const epicIssuesFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'epicIssues',
    arguments: args,
  } as FunctionCall;
};

// =============================================================================
// VERSION FUNCTIONS
// =============================================================================

/**
 * releasedVersions(project?) - Returns released versions
 */
const releasedVersionsFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'releasedVersions',
    arguments: args,
  } as FunctionCall;
};

/**
 * unreleasedVersions(project?) - Returns unreleased versions
 */
const unreleasedVersionsFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'unreleasedVersions',
    arguments: args,
  } as FunctionCall;
};

/**
 * latestReleasedVersion(project) - Returns latest released version
 */
const latestReleasedVersionFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'latestReleasedVersion',
    arguments: args,
  } as FunctionCall;
};

/**
 * earliestUnreleasedVersion(project) - Returns earliest unreleased version
 */
const earliestUnreleasedVersionFunction: JQLFunctionHandler = (args) => {
  return {
    type: 'FunctionCall',
    name: 'earliestUnreleasedVersion',
    arguments: args,
  } as FunctionCall;
};

// =============================================================================
// FUNCTION REGISTRY
// =============================================================================

export const FUNCTIONS: Record<string, JQLFunctionDefinition> = {
  // Date/Time functions
  now: {
    name: 'now',
    description: 'Returns current timestamp',
    minArgs: 0,
    maxArgs: 0,
    handler: nowFunction,
  },
  startOfDay: {
    name: 'startOfDay',
    description: 'Returns start of day',
    minArgs: 0,
    maxArgs: 1,
    handler: startOfDayFunction,
  },
  endOfDay: {
    name: 'endOfDay',
    description: 'Returns end of day',
    minArgs: 0,
    maxArgs: 1,
    handler: endOfDayFunction,
  },
  startOfWeek: {
    name: 'startOfWeek',
    description: 'Returns start of week (Monday)',
    minArgs: 0,
    maxArgs: 1,
    handler: startOfWeekFunction,
  },
  endOfWeek: {
    name: 'endOfWeek',
    description: 'Returns end of week (Sunday)',
    minArgs: 0,
    maxArgs: 1,
    handler: endOfWeekFunction,
  },
  startOfMonth: {
    name: 'startOfMonth',
    description: 'Returns start of month',
    minArgs: 0,
    maxArgs: 1,
    handler: startOfMonthFunction,
  },
  endOfMonth: {
    name: 'endOfMonth',
    description: 'Returns end of month',
    minArgs: 0,
    maxArgs: 1,
    handler: endOfMonthFunction,
  },
  startOfYear: {
    name: 'startOfYear',
    description: 'Returns start of year',
    minArgs: 0,
    maxArgs: 1,
    handler: startOfYearFunction,
  },
  endOfYear: {
    name: 'endOfYear',
    description: 'Returns end of year',
    minArgs: 0,
    maxArgs: 1,
    handler: endOfYearFunction,
  },

  // User functions
  currentUser: {
    name: 'currentUser',
    description: 'Returns current user',
    minArgs: 0,
    maxArgs: 0,
    handler: currentUserFunction,
  },
  membersOf: {
    name: 'membersOf',
    description: 'Returns members of a group',
    minArgs: 1,
    maxArgs: 1,
    handler: membersOfFunction,
  },

  // Project functions
  projectsLeadByUser: {
    name: 'projectsLeadByUser',
    description: 'Returns projects led by user',
    minArgs: 0,
    maxArgs: 1,
    handler: projectsLeadByUserFunction,
  },
  componentsLeadByUser: {
    name: 'componentsLeadByUser',
    description: 'Returns components led by user',
    minArgs: 0,
    maxArgs: 1,
    handler: componentsLeadByUserFunction,
  },

  // Sprint functions
  openSprints: {
    name: 'openSprints',
    description: 'Returns active sprints',
    minArgs: 0,
    maxArgs: 0,
    handler: openSprintsFunction,
  },
  closedSprints: {
    name: 'closedSprints',
    description: 'Returns completed sprints',
    minArgs: 0,
    maxArgs: 0,
    handler: closedSprintsFunction,
  },
  futureSprints: {
    name: 'futureSprints',
    description: 'Returns planned sprints',
    minArgs: 0,
    maxArgs: 0,
    handler: futureSprintsFunction,
  },

  // Version functions
  releasedVersions: {
    name: 'releasedVersions',
    description: 'Returns released versions',
    minArgs: 0,
    maxArgs: 1,
    handler: releasedVersionsFunction,
  },
  unreleasedVersions: {
    name: 'unreleasedVersions',
    description: 'Returns unreleased versions',
    minArgs: 0,
    maxArgs: 1,
    handler: unreleasedVersionsFunction,
  },
  latestReleasedVersion: {
    name: 'latestReleasedVersion',
    description: 'Returns latest released version',
    minArgs: 1,
    maxArgs: 1,
    handler: latestReleasedVersionFunction,
  },
  earliestUnreleasedVersion: {
    name: 'earliestUnreleasedVersion',
    description: 'Returns earliest unreleased version',
    minArgs: 1,
    maxArgs: 1,
    handler: earliestUnreleasedVersionFunction,
  },

  // Issue relationship functions
  linkedIssues: {
    name: 'linkedIssues',
    description: 'Returns issues linked to given issue',
    minArgs: 0,
    maxArgs: 2,
    handler: linkedIssuesFunction,
  },
  votedIssues: {
    name: 'votedIssues',
    description: 'Returns issues voted by current user',
    minArgs: 0,
    maxArgs: 1,
    handler: votedIssuesFunction,
  },
  watchedIssues: {
    name: 'watchedIssues',
    description: 'Returns issues watched by current user',
    minArgs: 0,
    maxArgs: 1,
    handler: watchedIssuesFunction,
  },
  subtasksOf: {
    name: 'subtasksOf',
    description: 'Returns subtasks of given issue',
    minArgs: 1,
    maxArgs: 1,
    handler: subtasksOfFunction,
  },
  parentOf: {
    name: 'parentOf',
    description: 'Returns parent of given issue',
    minArgs: 1,
    maxArgs: 1,
    handler: parentOfFunction,
  },
  epicIssues: {
    name: 'epicIssues',
    description: 'Returns issues in given epic',
    minArgs: 1,
    maxArgs: 1,
    handler: epicIssuesFunction,
  },
};

/**
 * Get a function definition by name (case-insensitive)
 */
export function getFunction(name: string): JQLFunctionDefinition | null {
  const lowerName = name.toLowerCase();

  for (const [key, def] of Object.entries(FUNCTIONS)) {
    if (key.toLowerCase() === lowerName) {
      return def;
    }
  }

  return null;
}

/**
 * Evaluate a function with given arguments and context
 */
export function evaluateFunction(
  name: string,
  args: Expression[],
  context: FunctionContext,
): Expression | null {
  const func = getFunction(name);
  if (!func) return null;

  // Validate argument count
  if (args.length < func.minArgs || args.length > func.maxArgs) {
    return null;
  }

  return func.handler(args, context);
}
