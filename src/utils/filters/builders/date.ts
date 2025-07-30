/**
 * Date related filter builders.
 */

// External imports
import { FilterValidationError } from '../../../errors/api-errors.js';
import { resolveDateRange } from '../../date-utils.js';

// Internal imports
import {
  FilterConditionType,
  ListEntryFilter,
  ListEntryFilters,
  DateRange,
  ATTRIBUTES,
} from './types.js';
import { validateDateRange } from '../validators.js';

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
        condition: FilterConditionType.AFTER,
        value: resolved.start,
      });
    }

    if (resolved.end) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.BEFORE,
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
