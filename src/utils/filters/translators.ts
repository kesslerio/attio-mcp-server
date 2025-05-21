/**
 * @module translators
 * 
 * Filter translation utilities for converting between formats
 * Handles transformation between MCP filter format and Attio API format
 * 
 * This module provides:
 * - MCP to Attio API format transformation
 * - Support for AND/OR logical operators
 * - Operator conversion utilities
 * - Attribute name transformations
 * - Reverse transformation (API to MCP)
 */

// External dependencies
import { isValidFilterCondition } from "../../types/attio.js";
import { FilterValidationError } from "../../errors/api-errors.js";

// Internal module dependencies
import {
  ListEntryFilters,
  ListEntryFilter,
  AttioApiFilter,
  FilterConditionType,
  FIELD_SPECIAL_HANDLING
} from "./types.js";
import { validateFilterStructure } from "./validators.js";

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
  // If filters is undefined or null, return empty object
  if (!filters) {
    throw new FilterValidationError('Filter object is required but was undefined or null');
  }
  
  // If filters.filters is not an array, throw a specific error
  if (!Array.isArray(filters.filters)) {
    throw new FilterValidationError(
      `Invalid filter structure: 'filters' property must be an array but got ${typeof filters.filters}`
    );
  }
  
  // If filters array is empty, return empty object without error
  if (filters.filters.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[transformFiltersToApiFormat] Empty filters array provided, returning empty result');
    }
    return {};
  }
  
  // Determine if we need to use the $or operator based on matchAny
  // matchAny: true = use $or logic, matchAny: false (or undefined) = use standard AND logic
  const useOrLogic = filters.matchAny === true;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[transformFiltersToApiFormat] Using ${useOrLogic ? 'OR' : 'AND'} logic for filters`);
    console.log(`[transformFiltersToApiFormat] Processing ${filters.filters.length} filter conditions`);
  }
  
  // For OR logic, we need a completely different structure with filter objects in an array
  if (useOrLogic) {
    return createOrFilterStructure(filters.filters, validateConditions);
  }
  
  // Standard AND logic
  return createAndFilterStructure(filters.filters, validateConditions);
}

/**
 * Creates an OR filter structure for the API
 * 
 * @param filters - Array of filters to combine with OR logic
 * @param validateConditions - Whether to validate condition types
 * @returns Filter object with $or structure
 * @throws FilterValidationError for invalid filter structures or when all filters are invalid
 */
function createOrFilterStructure(
  filters: ListEntryFilter[],
  validateConditions: boolean
): { filter?: AttioApiFilter } {
  const orConditions: any[] = [];
  const invalidFilters: { index: number; reason: string; filter: any }[] = [];
  
  // First pass: validate all filters and collect any invalid ones
  filters.forEach((filter, index) => {
    // Perform basic structure validation
    if (!filter || typeof filter !== 'object') {
      invalidFilters.push({
        index,
        reason: `Filter at index ${index} is ${filter === null ? 'null' : typeof filter}`,
        filter
      });
      return; // Skip this filter
    }
    
    if (!validateFilterStructure(filter)) {
      const reason = !filter.attribute ? 'missing attribute' : 
                     !filter.attribute.slug ? 'missing attribute.slug' : 
                     !filter.condition ? 'missing condition' : 'unknown issue';
      
      invalidFilters.push({
        index,
        reason: `Invalid filter structure: ${reason}`,
        filter
      });
      return; // Skip this filter
    }
    
    // Validate condition if enabled
    if (validateConditions && !isValidFilterCondition(filter.condition)) {
      invalidFilters.push({
        index, 
        reason: `Invalid condition '${filter.condition}'`,
        filter
      });
      return; // Skip this filter
    }
  });
  
  // Log invalid filters in development mode
  if (invalidFilters.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[createOrFilterStructure] Found invalid filters:',
      invalidFilters.map(f => `Index ${f.index}: ${f.reason}`)
    );
  }
  
  // If all filters are invalid, throw a descriptive error
  if (invalidFilters.length === filters.length) {
    const errorDetails = invalidFilters.map(f => `Filter [${f.index}]: ${f.reason}`).join('; ');
    throw new FilterValidationError(
      `All filters in the OR condition are invalid. ${errorDetails}`
    );
  }
  
  // Second pass: process valid filters
  filters.forEach((filter, index) => {
    // Skip if this filter was found invalid
    if (invalidFilters.some(invalid => invalid.index === index)) {
      return;
    }
    
    // Debug log each filter
    if (process.env.NODE_ENV === 'development') {
      console.log(`[createOrFilterStructure] Processing filter ${index}:`, {
        attribute: filter.attribute,
        condition: filter.condition,
        value: filter.value
      });
    }
    
    const { slug } = filter.attribute;
    
    // Create a condition object for this individual filter
    const condition: any = {};
    
    // Check for special case handling
    if (FIELD_SPECIAL_HANDLING[slug] && FIELD_SPECIAL_HANDLING[slug].useShorthandFormat) {
      // For special fields that need shorthand format
      if (process.env.NODE_ENV === 'development') {
        console.log(`[OR Logic] Using shorthand filter format for field ${slug}`);
      }
      
      // Direct value assignment for shorthand format
      condition[slug] = filter.value;
    } else {
      // Standard operator handling for normal fields
      const operator = filter.condition;
      
      // Create the condition with operator
      condition[slug] = {
        [`$${operator}`]: filter.value
      };
    }
    
    // Add to the OR conditions array
    orConditions.push(condition);
  });
  
  // Return the $or structure with valid conditions
  if (orConditions.length > 0) {
    return {
      filter: { "$or": orConditions }
    };
  }
  
  // This shouldn't happen given the earlier check, but just in case
  return {}; 
}

/**
 * Creates an AND filter structure for the API
 * 
 * @param filters - Array of filters to combine with AND logic
 * @param validateConditions - Whether to validate condition types
 * @returns Filter object with standard AND structure
 * @throws FilterValidationError for invalid filter structures or when all filters are invalid
 */
function createAndFilterStructure(
  filters: ListEntryFilter[],
  validateConditions: boolean
): { filter?: AttioApiFilter } {
  const apiFilter: AttioApiFilter = {};
  const invalidFilters: { index: number; reason: string; filter: any }[] = [];
  
  // First pass: validate all filters and collect any invalid ones
  filters.forEach((filter, index) => {
    // Perform basic structure validation
    if (!filter || typeof filter !== 'object') {
      invalidFilters.push({
        index,
        reason: `Filter at index ${index} is ${filter === null ? 'null' : typeof filter}`,
        filter
      });
      return; // Skip this filter
    }
    
    if (!validateFilterStructure(filter)) {
      const reason = !filter.attribute ? 'missing attribute' : 
                     !filter.attribute.slug ? 'missing attribute.slug' : 
                     !filter.condition ? 'missing condition' : 'unknown issue';
      
      invalidFilters.push({
        index,
        reason: `Invalid filter structure: ${reason}`,
        filter
      });
      return; // Skip this filter
    }
    
    // Validate condition if enabled
    if (validateConditions && !isValidFilterCondition(filter.condition)) {
      invalidFilters.push({
        index, 
        reason: `Invalid condition '${filter.condition}'`,
        filter
      });
      return; // Skip this filter
    }
  });
  
  // Log invalid filters in development mode
  if (invalidFilters.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[createAndFilterStructure] Found invalid filters:',
      invalidFilters.map(f => `Index ${f.index}: ${f.reason}`)
    );
  }
  
  // If all filters are invalid, throw a descriptive error
  if (invalidFilters.length === filters.length) {
    const errorDetails = invalidFilters.map(f => `Filter [${f.index}]: ${f.reason}`).join('; ');
    throw new FilterValidationError(
      `All filters in the AND condition are invalid. ${errorDetails}`
    );
  }
  
  // Second pass: process valid filters
  let hasValidFilters = false;
  
  filters.forEach((filter, index) => {
    // Skip if this filter was found invalid
    if (invalidFilters.some(invalid => invalid.index === index)) {
      return;
    }
    
    // Debug log each filter
    if (process.env.NODE_ENV === 'development') {
      console.log(`[createAndFilterStructure] Processing filter ${index}:`, {
        attribute: filter.attribute,
        condition: filter.condition,
        value: filter.value
      });
    }
    
    const { slug } = filter.attribute;
    
    // Check for special case handling
    if (FIELD_SPECIAL_HANDLING[slug] && FIELD_SPECIAL_HANDLING[slug].useShorthandFormat) {
      // For special fields that need shorthand format
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AND Logic] Using shorthand filter format for field ${slug}`);
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
      const operator = filter.condition;
      
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
 * Converts a single filter operator to API format
 * 
 * @param operator - The operator to convert (e.g., 'equals', 'contains')
 * @returns The operator in API format (e.g., '$equals', '$contains')
 */
