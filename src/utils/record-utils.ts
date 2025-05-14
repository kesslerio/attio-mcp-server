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
  InteractionType,
  ActivityFilter
} from "../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../api/attio-operations.js";
import { FilterValidationError } from "../errors/api-errors.js";
import { resolveDateRange } from "./date-utils.js";

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
 * Attribute constants for better code readability and consistency
 */
export const ATTRIBUTE_SLUGS = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  LAST_INTERACTION: 'last_interaction',
  INTERACTION_TYPE: 'interaction_type',
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name'
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
      
      // Create a condition object for this individual filter
      const condition: any = {};
      condition[slug] = {
        [`$${filter.condition}`]: filter.value
      };
      
      // Add to the OR conditions array
      orConditions.push(condition);
    });
    
    // Only return the $or structure if we have valid conditions
    if (orConditions.length > 0) {
      return {
        filter: { "$or": orConditions }
      };
    }
    
    return {}; // No valid conditions
  }
  
  // Standard AND logic - similar to the original implementation
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
    
    // Add condition with $ prefix as required by Attio API
    apiFilter[slug][`$${filter.condition}`] = filter.value;
    hasValidFilters = true;
  });
  
  // Return the filter object only if valid filters were found
  return hasValidFilters ? { filter: apiFilter } : {};
}

/**
 * Creates a date range filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createDateRangeFilter(
  attributeSlug: string,
  dateRange: DateRange
): ListEntryFilters {
  // Resolve any relative dates to absolute ISO strings
  const resolvedRange = resolveDateRange(dateRange);
  const filters: ListEntryFilter[] = [];
  
  // Add filter for start date if specified (using greater than or equal)
  if (resolvedRange.start) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: resolvedRange.start
    });
  }
  
  // Add filter for end date if specified (using less than or equal)
  if (resolvedRange.end) {
    filters.push({
      attribute: { slug: attributeSlug },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: resolvedRange.end
    });
  }
  
  return {
    filters,
    // When both start and end are specified, we want records that match both (AND logic)
    matchAny: false
  };
}

/**
 * Creates a filter for records based on their creation date
 * 
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter(ATTRIBUTE_SLUGS.CREATED_AT, dateRange);
}

/**
 * Creates a filter for records based on their last modification date
 * 
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter(ATTRIBUTE_SLUGS.UPDATED_AT, dateRange);
}

/**
 * Creates a filter for records based on their last interaction date
 * Optionally filtered by interaction type (email, calendar, etc.)
 * 
 * @param dateRange - Date range specification
 * @param interactionType - Optional type of interaction to filter by
 * @returns Configured filter object
 */
export function createLastInteractionFilter(
  dateRange: DateRange,
  interactionType?: InteractionType
): ListEntryFilters {
  // Basic date range filter on the last_interaction attribute
  const filters: ListEntryFilter[] = [];
  const resolvedRange = resolveDateRange(dateRange);
  
  // Add filter for start date if specified
  if (resolvedRange.start) {
    filters.push({
      attribute: { slug: ATTRIBUTE_SLUGS.LAST_INTERACTION },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: resolvedRange.start
    });
  }
  
  // Add filter for end date if specified
  if (resolvedRange.end) {
    filters.push({
      attribute: { slug: ATTRIBUTE_SLUGS.LAST_INTERACTION },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: resolvedRange.end
    });
  }
  
  // Add additional filter for interaction type if specified
  if (interactionType && interactionType !== InteractionType.ANY) {
    filters.push({
      attribute: { slug: ATTRIBUTE_SLUGS.INTERACTION_TYPE },
      condition: FilterConditionType.EQUALS,
      value: interactionType
    });
  }
  
  return {
    filters,
    matchAny: false
  };
}

/**
 * Creates a combined activity filter including date range and interaction type
 * 
 * @param activityFilter - Activity filter configuration
 * @returns Configured filter object
 */
export function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters {
  return createLastInteractionFilter(
    activityFilter.dateRange,
    activityFilter.interactionType
  );
}