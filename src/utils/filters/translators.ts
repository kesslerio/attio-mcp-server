/**
 * Filter translation utilities for converting between formats
 * Handles transformation between MCP filter format and Attio API format
 */

import {
  ListEntryFilters,
  ListEntryFilter,
  AttioApiFilter,
  FilterConditionType,
  FIELD_SPECIAL_HANDLING
} from "./types.js";
import { validateFilterStructure } from "./validators.js";
import { FilterValidationError } from "../../errors/api-errors.js";
import { isValidFilterCondition } from "../../types/attio.js";

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
 */
function createOrFilterStructure(
  filters: ListEntryFilter[],
  validateConditions: boolean
): { filter?: AttioApiFilter } {
  const orConditions: any[] = [];
  
  filters.forEach(filter => {
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

/**
 * Creates an AND filter structure for the API
 * 
 * @param filters - Array of filters to combine with AND logic
 * @param validateConditions - Whether to validate condition types
 * @returns Filter object with standard AND structure
 */
function createAndFilterStructure(
  filters: ListEntryFilter[],
  validateConditions: boolean
): { filter?: AttioApiFilter } {
  const apiFilter: AttioApiFilter = {};
  let hasValidFilters = false;
  
  filters.forEach(filter => {
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