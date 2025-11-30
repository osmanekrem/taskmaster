// =============================================================================
// WORKFLOW ENGINE - BASE TYPES
// =============================================================================

import type { issues } from '@/db/schema/issues';

// Issue type from schema
type Issue = typeof issues.$inferSelect;

/**
 * Context passed to all workflow rules during execution
 */
export interface WorkflowContext {
  // Current user executing the transition
  userId: string;
  
  // Issue being transitioned
  issue: Issue;
  
  // Project ID
  projectId: string;
  
  // Transition being executed
  transitionId: string;
  
  // From/To status IDs
  fromStatusId: string | null;
  toStatusId: string;
  
  // Additional data from transition screen (if any)
  screenData?: Record<string, unknown>;
  
  // Field values submitted with transition
  fieldValues?: Record<string, unknown>;
  
  // Resolution ID (if setting resolution)
  resolutionId?: string | null;
  
  // Comment to add with transition
  comment?: string;
}

// =============================================================================
// CONDITION TYPES
// =============================================================================

/**
 * Conditions determine WHO can execute a transition
 * All conditions must pass for transition to be available
 */
export type ConditionType =
  | 'user_in_project_role'    // User must have specific project role
  | 'user_is_assignee'        // User must be the assignee
  | 'user_is_reporter'        // User must be the reporter
  | 'user_has_permission'     // User must have specific permission
  | 'only_subtasks'           // Only for subtask issue types
  | 'only_standard_issues'    // Not for subtasks
  | 'parent_status'           // Parent issue must be in specific status
  | 'separation_of_duties';   // User cannot have performed another transition

export interface BaseCondition {
  type: ConditionType;
}

export interface UserInProjectRoleCondition extends BaseCondition {
  type: 'user_in_project_role';
  roleId: string;
  roleName?: string; // For display
}

export interface UserIsAssigneeCondition extends BaseCondition {
  type: 'user_is_assignee';
}

export interface UserIsReporterCondition extends BaseCondition {
  type: 'user_is_reporter';
}

export interface UserHasPermissionCondition extends BaseCondition {
  type: 'user_has_permission';
  permission: string;
}

export interface OnlySubtasksCondition extends BaseCondition {
  type: 'only_subtasks';
}

export interface OnlyStandardIssuesCondition extends BaseCondition {
  type: 'only_standard_issues';
}

export interface ParentStatusCondition extends BaseCondition {
  type: 'parent_status';
  statusIds: string[];
}

export interface SeparationOfDutiesCondition extends BaseCondition {
  type: 'separation_of_duties';
  transitionName: string; // Transition that user must NOT have performed
}

export type Condition =
  | UserInProjectRoleCondition
  | UserIsAssigneeCondition
  | UserIsReporterCondition
  | UserHasPermissionCondition
  | OnlySubtasksCondition
  | OnlyStandardIssuesCondition
  | ParentStatusCondition
  | SeparationOfDutiesCondition;

// =============================================================================
// VALIDATOR TYPES
// =============================================================================

/**
 * Validators determine WHAT must be true before transition executes
 * All validators must pass for transition to proceed
 */
export type ValidatorType =
  | 'field_required'          // Field must have a value
  | 'field_is_empty'          // Field must be empty
  | 'field_has_value'         // Field must have specific value
  | 'field_changed'           // Field must have been changed in this transition
  | 'resolution_set'          // Resolution must be selected
  | 'date_comparison'         // Date field comparison
  | 'regex_check'             // Field value must match regex
  | 'numeric_range'           // Number field must be in range
  | 'previous_status'         // Issue must have been in specific status
  | 'all_subtasks_resolved'   // All subtasks must be resolved
  | 'parent_status_check'     // Parent must be in allowed status
  | 'linked_issues_resolved'; // Linked blocking issues must be resolved

export interface BaseValidator {
  type: ValidatorType;
  errorMessage?: string; // Custom error message
}

export interface FieldRequiredValidator extends BaseValidator {
  type: 'field_required';
  fieldId: string;
  fieldName?: string; // For display
}

export interface FieldIsEmptyValidator extends BaseValidator {
  type: 'field_is_empty';
  fieldId: string;
  fieldName?: string;
}

export interface FieldHasValueValidator extends BaseValidator {
  type: 'field_has_value';
  fieldId: string;
  fieldName?: string;
  expectedValue: unknown;
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains';
}

export interface FieldChangedValidator extends BaseValidator {
  type: 'field_changed';
  fieldId: string;
  fieldName?: string;
}

export interface ResolutionSetValidator extends BaseValidator {
  type: 'resolution_set';
  allowedResolutions?: string[]; // If not specified, any resolution is ok
}

export interface DateComparisonValidator extends BaseValidator {
  type: 'date_comparison';
  fieldId: string;
  fieldName?: string;
  operator: '>' | '<' | '>=' | '<=' | '=';
  compareWith: 'now' | 'field';
  compareFieldId?: string; // If compareWith is 'field'
}

export interface RegexCheckValidator extends BaseValidator {
  type: 'regex_check';
  fieldId: string;
  fieldName?: string;
  pattern: string;
  flags?: string;
}

export interface NumericRangeValidator extends BaseValidator {
  type: 'numeric_range';
  fieldId: string;
  fieldName?: string;
  min?: number;
  max?: number;
}

export interface PreviousStatusValidator extends BaseValidator {
  type: 'previous_status';
  statusIds: string[];
}

export interface AllSubtasksResolvedValidator extends BaseValidator {
  type: 'all_subtasks_resolved';
}

export interface ParentStatusCheckValidator extends BaseValidator {
  type: 'parent_status_check';
  allowedStatuses: string[];
}

