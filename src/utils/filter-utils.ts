/**
 * Filter utility functions for working with Attio API filters
 * Provides functions for creating and transforming filters for various attributes
 * with support for date ranges, numeric ranges, and activity filtering.
 */
import { 
  isValidFilterCondition, 
  FilterConditionType,
  DateRange,
  NumericRange,
  InteractionType,
  ActivityFilter
} from "../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../api/attio-operations.js";
import { FilterValidationError } from "../errors/api-errors.js";
import { resolveDateRange } from "./date-utils.js";
import { createNumericRangeFilter } from "./numeric-utils.js";

/**
 * Attribute constants for better code readability and consistency
 */
export const FILTER_ATTRIBUTES = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  LAST_INTERACTION: 'last_interaction',
  INTERACTION_TYPE: 'interaction_type',
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  WEBSITE: 'website',
  INDUSTRY: 'industry',
  REVENUE: 'annual_revenue',
  EMPLOYEE_COUNT: 'employee_count'
};

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
 * Special case field-operator mappings and handling flags
 */
export const FIELD_SPECIAL_HANDLING: Record<string, any> = {
  // Special handling for B2B Segment field (type_persona)
  'type_persona': {
    // This field needs special shorthand format handling
    useShorthandFormat: true
  }
};

/**
 * Validates a filter structure for basic required properties
 * 
 * @param filter - The filter to validate
 * @returns True if filter is valid, false otherwise
 */
export function validateFilterStructure(filter: ListEntryFilter): boolean {
  if (!filter) {
    return false;
  }
  
  if (!filter.attribute || !filter.attribute.slug) {
    return false;
  }
  
  if (!filter.condition) {
    return false;
  }
  
  return true;
}

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
      // Debug log each filter
      if (process.env.NODE_ENV === 'development') {
        console.log(`[transformFiltersToApiFormat] Processing filter:`, {
          attribute: filter.attribute,
          condition: filter.condition,
          value: filter.value
        });
      }
      
      // Validate filter structure
      if (!validateFilterStructure(filter)) {
        const slugInfo = filter.attribute?.slug ? ` ${filter.attribute.slug}` : '';
        console.warn(`Invalid filter: Incomplete filter structure for${slugInfo}`, filter);
        return; // Skip this filter
      }
      
      const { slug } = filter.attribute;
      
      // Debug log the slug being processed
      if (process.env.NODE_ENV === 'development') {
        console.log(`[transformFiltersToApiFormat] Filter slug: ${slug}`);
      }
      
      // Validate condition type if enabled
      if (validateConditions && !isValidFilterCondition(filter.condition)) {
        throw new FilterValidationError(
          `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
          `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
        );
      }
      
      // Create a condition object for this individual filter
      const condition: any = {};
      
      // Check for special case handling
      if (FIELD_SPECIAL_HANDLING[slug] && FIELD_SPECIAL_HANDLING[slug].useShorthandFormat) {
        // For special fields that need shorthand format (no operators)
        // This uses the Attio shorthand filter format
        
        // Log special handling in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`[OR Logic] Using shorthand filter format for field ${slug}`);
        }
        
        // Direct value assignment for shorthand format
        condition[slug] = filter.value;
      } else {
        // Standard operator handling for normal fields
        let operator = filter.condition;
        
        // Debug log the operator transformation
        if (process.env.NODE_ENV === 'development') {
          console.log(`[transformFiltersToApiFormat] Creating condition with operator:`, {
            slug,
            operator: `$${operator}`,
            value: filter.value
          });
        }
        
        // Create the condition with operator
        condition[slug] = {
          [`$${operator}`]: filter.value
        };
      }
      
      // Debug log the condition being added
      if (process.env.NODE_ENV === 'development') {
        console.log(`[transformFiltersToApiFormat] Adding condition:`, condition);
      }
      
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
    if (!validateFilterStructure(filter)) {
      const slugInfo = filter.attribute?.slug ? ` ${filter.attribute.slug}` : '';
      console.warn(`Invalid filter: Incomplete filter structure for${slugInfo}`, filter);
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
    
    // Check for special case handling
    if (FIELD_SPECIAL_HANDLING[slug] && FIELD_SPECIAL_HANDLING[slug].useShorthandFormat) {
      // For special fields that need shorthand format (no operators)
      // This uses the Attio shorthand filter format
      
      // Log special handling in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Using shorthand filter format for field ${slug}`);
      }
      
      // Direct value assignment for shorthand format
      if (!apiFilter[slug]) {
        apiFilter[slug] = filter.value;
      } else {
        console.warn(`Multiple filters for ${slug} using shorthand format will overwrite previous values`);
        apiFilter[slug] = filter.value;
      }
    } else {
      // Standard operator handling for normal fields
      let operator = filter.condition;
      
      // Initialize attribute entry if needed for operator-based filtering
      if (!apiFilter[slug]) {
        apiFilter[slug] = {};
      }
      
      // Add operator with $ prefix as required by Attio API
      apiFilter[slug][`$${operator}`] = filter.value;
    }
    
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
  try {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(`Failed to create date range filter: ${errorMessage}`);
  }
}

