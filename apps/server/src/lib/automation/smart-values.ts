/**
 * Smart Values Parser for Automation Rules
 *
 * Supports Jira-like smart value syntax:
 * - {{issue.key}} - Issue fields
 * - {{issue.fields.customfield_xxx}} - Custom fields
 * - {{triggerUser.name}} - Trigger context
 * - {{now.plusDays(7)}} - Date functions
 * - {{issue.subtasks.count}} - Aggregations
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SmartValueContext {
  issue?: IssueContext;
  triggerUser?: UserContext;
  trigger?: TriggerContext;
  changelog?: ChangelogContext;
  now?: Date;
  variables?: Record<string, unknown>;
}

export interface IssueContext {
  id: string;
  key: string;
  summary: string;
  description?: string | null;
  status?: {
    id: string;
    name: string;
    category: string;
  };
  priority?: {
    id: string;
    name: string;
  };
  issueType?: {
    id: string;
    name: string;
    icon?: string;
  };
  assignee?: UserContext | null;
  reporter?: UserContext | null;
  project?: {
    id: string;
    key: string;
    name: string;
    lead?: UserContext;
  };
  parent?: IssueContext | null;
  subtasks?: IssueContext[];
  sprint?: {
    id: string;
    name: string;
  };
  labels?: string[];
  components?: Array<{ id: string; name: string }>;
  fixVersions?: Array<{ id: string; name: string }>;
  affectedVersions?: Array<{ id: string; name: string }>;
  fields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date | null;
  originalEstimate?: number;
  remainingEstimate?: number;
  timeSpent?: number;
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface TriggerContext {
  type: string;
  comment?: {
    id: string;
    body: string;
    author: UserContext;
    createdAt: Date;
  };
  worklog?: {
    id: string;
    timeSpent: number;
    description?: string;
    author: UserContext;
  };
  sprint?: {
    id: string;
    name: string;
  };
  version?: {
    id: string;
    name: string;
  };
}

export interface ChangelogContext {
  fieldName: string;
  fieldId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  oldDisplayValue?: string;
  newDisplayValue?: string;
}

// ============================================================================
// PARSER
// ============================================================================

const SMART_VALUE_REGEX = /\{\{([^}]+)\}\}/g;
const FUNCTION_REGEX = /(\w+)\(([^)]*)\)/;

/**
 * Parse and resolve smart values in a string
 */
export function resolveSmartValues(
  template: string,
  context: SmartValueContext,
): string {
  return template.replace(SMART_VALUE_REGEX, (match, expression) => {
    try {
      const value = evaluateExpression(expression.trim(), context);
      return formatValue(value);
    } catch {
      // Return original if can't resolve
      return match;
    }
  });
}

/**
 * Resolve smart value in any value (string, object, array)
 */
export function resolveSmartValue<T>(value: T, context: SmartValueContext): T {
  if (typeof value === 'string') {
    return resolveSmartValues(value, context) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveSmartValue(item, context)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveSmartValue(val, context);
    }
    return result as T;
  }

  return value;
}

/**
 * Check if a string contains smart values
 */
export function hasSmartValues(value: unknown): boolean {
  if (typeof value === 'string') {
    return SMART_VALUE_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(hasSmartValues);
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasSmartValues);
  }
  return false;
}

/**
 * Evaluate a smart value expression
 */
