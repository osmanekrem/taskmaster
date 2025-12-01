/**
 * Time Format Utilities
 *
 * Parses and formats time durations in Jira-style format.
 * Examples: "1w 2d 3h 30m" → seconds
 *
 * Default configuration:
 * - 1 week = 5 working days
 * - 1 day = 8 working hours
 * - 1 hour = 60 minutes
 * - 1 minute = 60 seconds
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TimeConfig {
  workingHoursPerDay: number;
  workingDaysPerWeek: number;
}

export interface ParsedDuration {
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: TimeConfig = {
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
};

// =============================================================================
// CONSTANTS
// =============================================================================

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR; // 3600

// =============================================================================
// PARSING
// =============================================================================

/**
 * Parse a time string into seconds
 *
 * @example
 * parseTimeFormat("1w 2d 3h 30m") // → 198000 seconds (with default config)
 * parseTimeFormat("2h 30m") // → 9000 seconds
 * parseTimeFormat("45m") // → 2700 seconds
 * parseTimeFormat("90") // → 90 seconds (raw number)
 */
export function parseTimeFormat(
  input: string,
  config: TimeConfig = DEFAULT_CONFIG,
): number {
  if (!input || typeof input !== 'string') {
    return 0;
  }

  const trimmed = input.trim().toLowerCase();

  // If it's just a number, treat as seconds
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const secondsPerDay = config.workingHoursPerDay * SECONDS_PER_HOUR;
  const secondsPerWeek = config.workingDaysPerWeek * secondsPerDay;

  let totalSeconds = 0;

  // Match patterns like "1w", "2d", "3h", "30m", "45s"
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)\s*w/g, multiplier: secondsPerWeek },
    { regex: /(\d+(?:\.\d+)?)\s*d/g, multiplier: secondsPerDay },
    { regex: /(\d+(?:\.\d+)?)\s*h/g, multiplier: SECONDS_PER_HOUR },
    { regex: /(\d+(?:\.\d+)?)\s*m(?!s)/g, multiplier: SECONDS_PER_MINUTE }, // "m" but not "ms"
    { regex: /(\d+(?:\.\d+)?)\s*s/g, multiplier: 1 },
  ];

  for (const { regex, multiplier } of patterns) {
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      totalSeconds += parseFloat(match[1]) * multiplier;
    }
  }

  return Math.round(totalSeconds);
}

/**
 * Parse time format and return detailed breakdown
 */
export function parseTimeFormatDetailed(
  input: string,
  config: TimeConfig = DEFAULT_CONFIG,
): ParsedDuration {
  const totalSeconds = parseTimeFormat(input, config);
  return secondsToParsedDuration(totalSeconds, config);
}

/**
 * Convert seconds to ParsedDuration
 */
