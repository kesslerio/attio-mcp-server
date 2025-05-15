import { FilterConditionType } from "../types/attio.js";
import { FilterValidationError } from "../errors/api-errors.js";
/**
 * Creates a date range filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createDateRangeFilter(attributeSlug, dateRange) {
    try {
        const filters = [];
        // Add filter for start date if specified (using greater than or equal)
        if (dateRange.start) {
            filters.push({
                attribute: { slug: attributeSlug },
                condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
                value: dateRange.start
            });
        }
        // Add filter for end date if specified (using less than or equal)
        if (dateRange.end) {
            filters.push({
                attribute: { slug: attributeSlug },
                condition: FilterConditionType.LESS_THAN_OR_EQUALS,
                value: dateRange.end
            });
        }
        return {
            filters,
            // When both start and end are specified, we want records that match both (AND logic)
            matchAny: false
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new FilterValidationError(`Failed to create date range filter: ${errorMessage}`);
    }
}
/**
 * Creates a numeric filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export function createNumericFilter(attributeSlug, range) {
    try {
        // Validate the numeric range
        if (range.equals !== undefined) {
            // If equals is specified, min and max should not be
            if (range.min !== undefined || range.max !== undefined) {
                throw new Error('Cannot specify both equals and min/max in a numeric range');
            }
            return {
                filters: [
                    {
                        attribute: { slug: attributeSlug },
                        condition: FilterConditionType.EQUALS,
                        value: range.equals
                    }
                ],
                matchAny: false
            };
        }
        // Check if we have min or max
        if (range.min === undefined && range.max === undefined) {
            throw new Error('Numeric range must specify at least one of: min, max, or equals');
        }
        // If both min and max are specified, ensure min <= max
        if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
            throw new Error(`Invalid numeric range: min (${range.min}) cannot be greater than max (${range.max})`);
        }
        const filters = [];
        // Handle min value (greater than or equal)
        if (range.min !== undefined) {
            filters.push({
                attribute: { slug: attributeSlug },
                condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
                value: range.min
            });
        }
        // Handle max value (less than or equal)
        if (range.max !== undefined) {
            filters.push({
                attribute: { slug: attributeSlug },
                condition: FilterConditionType.LESS_THAN_OR_EQUALS,
                value: range.max
            });
        }
        return {
            filters,
            // When both min and max are specified, we want records that match both (AND logic)
            matchAny: false
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new FilterValidationError(`Failed to create numeric filter: ${errorMessage}`);
    }
}
//# sourceMappingURL=filter-utils-additions.js.map