export interface LinkedIssuesResolvedValidator extends BaseValidator {
  type: 'linked_issues_resolved';
  linkTypes?: string[]; // If not specified, checks "blocks" type
}

export type Validator =
  | FieldRequiredValidator
  | FieldIsEmptyValidator
  | FieldHasValueValidator
  | FieldChangedValidator
  | ResolutionSetValidator
  | DateComparisonValidator
  | RegexCheckValidator
  | NumericRangeValidator
  | PreviousStatusValidator
  | AllSubtasksResolvedValidator
  | ParentStatusCheckValidator
  | LinkedIssuesResolvedValidator;

// =============================================================================
// POST-FUNCTION TYPES
// =============================================================================

/**
 * Post-functions execute AFTER transition completes
 */
export type PostFunctionType =
  | 'set_field'               // Set a field to a value
  | 'clear_field'             // Clear a field value
  | 'copy_field_value'        // Copy value from one field to another
  | 'assign_to_reporter'      // Assign issue to reporter
  | 'assign_to_lead'          // Assign issue to project lead
  | 'assign_to_current_user'  // Assign issue to transition executor
  | 'unassign'                // Remove assignee
  | 'set_resolution'          // Set resolution
  | 'clear_resolution'        // Clear resolution
  | 'add_comment'             // Add an automatic comment
  | 'add_watcher'             // Add user as watcher
  | 'remove_watcher'          // Remove user from watchers
  | 'trigger_notification'    // Send notification
  | 'fire_event'              // Fire custom event (for integrations)
  | 'update_change_history'   // Record change in history (usually automatic)
  | 'set_due_date'            // Set due date based on rules
  | 'move_to_sprint';         // Move issue to specific sprint

export interface BasePostFunction {
  type: PostFunctionType;
  order?: number; // Execution order
}

export interface SetFieldPostFunction extends BasePostFunction {
  type: 'set_field';
  fieldId: string;
  value: unknown;
  valueFrom?: 'static' | 'current_user' | 'current_date' | 'field';
  sourceFieldId?: string; // If valueFrom is 'field'
}

export interface ClearFieldPostFunction extends BasePostFunction {
  type: 'clear_field';
  fieldId: string;
}

export interface CopyFieldValuePostFunction extends BasePostFunction {
  type: 'copy_field_value';
  sourceFieldId: string;
  targetFieldId: string;
}

export interface AssignToReporterPostFunction extends BasePostFunction {
  type: 'assign_to_reporter';
}

export interface AssignToLeadPostFunction extends BasePostFunction {
  type: 'assign_to_lead';
}

export interface AssignToCurrentUserPostFunction extends BasePostFunction {
  type: 'assign_to_current_user';
}

export interface UnassignPostFunction extends BasePostFunction {
  type: 'unassign';
}

export interface SetResolutionPostFunction extends BasePostFunction {
  type: 'set_resolution';
  resolutionId: string;
}

export interface ClearResolutionPostFunction extends BasePostFunction {
  type: 'clear_resolution';
}

export interface AddCommentPostFunction extends BasePostFunction {
  type: 'add_comment';
  content: string;
  includeChanges?: boolean; // Include what changed in comment
}

export interface AddWatcherPostFunction extends BasePostFunction {
  type: 'add_watcher';
  userId?: string; // If not specified, adds current user
}

export interface RemoveWatcherPostFunction extends BasePostFunction {
  type: 'remove_watcher';
  userId?: string;
}

export interface TriggerNotificationPostFunction extends BasePostFunction {
  type: 'trigger_notification';
  notificationType: string;
  recipients: ('assignee' | 'reporter' | 'watchers' | 'project_lead' | 'role')[];
  roleId?: string; // If recipients includes 'role'
}

export interface FireEventPostFunction extends BasePostFunction {
  type: 'fire_event';
  eventName: string;
  eventData?: Record<string, unknown>;
}

export interface UpdateChangeHistoryPostFunction extends BasePostFunction {
  type: 'update_change_history';
  // Usually automatic, but can customize what gets recorded
}

export interface SetDueDatePostFunction extends BasePostFunction {
  type: 'set_due_date';
  daysFromNow: number;
  onlyIfEmpty?: boolean; // Only set if due date is currently empty
}

export interface MoveToSprintPostFunction extends BasePostFunction {
  type: 'move_to_sprint';
  sprintId?: string; // If not specified, removes from sprint (backlog)
}

export type PostFunction =
  | SetFieldPostFunction
  | ClearFieldPostFunction
  | CopyFieldValuePostFunction
  | AssignToReporterPostFunction
  | AssignToLeadPostFunction
  | AssignToCurrentUserPostFunction
  | UnassignPostFunction
  | SetResolutionPostFunction
  | ClearResolutionPostFunction
  | AddCommentPostFunction
  | AddWatcherPostFunction
  | RemoveWatcherPostFunction
  | TriggerNotificationPostFunction
  | FireEventPostFunction
  | UpdateChangeHistoryPostFunction
  | SetDueDatePostFunction
  | MoveToSprintPostFunction;

// =============================================================================
// EXECUTION RESULT TYPES
// =============================================================================

export interface ConditionResult {
  passed: boolean;
  conditionType: ConditionType;
  message?: string;
}

export interface ValidatorResult {
  valid: boolean;
  validatorType: ValidatorType;
  errorMessage?: string;
  fieldId?: string;
}

export interface PostFunctionResult {
  success: boolean;
  postFunctionType: PostFunctionType;
  error?: string;
  changes?: Record<string, unknown>;
}

export interface TransitionExecutionResult {
  success: boolean;
  conditionResults: ConditionResult[];
  validatorResults: ValidatorResult[];
  postFunctionResults: PostFunctionResult[];
  errors: string[];
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
}