export function secondsToParsedDuration(
  seconds: number,
  config: TimeConfig = DEFAULT_CONFIG,
): ParsedDuration {
  const secondsPerDay = config.workingHoursPerDay * SECONDS_PER_HOUR;
  const secondsPerWeek = config.workingDaysPerWeek * secondsPerDay;

  let remaining = Math.abs(seconds);

  const weeks = Math.floor(remaining / secondsPerWeek);
  remaining %= secondsPerWeek;

  const days = Math.floor(remaining / secondsPerDay);
  remaining %= secondsPerDay;

  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining %= SECONDS_PER_HOUR;

  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  remaining %= SECONDS_PER_MINUTE;

  return {
    weeks,
    days,
    hours,
    minutes,
    seconds: remaining,
    totalSeconds: seconds,
  };
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format seconds into human-readable time string
 *
 * @example
 * formatTimeSpent(198000) // → "1w 2d 3h"
 * formatTimeSpent(9000) // → "2h 30m"
 * formatTimeSpent(2700) // → "45m"
 */
export function formatTimeSpent(
  seconds: number,
  config: TimeConfig = DEFAULT_CONFIG,
  options: {
    includeSeconds?: boolean;
    compact?: boolean;
    maxUnits?: number;
  } = {},
): string {
  const { includeSeconds = false, compact = false, maxUnits = 4 } = options;

  if (seconds === 0) {
    return compact ? '0m' : '0 minutes';
  }

  const duration = secondsToParsedDuration(seconds, config);
  const parts: string[] = [];

  const unitLabels = compact
    ? { w: 'w', d: 'd', h: 'h', m: 'm', s: 's' }
    : { w: ' week', d: ' day', h: ' hour', m: ' minute', s: ' second' };

  if (duration.weeks > 0) {
    const label = compact
      ? unitLabels.w
      : `${unitLabels.w}${duration.weeks > 1 ? 's' : ''}`;
    parts.push(`${duration.weeks}${label}`);
  }

  if (duration.days > 0) {
    const label = compact
      ? unitLabels.d
      : `${unitLabels.d}${duration.days > 1 ? 's' : ''}`;
    parts.push(`${duration.days}${label}`);
  }

  if (duration.hours > 0) {
    const label = compact
      ? unitLabels.h
      : `${unitLabels.h}${duration.hours > 1 ? 's' : ''}`;
    parts.push(`${duration.hours}${label}`);
  }

  if (duration.minutes > 0) {
    const label = compact
      ? unitLabels.m
      : `${unitLabels.m}${duration.minutes > 1 ? 's' : ''}`;
    parts.push(`${duration.minutes}${label}`);
  }

  if (includeSeconds && duration.seconds > 0) {
    const label = compact
      ? unitLabels.s
      : `${unitLabels.s}${duration.seconds > 1 ? 's' : ''}`;
    parts.push(`${duration.seconds}${label}`);
  }

  // Limit number of units
  const limited = parts.slice(0, maxUnits);

  return compact ? limited.join(' ') : limited.join(', ');
}

/**
 * Format seconds as decimal hours
 *
 * @example
 * formatAsDecimalHours(9000) // → "2.50"
 */
export function formatAsDecimalHours(seconds: number): string {
  const hours = seconds / SECONDS_PER_HOUR;
  return hours.toFixed(2);
}

/**
 * Format seconds as HH:MM:SS
 *
 * @example
 * formatAsHMS(9045) // → "02:30:45"
 */
export function formatAsHMS(seconds: number): string {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const secs = seconds % SECONDS_PER_MINUTE;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Add two time durations
 */
export function addTime(seconds1: number, seconds2: number): number {
  return seconds1 + seconds2;
}

/**
 * Subtract time durations (returns 0 if negative)
 */
export function subtractTime(seconds1: number, seconds2: number): number {
  return Math.max(0, seconds1 - seconds2);
}

/**
 * Calculate percentage of time spent vs estimate
 */
export function calculateProgress(
  timeSpentSeconds: number,
  originalEstimateSeconds: number,
): number {
  if (originalEstimateSeconds <= 0) {
    return timeSpentSeconds > 0 ? 100 : 0;
  }
  return Math.round((timeSpentSeconds / originalEstimateSeconds) * 100);
}

/**
 * Check if over estimate
 */
export function isOverEstimate(
  timeSpentSeconds: number,
  originalEstimateSeconds: number,
): boolean {
  return (
    originalEstimateSeconds > 0 && timeSpentSeconds > originalEstimateSeconds
  );
}

/**
 * Calculate variance (positive = under, negative = over)
 */
export function calculateVariance(
  timeSpentSeconds: number,
  originalEstimateSeconds: number,
): number {
  return originalEstimateSeconds - timeSpentSeconds;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate time format string
 */
export function isValidTimeFormat(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const trimmed = input.trim().toLowerCase();

  // Raw number is valid
  if (/^\d+$/.test(trimmed)) {
    return true;
  }

  // Check for valid time patterns
  const validPattern = /^(\d+(?:\.\d+)?\s*[wdhms]\s*)+$/;
  return validPattern.test(trimmed);
}

/**
 * Parse with validation (throws on invalid input)
 */
export function parseTimeFormatStrict(
  input: string,
  config: TimeConfig = DEFAULT_CONFIG,
): number {
  if (!isValidTimeFormat(input)) {
    throw new Error(
      `Invalid time format: "${input}". Use format like "1w 2d 3h 30m"`,
    );
  }
  return parseTimeFormat(input, config);
}

// =============================================================================
// PRESETS
// =============================================================================

export const TIME_PRESETS = {
  FIFTEEN_MINUTES: 15 * SECONDS_PER_MINUTE,
  THIRTY_MINUTES: 30 * SECONDS_PER_MINUTE,
  ONE_HOUR: SECONDS_PER_HOUR,
  TWO_HOURS: 2 * SECONDS_PER_HOUR,
  HALF_DAY: 4 * SECONDS_PER_HOUR,
  ONE_DAY: 8 * SECONDS_PER_HOUR,
  ONE_WEEK: 5 * 8 * SECONDS_PER_HOUR,
} as const;
