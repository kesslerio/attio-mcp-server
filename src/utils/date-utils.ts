/**
 * Date utility functions for working with Attio date filters
 * Provides functions for handling date ranges, relative dates, and date formatting.
 */
import {
  type DateRange,
  DateRangePreset,
  type RelativeDate,
  RelativeDateUnit,
} from '../types/attio.js';

/**
 * Converts a relative date (e.g., "last 7 days") to an absolute ISO date string
 *
 * @param relativeDate - The relative date configuration
 * @returns ISO date string representation
 * @throws Error when validation fails
 */
export function resolveRelativeDate(relativeDate: RelativeDate): string {
  // Validate required properties
  if (!relativeDate) {
    throw new Error('RelativeDate object is required');
  }

  if (!relativeDate.unit) {
    throw new Error(
      'RelativeDate must specify a unit (day, week, month, quarter, year)'
    );
  }

  if (relativeDate.value === undefined || relativeDate.value === null) {
    throw new Error('RelativeDate must specify a numeric value');
  }

  if (!relativeDate.direction) {
    throw new Error('RelativeDate must specify a direction (past or future)');
  }

  if (
    relativeDate.direction !== 'past' &&
    relativeDate.direction !== 'future'
  ) {
    throw new Error('RelativeDate direction must be either "past" or "future"');
  }

  // Value should be a positive number
  if (
    typeof relativeDate.value !== 'number' ||
    isNaN(relativeDate.value) ||
    relativeDate.value < 0
  ) {
    throw new Error('RelativeDate value must be a positive number');
  }

  const now = new Date();
  const resultDate = new Date(now);

  // Determine the operation based on direction
  const operation = relativeDate.direction === 'past' ? -1 : 1;
  const value = relativeDate.value * operation;

  // Apply the operation based on unit
  switch (relativeDate.unit) {
    case RelativeDateUnit.DAY:
      resultDate.setDate(now.getDate() + value);
      break;
    case RelativeDateUnit.WEEK:
      resultDate.setDate(now.getDate() + value * 7);
      break;
    case RelativeDateUnit.MONTH:
      resultDate.setMonth(now.getMonth() + value);
      break;
    case RelativeDateUnit.QUARTER:
      resultDate.setMonth(now.getMonth() + value * 3);
      break;
    case RelativeDateUnit.YEAR:
      resultDate.setFullYear(now.getFullYear() + value);
      break;
    default:
      throw new Error(`Unsupported relative date unit: ${relativeDate.unit}`);
  }

  return resultDate.toISOString();
}

/**
 * Creates a date range from a preset string (today, yesterday, this_week, etc.)
 *
 * @param preset - Preset identifier string
 * @returns Object with start and end dates as ISO strings
 * @throws Error for invalid preset values
 */
