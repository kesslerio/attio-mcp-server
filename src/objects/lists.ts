/**
 * Lists-related functionality
 */
import { getLazyAttioClient } from '../api/lazy-client.js';
import {
  getAllLists as getGenericLists,
  getListDetails as getGenericListDetails,
  getListEntries as getGenericListEntries,
  addRecordToList as addGenericRecordToList,
  removeRecordFromList as removeGenericRecordFromList,
  updateListEntry as updateGenericListEntry,
  BatchConfig,
  BatchResponse,
  executeBatchOperations,
  BatchRequestItem,
  ListEntryFilters,
} from '../api/operations/index.js';
import { EnhancedApiError } from '../errors/enhanced-api-errors.js';
import { FilterValue } from '../types/api-operations.js';
import {
  AttioList,
  AttioListEntry,
  ResourceType,
  AttioRecord,
} from '../types/attio.js';
import {
  processListEntries,
  transformFiltersToApiFormat,
  createPathBasedFilter,
} from '../utils/record-utils.js';
import {
  ListMembership,
  ListEntryValues,
  ListEndpointConfig,
  extractListEntryValues,
  hasErrorResponse,
} from '../types/list-types.js';
import { isValidUUID } from '../utils/validation/uuid-validation.js';

// Re-export for backward compatibility
export type { ListMembership } from '../types/list-types.js';

/**
 * Extract data from response, handling axios, fetch, and mock response shapes
 */
function extract<T>(response: any): T {
  // Support axios-like, fetch-like, and mocks
  return (response?.data?.data ?? response?.data ?? response) as T;
}

/**
 * Ensure list shape with proper ID structure and fallback values
 */
function ensureListShape(raw: any) {
  if (!raw || typeof raw !== 'object') raw = {};
  const id = raw.id ?? raw.list_id ?? raw?.id?.list_id;
  const list_id =
    typeof id === 'string'
      ? id
      : (crypto.randomUUID?.() ?? `tmp_${Date.now()}`);
  return {
    id: { list_id },
    name: raw.name ?? raw.title ?? 'Untitled List',
    description: raw.description ?? '',
    ...raw,
  };
}

/**
 * Helper to convert raw data to proper list array format
 */
function asListArray(raw: any): any[] {
  return Array.isArray(raw) ? raw.map(ensureListShape) : [];
}

/**
 * Gets all lists in the workspace
 *
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @returns Array of list objects
 */
export async function getLists(
  objectSlug?: string,
  limit: number = 20
): Promise<AttioList[]> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await getGenericLists(objectSlug, limit);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'getLists').warn(
        'Generic getLists failed',
        { errorMessage }
      );
    }
    // Fallback implementation
    const api = getLazyAttioClient();
    let path = `/lists?limit=${limit}`;

    if (objectSlug) {
      path += `&objectSlug=${objectSlug}`;
    }

    const response = await api.get(path);
    return asListArray(extract<any[]>(response));
  }
}

/**
 * Gets details for a specific list
 *
 * @param listId - The ID of the list
 * @returns List details
 */
export async function getListDetails(listId: string): Promise<AttioList> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await getGenericListDetails(listId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'getListDetails').warn(
        'Generic getListDetails failed',
        { errorMessage }
      );
    }
    // Fallback implementation with proper error handling
    const api = getLazyAttioClient();
    const path = `/lists/${listId}`;

    try {
      const response = await api.get(path);

      // Extract and normalize response, handling undefined case
      const extracted = extract<AttioList>(response);

      // Use ensureListShape to normalize the response (handles undefined/null)
      return ensureListShape(extracted);
    } catch (apiError: any) {
      const status = apiError?.response?.status ?? apiError?.statusCode;
      if (status === 404) {
        throw new EnhancedApiError('Record not found', 404, path, 'GET', {
          resourceType: 'lists',
          recordId: String(listId),
          httpStatus: 404,
          documentationHint: 'Use search-lists to find valid list IDs.',
        });
      }
      if (status === 422) {
        const { InvalidRequestError } = await import('../errors/api-errors.js');
        throw new InvalidRequestError(
          'Invalid parameter(s) for list operation',
          '/lists',
          'GET'
        );
      }
      // Surface other statuses as enhanced errors instead of generic 500s
      const code = Number.isFinite(status) ? status : 500;
      throw new EnhancedApiError(
        apiError?.message ?? 'List retrieval failed',
        code,
        path,
        'GET',
        {
          resourceType: 'lists',
          recordId: String(listId),
          httpStatus: code,
        }
      );
    }
  }
}

