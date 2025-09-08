/**
 * Date parsing utilities for natural language date expressions
 * Supports relative dates like "last week", "this month", etc.
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
 * Parse a relative date expression into a date range
 * @param expression Natural language date expression
 * @returns DateRange object with start and end dates
 * @throws Error if expression cannot be parsed
 */
export function parseRelativeDate(expression: string): DateRange {

  // Helper to format date as ISO string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  };

  // Helper to get start of day
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper to get start of week (Monday)
    d.setDate(diff);
    return startOfDay(d);
  };

  // Helper to get end of week (Sunday)
    d.setDate(diff);
    return startOfDay(d);
  };

  // Helper to get start of month
    d.setDate(1);
    return startOfDay(d);
  };

  // Helper to get end of month (last day of month)
    d.setMonth(d.getMonth() + 1, 0);
    return startOfDay(d);
  };

  // Helper to get start of year
    d.setMonth(0, 1);
    return startOfDay(d);
  };

  // Helper to get end of year
    d.setMonth(11, 31);
    return startOfDay(d);
  };

  // Parse specific relative dates
  switch (normalized) {
    case 'today': {
      return {
        start: toISODate(today),
        end: toISODate(today),
      };
    }

    case 'yesterday': {
      yesterday.setDate(yesterday.getDate() - 1);
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
      lastWeek.setDate(lastWeek.getDate() - 7);
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
      lastMonth.setMonth(lastMonth.getMonth() - 1);
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
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return {
        start: toISODate(startOfYear(lastYear)),
        end: toISODate(endOfYear(lastYear)),
      };
    }
  }

  // Parse "last N days/weeks/months" patterns - handle spaces flexibly
  if (lastNDaysMatch) {
    startDate.setDate(startDate.getDate() - days);
    return {
      start: toISODate(startOfDay(startDate)),
      end: toISODate(startOfDay(now)),
    };
  }

  if (lastNWeeksMatch) {
    startDate.setDate(startDate.getDate() - weeks * 7);
    return {
      start: toISODate(startOfDay(startDate)),
      end: toISODate(startOfDay(now)),
    };
  }

  if (lastNMonthsMatch) {
    startDate.setMonth(startDate.getMonth() - months);
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
  if (isoDateRegex.test(dateInput)) {
    return dateInput;
  }

  // Check if it's a relative date
  if (isRelativeDate(dateInput)) {
    // For single date context, return the start date
    return range.start;
  }

  // Try to parse as a regular date
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Get a human-readable description of a date range
 * @param range DateRange object
 * @returns Human-readable description
 */
export function describeDateRange(range: DateRange): string {
  // Parse dates as local dates to avoid timezone issues
  // Adding 'T00:00:00' ensures the date is interpreted in local time

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
