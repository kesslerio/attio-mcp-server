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
import {
  FilterValidationError,
  FilterErrorCategory,
} from '../../errors/api-errors.js';
import { FilterValue } from '../../types/api-operations.js';

// Internal module dependencies
import {
  ListEntryFilters,
  ListEntryFilter,
  AttioApiFilter,
  AttioQueryApiFilter,
  PathConstraint,
  FilterConditionType,
  FIELD_SPECIAL_HANDLING,
} from './types.js';
import { validateFilterStructure } from './validators.js';
import {
  validateFilters,
  collectInvalidFilters,
  formatInvalidFiltersError,
  ERROR_MESSAGES,
  getFilterExample,
} from './validation-utils.js';
import { isListSpecificAttribute } from './utils.js';

/**
 * Transforms list entry filters to the format expected by the Attio API
 *
 * This is the main transformation function that converts MCP filter specifications
 * into the format expected by the Attio API. It handles both AND and OR logical
 * operators and provides comprehensive validation.
 *
 * **Key Features:**
 * - Validates filter structure using centralized validation utilities
 * - Supports both AND logic (default) and OR logic (matchAny: true)
 * - Handles empty filter arrays gracefully (returns empty object)
 * - Preserves filter condition types and values
 * - Provides detailed error messages with examples on validation failure
 *
 * @param filters - Filter configuration from the MCP API (may have optional filters array)
 * @param validateConditions - Whether to validate condition types against known Attio API operators
 * @returns Transformed filter object for Attio API, or empty object if no valid filters
 * @throws FilterValidationError if validation fails with consistent error messages and examples
 *
 * @example
 * // Simple filter with a single condition
 * const simpleFilter = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Company Inc'
 *     }
 *   ]
 * };
 *
 * // Filter with OR logic between conditions
 * const orFilter = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Inc'
 *     },
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Technology'
 *     }
 *   ],
 *   matchAny: true  // Use OR logic
 * };
 *
 * // Filter with multiple conditions (AND logic by default)
 * const multipleFilter = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Inc'
 *     },
 *     {
 *       attribute: { slug: 'website' },
 *       condition: 'contains',
 *       value: '.com'
 *     }
 *   ]
 * };
 */
export function transformFiltersToApiFormat(
  filters: ListEntryFilters | undefined,
  validateConditions: boolean = true,
  isListEntryContext: boolean = false
): { filter?: AttioApiFilter } {
  // Handle undefined/null filters gracefully
  if (!filters) {
    return {};
  }

  // Check if filters has a filters property and it's an array
  if (!('filters' in filters) || !Array.isArray(filters.filters)) {
    return {};
  }

  // If filters array is empty, return empty result
  if (filters.filters.length === 0) {
    return {};
  }

  try {
    // Use the central validation utility for consistent error messages
    const validatedFilters = validateFilters(filters, validateConditions);

    // Check if filters array exists and handle undefined case
    if (!validatedFilters.filters || validatedFilters.filters.length === 0) {
      // dev-only: skip logging to avoid top-level await in non-async function
      return {};
    }
  } catch (error: unknown) {
    // Check if this is a FilterValidationError
    if (error instanceof FilterValidationError) {
      // For condition validation errors when validateConditions is true, re-throw
      if (
        validateConditions &&
        (error.message.includes('Invalid condition') ||
          error.message.includes('Invalid filter condition'))
      ) {
        throw error;
      }

      // For structure errors (missing properties), return empty result instead of throwing
      // dev-only: skip logging to avoid top-level await in non-async function
      return {};
    }

    // Re-throw non-FilterValidationError errors
    throw error;
  }

  // Re-validate for the actual processing (this should not throw since we already validated)
  const validatedFilters = validateFilters(filters, validateConditions);

  // Determine if we need to use the $or operator based on matchAny
  // matchAny: true = use $or logic, matchAny: false (or undefined) = use standard AND logic
  const useOrLogic = validatedFilters.matchAny === true;

  // dev-only: skip logging to avoid top-level await in non-async function

  // For OR logic, we need a completely different structure with filter objects in an array
  if (useOrLogic) {
    return createOrFilterStructure(
      validatedFilters.filters,
      validateConditions,
      isListEntryContext
    );
  }

  // Standard AND logic
  return createAndFilterStructure(
    validatedFilters.filters,
    validateConditions,
    isListEntryContext
  );
}

/**
 * Transforms list entry filters to the new Query API format with path and constraints
 *
 * This function creates the proper Attio Query API structure as required by Issue #523.
 * Uses path-based filtering with constraints for relationship, content, and timeframe searches.
 *
 * @param filters - Filter configuration from the MCP API
 * @param validateConditions - Whether to validate condition types
 * @returns Query API formatted filter object
 * @throws FilterValidationError if validation fails
 */