/**
 * Gets entries for a specific list
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @param filters - Optional filters to apply to the list entries
 * @returns Array of list entries
 */
/**
 * Gets entries for a specific list
 *
 * Simplified implementation using the reliable single-endpoint approach.
 * The generic operation uses only `/lists/{listId}/entries/query` which
 * has been proven to work consistently across all workspaces.
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @param filters - Optional filters to apply to the list entries
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string,
  limit: number = 20,
  offset: number = 0,
  filters?: ListEntryFilters
): Promise<AttioListEntry[]> {
  // Directly use the generic operation which implements the reliable single-endpoint approach
  return await getGenericListEntries(listId, limit, offset, filters);
}

/**
 * Adds a record to a list
 *
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @param objectType - Required object type ('companies', 'people', etc.)
 * @param initialValues - Optional initial values for the list entry (e.g., stage)
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string,
  recordId: string,
  objectType: string,
  initialValues?: ListEntryValues
): Promise<AttioListEntry> {
  // Input validation to ensure required parameters
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
  }

  // Validate required objectType parameter
  if (!objectType || typeof objectType !== 'string') {
    throw new Error(
      'Object type is required: Must be a non-empty string (e.g., "companies", "people")'
    );
  }

  if (!Object.values(ResourceType).includes(objectType as ResourceType)) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new Error(
      `Invalid object type: "${objectType}". Must be one of: ${validTypes}`
    );
  }

  // Use the generic operation with fallback to direct implementation
  try {
    return await addGenericRecordToList(
      listId,
      recordId,
      objectType,
      initialValues
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'addRecordToList');
      log.warn(
        'Generic addRecordToList failed; falling back to direct implementation',
        {
          listId,
          recordId,
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }

    // Fallback implementation
    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries`;

    // Construct the proper API payload according to Attio API requirements
    // The API expects parent_record_id, parent_object, and optionally entry_values
    const payload: any = {
      data: {
        parent_record_id: recordId,
        parent_object: objectType,
      },
    };

    // Only include entry_values if initialValues is provided
    if (initialValues && Object.keys(initialValues).length > 0) {
      payload.data.entry_values = initialValues;
    }

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'addRecordToList');
      log.info('Fallback request payload', { path, payload });
      log.debug('Object Type', { objectType });
      if (initialValues) {
        log.debug('Initial Values', { initialValues });
      }
    }

    try {
      const response = await api.post(path, payload);

      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../utils/logger.js');
        createScopedLogger('objects.lists', 'addRecordToList').info(
          'Fallback success response',
          { data: response.data || {} }
        );
      }

      return extract<AttioListEntry>(response);
    } catch (error) {
      // Enhanced error handling for validation errors
      if (process.env.NODE_ENV === 'development') {
        const { createScopedLogger } = await import('../utils/logger.js');
        const log = createScopedLogger('objects.lists', 'addRecordToList');
        log.warn('Error adding record to list (fallback path)', {
          listId,
          recordId,
          message: error instanceof Error ? error.message : 'Unknown error',
          status: hasErrorResponse(error) ? error.response?.status : undefined,
          data: hasErrorResponse(error)
            ? error.response?.data || {}
            : undefined,
          validationErrors: hasErrorResponse(error)
            ? error.response?.data?.validation_errors
            : undefined,
        });
      }

      // Add more context to the error message
      if (hasErrorResponse(error) && error.response?.status === 400) {
        const validationErrors = error.response?.data?.validation_errors || [];
        const errorDetails = validationErrors
          .map((e) => {
            return `${e.path?.join('.') || 'unknown'}: ${
              e.message || 'unknown'
            }`;
          })
          .join('; ');

        throw new Error(
          `Validation error adding record to list: ${
            errorDetails ||
            (error instanceof Error ? error.message : 'Unknown error')
          }`
        );
      }

      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }
}

/**
 * Updates a list entry (e.g., changing stage)
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to update
 * @param attributes - The attributes to update (e.g., { stage: "Demo Scheduling" })
 * @returns The updated list entry
 */
