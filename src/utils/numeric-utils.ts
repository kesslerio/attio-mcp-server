/**
 * Numeric utility functions for working with Attio numeric filters
 * Provides functions for handling numeric ranges and comparison operations.
 */

import type {
  ListEntryFilter,
  ListEntryFilters,
} from '../api/operations/index.js';
import { FilterConditionType } from '../types/attio.js';

/**
 * Interface for numeric range
 */
export interface NumericRange {
  min?: number;
  max?: number;
  equals?: number;
}

/**
 * Validates a numeric range specification
 *
 * @param range - The numeric range to validate
 * @returns True if valid, throws an error if invalid
 * @throws Error when range is invalid
 */
export function validateNumericRange(range: NumericRange): boolean {
  // Check if we have an equals value (exact match)
  if (range.equals !== undefined) {
    // If equals is specified, min and max should not be
    if (range.min !== undefined || range.max !== undefined) {
      throw new Error(
        'Cannot specify both equals and min/max in a numeric range'
      );
    }
    return true;
  }

  // Check if we have min or max
  if (range.min === undefined && range.max === undefined) {
    throw new Error(
      'Numeric range must specify at least one of: min, max, or equals'
    );
  }

  // If both min and max are specified, ensure min <= max
  if (
    range.min !== undefined &&
    range.max !== undefined &&
    range.min > range.max
  ) {
    throw new Error(
      `Invalid numeric range: min (${range.min}) cannot be greater than max (${range.max})`
    );
  }

  return true;
}

/**
 * Creates a numeric range filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export function createNumericRangeFilter(
  attributeSlug: string,
  range: NumericRange
): ListEntryFilters {
  try {
    // Validate the numeric range
    validateNumericRange(range);

    const filters: ListEntryFilter[] = [];

    // Handle exact match case
    if (range.equals !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.EQUALS,
        value: range.equals,
      });
      return { filters, matchAny: false };
    }

    // Handle min value (greater than or equal)
    if (range.min !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: range.min,
      });
    }

    // Handle max value (less than or equal)
    if (range.max !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: range.max,
      });
    }

    return {
      filters,
      // When both min and max are specified, we want records that match both (AND logic)
      matchAny: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create numeric filter: ${errorMessage}`);
  }
}