export function convertOperatorToApiFormat(operator: string): string {
  // Ensure the operator starts with $ for Attio API format
  return operator.startsWith('$') ? operator : `$${operator}`;
}

/**
 * Transforms attribute names if they require special handling
 * 
 * @param attributeSlug - The attribute slug to transform
 * @returns The transformed attribute name
 */
export function transformAttributeName(attributeSlug: string): string {
  // Special transformations for certain attributes
  if (attributeSlug === 'relationship') {
    return '$relationship';
  }
  
  return attributeSlug;
}

/**
 * Processes a filter value for API submission
 * Handles any special value transformations needed
 * 
 * @param value - The value to process
 * @param condition - The filter condition being used
 * @returns The processed value
 */
export function processFilterValue(value: any, condition: FilterConditionType): any {
  // Empty conditions should not have a value
  if (condition === FilterConditionType.IS_EMPTY || 
      condition === FilterConditionType.IS_NOT_EMPTY ||
      condition === FilterConditionType.IS_SET ||
      condition === FilterConditionType.IS_NOT_SET) {
    return undefined;
  }
  
  // Return value as-is for other conditions
  return value;
}

/**
 * Transforms a simple filter to API format
 * 
 * @param filter - The filter to transform
 * @returns API-formatted filter object
 */
export function transformSingleFilterToApi(filter: ListEntryFilter): AttioApiFilter {
  if (!validateFilterStructure(filter)) {
    throw new FilterValidationError('Invalid filter structure');
  }
  
  const { slug } = filter.attribute;
  const apiOperator = convertOperatorToApiFormat(filter.condition);
  const value = processFilterValue(filter.value, filter.condition as FilterConditionType);
  
  return {
    [slug]: {
      [apiOperator]: value
    }
  };
}

