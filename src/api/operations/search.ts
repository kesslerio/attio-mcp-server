/**
 * Search operations for Attio objects
 * Handles basic and advanced search functionality
 */

import { callWithRetry, RetryConfig } from './retry.js';
import { ErrorEnhancer } from '../../errors/enhanced-api-errors.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { getAttioClient } from '../attio-client.js';
import { ListEntryFilters } from './types.js';
import { transformFiltersToApiFormat } from '../../utils/record-utils.js';

/**
 * Generic function to search any object type by name, email, or phone (when applicable)
 *
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export async function searchObject<T extends AttioRecord>(
  objectType: ResourceType,
  query: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {

  // Use different search logic based on object type
  let filter = {};

  if (objectType === ResourceType.PEOPLE) {
    // For people, search by name, email, or phone
    filter = {
      $or: [
        { name: { $contains: query } },
        { email_addresses: { $contains: query } },
        { phone_numbers: { $contains: query } },
      ],
    };
  } else {
    // For other types (like companies), search by name only
    filter = {
      name: { $contains: query },
    };
  }

  return callWithRetry(async () => {
    try {
        filter,
      });
      return response?.data?.data || [];
    } catch (error: unknown) {
      // Handle 404 errors with custom message
      if (apiError.response && apiError.response.status === 404) {
        throw new Error(`No ${objectType} found matching '${query}'`);
      }
      // Let upstream handlers create specific, rich error objects from the original Axios error.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to search any object type with advanced filtering capabilities
 *
 * @param objectType - The type of object to search (people or companies)
 * @param filters - Optional filters to apply
 * @param limit - Maximum number of results to return (optional)
 * @param offset - Number of results to skip (optional)
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export async function advancedSearchObject<T extends AttioRecord>(
  objectType: ResourceType,
  filters?: ListEntryFilters,
  limit?: number,
  offset?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {

  // Coerce input parameters to ensure proper types

  // Create request body with parameters and filters
    // Start with base parameters
    const body: SearchRequestBody = {
      limit: safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      offset: safeOffset !== undefined ? safeOffset : 0, // Default to 0 if not specified
    };

    try {
      // If filters is undefined, return body without filter
      if (!filters) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            '[advancedSearchObject] No filters provided, using default parameters only'
          );
        }
        return body;
      }

      // Import validation utilities dynamically to avoid circular dependencies
      const { validateFilters } = await import(
        '../../utils/filters/validation-utils.js'
      );

      // Use centralized validation with consistent error messages
      try {
        validateFilters(filters);
      } catch (validationError) {
        // Enhance error with API operation context, but preserve original message and category
        if (validationError instanceof FilterValidationError) {
          throw new FilterValidationError(
            `Advanced search filter validation failed: ${validationError.message}`,
            validationError.category
          );
        }
        throw validationError;
      }

      // Use our shared utility to transform filters to API format

      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;

        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[advancedSearchObject] Transformed filters:', {
            originalFilters: JSON.stringify(filters),
            transformedFilters: JSON.stringify(filterObject.filter),
            useOrLogic: filters?.matchAny === true,
            filterCount: filters?.filters?.length || 0,
          });
        }
      }
    } catch (err: unknown) {
      // Enhanced error handling with detailed context and examples
      if (err instanceof FilterValidationError) {
        // Log the full details for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error('[advancedSearchObject] Filter validation error:', {
            error: err.message,
            providedFilters: JSON.stringify(filters, (key, value) =>
              // Handle circular references in error logging
              typeof value === 'object' && value !== null
                ? Object.keys(value).length > 0
                  ? value
                  : '[Empty Object]'
                : value
            ),
          });
        }

        // The error message may already include examples, so just rethrow
        throw err;
      }

      // For other error types
        err instanceof Error
          ? `Error processing search filters: ${err.message}`
          : 'Unknown error processing search filters';

      throw new Error(errorMessage);
    }

    return body;
  };

  return callWithRetry(async () => {
    try {

      // Ensure we always return an array, never boolean or other types
      if (Array.isArray(data)) {
        return data;
      }

      // Return empty array if data is null, undefined, or not an array
      return [];
    } catch (err) {
      // If the error is a FilterValidationError, rethrow it unchanged
      // Tests expect this specific error type to bubble up
      if (
        err instanceof FilterValidationError ||
        (err as any)?.name === 'FilterValidationError'
      ) {
        throw err;
      }

      // For all other errors, enhance them for consistency
      throw ErrorEnhancer.ensureEnhanced(err, {
        method: 'POST',
        resourceType: objectType,
      } as any);
    }
  }, retryConfig);
}

/**
 * Generic function to list any object type with pagination and sorting
 *
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export async function listObjects<T extends AttioRecord>(
  objectType: ResourceType,
  limit?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {

  return callWithRetry(async () => {
    const body: ListRequestBody = {
      limit: limit || 20,
      sorts: [
        {
          attribute: 'last_interaction',
          field: 'interacted_at',
          direction: 'desc',
        },
      ],
    };

    let result = response?.data?.data || [];

    // BUGFIX: Handle case where API returns {} instead of [] for empty results
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      result = [];
    }

    return result;
  }, retryConfig);
}