export async function updateListEntry(
  listId: string,
  entryId: string,
  attributes: Record<string, unknown>
): Promise<AttioListEntry> {
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

  // Use the generic operation with fallback to direct implementation
  try {
    return await updateGenericListEntry(listId, entryId, attributes);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'updateListEntry');
      log.warn('Generic updateListEntry failed; falling back', {
        listId,
        entryId,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Fallback implementation
    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'updateListEntry').info(
        'Fallback request payload',
        { path, attributes }
      );
    }

    // Attio API expects updates to list entries in the 'data.entry_values' structure
    // This is specific to list entries, different from record updates in crud.ts
    const response = await api.patch(path, {
      data: {
        entry_values: attributes,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'updateListEntry').info(
        'Fallback success response',
        { data: response.data || {} }
      );
    }

    return extract<AttioList>(response);
  }
}

/**
 * Removes a record from a list
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @returns True if successful
 */
export async function removeRecordFromList(
  listId: string,
  entryId: string
): Promise<boolean> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await removeGenericRecordFromList(listId, entryId);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'removeRecordFromList').warn(
        'Generic removeRecordFromList failed',
        {
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      );
    }
    // Fallback implementation
    const api = getLazyAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    await api.delete(path);
    return true;
  }
}

/**
 * Gets details for multiple lists in batch
 *
 * @param listIds - Array of list IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with list details for each ID
 */
