// =============================================================================
// WORKFLOW ENGINE - PUBLIC API
// =============================================================================

// Types
export type {
  WorkflowContext,
  Condition,
  ConditionType,
  Validator,
  ValidatorType,
  PostFunction,
  PostFunctionType,
  ConditionResult,
  ValidatorResult,
  PostFunctionResult,
  TransitionExecutionResult,
  // Condition subtypes
  UserInProjectRoleCondition,
  UserIsAssigneeCondition,
  UserIsReporterCondition,
  UserHasPermissionCondition,
  OnlySubtasksCondition,
  OnlyStandardIssuesCondition,
  ParentStatusCondition,
  SeparationOfDutiesCondition,
  // Validator subtypes
  FieldRequiredValidator,
  FieldIsEmptyValidator,
  FieldHasValueValidator,
  FieldChangedValidator,
  ResolutionSetValidator,
  DateComparisonValidator,
  RegexCheckValidator,
  NumericRangeValidator,
  PreviousStatusValidator,
  AllSubtasksResolvedValidator,
  ParentStatusCheckValidator,
  LinkedIssuesResolvedValidator,
  // Post-function subtypes
  SetFieldPostFunction,
  ClearFieldPostFunction,
  CopyFieldValuePostFunction,
  AssignToReporterPostFunction,
  AssignToLeadPostFunction,
  AssignToCurrentUserPostFunction,
  UnassignPostFunction,
  SetResolutionPostFunction,
  ClearResolutionPostFunction,
  AddCommentPostFunction,
  AddWatcherPostFunction,
  RemoveWatcherPostFunction,
  TriggerNotificationPostFunction,
  FireEventPostFunction,
  UpdateChangeHistoryPostFunction,
  SetDueDatePostFunction,
  MoveToSprintPostFunction,
} from './types';

// Condition handlers and registry
export {
  evaluateConditions,
  registerConditionHandler,
  getConditionHandler,
  type ConditionHandler,
} from './conditions';

// Validator handlers and registry
export {
  validateTransition,
  registerValidatorHandler,
  getValidatorHandler,
  type ValidatorHandler,
} from './validators';

// Post-function handlers and registry
export {
  executePostFunctions,
  registerPostFunctionHandler,
  getPostFunctionHandler,
  resetPendingChanges,
  getPendingChanges,
  type PostFunctionHandler,
  type PostFunctionChanges,
} from './post-functions';

// Workflow Engine
export {
  WorkflowEngine,
  createWorkflowEngine,
  getDefaultWorkflowEngine,
  type WorkflowTransition,
  type AvailableTransition,
  type TransitionRequest,
} from './engine';
