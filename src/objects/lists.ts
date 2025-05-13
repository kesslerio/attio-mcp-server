/**
 * Lists-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { 
  getAllLists as getGenericLists,
  getListDetails as getGenericListDetails,
  getListEntries as getGenericListEntries,
  addRecordToList as addGenericRecordToList,
  removeRecordFromList as removeGenericRecordFromList,
  BatchConfig,
  BatchResponse,
  executeBatchOperations,
  BatchRequestItem,
  ListEntryFilters
} from "../api/attio-operations.js";
import { 
  AttioList, 
  AttioListEntry,
  ResourceType 
} from "../types/attio.js";
import { processListEntries, transformFiltersToApiFormat } from "../utils/record-utils.js";

/**
 * Gets all lists in the workspace
 * 
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @returns Array of list objects
 */
export async function getLists(objectSlug?: string, limit: number = 20): Promise<AttioList[]> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await getGenericLists(objectSlug, limit);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Generic getLists failed: ${error.message || 'Unknown error'}`);
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
      console.log(`Generic getListDetails failed: ${error.message || 'Unknown error'}`);
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
    "limit": limit, 
    "offset": offset,
    "expand": ["record"]
  };
  
  // Transform filters using our centralized utility function
  const filterData = transformFiltersToApiFormat(filters);
  
  // Setup endpoints with correct data
  const endpoints = [
    // Path 1: Direct query endpoint for the specific list with explicit parameters
    {
      method: 'post',
      path: `/lists/${listId}/entries/query`,
      data: { ...baseData, ...filterData }
    },
    // Path 2: General lists entries query endpoint with explicit parameters
    {
      method: 'post',
      path: `/lists-entries/query`,
      data: { 
        ...baseData,
        ...filterData,
        "list_id": listId
      }
    }
  ];
  
  // Only add the GET endpoint if we don't have filters, as it doesn't support them
  if (!filters || !filters.filters || filters.filters.length === 0) {
    endpoints.push({
      method: 'get',
      path: `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}&expand=record`,
      data: { ...baseData } // Copy baseData to ensure it has the required shape
    });
  }

  // Try each endpoint in sequence until one works
  for (const endpoint of endpoints) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Trying ${endpoint.method.toUpperCase()} ${endpoint.path}`, 
                    endpoint.data ? JSON.stringify(endpoint.data) : '');
      }
      
      const response = endpoint.method === 'post'
        ? await api.post(endpoint.path, endpoint.data)
        : await api.get(endpoint.path);
      
      // Process the response to extract record IDs properly
      const entries = response.data.data || [];
      
      // Check if entries were found and log for debugging
      if (process.env.NODE_ENV === 'development') {
        const messageType = entries.length > 0 ? 'SUCCESS' : 'WARNING';
        console.log(`[tryMultipleListEntryEndpoints] [${messageType}] Found ${entries.length} entries via ${endpoint.method.toUpperCase()} ${endpoint.path}`, {
          listId,
          limit,
          offset,
          hasFilters: filters && filters.filters ? filters.filters.length > 0 : false,
          entryCount: entries.length,
          endpoint: endpoint.method.toUpperCase()
        });
      }
      
      // Process entries to ensure record_id is properly set from the utils function
      return processListEntries(entries);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[tryMultipleListEntryEndpoints] [ERROR] Failed ${endpoint.method.toUpperCase()} ${endpoint.path}:`, 
                    error.message || 'Unknown error', {
          listId,
          limit,
          offset,
          hasFilters: filters && filters.filters ? filters.filters.length > 0 : false,
          endpoint: endpoint.method.toUpperCase(),
          path: endpoint.path,
          errorType: error.name || 'UnknownError'
        });
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
      console.log(`[getListEntries] Generic list entries failed: ${error.message || 'Unknown error'}`, {
        method: 'getGenericListEntries',
        listId,
        limit,
        offset,
        hasFilters: filters && filters.filters ? filters.filters.length > 0 : false
      });
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
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string, 
  recordId: string
): Promise<AttioListEntry> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await addGenericRecordToList(listId, recordId);
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Generic addRecordToList failed: ${error.message || 'Unknown error'}`);
    }
    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries`;
    
    const response = await api.post(path, {
      record_id: recordId
    });
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
      console.log(`Generic removeRecordFromList failed: ${error.message || 'Unknown error'}`);
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
    id: `get_list_${listId}`
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
  const operations: BatchRequestItem<{ listId: string; limit?: number; offset?: number }>[] = 
    listConfigs.map((config, index) => ({
      params: config,
      id: `get_list_entries_${config.listId}_${index}`
    }));
  
  // Execute batch operations
  return executeBatchOperations<{ listId: string; limit?: number; offset?: number }, AttioListEntry[]>(
    operations,
    (params) => getListEntries(params.listId, params.limit, params.offset),
    batchConfig
  );
}