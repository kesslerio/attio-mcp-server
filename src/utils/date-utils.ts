/**
 * Utility functions for working with dates in filters
 * Provides functions for handling relative dates, date ranges, and transforming to API format
 */
import { RelativeDate, RelativeDateUnit, DateRange, isRelativeDate } from "../types/attio.js";

/**
 * Converts a relative date to an ISO date string based on the current date
 * 
 * @param relativeDate - The relative date definition
 * @returns ISO date string
 */
export function resolveRelativeDate(relativeDate: RelativeDate): string {
  // Start with current date
  const now = new Date();
  const multiplier = relativeDate.direction === 'past' ? -1 : 1;
  
  // Apply the relative date calculation based on unit
  switch (relativeDate.unit) {
    case RelativeDateUnit.DAY:
      now.setDate(now.getDate() + (relativeDate.value * multiplier));
      break;
    case RelativeDateUnit.WEEK:
      now.setDate(now.getDate() + (relativeDate.value * 7 * multiplier));
      break;
    case RelativeDateUnit.MONTH:
      now.setMonth(now.getMonth() + (relativeDate.value * multiplier));
      break;
    case RelativeDateUnit.QUARTER:
      now.setMonth(now.getMonth() + (relativeDate.value * 3 * multiplier));
      break;
    case RelativeDateUnit.YEAR:
      now.setFullYear(now.getFullYear() + (relativeDate.value * multiplier));
      break;
    default:
      throw new Error(`Unsupported relative date unit: ${relativeDate.unit}`);
  }
  
  // Return ISO formatted date
  return now.toISOString();
}

/**
 * Converts a date string or relative date to an ISO date string
 * 
 * @param dateInput - Date string or relative date object
 * @returns ISO date string
 */
export function normalizeDate(dateInput: string | RelativeDate): string {
  if (isRelativeDate(dateInput)) {
    return resolveRelativeDate(dateInput);
  }
  
  // Validate and normalize the date string
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateInput}`);
  }
  
  return date.toISOString();
}

/**
 * Creates a preset relative date for common time periods
 * 
 * @param preset - Preset name (e.g., 'yesterday', 'last_week', 'last_month')
 * @returns Relative date object
 */
export function createRelativeDatePreset(preset: string): RelativeDate {
  const presets: { [key: string]: RelativeDate } = {
    yesterday: { unit: RelativeDateUnit.DAY, value: 1, direction: 'past' },
    last_week: { unit: RelativeDateUnit.WEEK, value: 1, direction: 'past' },
    last_month: { unit: RelativeDateUnit.MONTH, value: 1, direction: 'past' },
    last_quarter: { unit: RelativeDateUnit.QUARTER, value: 1, direction: 'past' },
    last_year: { unit: RelativeDateUnit.YEAR, value: 1, direction: 'past' },
    tomorrow: { unit: RelativeDateUnit.DAY, value: 1, direction: 'future' },
    next_week: { unit: RelativeDateUnit.WEEK, value: 1, direction: 'future' },
    next_month: { unit: RelativeDateUnit.MONTH, value: 1, direction: 'future' },
    next_quarter: { unit: RelativeDateUnit.QUARTER, value: 1, direction: 'future' },
    next_year: { unit: RelativeDateUnit.YEAR, value: 1, direction: 'future' },
    
    // Common ranges with day-based values
    last_7_days: { unit: RelativeDateUnit.DAY, value: 7, direction: 'past' },
    last_30_days: { unit: RelativeDateUnit.DAY, value: 30, direction: 'past' },
    last_90_days: { unit: RelativeDateUnit.DAY, value: 90, direction: 'past' },
    next_7_days: { unit: RelativeDateUnit.DAY, value: 7, direction: 'future' },
    next_30_days: { unit: RelativeDateUnit.DAY, value: 30, direction: 'future' },
    next_90_days: { unit: RelativeDateUnit.DAY, value: 90, direction: 'future' }
  };
  
  const relativeDate = presets[preset.toLowerCase()];
  if (!relativeDate) {
    throw new Error(`Unsupported date preset: ${preset}`);
  }
  
  return relativeDate;
}

/**
 * Creates a date range object from a preset name
 * 
 * @param preset - Preset name (e.g., 'this_week', 'this_month', 'last_7_days')
 * @returns Date range object with resolved ISO date strings
 */
export function createDateRangeFromPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  let start: Date, end: Date;
  
  switch (preset.toLowerCase()) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
      
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
      
    case 'this_week': {
      // Get the start of the week (Sunday)
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
      break;
    }
    
    case 'last_week': {
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 1, 23, 59, 59, 999);
      break;
    }
    
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
    }
    
    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
      break;
    }
    
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
      
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
      
    case 'last_7_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
      
    case 'last_30_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
      
    case 'last_90_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
      
    case 'next_7_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
      break;
      
    case 'next_30_days':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);
      break;
      
    default:
      throw new Error(`Unsupported date range preset: ${preset}`);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Normalizes a date range, resolving any relative dates
 * 
 * @param dateRange - Date range object
 * @returns Normalized date range with ISO date strings
 */
export function normalizeDateRange(dateRange: DateRange): { start?: string; end?: string } {
  const result: { start?: string; end?: string } = {};
  
  if (dateRange.start) {
    result.start = normalizeDate(dateRange.start);
  }
  
  if (dateRange.end) {
    result.end = normalizeDate(dateRange.end);
  }
  
  return result;
}