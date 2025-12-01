// =============================================================================
// AUTOMATION CONSTANTS
// =============================================================================

/**
 * Common cron expression presets
 */
export const CRON_PRESETS = {
  everyMinute: '* * * * *',
  everyHour: '0 * * * *',
  everyDay: '0 0 * * *',
  everyWeek: '0 0 * * 0',
  everyMonth: '0 0 1 * *',
  everyWeekday: '0 0 * * 1-5',
  everyWeekend: '0 0 * * 0,6',
  everyMorning: '0 9 * * *',
  everyEvening: '0 18 * * *',
} as const;

export type CronPreset = keyof typeof CRON_PRESETS;

/**
 * Automation trigger types
 */
export const AUTOMATION_TRIGGER_TYPES = [
  'issue_created',
  'issue_updated',
  'issue_transitioned',
  'issue_commented',
  'issue_assigned',
  'issue_deleted',
  'field_changed',
  'field_value_set',
  'field_value_cleared',
  'sprint_created',
  'sprint_started',
  'sprint_completed',
  'sprint_deleted',
  'version_created',
  'version_released',
  'version_archived',
  'comment_created',
  'comment_updated',
  'comment_deleted',
  'worklog_created',
  'worklog_updated',
  'worklog_deleted',
  'scheduled',
  'scheduled_jql',
  'manual',
  'incoming_webhook',
] as const;

export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

/**
 * Automation condition types
 */
export const AUTOMATION_CONDITION_TYPES = [
  'field_equals',
  'field_not_equals',
  'field_contains',
  'field_not_contains',
  'field_is_empty',
  'field_is_not_empty',
  'field_greater_than',
  'field_less_than',
  'field_in',
  'field_not_in',
  'field_changed',
  'field_changed_to',
  'field_changed_from',
  'issue_type',
  'issue_status',
  'issue_priority',
  'issue_has_subtasks',
  'issue_is_subtask',
  'issue_has_parent',
  'jql_match',
  'user_in_group',
  'user_in_project_role',
  'user_is_assignee',
  'user_is_reporter',
  'time_since_created',
  'time_since_updated',
  'time_in_status',
  'due_date_approaching',
  'and',
  'or',
  'not',
] as const;

export type AutomationConditionType = (typeof AUTOMATION_CONDITION_TYPES)[number];

/**
 * Automation action types
 */
export const AUTOMATION_ACTION_TYPES = [
  'edit_issue',
  'transition_issue',
  'assign_issue',
  'unassign_issue',
  'add_comment',
  'add_labels',
  'remove_labels',
  'set_priority',
  'set_due_date',
  'clear_due_date',
  'add_watcher',
  'remove_watcher',
  'set_field_value',
  'clear_field_value',
  'create_issue',
  'create_subtask',
  'clone_issue',
  'link_issues',
  'unlink_issues',
  'add_to_sprint',
  'remove_from_sprint',
  'move_to_backlog',
  'set_fix_version',
  'remove_fix_version',
  'set_affected_version',
  'remove_affected_version',
  'add_component',
  'remove_component',
  'send_email',
  'send_notification',
  'send_webhook',
  'log_work',
  'set_estimate',
  'if_else',
  'for_each',
  'run_jql',
  'lookup_issues',
  'branch_rule',
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];
