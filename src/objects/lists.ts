/**
 * Lists-related functionality
 */
import { getAttioClient } from '../api/attio-client.js';
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

// Re-export for backward compatibility
export type { ListMembership } from '../types/list-types.js';

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
      console.error(`Generic getLists failed: ${errorMessage}`);
    }
    // Fallback implementation
    const api = getAttioClient();
    let path = `/lists?limit=${limit}`;

    if (objectSlug) {
      path += `&objectSlug=${objectSlug}`;
    }

    const response = await api.get(path);
    return response.data.data || [];
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
      console.error(`Generic getListDetails failed: ${errorMessage}`);
    }
    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}`;

    const response = await api.get(path);
    return response.data.data || response.data;
  }
}

/**
 * Utility function to attempt multiple API endpoints for list entries
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch
 * @param offset - Number of entries to skip
 * @param filters - Optional filters to apply to list entries
 * @returns Array of list entries
 */
async function tryMultipleListEntryEndpoints(
  listId: string,
  limit: number,
  offset: number,
  filters?: ListEntryFilters
): Promise<AttioListEntry[]> {
  const api = getAttioClient();

  // Prepare the base data for POST requests
  const baseData = {
    limit: limit,
    offset: offset,
    expand: ['record'],
  };

  // Transform filters using our centralized utility function
  const filterData = transformFiltersToApiFormat(filters);

  // Setup endpoints with correct data
  const endpoints = [
    // Path 1: Direct query endpoint for the specific list with explicit parameters
    {
      method: 'post',
      path: `/lists/${listId}/entries/query`,
      data: { ...baseData, ...filterData },
    },
    // Path 2: General lists entries query endpoint with explicit parameters
    {
      method: 'post',
      path: `/lists-entries/query`,
      data: {
        ...baseData,
        ...filterData,
        list_id: listId,
      },
    },
  ];

  // Only add the GET endpoint if we don't have filters, as it doesn't support them
  if (!filters || !filters.filters || filters.filters.length === 0) {
    endpoints.push({
      method: 'get',
      path: `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}&expand=record`,
      data: { ...baseData }, // Copy baseData to ensure it has the required shape
    });
  }

  // Try each endpoint in sequence until one works
  for (const endpoint of endpoints) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `Trying ${endpoint.method.toUpperCase()} ${endpoint.path}`,
          endpoint.data ? JSON.stringify(endpoint.data) : ''
        );
      }

      const response =
        endpoint.method === 'post'
          ? await api.post(endpoint.path, endpoint.data)
          : await api.get(endpoint.path);

      // Process the response to extract record IDs properly
      const entries = response.data.data || [];

      // Check if entries were found and log for debugging
      if (process.env.NODE_ENV === 'development') {
        const messageType = entries.length > 0 ? 'SUCCESS' : 'WARNING';
        console.error(
          `[tryMultipleListEntryEndpoints] [${messageType}] Found ${
            entries.length
          } entries via ${endpoint.method.toUpperCase()} ${endpoint.path}`,
          {
            listId,
            limit,
            offset,
            hasFilters:
              filters && filters.filters ? filters.filters.length > 0 : false,
            entryCount: entries.length,
            endpoint: endpoint.method.toUpperCase(),
          }
        );
      }

      // Process entries to ensure record_id is properly set from the utils function
      return processListEntries(entries);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[tryMultipleListEntryEndpoints] [ERROR] Failed ${endpoint.method.toUpperCase()} ${
            endpoint.path
          }:`,
          errorMessage,
          {
            listId,
            limit,
            offset,
            hasFilters:
              filters && filters.filters ? filters.filters.length > 0 : false,
            endpoint: endpoint.method.toUpperCase(),
            path: endpoint.path,
            errorType: errorName,
          }
        );
      }
      // Continue to next endpoint on failure
      continue;
    }
  }

  // If all endpoints fail, return empty array
  return [];
}

// We no longer need this function as we use processListEntries from record-utils.js

