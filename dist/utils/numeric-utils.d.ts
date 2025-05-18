import { ListEntryFilters } from "../api/operations/index.js";
/**
 * Interface for numeric range
 */
export interface NumericRange {
    min?: number;
    max?: number;
    equals?: number;
}
/**
 * Validates a numeric range specification
 *
 * @param range - The numeric range to validate
 * @returns True if valid, throws an error if invalid
 * @throws Error when range is invalid
 */
export declare function validateNumericRange(range: NumericRange): boolean;
/**
 * Creates a numeric range filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export declare function createNumericRangeFilter(attributeSlug: string, range: NumericRange): ListEntryFilters;
//# sourceMappingURL=numeric-utils.d.ts.map