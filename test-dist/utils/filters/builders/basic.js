/**
 * Basic comparison filter builders.
 */
// Internal imports
import { FilterConditionType } from './types.js';
/**
 * Creates a simple equals filter for any attribute.
 */
export function createEqualsFilter(attributeSlug, value) {
    return {
        filters: [
            {
                attribute: { slug: attributeSlug },
                condition: FilterConditionType.EQUALS,
                value: value, // TODO: Update FilterValue type to accept unknown
            },
        ],
        matchAny: false,
    };
}
/**
 * Creates a simple contains filter for text attributes.
 */
export function createContainsFilter(attributeSlug, value) {
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
