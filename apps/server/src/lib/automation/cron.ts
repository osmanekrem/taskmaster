/**
 * Cron Expression Parser and Scheduler
 *
 * Supports standard cron expressions:
 * - 5 fields: minute hour day-of-month month day-of-week
 * - Special characters: * , - /
 */

// ============================================================================
// TYPES
// ============================================================================

interface CronField {
  values: number[];
  min: number;
  max: number;
}

interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

// ============================================================================
// PARSER
// ============================================================================

const FIELD_RANGES = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 }, // 0 = Sunday
};

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DAY_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Parse a cron expression
 */
export function parseCronExpression(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields, got ${parts.length}`,
    );
  }

  return {
    minute: parseField(parts[0], FIELD_RANGES.minute),
    hour: parseField(parts[1], FIELD_RANGES.hour),
    dayOfMonth: parseField(parts[2], FIELD_RANGES.dayOfMonth),
    month: parseField(parts[3], FIELD_RANGES.month, MONTH_NAMES),
    dayOfWeek: parseField(parts[4], FIELD_RANGES.dayOfWeek, DAY_NAMES),
  };
}

/**
 * Parse a single cron field
 */
function parseField(
  field: string,
  range: { min: number; max: number },
  names?: Record<string, number>,
): CronField {
  const values = new Set<number>();

  // Handle * (all values)
  if (field === '*') {
    for (let i = range.min; i <= range.max; i++) {
      values.add(i);
    }
    return { values: Array.from(values).sort((a, b) => a - b), ...range };
  }

  // Split by comma for multiple values/ranges
  const parts = field.split(',');

  for (const part of parts) {
    // Handle step values (*/2 or 1-10/2)
    const [rangeStr, stepStr] = part.split('/');
    const step = stepStr ? parseInt(stepStr, 10) : 1;

    if (isNaN(step) || step < 1) {
      throw new Error(`Invalid step value: ${stepStr}`);
    }

    let start: number;
    let end: number;

    if (rangeStr === '*') {
      start = range.min;
      end = range.max;
    } else if (rangeStr.includes('-')) {
      // Handle ranges (1-10)
      const [startStr, endStr] = rangeStr.split('-');
      start = parseValue(startStr, names, range);
      end = parseValue(endStr, names, range);
    } else {
      // Single value
      start = parseValue(rangeStr, names, range);
      end = start;
    }

    // Add values with step
    for (let i = start; i <= end; i += step) {
      if (i >= range.min && i <= range.max) {
        values.add(i);
      }
    }
  }

  if (values.size === 0) {
    throw new Error(`Invalid cron field: ${field}`);
  }

  return {
    values: Array.from(values).sort((a, b) => a - b),
    ...range,
  };
}

/**
 * Parse a single value (number or name)
 */
function parseValue(
  value: string,
  names?: Record<string, number>,
  range?: { min: number; max: number },
): number {
  const lower = value.toLowerCase();

  if (names && lower in names) {
    return names[lower];
  }

  const num = parseInt(value, 10);

  if (isNaN(num)) {
    throw new Error(`Invalid value: ${value}`);
  }

  if (range && (num < range.min || num > range.max)) {
    throw new Error(`Value ${num} out of range [${range.min}, ${range.max}]`);
  }

  return num;
}

// ============================================================================
// SCHEDULER
// ============================================================================

/**
 * Get the next date matching the cron expression
 */
export function getNextCronDate(
  expression: string,
  timezone = 'UTC',
  fromDate?: Date,
): Date {
  const cron = parseCronExpression(expression);
  let date = fromDate ? new Date(fromDate) : new Date();

  // Start from the next minute
  date.setSeconds(0);
  date.setMilliseconds(0);
  date.setMinutes(date.getMinutes() + 1);

  // Max iterations to prevent infinite loops
  const maxIterations = 10000;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    // Check month
    if (!cron.month.values.includes(date.getMonth() + 1)) {
      // Move to next valid month
      const nextMonth = findNextValue(date.getMonth() + 1, cron.month.values);
      if (nextMonth === null) {
        // No valid month in current year, move to next year
        date.setFullYear(date.getFullYear() + 1);
        date.setMonth(cron.month.values[0] - 1);
      } else if (nextMonth > date.getMonth() + 1) {
        date.setMonth(nextMonth - 1);
      }
      date.setDate(1);
      date.setHours(0);
      date.setMinutes(0);
      continue;
    }

    // Check day of month and day of week
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();
    const validDayOfMonth = cron.dayOfMonth.values.includes(dayOfMonth);
    const validDayOfWeek = cron.dayOfWeek.values.includes(dayOfWeek);

    // Both day-of-month and day-of-week must match (OR logic in standard cron)
    if (!validDayOfMonth && !validDayOfWeek) {
      date.setDate(date.getDate() + 1);
      date.setHours(0);
      date.setMinutes(0);
      continue;
    }

    // Check hour
    if (!cron.hour.values.includes(date.getHours())) {
      const nextHour = findNextValue(date.getHours(), cron.hour.values);
      if (nextHour === null) {
        // No valid hour today, move to next day
        date.setDate(date.getDate() + 1);
        date.setHours(cron.hour.values[0]);
      } else {
        date.setHours(nextHour);
      }
      date.setMinutes(cron.minute.values[0]);
      continue;
    }

    // Check minute
    if (!cron.minute.values.includes(date.getMinutes())) {
      const nextMinute = findNextValue(date.getMinutes(), cron.minute.values);
      if (nextMinute === null) {
        // No valid minute this hour, move to next hour
        date.setHours(date.getHours() + 1);
        date.setMinutes(cron.minute.values[0]);
        continue;
      }
      date.setMinutes(nextMinute);
    }

    // All fields match
    return date;
  }

  throw new Error('Could not find next cron date within iteration limit');
}

/**
 * Find the next value in the array >= current value
 */
function findNextValue(current: number, values: number[]): number | null {
  for (const value of values) {
    if (value >= current) {
      return value;
    }
  }
  return null;
}

/**
 * Get multiple future dates matching the cron expression
 */
export function getNextCronDates(
  expression: string,
  count: number,
  timezone = 'UTC',
  fromDate?: Date,
): Date[] {
  const dates: Date[] = [];
  let currentDate = fromDate ? new Date(fromDate) : new Date();

  for (let i = 0; i < count; i++) {
    const nextDate = getNextCronDate(expression, timezone, currentDate);
    dates.push(nextDate);
    currentDate = new Date(nextDate.getTime() + 60000); // Move 1 minute ahead
  }

  return dates;
}

/**
 * Check if a date matches a cron expression
 */
export function matchesCron(expression: string, date: Date): boolean {
  const cron = parseCronExpression(expression);

  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  return (
    cron.minute.values.includes(minute) &&
    cron.hour.values.includes(hour) &&
    cron.month.values.includes(month) &&
    (cron.dayOfMonth.values.includes(dayOfMonth) ||
      cron.dayOfWeek.values.includes(dayOfWeek))
  );
}

/**
 * Get a human-readable description of a cron expression
 */
export function describeCron(expression: string): string {
  const cron = parseCronExpression(expression);
  const parts: string[] = [];

  // Describe minute
  if (cron.minute.values.length === 60) {
    parts.push('Every minute');
  } else if (cron.minute.values.length === 1) {
    parts.push(`At minute ${cron.minute.values[0]}`);
  } else {
    parts.push(`At minutes ${cron.minute.values.join(', ')}`);
  }

  // Describe hour
  if (cron.hour.values.length !== 24) {
    if (cron.hour.values.length === 1) {
      parts.push(`of ${formatHour(cron.hour.values[0])}`);
    } else {
      parts.push(`of hours ${cron.hour.values.map(formatHour).join(', ')}`);
    }
  }

  // Describe day of month
  if (cron.dayOfMonth.values.length !== 31) {
    if (cron.dayOfMonth.values.length === 1) {
      parts.push(`on day ${cron.dayOfMonth.values[0]}`);
    } else {
      parts.push(`on days ${cron.dayOfMonth.values.join(', ')}`);
    }
  }

  // Describe month
  if (cron.month.values.length !== 12) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (cron.month.values.length === 1) {
      parts.push(`in ${monthNames[cron.month.values[0] - 1]}`);
    } else {
      parts.push(
        `in ${cron.month.values.map((m) => monthNames[m - 1]).join(', ')}`,
      );
    }
  }

  // Describe day of week
  if (cron.dayOfWeek.values.length !== 7) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (cron.dayOfWeek.values.length === 1) {
      parts.push(`on ${dayNames[cron.dayOfWeek.values[0]]}s`);
    } else {
      parts.push(
        `on ${cron.dayOfWeek.values.map((d) => dayNames[d]).join(', ')}`,
      );
    }
  }

  return parts.join(' ');
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// ============================================================================
// COMMON EXPRESSIONS
// ============================================================================

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
