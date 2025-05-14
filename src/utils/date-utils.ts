/**
 * Date utility functions for working with Attio date filters
 * Provides functions for handling date ranges, relative dates, and date formatting.
 */
import { RelativeDate, RelativeDateUnit, DateRange } from "../types/attio.js";

/**
 * Converts a relative date (e.g., "last 7 days") to an absolute ISO date string
 * 
 * @param relativeDate - The relative date configuration
 * @returns ISO date string representation
 */
export function resolveRelativeDate(relativeDate: RelativeDate): string {
  const now = new Date();
  let resultDate = new Date(now);
  
  // Determine the operation based on direction
  const operation = relativeDate.direction === 'past' ? -1 : 1;
  const value = relativeDate.value * operation;
  
  // Apply the operation based on unit
  switch (relativeDate.unit) {
    case RelativeDateUnit.DAY:
      resultDate.setDate(now.getDate() + value);
      break;
    case RelativeDateUnit.WEEK:
      resultDate.setDate(now.getDate() + (value * 7));
      break;
    case RelativeDateUnit.MONTH:
      resultDate.setMonth(now.getMonth() + value);
      break;
    case RelativeDateUnit.QUARTER:
      resultDate.setMonth(now.getMonth() + (value * 3));
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
 */
export function createDateRangeFromPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  
  // Set end to end of today by default
  end.setHours(23, 59, 59, 999);
  
  switch (preset.toLowerCase()) {
    case 'today':
      // start is already set to beginning of today
      break;
      
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
      break;
      
    case 'this_week':
      // Set start to beginning of current week (Sunday)
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      start.setDate(today.getDate() - dayOfWeek);
      break;
      
    case 'last_week':
      // Set start to beginning of last week
      const lastWeekDay = today.getDay();
      start.setDate(today.getDate() - lastWeekDay - 7);
      end.setDate(today.getDate() - lastWeekDay - 1);
      break;
      
    case 'this_month':
      // Set start to beginning of current month
      start.setDate(1);
      break;
      
    case 'last_month':
      // Set start to beginning of last month
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
      
    case 'this_quarter':
      // Set start to beginning of current quarter
      const currentQuarter = Math.floor(today.getMonth() / 3);
      start.setMonth(currentQuarter * 3);
      start.setDate(1);
      break;
      
    case 'last_quarter':
      // Set start to beginning of last quarter
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const normalizedLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
      
      start = new Date(lastQuarterYear, normalizedLastQuarter * 3, 1);
      end = new Date(lastQuarterYear, (normalizedLastQuarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
      
    case 'this_year':
      // Set start to beginning of current year
      start.setMonth(0);
      start.setDate(1);
      break;
      
    case 'last_year':
      // Set start to beginning of last year
      start.setFullYear(today.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
      
    default:
      throw new Error(`Unsupported date preset: ${preset}`);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

/**
 * Resolves a date range to absolute ISO date strings
 * Handles both relative and absolute date specifications
 * 
 * @param dateRange - The date range specification
 * @returns Object with resolved start and end dates as ISO strings
 */
export function resolveDateRange(dateRange: DateRange): { start?: string; end?: string } {
  const result: { start?: string; end?: string } = {};
  
  // Handle preset if specified
  if (dateRange.preset) {
    const presetRange = createDateRangeFromPreset(dateRange.preset);
    return presetRange;
  }
  
  // Handle start date if specified
  if (dateRange.start) {
    if (typeof dateRange.start === 'string') {
      // Direct ISO string
      result.start = dateRange.start;
    } else {
      // Relative date object
      result.start = resolveRelativeDate(dateRange.start);
    }
  }
  
  // Handle end date if specified
  if (dateRange.end) {
    if (typeof dateRange.end === 'string') {
      // Direct ISO string
      result.end = dateRange.end;
    } else {
      // Relative date object
      result.end = resolveRelativeDate(dateRange.end);
    }
  }
  
  return result;
}

/**
 * Creates a date range for a specific time period (last X days, weeks, etc.)
 * 
 * @param value - The number of units (e.g., 7 for "last 7 days")
 * @param unit - The time unit (day, week, month, etc.)
 * @returns Object with start and end dates as ISO strings
 */
export function createRelativeDateRange(value: number, unit: RelativeDateUnit): { start: string; end: string } {
  const now = new Date();
  let startDate = new Date(now);
  
  // Configure start date based on unit and value
  switch (unit) {
    case RelativeDateUnit.DAY:
      startDate.setDate(now.getDate() - value);
      break;
    case RelativeDateUnit.WEEK:
      startDate.setDate(now.getDate() - (value * 7));
      break;
    case RelativeDateUnit.MONTH:
      startDate.setMonth(now.getMonth() - value);
      break;
    case RelativeDateUnit.QUARTER:
      startDate.setMonth(now.getMonth() - (value * 3));
      break;
    case RelativeDateUnit.YEAR:
      startDate.setFullYear(now.getFullYear() - value);
      break;
    default:
      throw new Error(`Unsupported relative date unit: ${unit}`);
  }
  
  return {
    start: startDate.toISOString(),
    end: now.toISOString()
  };
}

/**
 * Creates a formatted date string to display to users
 * 
 * @param dateString - ISO date string
 * @param format - Optional format specification ('short', 'long', etc.)
 * @returns Formatted date string
 */
export function formatDate(dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const date = new Date(dateString);
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'relative':
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    default:
      return date.toISOString();
  }
}