/**
 * Timeframe utility functions for converting relative timeframes to date ranges
 *
 * This module provides type-safe date range conversion for the Attio MCP Server
 * timeframe search functionality. All operations use UTC timezone to ensure
 * consistent behavior across different environments.
 *
 * Key Features:
 * - Type-safe relative timeframe conversion
 * - UTC timezone handling for consistency
 * - ISO 8601 date format output
 * - Comprehensive validation and error handling
 *
 * @example
 * ```typescript
 * const range = getRelativeTimeframeRange('last_7_days');
 * // Returns: { startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-01-08T23:59:59.999Z' }
 * ```
 */

/**
 * Represents an absolute date range with ISO 8601 formatted dates
 */
export interface DateRange {
  /** Start date in ISO 8601 format (e.g., '2024-01-01T00:00:00.000Z') */
  readonly startDate: string;
  /** End date in ISO 8601 format (e.g., '2024-01-01T23:59:59.999Z') */
  readonly endDate: string;
}

/**
 * Supported relative timeframe options
 * Each timeframe is converted to an absolute date range using UTC timezone
 */
export type RelativeTimeframe =
  | 'today' // Current day (00:00:00 to 23:59:59 UTC)
  | 'yesterday' // Previous day (00:00:00 to 23:59:59 UTC)
  | 'this_week' // Monday of current week to now
  | 'last_week' // Monday to Sunday of previous week
  | 'this_month' // First day of current month to now
  | 'last_month' // First to last day of previous month
  | 'last_7_days' // 7 days ago to now (rolling window)
  | 'last_14_days' // 14 days ago to now (rolling window) - Added for sales playbook
  | 'last_30_days' // 30 days ago to now (rolling window)
  | 'last_90_days'; // 90 days ago to now (rolling window)

/**
 * Validation result for timeframe parameters
 */
export interface TimeframeValidation {
  readonly isValid: boolean;
  readonly error?: string;
  readonly normalizedTimeframe?: RelativeTimeframe;
}

/**
 * Converts a relative timeframe to an absolute date range
 * All dates are returned in ISO 8601 format
 *
 * @param timeframe - The relative timeframe to convert
 * @param timezone - Optional timezone (defaults to UTC)
 * @returns Date range with startDate and endDate in ISO format
 */
export function getRelativeTimeframeRange(
  timeframe: RelativeTimeframe,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timezone: string = 'UTC'
): DateRange {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (timeframe) {
    case 'today':
      startDate = getStartOfDay(now);
      endDate = getEndOfDay(now);
      break;

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      startDate = getStartOfDay(yesterday);
      endDate = getEndOfDay(yesterday);
      break;
    }

    case 'this_week':
      startDate = getStartOfWeek(now);
      endDate = getEndOfDay(now);
      break;

    case 'last_week': {
      const lastWeekStart = new Date(now);
      lastWeekStart.setUTCDate(now.getUTCDate() - 7);
      startDate = getStartOfWeek(lastWeekStart);

      const lastWeekEnd = new Date(startDate);
      lastWeekEnd.setUTCDate(startDate.getUTCDate() + 6);
      endDate = getEndOfDay(lastWeekEnd);
      break;
    }

    case 'this_month':
      startDate = getStartOfMonth(now);
      endDate = getEndOfDay(now);
      break;

    case 'last_month': {
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      startDate = getStartOfMonth(lastMonth);
      endDate = getEndOfMonth(lastMonth);
      break;
    }

    case 'last_7_days': {
      const weekAgo = new Date(now);
      weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
      startDate = getStartOfDay(weekAgo);
      endDate = getEndOfDay(now);
      break;
    }

    case 'last_14_days': {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
      startDate = getStartOfDay(twoWeeksAgo);
      endDate = getEndOfDay(now);
      break;
    }

    case 'last_30_days': {
      const monthAgo = new Date(now);
      monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
      startDate = getStartOfDay(monthAgo);
      endDate = getEndOfDay(now);
      break;
    }

    case 'last_90_days': {
      const quarterAgo = new Date(now);
      quarterAgo.setUTCDate(quarterAgo.getUTCDate() - 90);
      startDate = getStartOfDay(quarterAgo);
      endDate = getEndOfDay(now);
      break;
    }

    default:
      throw new Error(`Unsupported timeframe: ${timeframe}`);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Validates if a string is a valid ISO 8601 date
 *
 * @param dateString - The date string to validate
 * @returns True if valid ISO date, false otherwise
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('T');
}

