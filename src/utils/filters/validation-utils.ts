/**
 * @module validation-utils
 *
 * Centralized validation utilities for filter structures
 * Provides consistent error message formatting and reusable validation functions
 */

import {
  FilterValidationError,
  FilterErrorCategory,
} from '../../errors/api-errors.js';
import { ListEntryFilter, ListEntryFilters } from './types.js';
import { ValidatedListEntryFilters } from '../../api/operations/types.js';
import { isValidFilterCondition } from '../../types/attio.js';

/**
 * Error message templates for consistent error formatting
 */
export const ERROR_MESSAGES = {
  MISSING_FILTERS: 'Filter object is required but was undefined or null',
  FILTERS_NOT_ARRAY: (type: string) =>
    `Invalid filter structure: 'filters' property must be an array but got ${type}.

Expected format:
{
  "filters": [
    {"attribute": {"slug": "field_name"}, "condition": "contains", "value": "search_term"}
  ]
}`,
  MISSING_FILTERS_PROPERTY: `Invalid filter format. Expected structure:
{
  "filters": [
    {"attribute": {"slug": "field_name"}, "condition": "contains", "value": "search_term"}
  ]
}

Common mistake: Using object format instead of array format. 
Received an object without a "filters" array property.

See documentation for more examples.`,
  EMPTY_FILTERS_ARRAY: 'No filters provided in the filters array',
  INVALID_FILTER_STRUCTURE: (index: number, reason: string) =>
    `Invalid filter structure at index ${index}: ${reason}`,
  MISSING_ATTRIBUTE: 'missing attribute object',
  MISSING_ATTRIBUTE_SLUG: 'missing attribute.slug property',
  MISSING_CONDITION: 'missing condition property',
  INVALID_CONDITION: (condition: string, validConditions: string[]) =>
    `Invalid filter condition '${condition}'. Valid conditions are: ${validConditions.join(
      ', '
    )}`,
  ALL_FILTERS_INVALID:
    'All filters are invalid. Please provide at least one valid filter.',
};

/**
 * Standard example format for filter structures to include in error messages
 */
export const FILTER_EXAMPLES = {
  SIMPLE: `{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains",
      "value": "Company Inc"
    }
  ]
}`,
  OR_LOGIC: `{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains",
      "value": "Inc"
    },
    {
      "attribute": { "slug": "industry" },
      "condition": "equals",
      "value": "Technology"
    }
  ],
  "matchAny": true
}`,
  MULTIPLE_CONDITIONS: `{
  "filters": [
    {
      "attribute": { "slug": "name" },
      "condition": "contains", 
      "value": "Inc"
    },
    {
      "attribute": { "slug": "website" },
      "condition": "contains",
      "value": ".com"
    }
  ]
}`,
};

/**
 * Validates the basic filter structure ensuring filters object has required properties
 *
 * This function performs structural validation to ensure:
 * - The filters parameter is not null/undefined
 * - The filters object has a 'filters' property
 * - The 'filters' property is an array
 *
 * @param filters - The filters object to validate (may be undefined/null from user input)
 * @returns Validated filters object with guaranteed filters array
 * @throws FilterValidationError with consistent error messages and appropriate categories
 *
 * @example
 * ```typescript
 * const validated = validateFiltersObject({
 *   filters: [{ attribute: { slug: 'name' }, condition: 'equals', value: 'test' }]
 * });
 * // validated.filters is guaranteed to be an array
 * ```
 */
export function validateFiltersObject(
  filters: ListEntryFilters | undefined
): ValidatedListEntryFilters {
  // Check if filters is undefined or null
  if (!filters) {
    throw new FilterValidationError(
      ERROR_MESSAGES.MISSING_FILTERS,
      FilterErrorCategory.STRUCTURE
    );
  }

  // Check if filters has a filters property
  if (!('filters' in filters)) {
    throw new FilterValidationError(
      ERROR_MESSAGES.MISSING_FILTERS_PROPERTY,
      FilterErrorCategory.STRUCTURE
    );
  }

  // Check if filters.filters is an array
  if (!Array.isArray(filters.filters)) {
    throw new FilterValidationError(
      ERROR_MESSAGES.FILTERS_NOT_ARRAY(typeof filters.filters),
      FilterErrorCategory.STRUCTURE
    );
  }

  // Return the validated filters with the correct type
  return filters as ValidatedListEntryFilters;
}

/**
 * Validates each individual filter in a filters array
 * Returns list of invalid filters with reasons
 *
 * @param filters - Array of filter objects to validate
 * @param validateConditions - Whether to validate condition values
 * @returns Array of objects containing invalid filter index, reason and filter object
 */
export function collectInvalidFilters(
  filters: ListEntryFilter[],
  validateConditions: boolean = true
): { index: number; reason: string; filter: unknown }[] {
  const invalidFilters: { index: number; reason: string; filter: unknown }[] = [];

  // Check each filter in the array
  filters.forEach((filter, index) => {
    // Check if filter is a valid object
    if (!filter || typeof filter !== 'object') {
      invalidFilters.push({
        index,
        reason: `Filter at index ${index} is ${
          filter === null ? 'null' : typeof filter
        }`,
        filter,
      });
      return;
    }

    // Check for required properties
    if (!filter.attribute) {
      invalidFilters.push({
        index,
        reason: ERROR_MESSAGES.MISSING_ATTRIBUTE,
        filter,
      });
      return;
    }

    if (!filter.attribute.slug) {
      invalidFilters.push({
        index,
        reason: ERROR_MESSAGES.MISSING_ATTRIBUTE_SLUG,
        filter,
      });
      return;
    }

    if (!filter.condition) {
      invalidFilters.push({
        index,
        reason: ERROR_MESSAGES.MISSING_CONDITION,
        filter,
      });
      return;
    }

    // Validate condition if enabled
    if (validateConditions && !isValidFilterCondition(filter.condition)) {
      invalidFilters.push({
        index,
        reason: `Invalid condition '${filter.condition}'`,
        filter,
      });
      return;
    }
  });

  return invalidFilters;
}

