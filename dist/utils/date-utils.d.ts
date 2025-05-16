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
 * @throws Error when validation fails
 */
export declare function resolveRelativeDate(relativeDate: RelativeDate): string;
/**
 * Creates a date range from a preset string (today, yesterday, this_week, etc.)
 *
 * @param preset - Preset identifier string
 * @returns Object with start and end dates as ISO strings
 * @throws Error for invalid preset values
 */
export declare function createDateRangeFromPreset(preset: string): {
    start: string;
    end: string;
};
/**
 * Validates and resolves a date range to absolute ISO date strings
 * Handles both relative and absolute date specifications
 *
 * @param dateRange - The date range specification
 * @returns Object with resolved start and end dates as ISO strings
 * @throws Error when date range validation fails
 */
export declare function resolveDateRange(dateRange: DateRange): {
    start?: string;
    end?: string;
};
/**
 * Helper function to check if a string is a valid ISO date string
 *
 * @param dateString - The string to validate
 * @returns True if the string is a valid ISO date, false otherwise
 */
export declare function isValidISODateString(dateString: string): boolean;
/**
 * Creates a date range for a specific time period (last X days, weeks, etc.)
 *
 * @param value - The number of units (e.g., 7 for "last 7 days")
 * @param unit - The time unit (day, week, month, etc.)
 * @returns Object with start and end dates as ISO strings
 */
export declare function createRelativeDateRange(value: number, unit: RelativeDateUnit): {
    start: string;
    end: string;
};
/**
 * Creates a formatted date string to display to users
 *
 * @param dateString - ISO date string
 * @param format - Optional format specification ('short', 'long', etc.)
 * @returns Formatted date string
 */
export declare function formatDate(dateString: string, format?: 'short' | 'long' | 'relative'): string;
//# sourceMappingURL=date-utils.d.ts.map