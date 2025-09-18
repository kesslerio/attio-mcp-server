/**
 * Basic comparison filter builders.
 */

// Internal imports
import { FilterConditionType, ListEntryFilters } from './types.js';

/**
 * Creates a simple equals filter for any attribute.
 */
export function createEqualsFilter(
  attributeSlug: string,
  value: unknown
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.EQUALS,
        value: value,
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