/**
 * Creates a consistently formatted error message for invalid filters
 *
 * @param invalidFilters - Array of invalid filter objects with reasons
 * @returns Formatted error message with details
 */
export function formatInvalidFiltersError(
  invalidFilters: { index: number; reason: string; filter: unknown }[]
): string {
  if (invalidFilters.length === 0) {
    return '';
  }

  const errorDetails = invalidFilters
    .map((f) => `Filter [${f.index}]: ${f.reason}`)
    .join('; ');

  return errorDetails;
}

/**
 * Full validation of filters with detailed error messages and examples
 *
 * This is the primary entry point for filter validation. It performs:
 * 1. Structural validation using validateFiltersObject()
 * 2. Individual filter validation for each filter in the array
 * 3. Condition validation if enabled
 * 4. Comprehensive error reporting with examples
 *
 * @param filters - Filter object to validate (may have optional filters array)
 * @param validateConditions - Whether to validate condition values against known operators
 * @returns Validated filters with guaranteed filters array and valid structure
 * @throws FilterValidationError with detailed messages, examples, and appropriate categories
 *
 * @example
 * ```typescript
 * // Valid usage
 * const validated = validateFilters({
 *   filters: [
 *     { attribute: { slug: 'name' }, condition: 'equals', value: 'John' },
 *     { attribute: { slug: 'age' }, condition: 'greater_than', value: 18 }
 *   ],
 *   matchAny: false
 * }, true);
 *
 * // validated.filters is guaranteed to exist and be valid
 * ```
 *
 * @see validateFiltersObject For structural validation
 * @see collectInvalidFilters For individual filter validation logic
 */
export function validateFilters(
  filters: ListEntryFilters | undefined,
  validateConditions: boolean = true
): ValidatedListEntryFilters {
  // First validate basic structure
  const validatedFilters = validateFiltersObject(filters);

  // Handle empty or undefined filters array (valid but returns no results)
  if (!validatedFilters.filters || validatedFilters.filters.length === 0) {
    return validatedFilters;
  }

  // Collect invalid filters
  const invalidFilters = collectInvalidFilters(
    validatedFilters.filters,
    validateConditions
  );

  // If all filters are invalid, throw error with examples
  if (invalidFilters.length === validatedFilters.filters.length) {
    const errorDetails = formatInvalidFiltersError(invalidFilters);
    let errorMessage = `${ERROR_MESSAGES.ALL_FILTERS_INVALID} ${errorDetails}`;

    // Add examples to help the user fix their filters - show relevant example based on context
    const relevantExample = invalidFilters.length > 1 
      ? FILTER_EXAMPLES.MULTIPLE_CONDITIONS 
      : FILTER_EXAMPLES.SIMPLE;
    errorMessage +=
      '\n\nExample of valid filter structure: \n' + relevantExample;

    // Determine most appropriate error category based on invalid filters
    let category = FilterErrorCategory.STRUCTURE;

    // If we have specific attribute issues
    if (invalidFilters.some((f) => f.reason.includes('attribute'))) {
      category = FilterErrorCategory.ATTRIBUTE;
    }
    // If we have specific condition issues
    else if (invalidFilters.some((f) => f.reason.includes('condition'))) {
      category = FilterErrorCategory.CONDITION;
    }
    // If we have specific value issues
    else if (invalidFilters.some((f) => f.reason.includes('value'))) {
      category = FilterErrorCategory.VALUE;
    }

    throw new FilterValidationError(errorMessage, category);
  }

  return validatedFilters;
}

/**
 * Helper function to get a descriptive reason for an invalid filter
 *
 * @param filter - The filter to analyze
 * @returns A string describing what's wrong with the filter
 */
export function getInvalidFilterReason(filter: unknown): string {
  if (!filter || typeof filter !== 'object') {
    return `filter is ${filter === null ? 'null' : typeof filter}`;
  }

  const filterObj = filter as Record<string, any>;

  if (!filterObj.attribute) {
    return ERROR_MESSAGES.MISSING_ATTRIBUTE;
  }

  if (!filterObj.attribute.slug) {
    return ERROR_MESSAGES.MISSING_ATTRIBUTE_SLUG;
  }

  if (!filterObj.condition) {
    return ERROR_MESSAGES.MISSING_CONDITION;
  }

  if (!isValidFilterCondition(filterObj.condition)) {
    return `invalid condition '${filterObj.condition}'`;
  }

  return 'unknown issue';
}

/**
 * Generate examples for different filter scenarios
 *
 * @param filterType - The type of filter example to generate (simple, or, multiple)
 * @returns A string with the example in JSON format
 */
export function getFilterExample(
  filterType: 'simple' | 'or' | 'multiple' = 'simple'
): string {
  switch (filterType) {
    case 'or':
      return FILTER_EXAMPLES.OR_LOGIC;
    case 'multiple':
      return FILTER_EXAMPLES.MULTIPLE_CONDITIONS;
    case 'simple':
    default:
      return FILTER_EXAMPLES.SIMPLE;
  }
}
