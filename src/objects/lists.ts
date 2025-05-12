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
} from "../api/attio-operations.js";
import { 
  AttioList, 
  AttioListEntry,
  ResourceType 
} from "../types/attio.js";

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
  } catch (error) {
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
 * @returns Array of list entries
 */
async function tryMultipleListEntryEndpoints(
  listId: string,
  limit: number,
  offset: number
): Promise<AttioListEntry[]> {
  const api = getAttioClient();
  const endpoints = [
    // Path 1: Direct query endpoint for the specific list
    {
      method: 'post',
      path: `/lists/${listId}/entries/query`,
      data: { limit, offset }
    },
    // Path 2: General lists entries query endpoint
    {
      method: 'post',
      path: `/lists-entries/query`,
      data: { list_id: listId, limit, offset }
    },
    // Path 3: GET request on lists-entries
    {
      method: 'get',
      path: `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}`,
      data: null
    }
  ];

  // Try each endpoint in sequence until one works
  for (const endpoint of endpoints) {
    try {
      const response = endpoint.method === 'post'
        ? await api.post(endpoint.path, endpoint.data)
        : await api.get(endpoint.path);
      
      return response.data.data || [];
    } catch (error) {
      // Continue to next endpoint on failure
      continue;
    }
  }
  
  // If all endpoints fail, return empty array
  return [];
}

/**
 * Gets entries for a specific list
 * 
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string, 
  limit: number = 20, 
  offset: number = 0
): Promise<AttioListEntry[]> {
  // Use the generic operation with fallback to direct implementation
  try {
    return await getGenericListEntries(listId, limit, offset);
  } catch (error) {
    // Fallback to multi-endpoint utility function
    return await tryMultipleListEntryEndpoints(listId, limit, offset);
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
  } catch (error) {
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
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = `/lists/${listId}/entries/${entryId}`;
    
    await api.delete(path);
    return true;
  }
}