export function createDateRangeFromPreset(preset: string): {
  start: string;
  end: string;
} {
  // Validate preset
  if (!preset || typeof preset !== 'string') {
    throw new Error('Date preset must be a non-empty string');
  }

  const normalizedPreset = preset.toLowerCase().trim();

  // Check if preset is a valid DateRangePreset value
  const isValidPreset = Object.values(DateRangePreset).includes(
    normalizedPreset as DateRangePreset
  );
  if (!isValidPreset) {
    throw new Error(
      `Unsupported date preset: "${preset}". ` +
        `Valid presets are: ${Object.values(DateRangePreset).join(', ')}`
    );
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);

  // Set end to end of today by default
  end.setHours(23, 59, 59, 999);

  switch (normalizedPreset) {
    case DateRangePreset.TODAY:
      // start is already set to beginning of today
      break;

    case DateRangePreset.YESTERDAY:
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;

    case DateRangePreset.THIS_WEEK: {
      // Set start to beginning of current week (Sunday)
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      start.setDate(today.getDate() - dayOfWeek);
      break;
    }

    case DateRangePreset.LAST_WEEK: {
      // Set start to beginning of last week
      const lastWeekDay = today.getDay();
      start.setDate(today.getDate() - lastWeekDay - 7);
      end.setDate(today.getDate() - lastWeekDay - 1);
      break;
    }

    case DateRangePreset.THIS_MONTH:
      // Set start to beginning of current month
      start.setDate(1);
      break;

    case DateRangePreset.LAST_MONTH:
      // Set start to beginning of last month
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;

    case DateRangePreset.THIS_QUARTER: {
      // Set start to beginning of current quarter
      const currentQuarter = Math.floor(today.getMonth() / 3);
      start.setMonth(currentQuarter * 3);
      start.setDate(1);
      break;
    }

    case DateRangePreset.LAST_QUARTER: {
      // Set start to beginning of last quarter
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
      const lastQuarterYear =
        lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const normalizedLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;

      start = new Date(lastQuarterYear, normalizedLastQuarter * 3, 1);
      end = new Date(
        lastQuarterYear,
        (normalizedLastQuarter + 1) * 3,
        0,
        23,
        59,
        59,
        999
      );
      break;
    }

    case DateRangePreset.THIS_YEAR:
      // Set start to beginning of current year
      start.setMonth(0);
      start.setDate(1);
      break;

    case DateRangePreset.LAST_YEAR:
      // Set start to beginning of last year
      start.setFullYear(today.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;

    default:
      // This shouldn't happen due to earlier validation, but included for type safety
      throw new Error(`Unsupported date preset: ${preset}`);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Validates and resolves a date range to absolute ISO date strings
 * Handles both relative and absolute date specifications
 *
 * @param dateRange - The date range specification
 * @returns Object with resolved start and end dates as ISO strings
 * @throws Error when date range validation fails
 */
export function resolveDateRange(dateRange: DateRange): {
  start?: string;
  end?: string;
} {
  // Validate date range
  if (!dateRange) {
    throw new Error('DateRange object is required');
  }

  // A date range must have at least one of: preset, start, or end
  if (!(dateRange.preset || dateRange.start || dateRange.end)) {
    throw new Error(
      'DateRange must specify at least one of: preset, start, or end'
    );
  }

  const result: { start?: string; end?: string } = {};

  // Handle preset if specified
  if (dateRange.preset) {
    try {
      // If preset is specified along with start/end, warn but continue with preset
      if (dateRange.start || dateRange.end) {
        console.warn(
          'DateRange contains both preset and start/end specifications. ' +
            'Using preset and ignoring explicit start/end values.'
        );
      }

      const presetRange = createDateRangeFromPreset(dateRange.preset);
      return presetRange;
    } catch (error) {
      // Throw a more descriptive error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve date range preset: ${errorMessage}`);
    }
  }

  // Handle start date if specified
  if (dateRange.start) {
    try {
      if (typeof dateRange.start === 'string') {
        // Validate ISO date string format
        if (!isValidISODateString(dateRange.start)) {
          throw new Error(`Invalid ISO date string format: ${dateRange.start}`);
        }

        // Direct ISO string
        result.start = dateRange.start;
      } else {
        // Relative date object
        result.start = resolveRelativeDate(dateRange.start);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve start date: ${errorMessage}`);
    }
  }

  // Handle end date if specified
  if (dateRange.end) {
    try {
      if (typeof dateRange.end === 'string') {
        // Validate ISO date string format
        if (!isValidISODateString(dateRange.end)) {
          throw new Error(`Invalid ISO date string format: ${dateRange.end}`);
        }

        // Direct ISO string
        result.end = dateRange.end;
      } else {
        // Relative date object
        result.end = resolveRelativeDate(dateRange.end);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve end date: ${errorMessage}`);
    }
  }

  // Validate that if both dates are provided, start is before end
  if (result.start && result.end) {
    const startDate = new Date(result.start);
    const endDate = new Date(result.end);

    if (startDate > endDate) {
      throw new Error(
        `Invalid date range: start date (${result.start}) ` +
          `must be before or equal to end date (${result.end})`
      );
    }
  }

  return result;
}

/**
 * Helper function to check if a string is a valid ISO date string
 *
 * @param dateString - The string to validate
 * @returns True if the string is a valid ISO date, false otherwise
 */
export function isValidISODateString(dateString: string): boolean {
  // Check basic format
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Creates a date range for a specific time period (last X days, weeks, etc.)
 *
 * @param value - The number of units (e.g., 7 for "last 7 days")
 * @param unit - The time unit (day, week, month, etc.)
 * @returns Object with start and end dates as ISO strings
 */
export function createRelativeDateRange(
  value: number,
  unit: RelativeDateUnit
): { start: string; end: string } {
  const now = new Date();
  const startDate = new Date(now);

  // Configure start date based on unit and value
  switch (unit) {
    case RelativeDateUnit.DAY:
      startDate.setDate(now.getDate() - value);
      break;
    case RelativeDateUnit.WEEK:
      startDate.setDate(now.getDate() - value * 7);
      break;
    case RelativeDateUnit.MONTH:
      startDate.setMonth(now.getMonth() - value);
      break;
    case RelativeDateUnit.QUARTER:
      startDate.setMonth(now.getMonth() - value * 3);
      break;
    case RelativeDateUnit.YEAR:
      startDate.setFullYear(now.getFullYear() - value);
      break;
    default:
      throw new Error(`Unsupported relative date unit: ${unit}`);
  }

  return {
    start: startDate.toISOString(),
    end: now.toISOString(),
  };
}

/**
 * Creates a formatted date string to display to users
 *
 * @param dateString - ISO date string
 * @param format - Optional format specification ('short', 'long', etc.)
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  format: 'short' | 'long' | 'relative' = 'short'
): string {
  const date = new Date(dateString);

  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'relative': {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    }
    default:
      return date.toISOString();
  }
}

/**
 * Validates and creates a date range object for API requests
 * Ensures dates are properly formatted and handles missing values gracefully
 *
 * @param startDate - Optional start date (ISO string or empty)
 * @param endDate - Optional end date (ISO string or empty)
 * @returns Validated date range object or throws error
 * @throws Error when dates are invalid or illogical
 */
export function validateAndCreateDateRange(
  startDate?: string,
  endDate?: string
): { start?: string; end?: string } | null {
  // If both dates are missing or empty, return null (no date filtering)
  if (
    (!startDate || startDate.trim() === '') &&
    (!endDate || endDate.trim() === '')
  ) {
    return null;
  }

  const result: { start?: string; end?: string } = {};

  // Validate and process start date
  if (startDate && startDate.trim() !== '') {
    const trimmedStart = startDate.trim();
    if (!isValidISODateString(trimmedStart)) {
      throw new Error(
        `Invalid start date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ), got: "${trimmedStart}"`
      );
    }
    result.start = trimmedStart;
  }

  // Validate and process end date
  if (endDate && endDate.trim() !== '') {
    const trimmedEnd = endDate.trim();
    if (!isValidISODateString(trimmedEnd)) {
      throw new Error(
        `Invalid end date format. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ), got: "${trimmedEnd}"`
      );
    }
    result.end = trimmedEnd;
  }

  // If only one date is provided, it's still valid for open-ended ranges
  if ((result.start && !result.end) || (!result.start && result.end)) {
    console.info(
      `Creating open-ended date range: ${result.start ? `from ${result.start}` : `until ${result.end}`}`
    );
  }

  // Validate logical consistency if both dates are provided
  if (result.start && result.end) {
    const startDate = new Date(result.start);
    const endDate = new Date(result.end);

    if (startDate > endDate) {
      throw new Error(
        `Invalid date range: start date (${result.start}) must be before or equal to end date (${result.end})`
      );
    }

    // Warn if the date range is suspiciously large
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365);
    if (diffYears > 10) {
      console.warn(
        `Large date range detected: ${diffYears.toFixed(1)} years. This may impact performance.`
      );
    }
  }

  return result;
}
