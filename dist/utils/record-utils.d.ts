/**
 * Utility functions for working with Attio records and responses
 * Provides functions for processing list entries, extracting record information,
 * and transforming filters to Attio API format.
 */
import { AttioListEntry, DateRange, NumericRange, InteractionType, ActivityFilter } from "../types/attio.js";
import { ListEntryFilters } from "../api/attio-operations.js";
export declare const API_PARAMS: {
    EXPAND: string;
    RECORD: string;
    LIMIT: string;
    OFFSET: string;
    LIST_ID: string;
};
/**
 * Extracts and ensures record_id is properly populated in list entries
 *
 * @param entries - Raw list entries from API response
 * @returns Processed list entries with record_id correctly populated
 */
export declare function processListEntries(entries: AttioListEntry[]): AttioListEntry[];
/**
 * Safely extracts record name and type from a list entry if available
 *
 * @param entry - List entry that may contain record data
 * @returns An object with record name and type or empty values if not available
 */
export declare function getRecordNameFromEntry(entry: AttioListEntry): {
    name: string;
    type: string;
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
 * Attribute constants for better code readability and consistency
 */
export declare const ATTRIBUTE_SLUGS: {
    CREATED_AT: string;
    UPDATED_AT: string;
    LAST_INTERACTION: string;
    INTERACTION_TYPE: string;
    EMAIL: string;
    PHONE: string;
    NAME: string;
};
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
//# sourceMappingURL=record-utils.d.ts.map