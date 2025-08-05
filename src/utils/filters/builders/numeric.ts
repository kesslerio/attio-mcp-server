/**
 * Numeric range filter builders.
 */

// External imports
import { FilterValidationError } from '../../../errors/api-errors.js';
import { validateNumericRange } from '../validators.js';
// Internal imports
import {
  ATTRIBUTES,
  FilterConditionType,
  type ListEntryFilter,
  type ListEntryFilters,
  type NumericRange,
} from './types.js';

/**
 * Creates a numeric filter for a specific attribute.
 */
export function createNumericFilter(
  attributeSlug: string,
  range: NumericRange
): ListEntryFilters {
  try {
    const validatedRange = validateNumericRange(range);

    if (validatedRange.equals !== undefined) {
      return {
        filters: [
          {
            attribute: { slug: attributeSlug },
            condition: FilterConditionType.EQUALS,
            value: validatedRange.equals,
          },
        ],
        matchAny: false,
      };
    }

    const filters: ListEntryFilter[] = [];

    if (validatedRange.min !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: validatedRange.min,
      });
    }

    if (validatedRange.max !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: validatedRange.max,
      });
    }

    return { filters, matchAny: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create numeric filter: ${message}`
    );
  }
}

/**
 * Creates a filter for employee count.
 */
export function createEmployeeCountFilter(
  range: NumericRange
): ListEntryFilters {
  return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
}

/**
 * Creates a filter for annual revenue.
 */
export function createRevenueFilter(range: NumericRange): ListEntryFilters {
  return createNumericFilter(ATTRIBUTES.REVENUE, range);
}
