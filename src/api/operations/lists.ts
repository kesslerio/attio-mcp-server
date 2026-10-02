/**
 * List operations for Attio
 * Handles list management and list entry operations
 */

import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import { ResultEncodingError } from '@/handlers/tools/result-contract.js';
import { createScopedLogger } from '@/utils/logger.js';
import {
  AttioList,
  AttioListEntry,
  AttioListResponse,
  AttioSingleResponse,
} from '@/types/attio.js';
import { callWithRetry, RetryConfig } from '@/api/operations/retry.js';
import { ListEntryFilters } from '@/api/operations/types.js';
import {
  processListEntries,
  transformFiltersToApiFormat,
} from '@/utils/record-utils.js';
import { FilterValidationError } from '@/errors/api-errors.js';
import {
  SearchRequestBody,
  LogDetails,
  ListErrorResponse,
} from '@/types/api-operations.js';

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
  const api = getLazyAttioClient();
  let path = `/lists?limit=${limit}`;

  if (objectSlug) {
    path += `&objectSlug=${objectSlug}`;
  }

  const response = await callWithRetry(
    () => api.get<AttioListResponse<AttioList>>(path),
    retryConfig,
    { uncertainMutation: false }
  );
  const items = Array.isArray(response?.data?.data)
    ? response.data.data
    : Array.isArray(response?.data?.lists)
      ? response.data.lists
      : Array.isArray(response?.data?.items)
        ? response.data.items
        : Array.isArray(response?.data)
          ? response.data
          : undefined;
  if (!Array.isArray(items)) throw new ResultEncodingError();
  return items;
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
  const api = getLazyAttioClient();
  const path = `/lists/${listId}`;

  return callWithRetry(async () => {
    const response = await api.get<AttioSingleResponse<AttioList>>(path);
    return (response?.data?.data || response?.data) as AttioList;
  }, retryConfig, { uncertainMutation: false });
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

  // Input validation - make sure we have a valid listId
  if (!listId) {
    throw new UniversalValidationError('Invalid list ID: No ID provided');
  }

  const api = getLazyAttioClient();

  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;

  // Create request body with parameters and filters
  const createRequestBody = async () => {
    // Start with base parameters
    const body: SearchRequestBody = {
      expand: ['record'],
      limit: safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      offset: safeOffset !== undefined ? safeOffset : 0, // Default to 0 if not specified
    };

    try {
      // Use our shared utility to transform filters to API format
      // Pass isListEntryContext=true since we're filtering list entries
      // Note: resourceType is undefined for list entries as they can contain mixed record types
      const filterObject = await transformFiltersToApiFormat(
        filters,
        true,
        true,
        undefined
      );

      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;

        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          const log = createScopedLogger('lists.operations', 'getListEntries');
          log.debug('Transformed filters', {
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
          const log = createScopedLogger('lists.operations', 'getListEntries');
          log.warn('Filter validation error', {
            error: error.message,
            providedFilters: JSON.stringify(filters),
          });
        }

        // Rethrow with more context
        throw new UniversalValidationError(
          `Filter validation failed: ${error.message}`,
          undefined,
          { cause: error }
        );
      }
      throw error; // Rethrow other errors
    }

    return body;
  };

  // Enhanced logging function
  const logger = createScopedLogger('lists.operations', 'getListEntries');
  const logOperation = (
    stage: string,
    details?: LogDetails,
    isError = false
  ) => {
    if (process.env.NODE_ENV === 'development') {
      const data = {
        ...details,
        listId,
        limit: safeLimit,
        offset: safeOffset,
        hasFilters:
          filters && filters.filters ? filters.filters.length > 0 : false,
        timestamp: new Date().toISOString(),
      };
      if (isError || stage.includes('failed')) {
        logger.warn(stage, data);
      } else {
        logger.debug(stage, data);
      }
    }
  };

  // Call primary endpoint directly (Option A simplification)
  return callWithRetry(async () => {
    const path = `/lists/${listId}/entries/query`;
    const requestBody = await createRequestBody();

    logOperation('Primary endpoint attempt', {
      path,
      requestBody: JSON.stringify(requestBody),
    });

    const response = await api.post<AttioListResponse<AttioListEntry>>(
      path,
      requestBody
    );

    logOperation('Primary endpoint successful', {
      resultCount: response.data?.data?.length || 0,
    });

    return processListEntries(response.data?.data || []);
  }, retryConfig, { uncertainMutation: false });
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
  const path = `/lists/${listId}/entries`;

  // Input validation to ensure required parameters
  if (!listId || typeof listId !== 'string') {
    throw new UniversalValidationError(
      'Invalid list ID: Must be a non-empty string'
    );
  }

  if (!recordId || typeof recordId !== 'string') {
    throw new UniversalValidationError(
      'Invalid record ID: Must be a non-empty string'
    );
  }

  const api = getLazyAttioClient();

  // Default object type to 'companies' if not specified
  const safeObjectType = objectType || 'companies';

  return callWithRetry(async () => {
    const log = createScopedLogger('lists.operations', 'addRecordToList');
    try {
      // Construct proper API payload according to Attio API requirements
      // The API expects parent_record_id, parent_object, and entry_values (required, even if empty)
      const payload = {
        data: {
          parent_record_id: recordId,
          parent_object: safeObjectType,
          // entry_values is required by the API, use empty object if no initial values provided
          entry_values: initialValues || {},
        },
      };

      if (process.env.NODE_ENV === 'development') {
        log.info('Adding record to list', {
          path,
          listId,
          recordId,
          safeObjectType,
          initialValues: initialValues ?? null,
          payload,
        });
      }

      const response = await api.post<AttioSingleResponse<AttioListEntry>>(
        path,
        payload
      );

      if (process.env.NODE_ENV === 'development') {
        log.info('Add record success', { data: response.data });
      }

      return response?.data?.data || response?.data;
    } catch (error: unknown) {
      const listError = error as ListErrorResponse;
      // Enhanced error logging with detailed information
      if (process.env.NODE_ENV === 'development') {
        log.warn('Add record error', {
          message: listError.message || 'Unknown error',
          status: listError.response?.status,
          data: listError.response?.data || {},
          validationErrors: listError.response?.data?.validation_errors,
        });
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
  const path = `/lists/${listId}/entries/${entryId}`;

  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new UniversalValidationError(
      'Invalid list ID: Must be a non-empty string'
    );
  }

  if (!entryId || typeof entryId !== 'string') {
    throw new UniversalValidationError(
      'Invalid entry ID: Must be a non-empty string'
    );
  }

  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  ) {
    throw new UniversalValidationError(
      'Invalid attributes: Must be a non-empty object'
    );
  }

  const api = getLazyAttioClient();

  return callWithRetry(async () => {
    const log = createScopedLogger('lists.operations', 'updateListEntry');
    try {
      if (process.env.NODE_ENV === 'development') {
        log.info('Updating list entry', { path, listId, entryId, attributes });
      }

      // Attio API expects updates to list entries in the 'data.entry_values' structure
      // This is specific to list entries, different from record updates in crud.ts
      const response = await api.patch<AttioSingleResponse<AttioListEntry>>(
        path,
        {
          data: {
            entry_values: attributes,
          },
        }
      );

      if (process.env.NODE_ENV === 'development') {
        log.info('Update list entry success', { data: response.data });
      }

      return response?.data?.data || response?.data;
    } catch (error: unknown) {
      const updateError = error as ListErrorResponse;
      // Enhanced error logging with specific error types
      if (process.env.NODE_ENV === 'development') {
        log.warn('Update list entry error', {
          message: updateError.message || 'Unknown error',
          status: updateError.response?.status,
          data: updateError.response?.data || {},
        });
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
  if (!listId || typeof listId !== 'string') {
    throw new UniversalValidationError(
      'Invalid list ID: Must be a non-empty string'
    );
  }
  if (!entryId || typeof entryId !== 'string') {
    throw new UniversalValidationError(
      'Invalid entry ID: Must be a non-empty string'
    );
  }

  const api = getLazyAttioClient();
  const path = `/lists/${listId}/entries/${entryId}`;

  return callWithRetry(async () => {
    await api.delete(path);
    return true;
  }, retryConfig);
}
