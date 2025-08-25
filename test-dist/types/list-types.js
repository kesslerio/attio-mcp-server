/**
 * Type definitions for list operations
 * Created as part of TypeScript 'any' reduction initiative (Issue #502)
 */
/**
 * Type guard for list membership
 */
export function isListMembership(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'listId' in value &&
        'listName' in value &&
        'entryId' in value);
}
/**
 * Type guard for list entry filters
 */
export function isListEntryFilters(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'filters' in value &&
        Array.isArray(value.filters));
}
/**
 * Safely extract list entry values
 */
export function extractListEntryValues(entry) {
    if (typeof entry !== 'object' || entry === null) {
        return {};
    }
    const obj = entry;
    // Check for common value field names
    if (obj.values && typeof obj.values === 'object') {
        return obj.values;
    }
    if (obj.entryValues && typeof obj.entryValues === 'object') {
        return obj.entryValues;
    }
    // If no specific values field, return the object itself (minus metadata)
    const { id, listId, entryId, ...values } = obj;
    return values;
}
/**
 * Helper to check if error has axios-like response
 */
export function hasErrorResponse(error) {
    return typeof error === 'object' && error !== null && 'response' in error;
}
