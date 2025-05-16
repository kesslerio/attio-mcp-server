import { transformFiltersToApiFormat, createDateRangeFilter, createCreatedDateFilter, createModifiedDateFilter, createLastInteractionFilter, createActivityFilter, createNumericFilter, FILTER_ATTRIBUTES } from "./filter-utils.js";
// Re-export filter utilities for backwards compatibility
export { transformFiltersToApiFormat, createDateRangeFilter, createCreatedDateFilter, createModifiedDateFilter, createLastInteractionFilter, createActivityFilter, createNumericFilter };
// API parameter constants for better maintainability
export const API_PARAMS = {
    EXPAND: "expand",
    RECORD: "record",
    LIMIT: "limit",
    OFFSET: "offset",
    LIST_ID: "list_id"
};
// Re-export attribute slugs for backwards compatibility
export const ATTRIBUTE_SLUGS = FILTER_ATTRIBUTES;
/**
 * Extracts and ensures record_id is properly populated in list entries
 *
 * @param entries - Raw list entries from API response
 * @returns Processed list entries with record_id correctly populated
 */
export function processListEntries(entries) {
    return entries.map(entry => {
        // If record_id is already defined, no processing needed
        if (entry.record_id) {
            return entry;
        }
        // Try to extract record_id from the nested record structure
        if (entry.record?.id?.record_id) {
            return {
                ...entry,
                record_id: entry.record.id.record_id
            };
        }
        // If record data might be in a different nested structure
        if (entry.values?.record?.id?.record_id) {
            return {
                ...entry,
                record_id: entry.values.record.id.record_id
            };
        }
        // If we can find a record_id in another location
        const possibleKeys = Object.keys(entry);
        for (const key of possibleKeys) {
            // Check if any property ends with 'record_id' and is a string
            if (key.endsWith('_record_id') &&
                typeof entry[key] === 'string' &&
                entry[key]) {
                return {
                    ...entry,
                    record_id: entry[key]
                };
            }
        }
        // Unable to find record_id, return the entry as-is
        return entry;
    });
}
/**
 * Safely extracts record name and type from a list entry if available
 *
 * @param entry - List entry that may contain record data
 * @returns An object with record name and type or empty values if not available
 */
export function getRecordNameFromEntry(entry) {
    const defaultResult = { name: '', type: '' };
    // If no record data is available, return default
    if (!entry.record || !entry.record.values) {
        return defaultResult;
    }
    // Try to determine the record type based on available fields
    // Companies typically have industry or website fields, people typically have email or phone
    const isPerson = 'email' in entry.record.values || 'phone' in entry.record.values;
    const isCompany = 'industry' in entry.record.values || 'website' in entry.record.values;
    // Set the record type based on detected fields
    let recordType = '';
    if (isPerson && !isCompany) {
        recordType = 'Person';
    }
    else if (isCompany && !isPerson) {
        recordType = 'Company';
    }
    else if (entry.record.object_slug) {
        // If we have an object_slug, use it to determine type
        recordType = entry.record.object_slug === 'people' ? 'Person' :
            (entry.record.object_slug === 'companies' ? 'Company' : '');
    }
    // Extract name from the record values
    const nameValues = entry.record.values.name;
    let recordName = '';
    if (Array.isArray(nameValues) && nameValues.length > 0 && 'value' in nameValues[0]) {
        recordName = nameValues[0].value || '';
    }
    return {
        name: recordName,
        type: recordType
    };
}
//# sourceMappingURL=record-utils.js.map