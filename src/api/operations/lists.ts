/**
 * List operations for Attio
 * Handles list management and list entry operations
 */

import { FilterValidationError } from '../../errors/api-errors.js';
import {
  ListErrorResponse,
  LogDetails,
  SearchRequestBody,
  ValidationErrorDetails,
} from '../../types/api-operations.js';
import {
  AttioList,
  AttioListEntry,
  AttioListResponse,
  AttioSingleResponse,
} from '../../types/attio.js';
import { executeWithListFallback } from '../../utils/api-fallback.js';
import {
  processListEntries,
  transformFiltersToApiFormat,
} from '../../utils/record-utils.js';
import { getAttioClient } from '../attio-client.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { ListEntryFilters } from './types.js';

/**
 * Gets all lists in the workspace
 *
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @param retryConfig - Optional retry configuration
 * @returns Array of list objects
 */
export async function getAllLists(
  objectSlug?: string,
  limit: number = 20,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioList[]> {
  const api = getAttioClient();
  let path = `/lists?limit=${limit}`;

  if (objectSlug) {
    path += `&objectSlug=${objectSlug}`;
  }

  return callWithRetry(async () => {
    const response = await api.get<AttioListResponse<AttioList>>(path);
    return response?.data?.data || [];
  }, retryConfig);
}

/**
 * Gets details for a specific list
 *
 * @param listId - The ID of the list
 * @param retryConfig - Optional retry configuration
 * @returns List details
 */
export async function getListDetails(
  listId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioList> {
  const api = getAttioClient();
  const path = `/lists/${listId}`;

  return callWithRetry(async () => {
    const response = await api.get<AttioSingleResponse<AttioList>>(path);
    return response?.data?.data || response?.data;
  }, retryConfig);
}

/**
 * Gets entries in a list with pagination and filtering
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch
 * @param offset - Number of entries to skip
 * @param filters - Optional filters to apply
 * @param retryConfig - Optional retry configuration
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string,
  limit?: number,
  offset?: number,
  filters?: ListEntryFilters,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry[]> {
  const api = getAttioClient();

  // Input validation - make sure we have a valid listId
  if (!listId) {
    throw new Error('Invalid list ID: No ID provided');
  }

  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;

  // Create request body with parameters and filters
  const createRequestBody = () => {
    // Start with base parameters
    const body: SearchRequestBody = {
      expand: ['record'],
      limit: safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      offset: safeOffset !== undefined ? safeOffset : 0, // Default to 0 if not specified
    };

    try {
      // Use our shared utility to transform filters to API format
      // Pass isListEntryContext=true since we're filtering list entries
      const filterObject = transformFiltersToApiFormat(filters, true, true);

      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;

        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[getListEntries] Transformed filters:', {
            originalFilters: JSON.stringify(filters),
            transformedFilters: JSON.stringify(filterObject.filter),
            useOrLogic: filters?.matchAny === true,
            filterCount: filters?.filters?.length || 0,
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;

      if (error instanceof FilterValidationError) {
        // Log the problematic filters for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error('[getListEntries] Filter validation error:', {
            error: error.message,
            providedFilters: JSON.stringify(filters),
          });
        }

        // Rethrow with more context
        throw new Error(`Filter validation failed: ${error.message}`);
      }
      throw error; // Rethrow other errors
    }

    return body;
  };

  // Enhanced logging function
  const logOperation = (
    stage: string,
    details?: LogDetails,
    isError = false
  ) => {
    if (process.env.NODE_ENV === 'development') {
      const prefix = isError
        ? 'ERROR'
        : stage.includes('failed')
          ? 'WARNING'
          : 'INFO';
      console.error(`[getListEntries] ${prefix} - ${stage}`, {
        ...details,
        listId,
        limit: safeLimit,
        offset: safeOffset,
        hasFilters:
          filters && filters.filters ? filters.filters.length > 0 : false,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Define a function to try all endpoints with proper retry logic
  return callWithRetry(async () => {
    return executeWithListFallback(
      api,
      { listId, filters, limit: safeLimit, offset: safeOffset },
      createRequestBody,
      processListEntries,
      logOperation
    );
  }, retryConfig);
}

/**
 * Adds a record to a list
 *
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @param objectType - Optional object type ('companies', 'people', etc.)
 * @param initialValues - Optional initial values for the list entry (e.g., stage)
 * @param retryConfig - Optional retry configuration
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string,
  recordId: string,
  objectType?: string,
  initialValues?: Record<string, unknown>,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry> {
  const api = getAttioClient();
  const path = `/lists/${listId}/entries`;

  // Input validation to ensure required parameters
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
  }

  // Default object type to 'companies' if not specified
  const safeObjectType = objectType || 'companies';

  return callWithRetry(async () => {
    try {
      // Construct proper API payload according to Attio API requirements
      // The API expects parent_record_id, parent_object, and optionally entry_values
      const payload = {
        data: {
          parent_record_id: recordId,
          parent_object: safeObjectType,
          // Only include entry_values if initialValues is provided
          ...(initialValues && { entry_values: initialValues }),
        },
      };

      if (process.env.NODE_ENV === 'development') {
        console.error(`[addRecordToList] Adding record to list at ${path}`);
        console.error(`- List ID: ${listId}`);
        console.error(`- Record ID: ${recordId}`);
        console.error(`- Object Type: ${safeObjectType}`);
        console.error(
          `- Initial Values: ${
            initialValues ? JSON.stringify(initialValues) : 'none'
          }`
        );
        console.error(`- Request payload: ${JSON.stringify(payload)}`);
      }

      const response = await api.post<AttioSingleResponse<AttioListEntry>>(
        path,
        payload
      );

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[addRecordToList] Success: ${JSON.stringify(response.data)}`
        );
      }

      return response?.data?.data || response?.data;
    } catch (error: unknown) {
      const listError = error as ListErrorResponse;
      // Enhanced error logging with detailed information
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[addRecordToList] Error adding record ${recordId} to list ${listId}:`,
          listError.message || 'Unknown error'
        );
        console.error('Status:', listError.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(listError.response?.data || {})
        );

        // Add additional debug information for validation errors
        if (listError.response?.data?.validation_errors) {
          console.error(
            'Validation errors:',
            JSON.stringify(listError.response.data.validation_errors)
          );
        }
      }

      // Add more context to the error message
      if (listError.response?.status === 400) {
        const validationErrors =
          listError.response?.data?.validation_errors || [];
        const errorDetails = validationErrors
          .map(
            (e: ValidationErrorDetails) => `${e.path.join('.')}: ${e.message}`
          )
          .join('; ');

        throw new Error(
          `Validation error adding record to list: ${
            errorDetails || listError.message
          }`
        );
      }

      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Updates a list entry (e.g., changing stage)
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to update
 * @param attributes - The attributes to update (e.g., { stage: "Demo Scheduling" })
 * @param retryConfig - Optional retry configuration
 * @returns The updated list entry
 */
export async function updateListEntry(
  listId: string,
  entryId: string,
  attributes: Record<string, unknown>,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry> {
  const api = getAttioClient();
  const path = `/lists/${listId}/entries/${entryId}`;

  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!entryId || typeof entryId !== 'string') {
    throw new Error('Invalid entry ID: Must be a non-empty string');
  }

  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  ) {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  return callWithRetry(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[updateListEntry] Updating list entry at ${path}`);
        console.error(`- List ID: ${listId}`);
        console.error(`- Entry ID: ${entryId}`);
        console.error(`- Attributes: ${JSON.stringify(attributes)}`);
      }

      // Attio API expects updates to list entries in the 'data.values' structure
      // This follows the same pattern as record updates in crud.ts
      const response = await api.patch<AttioSingleResponse<AttioListEntry>>(
        path,
        {
          data: {
            values: attributes,
          },
        }
      );

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[updateListEntry] Success: ${JSON.stringify(response.data)}`
        );
      }

      return response?.data?.data || response?.data;
    } catch (error: unknown) {
      const updateError = error as ListErrorResponse;
      // Enhanced error logging with specific error types
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[updateListEntry] Error updating entry ${entryId} in list ${listId}:`,
          updateError.message || 'Unknown error'
        );
        console.error('Status:', updateError.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(updateError.response?.data || {})
        );
      }

      // Add more specific error types based on status codes
      if (updateError.response?.status === 404) {
        throw new Error(`List entry ${entryId} not found in list ${listId}`);
      } else if (updateError.response?.status === 400) {
        throw new Error(
          `Invalid attributes for list entry update: ${
            updateError.response?.data?.message || 'Bad request'
          }`
        );
      } else if (updateError.response?.status === 403) {
        throw new Error(
          `Insufficient permissions to update list entry ${entryId} in list ${listId}`
        );
      }

      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Removes a record from a list
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @param retryConfig - Optional retry configuration
 * @returns True if successful
 */
export async function removeRecordFromList(
  listId: string,
  entryId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const path = `/lists/${listId}/entries/${entryId}`;

  return callWithRetry(async () => {
    await api.delete(path);
    return true;
  }, retryConfig);
}
