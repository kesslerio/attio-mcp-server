/**
 * Timeframe utility functions for converting relative timeframes to date ranges
 * Supports various relative timeframes like 'today', 'last_week', 'last_30_days'
 */

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type RelativeTimeframe = 
  | 'today'
  | 'yesterday' 
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days';

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
    date_field = 'created_at' 
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
        throw new Error('Invalid created date range: created_after must be before created_before');
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
        throw new Error('Invalid updated date range: updated_after must be before updated_before');
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