/**
 * Utility functions for working with Attio records and responses
 * Provides functions for processing list entries, extracting record information,
 * and transforming filters to Attio API format.
 */
import { AttioListEntry } from "../types/attio.js";
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
//# sourceMappingURL=record-utils.d.ts.map