/**
 * Filter utility functions for working with Attio API filters
 * Provides functions for creating and transforming filters for various attributes
 * with support for date ranges, numeric ranges, and activity filtering.
 */
import { DateRange, NumericRange, InteractionType, ActivityFilter } from "../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../api/attio-operations.js";
/**
 * Attribute constants for better code readability and consistency
 */
export declare const FILTER_ATTRIBUTES: {
    CREATED_AT: string;
    UPDATED_AT: string;
    LAST_INTERACTION: string;
    INTERACTION_TYPE: string;
    EMAIL: string;
    PHONE: string;
    NAME: string;
    WEBSITE: string;
    INDUSTRY: string;
    REVENUE: string;
    EMPLOYEE_COUNT: string;
};
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
 * Special case field-operator mappings and handling flags
 */
export declare const FIELD_SPECIAL_HANDLING: Record<string, any>;
/**
 * Validates a filter structure for basic required properties
 *
 * @param filter - The filter to validate
 * @returns True if filter is valid, false otherwise
 */
export declare function validateFilterStructure(filter: ListEntryFilter): boolean;
/**
 * Transforms list entry filters to the format expected by the Attio API
 * This function handles both simple filters and advanced filters with logical operators
 *
 * @param filters - Filter configuration from the MCP API
 * @param validateConditions - Whether to validate condition types (default: true)
 * @returns Transformed filter object for Attio API
 * @throws FilterValidationError if validation fails
 */
export declare function transformFiltersToApiFormat(filters: ListEntryFilters | undefined, validateConditions?: boolean): {
    filter?: AttioApiFilter;
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
 * Creates a filter for records based on their creation date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters;
/**
 * Creates a filter for records based on their last modification date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters;
/**
 * Creates a filter for records based on their last interaction date
 * Optionally filtered by interaction type (email, calendar, etc.)
 *
 * @param dateRange - Date range specification
 * @param interactionType - Optional type of interaction to filter by
 * @returns Configured filter object
 */
export declare function createLastInteractionFilter(dateRange: DateRange, interactionType?: InteractionType): ListEntryFilters;
/**
 * Creates a combined activity filter including date range and interaction type
 *
 * @param activityFilter - Activity filter configuration
 * @returns Configured filter object
 */
export declare function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters;
/**
 * Creates a numeric filter for filtering by number values
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification with min, max, or equals
 * @returns Configured filter object
 */
export declare function createNumericFilter(attributeSlug: string, range: NumericRange): ListEntryFilters;
/**
 * Creates a revenue filter for companies
 *
 * @param range - Revenue range in numeric form
 * @returns Configured filter object
 */
export declare function createRevenueFilter(range: NumericRange): ListEntryFilters;
/**
 * Creates an employee count filter for companies
 *
 * @param range - Employee count range in numeric form
 * @returns Configured filter object
 */
export declare function createEmployeeCountFilter(range: NumericRange): ListEntryFilters;
/**
 * Creates a filter for B2B Segment (type_persona)
 *
 * @param value - B2B Segment value to filter by
 * @returns Configured filter object
 */
export declare function createB2BSegmentFilter(value: string): ListEntryFilters;
/**
 * Creates a simple equals filter for any attribute
 *
 * @param attributeSlug - The attribute to filter on
 * @param value - The exact value to match
 * @returns Configured filter object
 */
export declare function createEqualsFilter(attributeSlug: string, value: any): ListEntryFilters;
/**
 * Creates a simple contains filter for text attributes
 *
 * @param attributeSlug - The attribute to filter on
 * @param value - The text to search for
 * @returns Configured filter object
 */
export declare function createContainsFilter(attributeSlug: string, value: string): ListEntryFilters;
/**
 * Combines multiple filters with AND logic
 *
 * @param filters - Array of filters to combine
 * @returns Combined filter with AND logic
 */
export declare function combineFiltersWithAnd(...filters: ListEntryFilters[]): ListEntryFilters;
/**
 * Combines multiple filters with OR logic
 *
 * @param filters - Array of filters to combine
 * @returns Combined filter with OR logic
 */
export declare function combineFiltersWithOr(...filters: ListEntryFilters[]): ListEntryFilters;
//# sourceMappingURL=filter-utils.d.ts.map