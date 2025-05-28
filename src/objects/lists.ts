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
import { AttioList, AttioListEntry, ResourceType } from '../types/attio.js';
import {
  processListEntries,
  transformFiltersToApiFormat,
} from '../utils/record-utils.js';

/**
 * Represents a list membership entry for a record
 */
export interface ListMembership {
  listId: string;
  listName: string;
  entryId: string;
  entryValues?: Record<string, any>;
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generic getLists failed: ${error.message || 'Unknown error'}`
      );
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generic getListDetails failed: ${error.message || 'Unknown error'}`
      );
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
        console.log(
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
        console.log(
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
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[tryMultipleListEntryEndpoints] [ERROR] Failed ${endpoint.method.toUpperCase()} ${
            endpoint.path
          }:`,
          error.message || 'Unknown error',
          {
            listId,
            limit,
            offset,
            hasFilters:
              filters && filters.filters ? filters.filters.length > 0 : false,
            endpoint: endpoint.method.toUpperCase(),
            path: endpoint.path,
            errorType: error.name || 'UnknownError',
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[getListEntries] Generic list entries failed: ${
          error.message || 'Unknown error'
        }`,
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
 * @param objectType - Optional object type ('companies', 'people', etc.)
 * @param initialValues - Optional initial values for the list entry (e.g., stage)
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string,
  recordId: string,
  objectType?: string,
  initialValues?: Record<string, any>
): Promise<AttioListEntry> {
  // Input validation to ensure required parameters
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }

  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
  }
  
  // Validate objectType if provided
  if (objectType && !Object.values(ResourceType).includes(objectType as ResourceType)) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new Error(`Invalid object type: "${objectType}". Must be one of: ${validTypes}`);
  }

  // Use the generic operation with fallback to direct implementation
  try {
    return await addGenericRecordToList(listId, recordId, objectType, initialValues);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generic addRecordToList failed: ${error.message || 'Unknown error'}`
      );
      console.log(
        `Falling back to direct implementation for list ${listId} and record ${recordId}`
      );
    }

    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries`;

    // Default object type to 'companies' if not specified
    const safeObjectType = objectType || 'companies';

    // Construct the proper API payload according to Attio API requirements
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
      console.log(
        `[addRecordToList:fallback] Request to ${path} with payload:`,
        JSON.stringify(payload)
      );
      console.log(`Object Type: ${safeObjectType}`);
      if (initialValues) {
        console.log(`Initial Values: ${JSON.stringify(initialValues)}`);
      }
    }

    try {
      const response = await api.post(path, payload);

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[addRecordToList:fallback] Success response:`,
          JSON.stringify(response.data || {})
        );
      }

      return response.data.data || response.data;
    } catch (error: any) {
      // Enhanced error handling for validation errors
      if (process.env.NODE_ENV === 'development') {
        console.error(`[addRecordToList] Error adding record ${recordId} to list ${listId}:`, 
          error.message || 'Unknown error');
        console.error('Status:', error.response?.status);
        console.error('Response data:', JSON.stringify(error.response?.data || {}));
        
        // Add additional debug information for validation errors
        if (error.response?.data?.validation_errors) {
          console.error('Validation errors:', JSON.stringify(error.response.data.validation_errors));
        }
      }
      
      // Add more context to the error message
      if (error.response?.status === 400) {
        const validationErrors = error.response?.data?.validation_errors || [];
        const errorDetails = validationErrors.map((e: any) => 
          `${e.path.join('.')}: ${e.message}`
        ).join('; ');
        
        throw new Error(`Validation error adding record to list: ${errorDetails || error.message}`);
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
  attributes: Record<string, any>
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generic updateListEntry failed: ${error.message || 'Unknown error'}`
      );
      console.log(
        `Falling back to direct implementation for list ${listId}, entry ${entryId}`
      );
    }

    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[updateListEntry:fallback] Request to ${path} with attributes:`,
        JSON.stringify(attributes)
      );
    }

    // Attio API expects updates to list entries in the 'data.values' structure
    // This follows the same pattern as record updates in crud.ts
    const response = await api.patch(path, {
      data: {
        values: attributes,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generic removeRecordFromList failed: ${
          error.message || 'Unknown error'
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
  if (objectType && !Object.values(ResourceType).includes(objectType as ResourceType)) {
    const validTypes = Object.values(ResourceType).join(', ');
    throw new Error(`Invalid object type: "${objectType}". Must be one of: ${validTypes}`);
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
      console.log(`[getRecordListMemberships] Found ${lists.length} ${objectType || ''} lists to check`);
    }
    
    // If no lists found, return empty array
    if (!lists || lists.length === 0) {
      return [];
    }
    
    // For each list, check entries in parallel using batch operation
    const listConfigs = lists.map(list => ({
      listId: list.id?.list_id || list.id,
      // Use the list name from the list object for later reference
      listName: list.name || list.title || 'Unnamed List',
      // Set a higher limit to ensure we catch the record if it exists
      limit: 100
    }));
    
    // Process lists in batches to avoid overwhelming the API
    // batchSize parameter allows customizing the concurrency level
    for (let i = 0; i < listConfigs.length; i += batchSize) {
      const batchLists = listConfigs.slice(i, i + batchSize);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getRecordListMemberships] Processing batch ${Math.floor(i/batchSize) + 1} (${batchLists.length} lists)`);
      }
      
      // For each list in the batch, get entries and check for record ID
      const promises = batchLists.map(async (listConfig) => {
        try {
          // Get entries for this list
          const entries = await getListEntries(listConfig.listId, listConfig.limit);
          
          // Filter entries to find those matching the record ID
          const matchingEntries = entries.filter(entry => entry.record_id === recordId);
          
          if (matchingEntries.length > 0) {
            // Process matching entries into ListMembership format
            matchingEntries.forEach(entry => {
              allMemberships.push({
                listId: listConfig.listId,
                listName: listConfig.listName,
                entryId: entry.id?.entry_id || '',
                // Include entry values if requested
                ...(includeEntryValues && { 
                  entryValues: entry.values || {} 
                })
              });
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log(
                `[getRecordListMemberships] Found ${matchingEntries.length} membership(s) in list "${listConfig.listName}"`
              );
            }
          }
        } catch (error: any) {
          // Log error but continue with other lists
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `[getRecordListMemberships] Error getting entries for list ${listConfig.listId}: ${error.message || 'Unknown error'}`
            );
          }
        }
      });
      
      // Wait for all promises in this batch to complete
      await Promise.all(promises);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getRecordListMemberships] Total memberships found: ${allMemberships.length}`);
    }
    
    return allMemberships;
  } catch (error: any) {
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[getRecordListMemberships] Error: ${error.message || 'Unknown error'}`
      );
    }
    throw error;
  }
}