export function transformFiltersToQueryApiFormat(
  filters: ListEntryFilters | undefined,
  validateConditions: boolean = true
): AttioQueryApiFilter {
  // Handle undefined/null filters gracefully
  if (!filters) {
    return {};
  }

  // Check if filters has a filters property and it's an array
  if (!('filters' in filters) || !Array.isArray(filters.filters)) {
    return {};
  }

  // If filters array is empty, return empty result
  if (filters.filters.length === 0) {
    return {};
  }

  try {
    // Use the central validation utility for consistent error messages
    const validatedFilters = validateFilters(filters, validateConditions);

    // Check if filters array exists and handle undefined case
    if (!validatedFilters.filters || validatedFilters.filters.length === 0) {
      return {};
    }

    // Single filter case
    if (validatedFilters.filters.length === 1) {
      const filter = validatedFilters.filters[0];
      return {
        filter: {
          path: [filter.attribute.slug],
          constraints: [
            {
              operator: filter.condition,
              value: filter.value,
            },
          ],
        },
      };
    }

    // Multiple filters case
    const useOrLogic = validatedFilters.matchAny === true;

    if (useOrLogic) {
      // OR logic: create array of individual filter objects
      const orConditions = validatedFilters.filters.map((filter) => ({
        path: [filter.attribute.slug],
        constraints: [
          {
            operator: filter.condition,
            value: filter.value,
          },
        ],
      }));

      return {
        filter: {
          $or: orConditions.map((condition) => ({ filter: condition })),
        },
      };
    } else {
      // AND logic: create single filter with multiple constraints
      // For now, we'll use $and structure for multiple different attributes
      const andConditions = validatedFilters.filters.map((filter) => ({
        filter: {
          path: [filter.attribute.slug],
          constraints: [
            {
              operator: filter.condition,
              value: filter.value,
            },
          ],
        },
      }));

      return {
        filter: {
          $and: andConditions,
        },
      };
    }
  } catch (error: unknown) {
    // Check if this is a FilterValidationError
    if (error instanceof FilterValidationError) {
      // For condition validation errors when validateConditions is true, re-throw
      if (
        validateConditions &&
        (error.message.includes('Invalid condition') ||
          error.message.includes('Invalid filter condition'))
      ) {
        throw error;
      }

      // For structure errors (missing properties), return empty result instead of throwing
      return {};
    }

    // Re-throw non-FilterValidationError errors
    throw error;
  }
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
  validateConditions: boolean,
  isListEntryContext: boolean = false
): { filter?: AttioApiFilter } {
  const orConditions: any[] = [];

  // Use centralized validation utility to collect invalid filters with consistent messages
  const invalidFilters = collectInvalidFilters(filters, validateConditions);

  // Log invalid filters in development mode
  if (invalidFilters.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      '[createOrFilterStructure] Found invalid filters:',
      invalidFilters.map((f) => `Index ${f.index}: ${f.reason}`)
    );
  }

  // If all filters are invalid, throw a descriptive error with example
  if (invalidFilters.length === filters.length) {
    const errorDetails = formatInvalidFiltersError(invalidFilters);
    let errorMessage = `${ERROR_MESSAGES.ALL_FILTERS_INVALID} ${errorDetails}`;

    // Add example of valid OR filter structure
    errorMessage +=
      '\n\nExample of valid OR filter structure: \n' + getFilterExample('or');

    throw new FilterValidationError(
      errorMessage,
      FilterErrorCategory.TRANSFORMATION
    );
  }

  // Process valid filters
  filters.forEach((filter, index) => {
    // Skip if this filter was found invalid
    if (invalidFilters.some((invalid) => invalid.index === index)) {
      return;
    }

    // Debug log each filter
    if (process.env.NODE_ENV === 'development') {
      console.error(`[createOrFilterStructure] Processing filter ${index}:`, {
        attribute: filter.attribute,
        condition: filter.condition,
        value: filter.value,
      });
    }

    const { slug } = filter.attribute;

    // Create a condition object for this individual filter
    const condition: any = {};

    // Check if we're in list entry context and this is a list-specific attribute
    if (isListEntryContext && isListSpecificAttribute(slug)) {
      // For list-specific attributes, we don't need any path prefix
      // The API expects these attributes directly at the entry level
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[OR Logic] Using list-specific attribute format for field ${slug}`
        );
      }

      // List-specific attributes use direct field access
      const operator =
        filter.condition === 'equals' ? '$equals' : `$${filter.condition}`;
      condition[slug] = {
        [operator]: filter.value,
      };
    } else if (
      FIELD_SPECIAL_HANDLING[slug] &&
      FIELD_SPECIAL_HANDLING[slug].useShorthandFormat
    ) {
      // For special fields that need shorthand format
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[OR Logic] Using shorthand filter format for field ${slug}`
        );
      }

      // Direct value assignment for shorthand format
      condition[slug] = filter.value;
    } else {
      // Standard operator handling for normal fields
      const operator =
        filter.condition === 'equals' ? '$equals' : `$${filter.condition}`;

      // For parent record attributes in list context, we need to use the record path
      if (isListEntryContext && !isListSpecificAttribute(slug)) {
        condition[`record.values.${slug}`] = {
          [operator]: filter.value,
        };
      } else {
        // Standard field access for non-list contexts
        condition[slug] = {
          [operator]: filter.value,
        };
      }
    }

    // Add to the OR conditions array
    orConditions.push(condition);
  });

  // Return the $or structure with valid conditions
  if (orConditions.length > 0) {
    return {
      filter: { $or: orConditions },
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
  validateConditions: boolean,
  isListEntryContext: boolean = false
): { filter?: AttioApiFilter } {
  // Use simple merged object for AND logic instead of $and wrapper
  const mergedConditions: any = {};

  // Use centralized validation utility to collect invalid filters with consistent messages
  const invalidFilters = collectInvalidFilters(filters, validateConditions);

  // Log invalid filters in development mode
  if (invalidFilters.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      '[createAndFilterStructure] Found invalid filters:',
      invalidFilters.map((f) => `Index ${f.index}: ${f.reason}`)
    );
  }

  // If all filters are invalid, throw a descriptive error with example
  if (invalidFilters.length === filters.length) {
    const errorDetails = formatInvalidFiltersError(invalidFilters);
    let errorMessage = `${ERROR_MESSAGES.ALL_FILTERS_INVALID} ${errorDetails}`;

    // Add example of valid filter structure for AND logic (multiple conditions)
    errorMessage +=
      '\n\nExample of valid filter structure with multiple conditions: \n' +
      getFilterExample('multiple');

    throw new FilterValidationError(
      errorMessage,
      FilterErrorCategory.TRANSFORMATION
    );
  }

  // Process valid filters by merging into single object
  filters.forEach((filter, index) => {
    // Skip if this filter was found invalid
    if (invalidFilters.some((invalid) => invalid.index === index)) {
      return;
    }

    // Debug log each filter
    if (process.env.NODE_ENV === 'development') {
      console.error(`[createAndFilterStructure] Processing filter ${index}:`, {
        attribute: filter.attribute,
        condition: filter.condition,
        value: filter.value,
      });
    }

    const { slug } = filter.attribute;
    const operator =
      filter.condition === 'equals' ? '$equals' : `$${filter.condition}`;

    // Build condition object in Attio's expected format
    let fieldPath: string;

    if (isListEntryContext && isListSpecificAttribute(slug)) {
      // List-specific attributes use direct field access
      fieldPath = slug;
    } else if (isListEntryContext && !isListSpecificAttribute(slug)) {
      // Parent record attributes in list context need record path
      fieldPath = `record.values.${slug}`;
    } else {
      // Standard field access for non-list contexts
      fieldPath = slug;
    }

    // Merge condition directly into the main object (AND logic)
    mergedConditions[fieldPath] = {
      [operator]: filter.value,
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[createAndFilterStructure] Added condition for ${fieldPath}:`,
        mergedConditions[fieldPath]
      );
    }
  });

  // Return merged conditions if we have any
  if (Object.keys(mergedConditions).length === 0) {
    return {};
  }

  return { filter: mergedConditions };
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
export function processFilterValue(
  value: any,
  condition: FilterConditionType
): any {
  // Empty conditions should not have a value
  if (
    condition === FilterConditionType.IS_EMPTY ||
    condition === FilterConditionType.IS_NOT_EMPTY ||
    condition === FilterConditionType.IS_SET ||
    condition === FilterConditionType.IS_NOT_SET
  ) {
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
export function transformSingleFilterToApi(
  filter: ListEntryFilter
): AttioApiFilter {
  if (!validateFilterStructure(filter)) {
    throw new FilterValidationError(
      'Invalid filter structure',
      FilterErrorCategory.STRUCTURE
    );
  }

  const { slug } = filter.attribute;
  const apiOperator = convertOperatorToApiFormat(filter.condition);
  const value = processFilterValue(
    filter.value,
    filter.condition as FilterConditionType
  );

  return {
    [slug]: {
      [apiOperator]: value,
    },
  };
}

/**
 * Converts API filter format back to MCP filter format
 * Useful for debugging and reverse transformation
 *
 * @param apiFilter - API format filter
 * @returns MCP format filters
 */
export function transformApiFormatToFilters(
  apiFilter: AttioApiFilter
): ListEntryFilters {
  const filters: ListEntryFilter[] = [];

  // Check for $or structure
  if (apiFilter.$or && Array.isArray(apiFilter.$or)) {
    // Handle OR logic
    apiFilter.$or.forEach((condition) => {
      if (condition && typeof condition === 'object') {
        Object.entries(condition).forEach(([slug, conditions]) => {
          if (conditions && typeof conditions === 'object') {
            Object.entries(conditions).forEach(([operator, value]) => {
              filters.push({
                attribute: { slug },
                condition: operator.replace('$', '') as FilterConditionType,
                value: value as FilterValue,
              });
            });
          }
        });
      }
    });

    return {
      filters,
      matchAny: true,
    };
  }

  // Handle standard AND logic
  Object.entries(apiFilter).forEach(([slug, conditions]) => {
    if (conditions && typeof conditions === 'object') {
      Object.entries(conditions).forEach(([operator, value]) => {
        filters.push({
          attribute: { slug },
          condition: operator.replace('$', '') as FilterConditionType,
          value,
        });
      });
    }
  });

  return {
    filters,
    matchAny: false,
  };
}