export async function batchGetListsDetails(
  listIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioList>> {
  // Create batch request items
  const operations: BatchRequestItem<string>[] = listIds.map((listId) => ({
    params: listId,
    id: `get_list_${listId}`,
  }));

  // Execute batch operations
  return executeBatchOperations<string, AttioList>(
    operations,
    (listId) => getListDetails(listId),
    batchConfig
  );
}

/**
 * Gets entries for multiple lists in batch
 *
 * @param listConfigs - Array of list configurations with ID, limit, and offset
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with list entries for each configuration
 */
export async function batchGetListsEntries(
  listConfigs: Array<{ listId: string; limit?: number; offset?: number }>,
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<AttioListEntry[]>> {
  // Create batch request items
  const operations: BatchRequestItem<{
    listId: string;
    limit?: number;
    offset?: number;
  }>[] = listConfigs.map((config, index) => ({
    params: config,
    id: `get_list_entries_${config.listId}_${index}`,
  }));

  // Execute batch operations
  return executeBatchOperations<
    { listId: string; limit?: number; offset?: number },
    AttioListEntry[]
  >(
    operations,
    (params) => getListEntries(params.listId, params.limit, params.offset),
    batchConfig
  );
}

/**
 * Finds all lists that contain a specific record
 *
 * @param recordId - The ID of the record to find in lists
 * @param objectType - Optional record type ('companies', 'people', etc.)
 * @param includeEntryValues - Whether to include entry values in the result (default: false)
 * @returns Array of list memberships
 */
/**
 * Finds all lists that contain a specific record
 *
 * @param recordId - The ID of the record to find in lists
 * @param objectType - Optional record type ('companies', 'people', etc.)
 * @param includeEntryValues - Whether to include entry values in the result (default: false)
 * @param batchSize - Number of lists to process in parallel (default: 5)
 * @returns Array of list memberships
 *
 * @example
 * // Find all lists containing a company record
 * const memberships = await getRecordListMemberships('company-123', 'companies');
 *
 * // Find all lists containing a person record with entry values
 * const membershipsWithValues = await getRecordListMemberships('person-456', 'people', true);
 */
export async function getRecordListMemberships(
  recordId: string,
  objectType?: string,
  includeEntryValues: boolean = false,
  batchSize: number = 5
): Promise<ListMembership[]> {
  // Input validation - if not syntactically a UUID, return empty array (success)
  if (!recordId || typeof recordId !== 'string' || !isValidUUID(recordId)) {
    return []; // Return empty array for invalid record IDs per user guidance
  }

  // Validate objectType if provided
  if (
    objectType &&
    !Object.values(ResourceType).includes(objectType as ResourceType)
  ) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new Error(
      `Invalid object type: "${objectType}". Must be one of: ${validTypes}`
    );
  }

  try {
    const api = getLazyAttioClient();
    const memberships: ListMembership[] = [];

    // Determine object type - if not provided, try common types
    const objectTypes = objectType
      ? [objectType]
      : ['companies', 'people', 'deals'];

    for (const objType of objectTypes) {
      try {
        // Use the correct API endpoint: GET /v2/objects/{object}/records/{record_id}/entries
        const response = await api.get(
          `/objects/${objType}/records/${recordId}/entries`
        );
        const entries = response?.data?.data || [];

        // Convert entries to ListMembership format
        for (const entry of entries) {
          memberships.push({
            listId: entry.list_id || entry.list?.id?.list_id || 'unknown',
            listName: entry.list?.name || 'Unknown List',
            entryId: entry.id?.entry_id || entry.id || 'unknown',
            entryValues: includeEntryValues ? entry.values || {} : undefined,
          });
        }

        // If objectType was specified, we only need to check one type
        if (objectType) {
          break;
        }
      } catch (error) {
        // For 404 errors, this is normal - the record doesn't exist in this object type
        // Continue to check other object types
        if (
          (error as any)?.status === 404 ||
          (error as any)?.statusCode === 404
        ) {
          continue;
        }
        // For other errors, log but continue
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `Error checking ${objType} entries for record ${recordId}:`,
            error
          );
        }
      }
    }

    return memberships;
  } catch (error) {
    // For valid UUID that returns 404, return empty array (no memberships found)
    if ((error as any)?.status === 404 || (error as any)?.statusCode === 404) {
      return [];
    }
    // For other errors, log and return empty array per user guidance
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Error in getRecordListMemberships for record ${recordId}:`,
        error
      );
    }
    return [];
  }
}

/**
 * Filters list entries by a specific attribute
 *
 * This function allows filtering list entries based on any attribute, including
 * list-specific attributes (like stage, status) and parent record attributes.
 *
 * @param listId - The ID of the list to filter entries from
 * @param attributeSlug - The attribute to filter by (e.g., 'stage', 'status', 'name')
 * @param condition - The filter condition to apply
 * @param value - The value to filter by
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of filtered list entries
 *
 * @example
 * // Filter by list-specific stage attribute
 * const entries = await filterListEntries(
 *   'list_12345',
 *   'stage',
 *   'equals',
 *   'Contacted'
 * );
 */
export async function filterListEntries(
  listId: string,
  attributeSlug: string,
  condition: string,
  value: unknown,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!attributeSlug || typeof attributeSlug !== 'string') {
    throw new Error('Invalid attribute slug: Must be a non-empty string');
  }

  if (!condition || typeof condition !== 'string') {
    throw new Error('Invalid condition: Must be a non-empty string');
  }

  // Create filter structure with proper typing
  const filters: ListEntryFilters = {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition,
        value: value as FilterValue, // Cast to FilterValue type
      },
    ],
    matchAny: false,
  };

  // Use getListEntries with filters
  return getListEntries(listId, limit, offset, filters);
}

/**
 * Advanced filtering of list entries with multiple conditions
 *
 * This function allows filtering list entries using complex filter logic with
 * multiple conditions, AND/OR operators, and support for both list-specific
 * and parent record attributes.
 *
 * @param listId - The ID of the list to filter entries from
 * @param filters - Advanced filter configuration with multiple conditions
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of filtered list entries
 *
 * @example
 * // Filter by multiple conditions with OR logic
 * const entries = await advancedFilterListEntries(
 *   'list_12345',
 *   {
 *     filters: [
 *       { attribute: { slug: 'stage' }, condition: 'equals', value: 'Contacted' },
 *       { attribute: { slug: 'stage' }, condition: 'equals', value: 'Demo' }
 *     ],
 *     matchAny: true
 *   }
 * );
 */
export async function advancedFilterListEntries(
  listId: string,
  filters: ListEntryFilters,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!filters || typeof filters !== 'object') {
    throw new Error('Invalid filters: Must be an object');
  }

  if (!filters.filters || !Array.isArray(filters.filters)) {
    throw new Error('Invalid filters: Must contain a filters array');
  }

  // Use getListEntries with filters
  return getListEntries(listId, limit, offset, filters);
}

/**
 * Filters list entries based on parent record properties using path-based filtering
 *
 * This function allows filtering list entries based on properties of their parent records,
 * such as company name, email domain, or any other attribute of the parent record.
 *
 * @param listId - The ID of the list to filter entries from
 * @param parentObjectType - The type of parent record (e.g., 'companies', 'people')
 * @param parentAttributeSlug - The attribute of the parent record to filter by
 * @param condition - The filter condition to apply
 * @param value - The value to filter by
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of filtered list entries
 *
 * @example
 * // Get list entries for companies that have "Tech" in their industry
 * const entries = await filterListEntriesByParent(
 *   'list_12345',
 *   'companies',
 *   'industry',
 *   'contains',
 *   'Tech'
 * );
 */
export async function filterListEntriesByParent(
  listId: string,
  parentObjectType: string,
  parentAttributeSlug: string,
  condition: string,
  value: unknown,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!parentObjectType || typeof parentObjectType !== 'string') {
    throw new Error('Invalid parent object type: Must be a non-empty string');
  }

  if (!parentAttributeSlug || typeof parentAttributeSlug !== 'string') {
    throw new Error(
      'Invalid parent attribute slug: Must be a non-empty string'
    );
  }

  if (!condition || typeof condition !== 'string') {
    throw new Error('Invalid condition: Must be a non-empty string');
  }

  // Use direct API interaction to perform path-based filtering
  try {
    // Get API client
    const api = getLazyAttioClient();

    // Create path-based filter using our utility function
    const { path, constraints } = createPathBasedFilter(
      listId,
      parentObjectType,
      parentAttributeSlug,
      condition,
      value
    );

    // Construct the request payload
    const payload = {
      limit: limit,
      offset: offset,
      expand: ['record'],
      path,
      constraints,
    };

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger(
        'objects.lists',
        'filterListEntriesByParent'
      );
      log.info('Filtering with path-based filter', {
        listId,
        parentObjectType,
        parentAttributeSlug,
        condition,
        value,
        payload,
      });
    }

    // Create API URL endpoint
    const endpoint = `/lists/${listId}/entries/query`;

    // Make the API request
    const response = await api.post(endpoint, payload);

    // Process the entries to ensure record_id is properly set
    const entries = processListEntries(response.data.data || []);

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'filterListEntriesByParent').info(
        'Matching entries found',
        { count: entries.length }
      );
    }

    return entries;
  } catch (error) {
    // Enhanced error logging
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger(
        'objects.lists',
        'filterListEntriesByParent'
      );
      log.warn('Error filtering list entries', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid filter parameters: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    }

    throw error;
  }
}

/**
 * Filters list entries by parent record ID
 *
 * This is a specialized version of filterListEntriesByParent that specifically
 * filters by the record ID of the parent record, which is a common use case.
 *
 * @param listId - The ID of the list to filter entries from
 * @param recordId - The ID of the parent record to filter by
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of filtered list entries
 */
export async function filterListEntriesByParentId(
  listId: string,
  recordId: string,
  limit: number = 20,
  offset: number = 0
): Promise<AttioListEntry[]> {
  return filterListEntriesByParent(
    listId,
    'record', // This is a special case that will use just the parent_record path
    'record_id',
    'equals',
    recordId,
    limit,
    offset
  );
}

/**
 * Creates a new list in Attio
 *
 * @param attributes - List attributes including name, parent_object, etc.
 * @returns The created list
 */
export async function createList(
  attributes: Record<string, unknown>
): Promise<AttioList> {
  // Input validation
  if (!attributes || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  if (!attributes.name) {
    throw new Error('List name is required');
  }

  if (!attributes.parent_object) {
    throw new Error(
      'Parent object type is required (e.g., "companies", "people")'
    );
  }

  const api = getLazyAttioClient();
  const path = '/lists';

  try {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'createList').info(
        'Creating list with attributes',
        { attributes }
      );
    }

    const response = await api.post(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'createList').info(
        'Create list success',
        { data: response.data }
      );
    }

    // Extract and normalize response, handling undefined case
    const extracted = extract<AttioList>(response);

    // Use ensureListShape to normalize the response (handles undefined/null)
    return ensureListShape(extracted);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'createList');
      log.warn('Create list error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      throw new Error('Insufficient permissions to create list');
    }

    throw error;
  }
}

/**
 * Updates a list in Attio
 *
 * @param listId - The ID of the list to update
 * @param attributes - List attributes to update
 * @returns The updated list
 */
export async function updateList(
  listId: string,
  attributes: Record<string, unknown>
): Promise<AttioList> {
  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!attributes || typeof attributes !== 'object') {
    throw new Error('Invalid attributes: Must be a non-empty object');
  }

  const api = getLazyAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'updateList').info('Updating list', {
        listId,
        attributes,
      });
    }

    const response = await api.patch(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'updateList').info(
        'Update list success',
        { data: response.data }
      );
    }

    return extract<AttioList>(response);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'updateList');
      log.warn('Update list error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    } else if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${
          error instanceof Error ? error.message : 'Bad request'
        }`
      );
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      throw new Error(`Insufficient permissions to update list ${listId}`);
    }

    throw error;
  }
}

