/**
 * Utility functions for working with Attio records and responses
 * Provides functions for processing list entries, extracting record information,
 * and transforming filters to Attio API format.
 */
import { 
  AttioListEntry, 
  isValidFilterCondition, 
  FilterConditionType,
  DateRange,
  isDateRange
} from "../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../api/attio-operations.js";
import { FilterValidationError } from "../errors/api-errors.js";
import { normalizeDateRange } from "./date-utils.js";

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
 * Safely extracts record name and type from a list entry if available
 * 
 * @param entry - List entry that may contain record data
 * @returns An object with record name and type or empty values if not available
 */
export function getRecordNameFromEntry(entry: AttioListEntry): { name: string; type: string } {
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
  } else if (isCompany && !isPerson) {
    recordType = 'Company';
  } else if (entry.record.object_slug) {
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

/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
  [attributeSlug: string]: {
    [condition: string]: any
  }
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
export function transformFiltersToApiFormat(
  filters: ListEntryFilters | undefined,
  validateConditions: boolean = true
): { filter?: AttioApiFilter } {
  // If no filters provided, return empty object
  if (!filters || !filters.filters || filters.filters.length === 0) {
    return {};
  }
  
  // Determine if we need to use the $or operator based on matchAny
  // matchAny: true = use $or logic, matchAny: false (or undefined) = use standard AND logic
  const useOrLogic = filters.matchAny === true;
  
  // For OR logic, we need a completely different structure with filter objects in an array
  if (useOrLogic) {
    // Create array of condition objects for $or
    const orConditions: any[] = [];
    
    // Process each filter to create individual condition objects
    filters.filters.forEach(filter => {
      // Validate filter structure
      if (!filter.attribute || !filter.attribute.slug) {
        console.warn(`Invalid filter: Missing attribute slug`, filter);
        return; // Skip this filter
      }
      
      if (!filter.condition) {
        console.warn(`Invalid filter: Missing condition for attribute ${filter.attribute.slug}`, filter);
        return; // Skip this filter
      }
      
      const { slug } = filter.attribute;
      
      // Validate condition type if enabled
      if (validateConditions && !isValidFilterCondition(filter.condition)) {
        throw new FilterValidationError(
          `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
          `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
        );
      }
      
      // Special handling for the BETWEEN condition
      if (filter.condition === FilterConditionType.BETWEEN && isDateRange(filter.value)) {
        // For BETWEEN, create separate conditions for start and end dates
        const dateRange = filter.value as DateRange;
        const normalizedRange = normalizeDateRange(dateRange);
        
        // Create a combined condition for the date range
        const rangeCondition: any = {};
        
        // Add conditions based on available range boundaries
        if (normalizedRange.start && normalizedRange.end) {
          // Both start and end are specified - create a nested AND condition
          rangeCondition[slug] = {
            "$and": [
              { "$greater_than_or_equals": normalizedRange.start },
              { "$less_than_or_equals": normalizedRange.end }
            ]
          };
        } else if (normalizedRange.start) {
          // Only start date specified
          rangeCondition[slug] = {
            "$greater_than_or_equals": normalizedRange.start
          };
        } else if (normalizedRange.end) {
          // Only end date specified
          rangeCondition[slug] = {
            "$less_than_or_equals": normalizedRange.end
          };
        }
        
        // Add to the OR conditions array if we have a valid range condition
        if (Object.keys(rangeCondition[slug]).length > 0) {
          orConditions.push(rangeCondition);
        }
      } else {
        // Standard condition handling
        const condition: any = {};
        condition[slug] = {
          [`$${filter.condition}`]: filter.value
        };
        
        // Add to the OR conditions array
        orConditions.push(condition);
      }
    });
    
    // Only return the $or structure if we have valid conditions
    if (orConditions.length > 0) {
      return {
        filter: { "$or": orConditions }
      };
    }
    
    return {}; // No valid conditions
  }
  
  // Standard AND logic with enhanced support for date ranges
  const apiFilter: AttioApiFilter = {};
  let hasValidFilters = false;
  
  // Process each filter
  filters.filters.forEach(filter => {
    // Validate filter structure
    if (!filter.attribute || !filter.attribute.slug) {
      console.warn(`Invalid filter: Missing attribute slug`, filter);
      return; // Skip this filter
    }
    
    if (!filter.condition) {
      console.warn(`Invalid filter: Missing condition for attribute ${filter.attribute.slug}`, filter);
      return; // Skip this filter
    }
    
    const { slug } = filter.attribute;
    
    // Validate condition type if enabled
    if (validateConditions && !isValidFilterCondition(filter.condition)) {
      throw new FilterValidationError(
        `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
        `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
      );
    }
    
    // Initialize attribute entry if needed
    if (!apiFilter[slug]) {
      apiFilter[slug] = {};
    }
    
    // Special handling for date range and numeric range conditions
    if (filter.condition === FilterConditionType.BETWEEN) {
      // For date ranges
      if (isDateRange(filter.value)) {
        const dateRange = filter.value as DateRange;
        const normalizedRange = normalizeDateRange(dateRange);
        
        // Add start and end date conditions
        if (normalizedRange.start) {
          apiFilter[slug]["$greater_than_or_equals"] = normalizedRange.start;
        }
        
        if (normalizedRange.end) {
          apiFilter[slug]["$less_than_or_equals"] = normalizedRange.end;
        }
      }
      // For numeric ranges (assuming the value is an object with min and max properties)
      else if (typeof filter.value === 'object' && filter.value !== null) {
        const range = filter.value as { min?: number; max?: number };
        
        if (range.min !== undefined) {
          apiFilter[slug]["$greater_than_or_equals"] = range.min;
        }
        
        if (range.max !== undefined) {
          apiFilter[slug]["$less_than_or_equals"] = range.max;
        }
      }
    }
    // Handle before date condition
    else if (filter.condition === FilterConditionType.BEFORE) {
      apiFilter[slug]["$less_than_or_equals"] = filter.value;
    }
    // Handle after date condition
    else if (filter.condition === FilterConditionType.AFTER) {
      apiFilter[slug]["$greater_than_or_equals"] = filter.value;
    }
    // Standard condition handling
    else {
      apiFilter[slug][`$${filter.condition}`] = filter.value;
    }
    
    hasValidFilters = true;
  });
  
  // Return the filter object only if valid filters were found
  return hasValidFilters ? { filter: apiFilter } : {};
}

/**
 * Creates a date range filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on
 * @param dateRange - Date range object with start and/or end dates
 * @returns ListEntryFilters object configured for date range filtering
 */
export function createDateRangeFilter(
  attributeSlug: string,
  dateRange: DateRange
): ListEntryFilters {
  // Normalize the date range
  const normalizedRange = normalizeDateRange(dateRange);
  const filters: ListEntryFilter[] = [];
  
  // Add start date filter if provided
  if (normalizedRange.start) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: normalizedRange.start
    });
  }
  
  // Add end date filter if provided
  if (normalizedRange.end) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: normalizedRange.end
    });
  }
  
  return {
    filters,
    // Use AND logic for date ranges (both start and end conditions must be met)
    matchAny: false
  };
}

