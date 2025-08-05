/**
 * Basic comparison filter builders.
 */

// Internal imports
import { FilterConditionType, type ListEntryFilters } from './types.js';

/**
 * Creates a simple equals filter for any attribute.
 */
export function createEqualsFilter(
  attributeSlug: string,
  value: any
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.EQUALS,
        value,
      },
    ],
    matchAny: false,
  };
}

/**
 * Creates a simple contains filter for text attributes.
 */
export function createContainsFilter(
  attributeSlug: string,
  value: string
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.CONTAINS,
        value,
      },
    ],
    matchAny: false,
  };
}
