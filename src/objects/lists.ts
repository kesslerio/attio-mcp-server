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
 * @returns Array of list entries
 */
async function tryMultipleListEntryEndpoints(
  listId: string,
  limit: number,
  offset: number
): Promise<AttioListEntry[]> {
  const api = getAttioClient();
  const endpoints = [
    // Path 1: Direct query endpoint for the specific list with explicit parameters
    {
      method: 'post',
      path: `/lists/${listId}/entries/query`,
      data: { 
        "limit": limit, 
        "offset": offset,
        "expand": ["record"]
      }
    },
    // Path 2: General lists entries query endpoint with explicit parameters
    {
      method: 'post',
      path: `/lists-entries/query`,
      data: { 
        "list_id": listId, 
        "limit": limit, 
        "offset": offset,
        "expand": ["record"]
      }
    },
    // Path 3: GET request on lists-entries with explicit query parameters
    {
      method: 'get',
      path: `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}&expand=record`,
      data: null
    }
  ];

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
      if (process.env.NODE_ENV === 'development' && entries.length > 0) {
        console.log(`Found ${entries.length} entries via ${endpoint.method.toUpperCase()} ${endpoint.path}`);
      }
      
      // Process entries to ensure record_id is properly set
      return processEntries(entries);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Failed ${endpoint.method.toUpperCase()} ${endpoint.path}:`, 
                    error.message || 'Unknown error');
      }
      // Continue to next endpoint on failure
      continue;
    }
  }
  
  // If all endpoints fail, return empty array
  return [];
}

/**
 * Process list entries to extract record IDs and handle complex objects
 * 
 * @param entries - Raw list entries from API
 * @returns Processed entries with properly extracted record IDs
 */
function processEntries(entries: any[]): AttioListEntry[] {
  return entries.map(entry => {
    let recordId = null;
    
    // Try multiple potential paths to find the record ID
    if (entry.record_id) {
      recordId = entry.record_id;
    } else if (entry.record?.id?.record_id) {
      recordId = entry.record.id.record_id;
    } else if (entry.values?.record?.id?.record_id) {
      recordId = entry.values.record.id.record_id;
    } else {
      // Search for any property that might contain the record ID
      for (const key of Object.keys(entry)) {
        if (key.includes('record_id') && typeof entry[key] === 'string') {
          recordId = entry[key];
          break;
        }
      }
    }
    
    // Format the entry with the extracted record ID
    return {
      ...entry,
      record_id: recordId,
      // Ensure the ID is properly formatted as a string to avoid [object Object]
      id: typeof entry.id === 'object' ? 
          { entry_id: entry.id.entry_id || entry.id.id || entry.id.toString() } : 
          { entry_id: String(entry.id) }
    };
  });
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
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Generic list entries failed: ${error.message || 'Unknown error'}`);
    }
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