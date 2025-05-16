/**
 * Utility functions for working with Attio records and responses
 * Provides functions for processing list entries, extracting record information,
 * and interacting with the Attio API.
 */
import { AttioListEntry } from "../types/attio.js";
import { transformFiltersToApiFormat, createDateRangeFilter, createCreatedDateFilter, createModifiedDateFilter, createLastInteractionFilter, createActivityFilter, createNumericFilter } from "./filter-utils.js";
export { transformFiltersToApiFormat, createDateRangeFilter, createCreatedDateFilter, createModifiedDateFilter, createLastInteractionFilter, createActivityFilter, createNumericFilter };
export declare const API_PARAMS: {
    EXPAND: string;
    RECORD: string;
    LIMIT: string;
    OFFSET: string;
    LIST_ID: string;
};
export declare const ATTRIBUTE_SLUGS: {
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
//# sourceMappingURL=record-utils.d.ts.map