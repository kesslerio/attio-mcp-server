/**
 * Complex and utility filter builders.
 */
// Internal imports
import { FilterConditionType, ATTRIBUTES, FIELD_SPECIAL_HANDLING, } from './types.js';
/**
 * Creates a filter for objects in a specific list.
 */
export function createListFilter(listId) {
    return {
        filters: [
            {
                attribute: { slug: ATTRIBUTES.LIST_ID },
                condition: FilterConditionType.EQUALS,
                value: listId,
            },
        ],
        matchAny: false,
    };
}
/**
 * Creates filters using special field handling rules.
 */
export function createFilterWithSpecialHandling(attributeSlug, operator, value) {
    const specialHandling = FIELD_SPECIAL_HANDLING[attributeSlug];
    if (!specialHandling) {
        return {
            filters: [
                {
                    attribute: { slug: attributeSlug },
                    condition: operator,
                    value: value, // TODO: Update FilterValue type to accept unknown
                },
            ],
            matchAny: false,
        };
    }
    const mappedOperator = specialHandling[operator] || operator;
    let processedValue = value;
    if (specialHandling.allowStringValue && typeof value === 'string') {
        processedValue = value;
    }
    return {
        filters: [
            {
                attribute: { slug: attributeSlug },
                condition: mappedOperator,
                value: processedValue, // TODO: Update FilterValue type to accept unknown
            },
        ],
        matchAny: false,
    };
}
/**
 * Combines multiple filter sets using OR logic.
 */
export function createOrFilter(...filterSets) {
    const allFilters = [];
    filterSets.forEach((filterSet) => {
        if (filterSet.filters) {
            allFilters.push(...filterSet.filters);
        }
    });
    return { filters: allFilters, matchAny: true };
}
/**
 * Combines multiple filter sets using AND logic.
 */
export function createAndFilter(...filterSets) {
    const allFilters = [];
    filterSets.forEach((filterSet) => {
        if (filterSet.filters) {
            allFilters.push(...filterSet.filters);
        }
    });
    return { filters: allFilters, matchAny: false };
}
/**
 * Combines multiple filters with AND logic.
 */
export function combineWithAnd(...filters) {
    return createAndFilter(...filters);
}
/**
 * Combines multiple filters with OR logic.
 */
export function combineWithOr(...filters) {
    return createOrFilter(...filters);
}
export const combineFiltersWithAnd = combineWithAnd;
export const combineFiltersWithOr = combineWithOr;
