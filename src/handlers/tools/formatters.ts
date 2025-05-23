/**
 * Result formatting module - handles transformation and formatting of tool results
 */
import { AttioRecord, AttioListEntry, AttioValue } from "../../types/attio.js";
import { processListEntries } from "../../utils/record-utils.js";
import { safeJsonStringify, sanitizeMcpResponse } from "../../utils/json-serializer.js";

/**
 * Safely extract value from record attributes
 */
function getAttributeValue(record: AttioRecord | undefined, fieldName: string): string {
  if (!record?.values) return 'Unknown';
  
  const fieldValue = record.values[fieldName] as AttioValue<string>[] | undefined;
  return fieldValue?.[0]?.value || 'Unknown';
}

/**
 * Format search results for display
 * 
 * @param results - Array of search results
 * @param resourceType - The type of resource being searched
 * @returns Formatted string output
 */
export function formatSearchResults(results: AttioRecord[], resourceType: string): string {
  if (!results || results.length === 0) {
    return `No ${resourceType} found.`;
  }
  
  return results.map((record, index) => {
    const name = getAttributeValue(record, 'name');
    const id = record.id?.record_id || 'Unknown ID';
    return `${index + 1}. ${name} (ID: ${id})`;
  }).join('\n');
}

/**
 * Format record details for display
 * 
 * @param record - The record to format
 * @returns Formatted string output
 */
export function formatRecordDetails(record: AttioRecord): string {
  if (!record) {
    return 'No record found.';
  }
  
  const attributes = record.attributes || ({} as Record<string, any>);
  const formattedAttrs = Object.entries(attributes).map(([key, attr]) => {
    const value = (attr as any).value || 'N/A';
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
export function formatListEntries(entries: AttioListEntry[]): string {
  if (!entries || entries.length === 0) {
    return 'No entries found.';
  }
  
  const processedEntries = processListEntries(entries);
  
  return processedEntries.map((entry, index) => {
    const record = entry.record;
    const name = getAttributeValue(record, 'name');
    const entryId = entry.id?.entry_id || 'Unknown Entry ID';
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
export function formatBatchResults(result: any, operation: string): string {
  const summary = result.summary;
  const details = result.results.map((r: any) => 
    r.success 
      ? `✅ Record ${r.id}: ${operation} successfully`
      : `❌ Record ${r.id}: Failed - ${r.error?.message || 'Unknown error'}`
  ).join('\n');
  
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
export function formatResponse(content: string | any, isError: boolean = false) {
  // Handle non-string content by converting it to a string
  let formattedContent: string;
  
  if (typeof content === 'string') {
    formattedContent = content;
  } else if (content === undefined || content === null) {
    // Prevent "undefined" or "null" from being returned as response content
    formattedContent = isError 
      ? 'An unknown error occurred' 
      : 'Operation completed successfully, but no content was returned';
  } else {
    try {
      // Try to convert the content to a string representation using safe serialization
      formattedContent = typeof content === 'object' 
        ? safeJsonStringify(content, { maxDepth: 6, includeStackTraces: false })
        : String(content);
    } catch (error) {
      if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        console.error('[formatResponse] Error converting content to string:', error);
      }
      formattedContent = 'Error: Content could not be serialized';
    }
  }
  
  // Ensure we never return empty content
  if (!formattedContent) {
    formattedContent = isError 
      ? 'An unknown error occurred' 
      : 'Operation completed successfully';
  }
  
  const response = {
    content: [
      {
        type: "text",
        text: formattedContent,
      },
    ],
    isError,
  };
  
  // Sanitize the final response to ensure it's MCP-compatible
  return sanitizeMcpResponse(response);
}