/**
 * Creates a "before date" filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on
 * @param date - Date string or relative date
 * @returns ListEntryFilters object configured for "before date" filtering
 */
export function createBeforeDateFilter(
  attributeSlug: string,
  date: string | DateRange
): ListEntryFilters {
  // If a date range is provided, use only the end date
  if (isDateRange(date)) {
    return createDateRangeFilter(attributeSlug, { end: date.end });
  }
  
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: date
      }
    ]
  };
}

/**
 * Creates an "after date" filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on
 * @param date - Date string or relative date
 * @returns ListEntryFilters object configured for "after date" filtering
 */
export function createAfterDateFilter(
  attributeSlug: string,
  date: string | DateRange
): ListEntryFilters {
  // If a date range is provided, use only the start date
  if (isDateRange(date)) {
    return createDateRangeFilter(attributeSlug, { start: date.start });
  }
  
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: date
      }
    ]
  };
}

/**
 * Creates a numeric range filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns ListEntryFilters object configured for numeric range filtering
 */
export function createNumericRangeFilter(
  attributeSlug: string,
  min?: number,
  max?: number
): ListEntryFilters {
  const filters: ListEntryFilter[] = [];
  
  // Add minimum value filter if provided
  if (min !== undefined) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: min
    });
  }
  
  // Add maximum value filter if provided
  if (max !== undefined) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: max
    });
  }
  
  return {
    filters,
    // Use AND logic for numeric ranges (both min and max conditions must be met)
    matchAny: false
  };
}