/**
 * Numeric range filter builders.
 */
// External imports
import { FilterValidationError } from '../../../errors/api-errors.js';
// Internal imports
import { FilterConditionType, ATTRIBUTES, } from './types.js';
import { validateNumericRange } from '../validators.js';
/**
 * Creates a numeric filter for a specific attribute.
 */
export function createNumericFilter(attributeSlug, range) {
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
        const filters = [];
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new FilterValidationError(`Failed to create numeric filter: ${message}`);
    }
}
/**
 * Creates a filter for employee count.
 */
export function createEmployeeCountFilter(range) {
    return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
}
/**
 * Creates a filter for annual revenue.
 */
export function createRevenueFilter(range) {
    return createNumericFilter(ATTRIBUTES.REVENUE, range);
}
