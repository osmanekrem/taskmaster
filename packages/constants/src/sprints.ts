// =============================================================================
// SPRINT CONSTANTS
// =============================================================================

/**
 * Sprint durumları
 * - planned: Planlanan, henüz başlamamış
 * - active: Aktif sprint
 * - completed: Tamamlanmış
 * - cancelled: İptal edilmiş
 */
export const SPRINT_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

/**
 * Sprint history action types
 */
export const SPRINT_HISTORY_ACTIONS = [
  'sprint_created',
  'sprint_started',
  'sprint_completed',
  'sprint_cancelled',
  'sprint_updated',
  'issue_added',
  'issue_removed',
  'issue_completed',
  'goal_updated',
  'dates_updated',
] as const;

export type SprintHistoryAction = (typeof SPRINT_HISTORY_ACTIONS)[number];
