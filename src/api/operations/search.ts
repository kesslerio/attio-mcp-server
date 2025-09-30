/**
 * Search operations for Attio objects
 * Handles basic and advanced search functionality
 */

import { getLazyAttioClient } from '@api/lazy-client.js';
import { callWithRetry, RetryConfig } from '@api/operations/retry.js';
import { ListEntryFilters } from '@api/operations/types.js';
import { parseQuery } from '@api/operations/query-parser.js';
import { FilterValidationError } from '@errors/api-errors.js';
import { ErrorEnhancer } from '@errors/enhanced-api-errors.js';
import { transformFiltersToApiFormat } from '@utils/record-utils.js';
import {
  AttioRecord,
  ResourceType,
  AttioListResponse,
} from '@shared-types/attio.js';
import {
  ApiError,
  SearchRequestBody,
  ListRequestBody,
} from '@shared-types/api-operations.js';

type FilterCondition = Record<string, unknown>;

function createLegacyFilter(
  objectType: ResourceType,
  query: string
): FilterCondition {
  if (objectType === ResourceType.PEOPLE) {
    return {
      $or: [
        { name: { $contains: query } },
        { email_addresses: { $contains: query } },
        { phone_numbers: { $contains: query } },
      ],
    };
  }

  return { name: { $contains: query } };
}

function addCondition(
  collection: FilterCondition[],
  seen: Set<string>,
  condition: FilterCondition
) {
  const key = JSON.stringify(condition);
  if (!seen.has(key)) {
    seen.add(key);
    collection.push(condition);
  }
}

function buildSearchFilter(
  objectType: ResourceType,
  query: string
): FilterCondition {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return createLegacyFilter(objectType, query);
  }

  const parsed = parseQuery(trimmedQuery);
  const conditions: FilterCondition[] = [];
  const seen = new Set<string>();

  parsed.emails.forEach((email) => {
    addCondition(conditions, seen, {
      email_addresses: { $contains: email },
    });
  });

  parsed.phones.forEach((phone) => {
    addCondition(conditions, seen, {
      phone_numbers: { $contains: phone },
    });
  });

  if (objectType === ResourceType.COMPANIES) {
    parsed.domains.forEach((domain) => {
      addCondition(conditions, seen, {
        domains: { $contains: domain },
      });
    });
  }

  const tokenTargets = new Set<string>();
  tokenTargets.add('name');

  if (objectType === ResourceType.PEOPLE) {
    tokenTargets.add('email_addresses');
    tokenTargets.add('phone_numbers');
  }

  if (objectType === ResourceType.COMPANIES) {
    tokenTargets.add('domains');
  }

  const uniqueTokens = Array.from(
    new Set(parsed.tokens.filter((token) => token.length > 1))
  );

  uniqueTokens.forEach((token) => {
    tokenTargets.forEach((field) => {
      addCondition(conditions, seen, {
        [field]: { $contains: token },
      });
    });
  });

  if (conditions.length === 0) {
    return createLegacyFilter(objectType, trimmedQuery);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    $or: conditions,
  };
}

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
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

  const filter = buildSearchFilter(objectType, query);

  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioListResponse<T>>(path, {
        filter,
      });
      return response?.data?.data || [];
    } catch (error: unknown) {
      const apiError = error as ApiError;
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
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;

  // Create request body with parameters and filters
  const createRequestBody = async () => {
    // Start with base parameters
    const body: SearchRequestBody = {
      limit: safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      offset: safeOffset !== undefined ? safeOffset : 0, // Default to 0 if not specified
    };

    try {
      // If filters is undefined, return body without filter
      if (!filters) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').debug(
            'No filters provided, using default parameters only'
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
      const filterObject = transformFiltersToApiFormat(filters, true);

      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;

        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').debug(
            'Transformed filters',
            {
              originalFilters: JSON.stringify(filters),
              transformedFilters: JSON.stringify(filterObject.filter),
              useOrLogic: filters?.matchAny === true,
              filterCount: filters?.filters?.length || 0,
            }
          );
        }
      }
    } catch (err: unknown) {
      // Enhanced error handling with detailed context and examples
      if (err instanceof FilterValidationError) {
        // Log the full details for debugging
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').warn(
            'Filter validation error',
            {
              error: err.message,
              providedFilters: JSON.stringify(filters, (key, value) =>
                // Handle circular references in error logging
                typeof value === 'object' && value !== null
                  ? Object.keys(value).length > 0
                    ? value
                    : '[Empty Object]'
                  : value
              ),
            }
          );
        }

        // The error message may already include examples, so just rethrow
        throw err;
      }

      // For other error types
      const errorMessage =
        err instanceof Error
          ? `Error processing search filters: ${err.message}`
          : 'Unknown error processing search filters';

      throw new Error(errorMessage);
    }

    return body;
  };

  return callWithRetry(async () => {
    try {
      const requestBody = await createRequestBody();
      const response = await api.post<AttioListResponse<T>>(path, requestBody);
      const data = response?.data?.data;

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
        (err as Record<string, unknown>)?.name === 'FilterValidationError'
      ) {
        throw err;
      }

      // For all other errors, enhance them for consistency
      throw ErrorEnhancer.ensureEnhanced(err, {
        resourceType: objectType,
      });
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
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

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

    const response = await api.post<AttioListResponse<T>>(path, body);
    let result = response?.data?.data || [];

    // BUGFIX: Handle case where API returns {} instead of [] for empty results
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      result = [];
    }

    return result;
  }, retryConfig);
}
