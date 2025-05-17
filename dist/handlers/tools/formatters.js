import { processListEntries } from "../../utils/record-utils.js";
/**
 * Format search results for display
 *
 * @param results - Array of search results
 * @param resourceType - The type of resource being searched
 * @returns Formatted string output
 */
export function formatSearchResults(results, resourceType) {
    if (!results || results.length === 0) {
        return `No ${resourceType} found.`;
    }
    return results.map((record, index) => {
        const attributes = record.attributes || {};
        const name = attributes.name?.value ?? 'Unknown';
        const id = record.id?.record_id || record.recordId || 'Unknown ID';
        return `${index + 1}. ${name} (ID: ${id})`;
    }).join('\n');
}
/**
 * Format record details for display
 *
 * @param record - The record to format
 * @returns Formatted string output
 */
export function formatRecordDetails(record) {
    if (!record) {
        return 'No record found.';
    }
    const attributes = record.attributes || {};
    const formattedAttrs = Object.entries(attributes).map(([key, attr]) => {
        const value = attr.value || 'N/A';
        return `${key}: ${value}`;
    }).join('\n');
    return `Record Details:\n${formattedAttrs}`;
}
/**
 * Format list entries for display
 *
 * @param entries - Array of list entries
 * @returns Formatted string output
 */
export function formatListEntries(entries) {
    if (!entries || entries.length === 0) {
        return 'No entries found.';
    }
    const processedEntries = processListEntries(entries);
    return processedEntries.map((entry, index) => {
        const record = entry.record;
        const attributes = record?.attributes || {};
        const name = attributes.name?.value ?? 'Unknown';
        const entryId = entry.entry_id;
        const recordId = record?.id?.record_id || 'Unknown ID';
        return `${index + 1}. ${name} (Entry: ${entryId}, Record: ${recordId})`;
    }).join('\n');
}
/**
 * Format batch operation results for display
 *
 * @param result - Batch operation result
 * @param operation - The type of batch operation
 * @returns Formatted string output
 */
export function formatBatchResults(result, operation) {
    const summary = result.summary;
    const details = result.results.map((r) => r.success
        ? `✅ Record ${r.id}: ${operation} successfully`
        : `❌ Record ${r.id}: Failed - ${r.error?.message || 'Unknown error'}`).join('\n');
    return `Batch ${operation} operation completed:\n` +
        `Total: ${summary.total}, Succeeded: ${summary.succeeded}, Failed: ${summary.failed}\n` +
        details;
}
/**
 * Format standard response content
 *
 * @param content - The content to format
 * @param isError - Whether this is an error response
 * @returns Formatted response object
 */
export function formatResponse(content, isError = false) {
    return {
        content: [
            {
                type: "text",
                text: content,
            },
        ],
        isError,
    };
}
//# sourceMappingURL=formatters.js.map