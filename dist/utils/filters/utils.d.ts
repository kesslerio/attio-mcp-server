/**
 * General filter utility functions
 * Consolidates utilities from filter-utils.ts and filter-utils-additions.ts
 */
import { DateRange, NumericRange, FilterConditionType } from "./types.js";
/**
 * Creates a filter for records based on their creation date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createCreatedDateFilter(dateRange: DateRange): import("./types.js").ListEntryFilters;
/**
 * Creates a filter for records based on their last modification date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createModifiedDateFilter(dateRange: DateRange): import("./types.js").ListEntryFilters;
/**
 * Creates a filter for B2B Segment (type_persona)
 *
 * @param value - B2B Segment value to filter by
 * @returns Configured filter object
 */
export declare function createB2BSegmentFilter(value: string): {
    filters: {
        attribute: {
            slug: string;
        };
        condition: FilterConditionType;
        value: string;
    }[];
    matchAny: boolean;
};
/**
 * Validates if a value falls within a numeric range
 *
 * @param value - The value to check
 * @param range - The numeric range to validate against
 * @returns True if value is within range
 */
export declare function isInNumericRange(value: number, range: NumericRange): boolean;
/**
 * Checks if a date string falls within a date range
 *
 * @param dateStr - ISO date string to check
 * @param range - Date range to validate against
 * @returns True if date is within range
 */
export declare function isInDateRange(dateStr: string, range: DateRange): boolean;
/**
 * Debug logging for filter operations
 *
 * @param operation - The operation being performed
 * @param details - Additional details to log
 */
export declare function debugFilterLog(operation: string, details: any): void;
/**
 * Determines if a filter attribute represents a date field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a date field
 */
export declare function isDateAttribute(attributeSlug: string): boolean;
/**
 * Determines if a filter attribute represents a numeric field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a numeric field
 */
export declare function isNumericAttribute(attributeSlug: string): boolean;
/**
 * Determines if a filter attribute represents a text field
 *
 * @param attributeSlug - The attribute slug to check
 * @returns True if the attribute is a text field
 */
export declare function isTextAttribute(attributeSlug: string): boolean;
/**
 * Helper function to extract attribute mappings as needed
 * Re-exports builder functions as utilities for backward compatibility
 */
import { createDateRangeFilter, createEqualsFilter, createContainsFilter } from "./builders.js";
export { createDateRangeFilter, createEqualsFilter, createContainsFilter };
//# sourceMappingURL=utils.d.ts.map