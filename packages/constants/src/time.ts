// =============================================================================
// TIME CONSTANTS
// =============================================================================

/**
 * Time constants in seconds
 */
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR; // 3600

/**
 * Time presets in seconds (based on 8-hour workday, 5-day workweek)
 */
export const TIME_PRESETS = {
  FIFTEEN_MINUTES: 15 * SECONDS_PER_MINUTE,
  THIRTY_MINUTES: 30 * SECONDS_PER_MINUTE,
  ONE_HOUR: SECONDS_PER_HOUR,
  TWO_HOURS: 2 * SECONDS_PER_HOUR,
  HALF_DAY: 4 * SECONDS_PER_HOUR,
  ONE_DAY: 8 * SECONDS_PER_HOUR,
  ONE_WEEK: 5 * 8 * SECONDS_PER_HOUR,
} as const;

export type TimePreset = keyof typeof TIME_PRESETS;

/**
 * Default time configuration
 */
export const DEFAULT_TIME_CONFIG = {
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
} as const;
