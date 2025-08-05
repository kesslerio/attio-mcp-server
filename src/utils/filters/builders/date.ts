/**
 * Date related filter builders.
 */

// External imports
import { FilterValidationError } from '../../../errors/api-errors.js';
import { resolveDateRange } from '../../date-utils.js';
import { validateDateRange } from '../validators.js';
// Internal imports
import {
  ATTRIBUTES,
  type DateRange,
  FilterConditionType,
  type ListEntryFilter,
  type ListEntryFilters,
} from './types.js';

/**
 * Creates a date range filter for a specific attribute.
 */
export function createDateRangeFilter(
  attributeSlug: string,
  dateRange: DateRange
): ListEntryFilters {
  try {
    const validated = validateDateRange(dateRange);
    const resolved = resolveDateRange(validated);
    const filters: ListEntryFilter[] = [];

    if (resolved.start) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: resolved.start,
      });
    }

    if (resolved.end) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN,
        value: resolved.end,
      });
    }

    return { filters, matchAny: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create date range filter: ${message}`
    );
  }
}

/**
 * Creates a filter for records based on their creation date.
 */
export function createCreatedDateFilter(
  dateRange: DateRange
): ListEntryFilters {
  return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
}

/**
 * Creates a filter for records based on their last modification date.
 */
export function createModifiedDateFilter(
  dateRange: DateRange
): ListEntryFilters {
  return createDateRangeFilter(ATTRIBUTES.UPDATED_AT, dateRange);
}
