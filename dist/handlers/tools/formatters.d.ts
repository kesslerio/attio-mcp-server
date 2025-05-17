/**
 * Result formatting module - handles transformation and formatting of tool results
 */
import { AttioRecord, AttioListEntry } from "../../types/attio.js";
/**
 * Format search results for display
 *
 * @param results - Array of search results
 * @param resourceType - The type of resource being searched
 * @returns Formatted string output
 */
export declare function formatSearchResults(results: AttioRecord[], resourceType: string): string;
/**
 * Format record details for display
 *
 * @param record - The record to format
 * @returns Formatted string output
 */
export declare function formatRecordDetails(record: AttioRecord): string;
/**
 * Format list entries for display
 *
 * @param entries - Array of list entries
 * @returns Formatted string output
 */
export declare function formatListEntries(entries: AttioListEntry[]): string;
/**
 * Format batch operation results for display
 *
 * @param result - Batch operation result
 * @param operation - The type of batch operation
 * @returns Formatted string output
 */
export declare function formatBatchResults(result: any, operation: string): string;
/**
 * Format standard response content
 *
 * @param content - The content to format
 * @param isError - Whether this is an error response
 * @returns Formatted response object
 */
export declare function formatResponse(content: string, isError?: boolean): {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
};
//# sourceMappingURL=formatters.d.ts.map