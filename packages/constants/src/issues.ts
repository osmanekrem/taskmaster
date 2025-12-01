// =============================================================================
// ISSUE CONSTANTS
// =============================================================================

/**
 * Change action types for issue history
 */
export const CHANGE_ACTION_TYPES = [
  'created',
  'updated',
  'transitioned',
  'assigned',
  'commented',
  'attachment_added',
  'attachment_removed',
  'linked',
  'unlinked',
  'moved',
  'cloned',
  'worklog_added',
  'worklog_updated',
  'worklog_deleted',
] as const;

export type ChangeActionType = (typeof CHANGE_ACTION_TYPES)[number];
