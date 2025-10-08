/**
 * Search functionality for deals
 * Issue #885: Add deals support to fast path optimization
 */
import {
  advancedSearchObject,
  ListEntryFilters,
} from '../../api/operations/index.js';
import { ResourceType, AttioRecord } from '../../types/attio.js';
import {
  FilterValidationError,
  FilterErrorCategory,
} from '../../errors/api-errors.js';

/**
 * Performs advanced search with custom filters using standard API
 *
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return
 * @param offset - Number of results to skip
 * @returns Array of deal results
 */
export async function advancedSearchDeals(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<AttioRecord[]> {
  // Strict validation BEFORE calling advancedSearchObject
  // This ensures FilterValidationError is thrown for invalid inputs
  if (!filters) {
    throw new FilterValidationError(
      'Filters object is required',
      FilterErrorCategory.STRUCTURE
    );
  }

  if (!('filters' in filters)) {
    throw new FilterValidationError(
      'Filters must include a "filters" array',
      FilterErrorCategory.STRUCTURE
    );
  }

  if (!Array.isArray(filters.filters)) {
    throw new FilterValidationError(
      'Filters.filters must be an array',
      FilterErrorCategory.STRUCTURE
    );
  }

  // Validate each filter condition structure
  if (filters.filters && filters.filters.length > 0) {
    filters.filters.forEach((filter, index) => {
      if (!filter || typeof filter !== 'object') {
        throw new FilterValidationError(
          `Invalid condition at index ${index}: filter must be an object`,
          FilterErrorCategory.STRUCTURE
        );
      }

      if (!filter.attribute) {
        throw new FilterValidationError(
          `Invalid condition at index ${index}: missing attribute object`,
          FilterErrorCategory.ATTRIBUTE
        );
      }

      if (!filter.attribute.slug) {
        throw new FilterValidationError(
          `Invalid condition at index ${index}: missing attribute.slug property`,
          FilterErrorCategory.ATTRIBUTE
        );
      }

      if (!filter.condition) {
        throw new FilterValidationError(
          `Invalid condition at index ${index}: missing condition property`,
          FilterErrorCategory.CONDITION
        );
      }

      // Additional validation for unknown operators/malformed structures
      if (typeof filter.condition !== 'string') {
        throw new FilterValidationError(
          `Invalid condition at index ${index}: condition must be a string`,
          FilterErrorCategory.CONDITION
        );
      }
    });
  }

  if (
    limit !== undefined &&
    (typeof limit !== 'number' || limit < 0 || !Number.isInteger(limit))
  ) {
    throw new FilterValidationError(
      'Limit must be a non-negative integer',
      FilterErrorCategory.VALUE
    );
  }

  if (
    offset !== undefined &&
    (typeof offset !== 'number' || offset < 0 || !Number.isInteger(offset))
  ) {
    throw new FilterValidationError(
      'Offset must be a non-negative integer',
      FilterErrorCategory.VALUE
    );
  }

  return await advancedSearchObject<AttioRecord>(
    ResourceType.DEALS,
    filters,
    limit,
    offset
  );
}