function evaluateExpression(
  expression: string,
  context: SmartValueContext,
): unknown {
  const parts = expression.split('.');
  let current: unknown = context;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Check for function call
    const funcMatch = part.match(FUNCTION_REGEX);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      const args = parseArgs(argsStr);
      current = callFunction(funcName, current, args, context);
    } else if (current !== null && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Parse function arguments
 */
function parseArgs(argsStr: string): unknown[] {
  if (!argsStr.trim()) return [];

  return argsStr.split(',').map((arg) => {
    const trimmed = arg.trim();
    // Number
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    // String (quoted)
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    // Boolean
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    // Null
    if (trimmed === 'null') return null;
    // Return as string
    return trimmed;
  });
}

/**
 * Call a smart value function
 */
function callFunction(
  name: string,
  target: unknown,
  args: unknown[],
  context: SmartValueContext,
): unknown {
  // Date functions on 'now'
  if (target instanceof Date || name === 'now') {
    const date = target instanceof Date ? target : context.now || new Date();
    return callDateFunction(name, date, args);
  }

  // Array functions
  if (Array.isArray(target)) {
    return callArrayFunction(name, target, args);
  }

  // String functions
  if (typeof target === 'string') {
    return callStringFunction(name, target, args);
  }

  // Context functions
  return callContextFunction(name, args, context);
}

/**
 * Date functions
 */
function callDateFunction(name: string, date: Date, args: unknown[]): unknown {
  const offset = typeof args[0] === 'number' ? args[0] : 0;
  const result = new Date(date);

  switch (name) {
    case 'now':
      return result;

    case 'plusDays':
      result.setDate(result.getDate() + offset);
      return result;

    case 'minusDays':
      result.setDate(result.getDate() - offset);
      return result;

    case 'plusWeeks':
      result.setDate(result.getDate() + offset * 7);
      return result;

    case 'minusWeeks':
      result.setDate(result.getDate() - offset * 7);
      return result;

    case 'plusMonths':
      result.setMonth(result.getMonth() + offset);
      return result;

    case 'minusMonths':
      result.setMonth(result.getMonth() - offset);
      return result;

    case 'plusHours':
      result.setHours(result.getHours() + offset);
      return result;

    case 'minusHours':
      result.setHours(result.getHours() - offset);
      return result;

    case 'startOfDay':
      result.setHours(0, 0, 0, 0);
      return result;

    case 'endOfDay':
      result.setHours(23, 59, 59, 999);
      return result;

    case 'startOfWeek':
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
      return result;

    case 'endOfWeek':
      const dayEnd = result.getDay();
      result.setDate(result.getDate() + (6 - dayEnd));
      result.setHours(23, 59, 59, 999);
      return result;

    case 'startOfMonth':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      return result;

    case 'endOfMonth':
      result.setMonth(result.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      return result;

    case 'format':
      const formatStr = typeof args[0] === 'string' ? args[0] : 'yyyy-MM-dd';
      return formatDate(result, formatStr);

    default:
      return date;
  }
}

/**
 * Array functions
 */
function callArrayFunction(
  name: string,
  arr: unknown[],
  args: unknown[],
): unknown {
  switch (name) {
    case 'count':
    case 'length':
    case 'size':
      return arr.length;

    case 'first':
      return arr[0];

    case 'last':
      return arr[arr.length - 1];

    case 'join':
      const separator = typeof args[0] === 'string' ? args[0] : ', ';
      return arr.map((item) => formatValue(item)).join(separator);

    case 'contains':
      return arr.includes(args[0]);

    case 'isEmpty':
      return arr.length === 0;

    case 'isNotEmpty':
      return arr.length > 0;

    case 'get':
      const index = typeof args[0] === 'number' ? args[0] : 0;
      return arr[index];

    default:
      return arr;
  }
}

/**
 * String functions
 */
function callStringFunction(
  name: string,
  str: string,
  args: unknown[],
): unknown {
  switch (name) {
    case 'toLowerCase':
    case 'lower':
      return str.toLowerCase();

    case 'toUpperCase':
    case 'upper':
      return str.toUpperCase();

    case 'trim':
      return str.trim();

    case 'length':
      return str.length;

    case 'substring':
      const start = typeof args[0] === 'number' ? args[0] : 0;
      const end = typeof args[1] === 'number' ? args[1] : undefined;
      return str.substring(start, end);

    case 'replace':
      const search = String(args[0] || '');
      const replacement = String(args[1] || '');
      return str.replace(search, replacement);

    case 'split':
      const delimiter = typeof args[0] === 'string' ? args[0] : ',';
      return str.split(delimiter);

    case 'startsWith':
      return str.startsWith(String(args[0] || ''));

    case 'endsWith':
      return str.endsWith(String(args[0] || ''));

    case 'contains':
      return str.includes(String(args[0] || ''));

    case 'isEmpty':
      return str.length === 0;

    case 'isNotEmpty':
      return str.length > 0;

    default:
      return str;
  }
}

/**
 * Context functions (global functions)
 */
function callContextFunction(
  name: string,
  args: unknown[],
  context: SmartValueContext,
): unknown {
  switch (name) {
    case 'currentUser':
      return context.triggerUser;

    case 'now':
      return context.now || new Date();

    case 'concat':
      return args.map((a) => formatValue(a)).join('');

    case 'if':
      const [condition, trueVal, falseVal] = args;
      return condition ? trueVal : falseVal;

    case 'equals':
      return args[0] === args[1];

    case 'notEquals':
      return args[0] !== args[1];

    case 'and':
      return args.every(Boolean);

    case 'or':
      return args.some(Boolean);

    case 'not':
      return !args[0];

    case 'coalesce':
      return args.find((a) => a !== null && a !== undefined);

    case 'abs':
      return Math.abs(Number(args[0]) || 0);

    case 'round':
      return Math.round(Number(args[0]) || 0);

    case 'floor':
      return Math.floor(Number(args[0]) || 0);

    case 'ceil':
      return Math.ceil(Number(args[0]) || 0);

    case 'min':
      return Math.min(...args.map((a) => Number(a) || 0));

    case 'max':
      return Math.max(...args.map((a) => Number(a) || 0));

    default:
      return undefined;
  }
}

/**
 * Format a value for string output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    // Try to get a display value
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.displayName) return String(obj.displayName);
    if (obj.key) return String(obj.key);
    if (obj.id) return String(obj.id);
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Format date with pattern
 */
function formatDate(date: Date, pattern: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return pattern
    .replace('yyyy', String(year))
    .replace('MM', String(month).padStart(2, '0'))
    .replace('dd', String(day).padStart(2, '0'))
    .replace('HH', String(hours).padStart(2, '0'))
    .replace('mm', String(minutes).padStart(2, '0'))
    .replace('ss', String(seconds).padStart(2, '0'));
}

// ============================================================================
// BUILDERS
// ============================================================================

/**
 * Build context from issue data
 */
export function buildIssueContext(issue: {
  id: string;
  issueKey?: string;
  key?: string;
  summary: string;
  description?: string | null;
  status?: { id: string; name: string; category: string };
  priority?: { id: string; name: string };
  issueType?: { id: string; name: string; iconUrl?: string };
  assignee?: { id: string; name: string; email: string } | null;
  reporter?: { id: string; name: string; email: string } | null;
  project?: { id: string; key: string; name: string };
  labels?: Array<{ name: string }> | string[];
  components?: Array<{ id: string; name: string }>;
  fixVersions?: Array<{ id: string; name: string }>;
  affectedVersions?: Array<{ id: string; name: string }>;
  fieldValues?: Array<{ fieldId: string; value: unknown }>;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date | null;
  parent?: unknown;
  subtasks?: unknown[];
  sprint?: { id: string; name: string };
}): IssueContext {
  return {
    id: issue.id,
    key: issue.issueKey || issue.key || issue.id,
    summary: issue.summary,
    description: issue.description ?? undefined,
    status: issue.status
      ? {
          id: issue.status.id,
          name: issue.status.name,
          category: issue.status.category,
        }
      : undefined,
    priority: issue.priority
      ? {
          id: issue.priority.id,
          name: issue.priority.name,
        }
      : undefined,
    issueType: issue.issueType
      ? {
          id: issue.issueType.id,
          name: issue.issueType.name,
          icon: issue.issueType.iconUrl,
        }
      : undefined,
    assignee: issue.assignee
      ? {
          id: issue.assignee.id,
          name: issue.assignee.name,
          email: issue.assignee.email,
        }
      : null,
    reporter: issue.reporter
      ? {
          id: issue.reporter.id,
          name: issue.reporter.name,
          email: issue.reporter.email,
        }
      : null,
    project: issue.project
      ? {
          id: issue.project.id,
          key: issue.project.key,
          name: issue.project.name,
        }
      : undefined,
    labels: issue.labels?.map((l) => (typeof l === 'string' ? l : l.name)),
    components: issue.components?.map((c) => ({ id: c.id, name: c.name })),
    fixVersions: issue.fixVersions?.map((v) => ({ id: v.id, name: v.name })),
    affectedVersions: issue.affectedVersions?.map((v) => ({
      id: v.id,
      name: v.name,
    })),
    fields: issue.fieldValues?.reduce((acc, fv) => {
      acc[fv.fieldId] = fv.value;
      return acc;
    }, {} as Record<string, unknown>),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    dueDate: issue.dueDate,
  };
}

/**
 * Build user context
 */
export function buildUserContext(user: {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}): UserContext {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    displayName: user.name,
    avatarUrl: user.image || undefined,
  };
}