/**
 * Deletes a list in Attio
 *
 * @param listId - The ID of the list to delete
 * @returns True if successful
 */
export async function deleteList(listId: string): Promise<boolean> {
  // Input validation
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  const api = getLazyAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'deleteList').info('Deleting list', {
        listId,
      });
    }

    await api.delete(path);

    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      createScopedLogger('objects.lists', 'deleteList').info(
        'Delete list success',
        { listId }
      );
    }

    return true;
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      const { createScopedLogger } = await import('../utils/logger.js');
      const log = createScopedLogger('objects.lists', 'deleteList');
      log.warn('Delete list error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: hasErrorResponse(error) ? error.response?.status : undefined,
        data: hasErrorResponse(error) ? error.response?.data || {} : undefined,
      });
    }

    const status = error?.response?.status ?? error?.statusCode;
    if (status === 404) {
      throw new EnhancedApiError('Record not found', 404, path, 'DELETE', {
        resourceType: 'lists',
        recordId: String(listId),
        httpStatus: 404,
      });
    }
    const code = Number.isFinite(status) ? status : 500;
    throw new EnhancedApiError(
      error?.message ?? 'List deletion failed',
      code,
      path,
      'DELETE',
      {
        resourceType: 'lists',
        recordId: String(listId),
        httpStatus: code,
      }
    );
  }
}

