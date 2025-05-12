/**
 * Utility functions for working with Attio records and responses
 */
import { AttioListEntry } from "../types/attio.js";

// API parameter constants for better maintainability
export const API_PARAMS = {
  EXPAND: "expand",
  RECORD: "record",
  LIMIT: "limit",
  OFFSET: "offset",
  LIST_ID: "list_id"
};

/**
 * Extracts and ensures record_id is properly populated in list entries
 * 
 * @param entries - Raw list entries from API response
 * @returns Processed list entries with record_id correctly populated
 */
export function processListEntries(entries: AttioListEntry[]): AttioListEntry[] {
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
      if (
        key.endsWith('_record_id') && 
        typeof entry[key] === 'string' && 
        entry[key]
      ) {
        return {
          ...entry,
          record_id: entry[key] as string
        };
      }
    }
    
    // Unable to find record_id, return the entry as-is
    return entry;
  });
}

/**
 * Safely extracts record name from a list entry if available
 * 
 * @param entry - List entry that may contain record data
 * @returns Record name or empty string if not available
 */
export function getRecordNameFromEntry(entry: AttioListEntry): string {
  if (!entry.record || !entry.record.values) {
    return '';
  }
  
  const nameValues = entry.record.values.name;
  if (Array.isArray(nameValues) && nameValues.length > 0 && 'value' in nameValues[0]) {
    return nameValues[0].value || '';
  }
  
  return '';
}