/**
 * Validates a date range to ensure start comes before end
 *
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @returns True if valid range, false otherwise
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return false;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  return start <= end;
}

/**
 * Converts user-friendly date parameters to Attio API timeframe query parameters
 *
 * @param params - User date parameters
 * @returns Attio API compatible parameters
 */
export function convertDateParamsToTimeframeQuery(params: {
  date_from?: string;
  date_to?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  timeframe?: RelativeTimeframe;
  date_field?: 'created_at' | 'updated_at';
}): {
  timeframe_attribute?: string;
  start_date?: string;
  end_date?: string;
  date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
} | null {
  const {
    date_from,
    date_to,
    created_after,
    created_before,
    updated_after,
    updated_before,
    timeframe,
    date_field = 'created_at',
  } = params;

  // If relative timeframe is specified, use it (overrides absolute dates)
  if (timeframe) {
    const range = getRelativeTimeframeRange(timeframe);
    return {
      timeframe_attribute: date_field,
      start_date: range.startDate,
      end_date: range.endDate,
      date_operator: 'between',
    };
  }

  // Handle date_from/date_to range
  if (date_from && date_to) {
    if (!isValidDateRange(date_from, date_to)) {
      throw new Error('Invalid date range: start date must be before end date');
    }
    return {
      timeframe_attribute: date_field,
      start_date: date_from,
      end_date: date_to,
      date_operator: 'between',
    };
  }

  // Handle single date bounds
  if (date_from && !date_to) {
    if (!isValidISODate(date_from)) {
      throw new Error('Invalid date_from format: must be ISO 8601');
    }
    return {
      timeframe_attribute: date_field,
      start_date: date_from,
      date_operator: 'greater_than',
    };
  }

  if (date_to && !date_from) {
    if (!isValidISODate(date_to)) {
      throw new Error('Invalid date_to format: must be ISO 8601');
    }
    return {
      timeframe_attribute: date_field,
      end_date: date_to,
      date_operator: 'less_than',
    };
  }

  // Handle created_at specific filters
  if (created_after || created_before) {
    if (created_after && created_before) {
      if (!isValidDateRange(created_after, created_before)) {
        throw new Error(
          'Invalid created date range: created_after must be before created_before'
        );
      }
      return {
        timeframe_attribute: 'created_at',
        start_date: created_after,
        end_date: created_before,
        date_operator: 'between',
      };
    } else if (created_after) {
      if (!isValidISODate(created_after)) {
        throw new Error('Invalid created_after format: must be ISO 8601');
      }
      return {
        timeframe_attribute: 'created_at',
        start_date: created_after,
        date_operator: 'greater_than',
      };
    } else if (created_before) {
      if (!isValidISODate(created_before)) {
        throw new Error('Invalid created_before format: must be ISO 8601');
      }
      return {
        timeframe_attribute: 'created_at',
        end_date: created_before,
        date_operator: 'less_than',
      };
    }
  }

  // Handle updated_at specific filters
  if (updated_after || updated_before) {
    if (updated_after && updated_before) {
      if (!isValidDateRange(updated_after, updated_before)) {
        throw new Error(
          'Invalid updated date range: updated_after must be before updated_before'
        );
      }
      return {
        timeframe_attribute: 'updated_at',
        start_date: updated_after,
        end_date: updated_before,
        date_operator: 'between',
      };
    } else if (updated_after) {
      if (!isValidISODate(updated_after)) {
        throw new Error('Invalid updated_after format: must be ISO 8601');
      }
      return {
        timeframe_attribute: 'updated_at',
        start_date: updated_after,
        date_operator: 'greater_than',
      };
    } else if (updated_before) {
      if (!isValidISODate(updated_before)) {
        throw new Error('Invalid updated_before format: must be ISO 8601');
      }
      return {
        timeframe_attribute: 'updated_at',
        end_date: updated_before,
        date_operator: 'less_than',
      };
    }
  }

  return null; // No date parameters provided
}

// Helper functions for date calculations (all in UTC)

function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = result.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setUTCDate(diff);
  return getStartOfDay(result);
}

function getStartOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setUTCDate(1);
  return getStartOfDay(result);
}

function getEndOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1, 0); // Last day of current month
  return getEndOfDay(result);
}

/**
 * Validates a relative timeframe string against supported options
 *
 * @param timeframe - The timeframe string to validate
 * @returns Validation result with error details if invalid
 *
 * @example
 * ```typescript
 * const result = validateTimeframe('last_7_days');
 * if (result.isValid) {
 *   console.log('Valid timeframe:', result.normalizedTimeframe);
 * } else {
 *   console.error('Invalid timeframe:', result.error);
 * }
 * ```
 */
export function validateTimeframe(timeframe: string): TimeframeValidation {
  const supportedTimeframes: RelativeTimeframe[] = [
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'last_7_days',
    'last_14_days',
    'last_30_days',
    'last_90_days',
  ];

  if (!timeframe || typeof timeframe !== 'string') {
    return {
      isValid: false,
      error: 'Timeframe must be a non-empty string',
    };
  }

  const normalizedString = timeframe.toLowerCase().trim();

  // Check for empty string after trimming
  if (normalizedString === '') {
    return {
      isValid: false,
      error: 'Timeframe must be a non-empty string',
    };
  }

  const normalizedTimeframe = normalizedString as RelativeTimeframe;

  if (!supportedTimeframes.includes(normalizedTimeframe)) {
    return {
      isValid: false,
      error: `Unsupported timeframe '${timeframe}'. Supported options: ${supportedTimeframes.join(', ')}`,
    };
  }

  return {
    isValid: true,
    normalizedTimeframe,
  };
}

/**
 * Validates that a date range is logical (start before end)
 *
 * @param startDate - Start date in ISO 8601 format
 * @param endDate - End date in ISO 8601 format
 * @returns true if range is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = validateDateRange('2024-01-01', '2024-01-31');
 * // Returns: true
 * ```
 */
export function validateDateRange(startDate: string, endDate: string): boolean {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    return start <= end;
  } catch {
    return false;
  }
}

/**
 * Enhanced timeframe parameter conversion with comprehensive validation
 *
 * This function provides better error handling and type safety compared to
 * the basic convertTimeframeParams function.
 *
 * @param params - Search parameters potentially containing date/timeframe fields
 * @returns Validated timeframe query parameters or detailed error
 *
 * @throws {Error} With descriptive error messages for invalid parameters
 */
export function convertTimeframeParamsWithValidation(
  params: Record<string, unknown>
): {
  timeframe_attribute?: string;
  start_date?: string;
  end_date?: string;
  date_operator?: 'greater_than' | 'less_than' | 'between' | 'equals';
} {
  const timeframe = params.timeframe as string;
  const dateField = (params.date_field as string) || 'created_at';

  // Validate relative timeframe if provided
  if (timeframe) {
    const validation = validateTimeframe(timeframe);
    if (!validation.isValid) {
      throw new Error(`Timeframe validation failed: ${validation.error}`);
    }

    const range = getRelativeTimeframeRange(validation.normalizedTimeframe!);
    return {
      timeframe_attribute: dateField,
      start_date: range.startDate,
      end_date: range.endDate,
      date_operator: 'between',
    };
  }

  // Validate absolute date ranges
  const dateFrom = params.date_from as string;
  const dateTo = params.date_to as string;

  if (dateFrom && dateTo) {
    if (!validateDateRange(dateFrom, dateTo)) {
      throw new Error(
        'Date parameter validation failed: start date must be before end date and both must be valid ISO 8601 dates'
      );
    }
    return {
      timeframe_attribute: dateField,
      start_date: dateFrom,
      end_date: dateTo,
      date_operator: 'between',
    };
  }

  // Handle single date bounds with validation
  if (dateFrom) {
    if (!isValidISODate(dateFrom)) {
      throw new Error(
        'Date parameter validation failed: date_from must be a valid ISO 8601 date'
      );
    }
    return {
      timeframe_attribute: dateField,
      start_date: dateFrom,
      date_operator: 'greater_than',
    };
  }

  if (dateTo) {
    if (!isValidISODate(dateTo)) {
      throw new Error(
        'Date parameter validation failed: date_to must be a valid ISO 8601 date'
      );
    }
    return {
      timeframe_attribute: dateField,
      end_date: dateTo,
      date_operator: 'less_than',
    };
  }

  throw new Error('No valid timeframe or date parameters provided');
}