/**
 * Creates a filter for records based on their creation date
 * 
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter(FILTER_ATTRIBUTES.CREATED_AT, dateRange);
}

/**
 * Creates a filter for records based on their last modification date
 * 
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter(FILTER_ATTRIBUTES.UPDATED_AT, dateRange);
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
  try {
    // Basic date range filter on the last_interaction attribute
    const filters: ListEntryFilter[] = [];
    const resolvedRange = resolveDateRange(dateRange);
    
    // Add filter for start date if specified
    if (resolvedRange.start) {
      filters.push({
        attribute: { slug: FILTER_ATTRIBUTES.LAST_INTERACTION },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: resolvedRange.start
      });
    }
    
    // Add filter for end date if specified
    if (resolvedRange.end) {
      filters.push({
        attribute: { slug: FILTER_ATTRIBUTES.LAST_INTERACTION },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: resolvedRange.end
      });
    }
    
    // Add additional filter for interaction type if specified
    if (interactionType && interactionType !== InteractionType.ANY) {
      filters.push({
        attribute: { slug: FILTER_ATTRIBUTES.INTERACTION_TYPE },
        condition: FilterConditionType.EQUALS,
        value: interactionType
      });
    }
    
    return {
      filters,
      matchAny: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(`Failed to create interaction filter: ${errorMessage}`);
  }
}

/**
 * Creates a combined activity filter including date range and interaction type
 * 
 * @param activityFilter - Activity filter configuration
 * @returns Configured filter object
 */
export function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters {
  try {
    if (!activityFilter || !activityFilter.dateRange) {
      throw new Error('Activity filter must include a date range');
    }
    
    return createLastInteractionFilter(
      activityFilter.dateRange,
      activityFilter.interactionType
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(`Failed to create activity filter: ${errorMessage}`);
  }
}

/**
 * Creates a numeric filter for filtering by number values
 * 
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification with min, max, or equals
 * @returns Configured filter object
 */
export function createNumericFilter(
  attributeSlug: string,
  range: NumericRange
): ListEntryFilters {
  try {
    return createNumericRangeFilter(attributeSlug, range);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(`Failed to create numeric filter for ${attributeSlug}: ${errorMessage}`);
  }
}

/**
 * Creates a revenue filter for companies
 * 
 * @param range - Revenue range in numeric form
 * @returns Configured filter object
 */
export function createRevenueFilter(range: NumericRange): ListEntryFilters {
  return createNumericFilter(FILTER_ATTRIBUTES.REVENUE, range);
}

/**
 * Creates an employee count filter for companies
 * 
 * @param range - Employee count range in numeric form
 * @returns Configured filter object
 */
export function createEmployeeCountFilter(range: NumericRange): ListEntryFilters {
  return createNumericFilter(FILTER_ATTRIBUTES.EMPLOYEE_COUNT, range);
}

/**
 * Creates a filter for B2B Segment (type_persona)
 * 
 * @param value - B2B Segment value to filter by
 * @returns Configured filter object
 */
export function createB2BSegmentFilter(
  value: string
): ListEntryFilters {
  // Using a simple equals filter that will be transformed using the shorthand format
  return {
    filters: [
      {
        attribute: { slug: 'type_persona' },
        condition: FilterConditionType.EQUALS, // This won't be used for type_persona due to shorthand format
        value
      }
    ],
    matchAny: false
  };
}

/**
 * Creates a simple equals filter for any attribute
 * 
 * @param attributeSlug - The attribute to filter on
 * @param value - The exact value to match
 * @returns Configured filter object
 */
export function createEqualsFilter(
  attributeSlug: string,
  value: any
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.EQUALS,
        value
      }
    ],
    matchAny: false
  };
}

/**
 * Creates a simple contains filter for text attributes
 * 
 * @param attributeSlug - The attribute to filter on
 * @param value - The text to search for
 * @returns Configured filter object
 */
export function createContainsFilter(
  attributeSlug: string,
  value: string
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.CONTAINS,
        value
      }
    ],
    matchAny: false
  };
}

/**
 * Combines multiple filters with AND logic
 * 
 * @param filters - Array of filters to combine
 * @returns Combined filter with AND logic
 */
export function combineFiltersWithAnd(...filters: ListEntryFilters[]): ListEntryFilters {
  const combinedFilters: ListEntryFilter[] = [];
  
  filters.forEach(filter => {
    if (filter.filters && filter.filters.length > 0) {
      combinedFilters.push(...filter.filters);
    }
  });
  
  return {
    filters: combinedFilters,
    matchAny: false
  };
}

/**
 * Combines multiple filters with OR logic
 * 
 * @param filters - Array of filters to combine
 * @returns Combined filter with OR logic
 */
export function combineFiltersWithOr(...filters: ListEntryFilters[]): ListEntryFilters {
  const combinedFilters: ListEntryFilter[] = [];
  
  filters.forEach(filter => {
    if (filter.filters && filter.filters.length > 0) {
      combinedFilters.push(...filter.filters);
    }
  });
  
  return {
    filters: combinedFilters,
    matchAny: true
  };
}