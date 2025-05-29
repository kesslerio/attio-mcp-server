/**
 * Utility functions for working with Attio records and responses
 * Provides functions for processing list entries, extracting record information,
 * and interacting with the Attio API.
 */
import { AttioListEntry } from '../types/attio.js';
import {
  transformFiltersToApiFormat,
  createDateRangeFilter,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createLastInteractionFilter,
  createActivityFilter,
  createNumericFilter,
  FILTER_ATTRIBUTES,
} from './filters/index.js';

// Re-export filter utilities for backwards compatibility
export {
  transformFiltersToApiFormat,
  createDateRangeFilter,
  createCreatedDateFilter,
  createModifiedDateFilter,
  createLastInteractionFilter,
  createActivityFilter,
  createNumericFilter,
};

// API parameter constants for better maintainability
export const API_PARAMS = {
  EXPAND: 'expand',
  RECORD: 'record',
  LIMIT: 'limit',
  OFFSET: 'offset',
  LIST_ID: 'list_id',
};

// Re-export attribute slugs for backwards compatibility
export const ATTRIBUTE_SLUGS = FILTER_ATTRIBUTES;

/**
 * Extracts and ensures record_id is properly populated in list entries
 *
 * @param entries - Raw list entries from API response
 * @returns Processed list entries with record_id correctly populated
 */
export function processListEntries(
  entries: AttioListEntry[]
): AttioListEntry[] {
  return entries.map((entry) => {
    // Debug logging in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[processListEntries] Processing entry:`, {
        entryId: entry.id?.entry_id || 'unknown',
        hasRecordId: !!entry.record_id,
        hasRecord: !!entry.record,
        hasParentRecordId: !!entry.parent_record_id,
        valueKeys: entry.values ? Object.keys(entry.values) : [],
      });
    }

    // If record_id is already defined and non-empty, no processing needed
    if (
      entry.record_id &&
      typeof entry.record_id === 'string' &&
      entry.record_id.trim() !== ''
    ) {
      return entry;
    }

    // Enhanced record_id extraction from multiple possible locations
    let recordId: string | undefined;

    // Option 1: Direct parent_record_id property
    if (entry.parent_record_id) {
      recordId = entry.parent_record_id;
    }
    // Option 2: Nested in record object
    else if (entry.record?.id?.record_id) {
      recordId = entry.record.id.record_id;
    }
    // Option 3: Nested in values.record_id
    else if (
      entry.values &&
      typeof entry.values === 'object' &&
      'record_id' in entry.values
    ) {
      const recordIdValue = entry.values.record_id;
      if (Array.isArray(recordIdValue) && recordIdValue.length > 0) {
        // Handle array of values with possible value property
        if (recordIdValue[0].value) {
          recordId = recordIdValue[0].value;
        } else if (typeof recordIdValue[0] === 'string') {
          recordId = recordIdValue[0];
        }
      } else if (typeof recordIdValue === 'string') {
        recordId = recordIdValue;
      }
    }
    // Option 4: Nested in values.record
    else if (
      entry.values &&
      typeof entry.values === 'object' &&
      'record' in entry.values
    ) {
      const valuesWithRecord = entry.values as {
        record?: { id?: { record_id?: string } };
      };
      if (valuesWithRecord.record?.id?.record_id) {
        recordId = valuesWithRecord.record.id.record_id;
      }
    }
    // Option 5: Check for reference_id property
    else if (entry.reference_id) {
      recordId = entry.reference_id;
    }
    // Option 6: Check for object_id property
    else if (entry.object_id) {
      recordId = entry.object_id;
    }
    // Option 7: Search all properties for anything ending with _record_id
    else {
      const possibleKeys = Object.keys(entry);
      for (const key of possibleKeys) {
        if (
          key.endsWith('_record_id') &&
          typeof entry[key] === 'string' &&
          entry[key]
        ) {
          recordId = entry[key] as string;
          break;
        }
      }
    }

    // Option 8: If record object exists, look for record.reference_id or record.record_id
    if (!recordId && entry.record) {
      if (entry.record.reference_id) {
        recordId = entry.record.reference_id;
      } else if (entry.record.record_id) {
        recordId = entry.record.record_id;
      } else if (entry.record.id) {
        // Various id object patterns
        const idObj = entry.record.id;
        if (typeof idObj === 'string') {
          recordId = idObj;
        } else if (idObj.record_id) {
          recordId = idObj.record_id;
        } else if (idObj.id && typeof idObj.id === 'string') {
          recordId = idObj.id;
        } else if (
          idObj.reference_id &&
          typeof idObj.reference_id === 'string'
        ) {
          recordId = idObj.reference_id;
        }
      }
    }

    // If a record_id was found, return updated entry
    if (recordId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[processListEntries] Found record_id: ${recordId} for entry ${
            entry.id?.entry_id || 'unknown'
          }`
        );
      }
      return {
        ...entry,
        record_id: recordId,
      };
    }

    // Additional fallback: Check if record has a uri property
    if (entry.record?.uri) {
      const uriParts = entry.record.uri.split('/');
      if (uriParts.length > 0) {
        recordId = uriParts[uriParts.length - 1];

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[processListEntries] Extracted record_id ${recordId} from URI: ${entry.record.uri}`
          );
        }

        return {
          ...entry,
          record_id: recordId,
        };
      }
    }

    // Unable to find record_id, log warning and return entry with a placeholder
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[processListEntries] Could not extract record_id for entry ${
          entry.id?.entry_id || 'unknown'
        }`
      );
    }

    return {
      ...entry,
      record_id: 'record-id-unavailable',
    };
  });
}

/**
 * Safely extracts record name and type from a list entry if available
 *
 * @param entry - List entry that may contain record data
 * @returns An object with record name and type or empty values if not available
 */
export function getRecordNameFromEntry(entry: AttioListEntry): {
  name: string;
  type: string;
} {
  const defaultResult = { name: '', type: '' };

  // If no record data is available, return default
  if (!entry.record || !entry.record.values) {
    return defaultResult;
  }

  // Try to determine the record type based on available fields
  // Companies typically have industry or website fields, people typically have email or phone
  const isPerson =
    'email' in entry.record.values || 'phone' in entry.record.values;
  const isCompany =
    'industry' in entry.record.values || 'website' in entry.record.values;

  // Set the record type based on detected fields
  let recordType = '';
  if (isPerson && !isCompany) {
    recordType = 'Person';
  } else if (isCompany && !isPerson) {
    recordType = 'Company';
  } else if (entry.record.object_slug) {
    // If we have an object_slug, use it to determine type
    recordType =
      entry.record.object_slug === 'people'
        ? 'Person'
        : entry.record.object_slug === 'companies'
          ? 'Company'
          : '';
  }

  // Extract name from the record values
  const nameValues = entry.record.values.name;
  let recordName = '';
  if (
    Array.isArray(nameValues) &&
    nameValues.length > 0 &&
    'value' in nameValues[0]
  ) {
    recordName = nameValues[0].value || '';
  }

  return {
    name: recordName,
    type: recordType,
  };
}