/**
 * Searches for lists by query
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching lists
 */
export async function searchLists(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<AttioList[]> {
  // For now, we'll get all lists and filter client-side
  // since Attio API may not support direct list search
  const allLists = await getLists(undefined, 100);

  // Defensive programming: ensure we have an array to work with
  const listsArray = Array.isArray(allLists) ? allLists : [];

  const lowerQuery = query.toLowerCase();
  const filtered = listsArray.filter((list) => {
    // Ensure list is an object and has the expected properties
    if (!list || typeof list !== 'object') return false;

    const name = (list.name || '').toLowerCase();
    const description = (list.description || '').toLowerCase();
    return name.includes(lowerQuery) || description.includes(lowerQuery);
  });

  return filtered.slice(offset, offset + limit);
}

/**
 * Gets the attributes schema for lists
 *
 * @returns List attributes schema
 */
export async function getListAttributes(): Promise<Record<string, unknown>> {
  const api = getLazyAttioClient();
  const path = '/lists/attributes';

  try {
    const response = await api.get(path);
    return extract<Record<string, unknown>>(response);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getListAttributes] Error:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Return a default schema if the endpoint doesn't exist
    return {
      name: { type: 'string', required: true },
      parent_object: { type: 'string', required: true },
      description: { type: 'string', required: false },
    };
  }
}