/**
 * Converts API filter format back to MCP filter format
 * Useful for debugging and reverse transformation
 * 
 * @param apiFilter - API format filter
 * @returns MCP format filters
 */
export function transformApiFormatToFilters(apiFilter: AttioApiFilter): ListEntryFilters {
  const filters: ListEntryFilter[] = [];
  
  // Check for $or structure
  if (apiFilter.$or && Array.isArray(apiFilter.$or)) {
    // Handle OR logic
    apiFilter.$or.forEach(condition => {
      if (condition && typeof condition === 'object') {
        Object.entries(condition).forEach(([slug, conditions]) => {
          if (conditions && typeof conditions === 'object') {
            Object.entries(conditions).forEach(([operator, value]) => {
              filters.push({
                attribute: { slug },
                condition: operator.replace('$', '') as FilterConditionType,
                value
              });
            });
          }
        });
      }
    });
    
    return {
      filters,
      matchAny: true
    };
  }
  
  // Handle standard AND logic
  Object.entries(apiFilter).forEach(([slug, conditions]) => {
    if (conditions && typeof conditions === 'object') {
      Object.entries(conditions).forEach(([operator, value]) => {
        filters.push({
          attribute: { slug },
          condition: operator.replace('$', '') as FilterConditionType,
          value
        });
      });
    }
  });
  
  return {
    filters,
    matchAny: false
  };
}