/**
 * Gets entries for a specific list
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
  // Use the generic operation with fallback to direct implementation
  try {
    return await getGenericListEntries(listId, limit, offset, filters);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getListEntries] Generic list entries failed: ${errorMessage}`,
        {
          method: 'getGenericListEntries',
          listId,
          limit,
          offset,
          hasFilters:
            filters && filters.filters ? filters.filters.length > 0 : false,
        }
      );
    }
    // Fallback to our multi-endpoint utility function with enhanced filter support
    return await tryMultipleListEntryEndpoints(listId, limit, offset, filters);
  }
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
      console.error(
        `Generic addRecordToList failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error(
        `Falling back to direct implementation for list ${listId} and record ${recordId}`
      );
    }

    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries`;

    // Construct the proper API payload according to Attio API requirements
    // The API expects parent_record_id, parent_object, and optionally entry_values
    const payload = {
      data: {
        parent_record_id: recordId,
        parent_object: objectType,
        // Only include entry_values if initialValues is provided
        ...(initialValues && { entry_values: initialValues }),
      },
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[addRecordToList:fallback] Request to ${path} with payload:`,
        JSON.stringify(payload)
      );
      console.error(`Object Type: ${objectType}`);
      if (initialValues) {
        console.error(`Initial Values: ${JSON.stringify(initialValues)}`);
      }
    }

    try {
      const response = await api.post(path, payload);

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[addRecordToList:fallback] Success response:`,
          JSON.stringify(response.data || {})
        );
      }

      return response.data.data || response.data;
    } catch (error) {
      // Enhanced error handling for validation errors
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[addRecordToList] Error adding record ${recordId} to list ${listId}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );

        if (hasErrorResponse(error)) {
          console.error('Status:', error.response?.status);
          console.error(
            'Response data:',
            JSON.stringify(error.response?.data || {})
          );

          // Add additional debug information for validation errors
          if (error.response?.data?.validation_errors) {
            console.error(
              'Validation errors:',
              JSON.stringify(error.response.data.validation_errors)
            );
          }
        }
      }

      // Add more context to the error message
      if (hasErrorResponse(error) && error.response?.status === 400) {
        const validationErrors = error.response?.data?.validation_errors || [];
        const errorDetails = validationErrors
          .map((e) => {
            return `${e.path?.join('.') || 'unknown'}: ${e.message || 'unknown'}`;
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
      console.error(
        `Generic updateListEntry failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error(
        `Falling back to direct implementation for list ${listId}, entry ${entryId}`
      );
    }

    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[updateListEntry:fallback] Request to ${path} with attributes:`,
        JSON.stringify(attributes)
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
      console.error(
        `[updateListEntry:fallback] Success response:`,
        JSON.stringify(response.data || {})
      );
    }

    return response.data.data || response.data;
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
      console.error(
        `Generic removeRecordFromList failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
    // Fallback implementation
    const api = getAttioClient();
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
  // Input validation
  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
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

  // Validate batchSize
  if (typeof batchSize !== 'number' || batchSize < 1 || batchSize > 20) {
    throw new Error('Invalid batch size: Must be a number between 1 and 20');
  }

  const allMemberships: ListMembership[] = [];

  try {
    // First get all lists in the workspace
    // If objectType is provided, filter lists by that object type
    const lists = await getLists(objectType);

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getRecordListMemberships] Found ${lists.length} ${
          objectType || ''
        } lists to check`
      );
    }

    // If no lists found, return empty array
    if (!lists || lists.length === 0) {
      return [];
    }

    // For each list, check entries in parallel using batch operation
    const listConfigs = lists.map((list) => ({
      listId: list.id?.list_id || (typeof list.id === 'string' ? list.id : ''),
      // Use the list name from the list object for later reference
      listName: list.name || list.title || 'Unnamed List',
      // Set a higher limit to ensure we catch the record if it exists
      limit: 100,
    }));

    // Process lists in batches to avoid overwhelming the API
    // batchSize parameter allows customizing the concurrency level
    for (let i = 0; i < listConfigs.length; i += batchSize) {
      const batchLists = listConfigs.slice(i, i + batchSize);

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[getRecordListMemberships] Processing batch ${
            Math.floor(i / batchSize) + 1
          } (${batchLists.length} lists)`
        );
      }

      // For each list in the batch, get entries and check for record ID
      const promises = batchLists.map(async (listConfig) => {
        try {
          // Get entries for this list
          const entries = await getListEntries(
            listConfig.listId,
            listConfig.limit
          );

          // Filter entries to find those matching the record ID
          const matchingEntries = entries.filter(
            (entry) => entry.record_id === recordId
          );

          if (matchingEntries.length > 0) {
            // Process matching entries into ListMembership format
            matchingEntries.forEach((entry) => {
              allMemberships.push({
                listId: listConfig.listId,
                listName: listConfig.listName,
                entryId: entry.id?.entry_id || '',
                // Include entry values if requested
                ...(includeEntryValues && {
                  entryValues: entry.values || {},
                }),
              });
            });

            if (process.env.NODE_ENV === 'development') {
              console.error(
                `[getRecordListMemberships] Found ${matchingEntries.length} membership(s) in list "${listConfig.listName}"`
              );
            }
          }
        } catch (error) {
          // Log error but continue with other lists
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `[getRecordListMemberships] Error getting entries for list ${
                listConfig.listId
              }: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      });

      // Wait for all promises in this batch to complete
      await Promise.all(promises);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getRecordListMemberships] Total memberships found: ${allMemberships.length}`
      );
    }

    return allMemberships;
  } catch (error) {
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getRecordListMemberships] Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    throw error;
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
    const api = getAttioClient();

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
      console.error(
        `[filterListEntriesByParent] Filtering list ${listId} with path-based filter:`
      );
      console.error(`- Parent Object Type: ${parentObjectType}`);
      console.error(`- Parent Attribute: ${parentAttributeSlug}`);
      console.error(`- Condition: ${condition}`);
      console.error(`- Value: ${JSON.stringify(value)}`);
      console.error(`- Request payload: ${JSON.stringify(payload)}`);
    }

    // Create API URL endpoint
    const endpoint = `/lists/${listId}/entries/query`;

    // Make the API request
    const response = await api.post(endpoint, payload);

    // Process the entries to ensure record_id is properly set
    const entries = processListEntries(response.data.data || []);

    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[filterListEntriesByParent] Found ${entries.length} matching entries`
      );
    }

    return entries;
  } catch (error) {
    // Enhanced error logging
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[filterListEntriesByParent] Error filtering list entries: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );

      if (hasErrorResponse(error)) {
        console.error('Status:', error.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response?.data || {})
        );
      }
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid filter parameters: ${error instanceof Error ? error.message : 'Bad request'}`
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

  const api = getAttioClient();
  const path = '/lists';

  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[createList] Creating list with attributes:`,
        JSON.stringify(attributes)
      );
    }

    const response = await api.post(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      console.error(`[createList] Success:`, JSON.stringify(response.data));
    }

    return response.data.data || response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[createList] Error:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (hasErrorResponse(error)) {
        console.error('Status:', error.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response?.data || {})
        );
      }
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${error instanceof Error ? error.message : 'Bad request'}`
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

  const api = getAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[updateList] Updating list ${listId} with attributes:`,
        JSON.stringify(attributes)
      );
    }

    const response = await api.patch(path, {
      data: attributes,
    });

    if (process.env.NODE_ENV === 'development') {
      console.error(`[updateList] Success:`, JSON.stringify(response.data));
    }

    return response.data.data || response.data;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[updateList] Error:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (hasErrorResponse(error)) {
        console.error('Status:', error.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response?.data || {})
        );
      }
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    } else if (hasErrorResponse(error) && error.response?.status === 400) {
      throw new Error(
        `Invalid list attributes: ${error instanceof Error ? error.message : 'Bad request'}`
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

  const api = getAttioClient();
  const path = `/lists/${listId}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[deleteList] Deleting list ${listId}`);
    }

    await api.delete(path);

    if (process.env.NODE_ENV === 'development') {
      console.error(`[deleteList] Success: List ${listId} deleted`);
    }

    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[deleteList] Error:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (hasErrorResponse(error)) {
        console.error('Status:', error.response?.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response?.data || {})
        );
      }
    }

    // Add context to error message
    if (hasErrorResponse(error) && error.response?.status === 404) {
      throw new Error(`List ${listId} not found`);
    } else if (hasErrorResponse(error) && error.response?.status === 403) {
      throw new Error(`Insufficient permissions to delete list ${listId}`);
    }

    throw error;
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

  const lowerQuery = query.toLowerCase();
  const filtered = allLists.filter((list) => {
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
  const api = getAttioClient();
  const path = '/lists/attributes';

  try {
    const response = await api.get(path);
    return response.data.data || response.data || [];
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
