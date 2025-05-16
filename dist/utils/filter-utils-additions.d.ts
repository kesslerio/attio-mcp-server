/**
 * Additional filter utilities for date and numeric ranges
 * To be added to the existing filter-utils.ts file
 */
import { ListEntryFilters } from "../api/attio-operations.js";
import { DateRange, NumericRange } from "../types/attio.js";
/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
    [attributeSlug: string]: {
        [condition: string]: any;
    };
};
/**
 * Creates a date range filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createDateRangeFilter(attributeSlug: string, dateRange: DateRange): ListEntryFilters;
/**
 * Creates a numeric filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export declare function createNumericFilter(attributeSlug: string, range: NumericRange): ListEntryFilters;
//# sourceMappingURL=filter-utils-additions.d.ts.map