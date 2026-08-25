/**
 * Date parsing utilities for natural language date expressions
 * Supports relative dates like "last week", "this month", etc.
 *
 * Calendar boundaries use UTC so results are host-timezone stable
 * (same policy as timeframe-utils).
 */

/**
 * Supported relative date formats
 */
export enum RelativeDateFormat {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this week',
  LAST_WEEK = 'last week',
  THIS_MONTH = 'this month',
  LAST_MONTH = 'last month',
  THIS_YEAR = 'this year',
  LAST_YEAR = 'last year',
  LAST_N_DAYS = 'last {n} days',
  LAST_N_WEEKS = 'last {n} weeks',
  LAST_N_MONTHS = 'last {n} months',
}

/**
 * Date range object for search operations
 */
export interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

/**
 * Format a Date as YYYY-MM-DD from its UTC calendar components.
 */
function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00:00.000 UTC of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return startOfDay(d);
}

/** Sunday 00:00:00.000 UTC of the week containing `date`. */
function endOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? 0 : 7);
  d.setUTCDate(diff);
  return startOfDay(d);
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(1);
  return startOfDay(d);
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return startOfDay(d);
}

function startOfYear(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(0, 1);
  return startOfDay(d);
}

function endOfYear(date: Date): Date {
  const d = new Date(date);
  d.setUTCMonth(11, 31);
  return startOfDay(d);
}

/**
 * Parse a relative date expression into a date range
 * @param expression Natural language date expression
 * @returns DateRange object with start and end dates
 * @throws Error if expression cannot be parsed
 */
export function parseRelativeDate(expression: string): DateRange {
  const normalized = expression.toLowerCase().trim();
  const now = new Date();

  // Parse specific relative dates
  switch (normalized) {
    case 'today': {
      const today = startOfDay(now);
      return {
        start: toISODate(today),
        end: toISODate(today),
      };
    }

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const startYesterday = startOfDay(yesterday);
      return {
        start: toISODate(startYesterday),
        end: toISODate(startYesterday),
      };
    }

    case 'this week': {
      return {
        start: toISODate(startOfWeek(now)),
        end: toISODate(endOfWeek(now)),
      };
    }

    case 'last week': {
      const lastWeek = new Date(now);
      lastWeek.setUTCDate(lastWeek.getUTCDate() - 7);
      return {
        start: toISODate(startOfWeek(lastWeek)),
        end: toISODate(endOfWeek(lastWeek)),
      };
    }

    case 'this month': {
      return {
        start: toISODate(startOfMonth(now)),
        end: toISODate(endOfMonth(now)),
      };
    }

    case 'last month': {
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      return {
        start: toISODate(startOfMonth(lastMonth)),
        end: toISODate(endOfMonth(lastMonth)),
      };
    }

    case 'this year': {
      return {
        start: toISODate(startOfYear(now)),
        end: toISODate(endOfYear(now)),
      };
    }

    case 'last year': {
      const lastYear = new Date(now);
      lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1);
      return {
        start: toISODate(startOfYear(lastYear)),
        end: toISODate(endOfYear(lastYear)),
      };
    }
  }

  // Parse "last N days/weeks/months" patterns - handle spaces flexibly
  const lastNDaysMatch = normalized.match(/^last\s+(\d+)\s+days?$/);
  if (lastNDaysMatch) {
    const days = parseInt(lastNDaysMatch[1], 10);
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - days);
    return {
      start: toISODate(startOfDay(startDate)),
      end: toISODate(startOfDay(now)),
    };
  }

  const lastNWeeksMatch = normalized.match(/^last\s+(\d+)\s+weeks?$/);
  if (lastNWeeksMatch) {
    const weeks = parseInt(lastNWeeksMatch[1], 10);
    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);
    return {
      start: toISODate(startOfDay(startDate)),
      end: toISODate(startOfDay(now)),
    };
  }

  const lastNMonthsMatch = normalized.match(/^last\s+(\d+)\s+months?$/);
  if (lastNMonthsMatch) {
    const months = parseInt(lastNMonthsMatch[1], 10);
    const startDate = new Date(now);
    startDate.setUTCMonth(startDate.getUTCMonth() - months);
    return {
      start: toISODate(startOfDay(startDate)),
      end: toISODate(startOfDay(now)),
    };
  }

  // If no pattern matches, throw an error
  throw new Error(
    `Unable to parse relative date expression: "${expression}". ` +
      `Supported formats: today, yesterday, this week, last week, this month, ` +
      `last month, this year, last year, last N days/weeks/months`
  );
}

/**
 * Check if a string is a relative date expression
 * @param expression String to check
 * @returns true if the string is a recognized relative date expression
 */
export function isRelativeDate(expression: string): boolean {
  try {
    parseRelativeDate(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a date string or relative expression to ISO date format
 * @param dateInput Date string or relative expression
 * @returns ISO date string or null if invalid
 */
export function normalizeDate(dateInput: string): string | null {
  // Check if it's already an ISO date (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDateRegex.test(dateInput)) {
    return dateInput;
  }

  // Check if it's a relative date
  if (isRelativeDate(dateInput)) {
    const range = parseRelativeDate(dateInput);
    // For single date context, return the start date
    return range.start;
  }

  // Try to parse as a regular date.
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return null;
  }

  // ISO datetimes/instants (…T…): UTC calendar day — host-stable.
  // Wall-clock strings ("March 15, 2024", "2024/03/15"): local calendar day.
  if (/^\d{4}-\d{2}-\d{2}T/i.test(dateInput.trim())) {
    return date.toISOString().split('T')[0];
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get a human-readable description of a date range
 * @param range DateRange object
 * @returns Human-readable description
 */
export function describeDateRange(range: DateRange): string {
  // Parse dates as local dates to avoid timezone issues
  // Adding 'T00:00:00' ensures the date is interpreted in local time
  const start = new Date(range.start + 'T00:00:00');
  const end = new Date(range.end + 'T00:00:00');

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if it's a single day
  if (range.start === range.end) {
    return formatDate(start);
  }

  return `${formatDate(start)} to ${formatDate(end)}`;
}
