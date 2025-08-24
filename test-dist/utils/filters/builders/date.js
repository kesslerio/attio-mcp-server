/**
 * Date related filter builders.
 */
// External imports
import { FilterValidationError } from '../../../errors/api-errors.js';
import { resolveDateRange } from '../../date-utils.js';
// Internal imports
import { FilterConditionType, ATTRIBUTES, } from './types.js';
import { validateDateRange } from '../validators.js';
/**
 * Creates a date range filter for a specific attribute.
 */
export function createDateRangeFilter(attributeSlug, dateRange) {
    try {
        const validated = validateDateRange(dateRange);
        const resolved = resolveDateRange(validated);
        const filters = [];
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new FilterValidationError(`Failed to create date range filter: ${message}`);
    }
}
/**
 * Creates a filter for records based on their creation date.
 */
export function createCreatedDateFilter(dateRange) {
    return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
}
/**
 * Creates a filter for records based on their last modification date.
 */
export function createModifiedDateFilter(dateRange) {
    return createDateRangeFilter(ATTRIBUTES.UPDATED_AT, dateRange);
}
