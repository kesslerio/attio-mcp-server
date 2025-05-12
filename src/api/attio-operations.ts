import { getAttioClient } from "./attio-client.js";
import { 
  AttioRecord, 
  AttioNote, 
  ResourceType, 
  AttioListResponse,
  AttioSingleResponse,
  Person,
  Company,
  AttioList,
  AttioListEntry
} from "../types/attio.js";

/**
 * Generic function to search any object type by name and other fields
 * 
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @returns Array of matching records
 */
export async function searchObject<T extends AttioRecord>(
  objectType: ResourceType, 
  query: string
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/query`;
  
  try {
    // Create a search filter that looks in multiple fields
    const searchFilter = objectType === ResourceType.PEOPLE 
      ? {
          "$or": [
            { name: { "$contains": query } },
            { email: { "$contains": query } },
            { phone: { "$contains": query } }
          ]
        }
      : {
          // For companies or other object types, default to name search
          name: { "$contains": query }
        };
    
    const response = await api.post<AttioListResponse<T>>(path, {
      filter: searchFilter
    });
    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`No ${objectType} found matching '${query}'`);
    }
    throw error;
  }
}

/**
 * Generic function to list any object type with pagination and sorting
 * 
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @returns Array of records
 */
export async function listObjects<T extends AttioRecord>(
  objectType: ResourceType, 
  limit: number = 20
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/query`;
  
  try {
    const response = await api.post<AttioListResponse<T>>(path, {
      limit,
      sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
    });
    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(`Invalid parameters when listing ${objectType}`);
    }
    throw error;
  }
}

/**
 * Generic function to get details for a specific record
 * 
 * @param objectType - The type of object to get (people or companies)
 * @param recordId - ID of the record
 * @returns Record details
 */
export async function getObjectDetails<T extends AttioRecord>(
  objectType: ResourceType, 
  recordId: string
): Promise<T> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/${recordId}`;
  
  try {
    const response = await api.get<AttioSingleResponse<T>>(path);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`${objectType.charAt(0).toUpperCase() + objectType.slice(1, -1)} with ID ${recordId} not found`);
    }
    throw error;
  }
}

/**
 * Generic function to get notes for a specific record
 * 
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param limit - Maximum number of notes to return
 * @param offset - Number of notes to skip
 * @returns Array of notes
 */
export async function getObjectNotes(
  objectType: ResourceType, 
  recordId: string, 
  limit: number = 10, 
  offset: number = 0
): Promise<AttioNote[]> {
  const api = getAttioClient();
  const path = `/notes?limit=${limit}&offset=${offset}&parent_object=${objectType}&parent_record_id=${recordId}`;
  
  try {
    const response = await api.get<AttioListResponse<AttioNote>>(path);
    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Notes for ${objectType.slice(0, -1)} ${recordId} not found`);
    }
    throw error;
  }
}

/**
 * Generic function to create a note for any object type
 * 
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param noteTitle - Title of the note
 * @param noteText - Content of the note
 * @returns Created note
 */
export async function createObjectNote(
  objectType: ResourceType, 
  recordId: string, 
  noteTitle: string, 
  noteText: string
): Promise<AttioNote> {
  const api = getAttioClient();
  const path = "/notes";
  
  try {
    const response = await api.post<AttioSingleResponse<AttioNote>>(path, {
      data: {
        format: "plaintext",
        parent_object: objectType,
        parent_record_id: recordId,
        title: `[AI] ${noteTitle}`,
        content: noteText
      },
    });
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(`Failed to create note: ${error.response.data.message || 'Invalid parameters'}`);
    } else if (error.response?.status === 404) {
      throw new Error(`${objectType.charAt(0).toUpperCase() + objectType.slice(1, -1)} with ID ${recordId} not found`);
    }
    throw error;
  }
}

/**
 * Gets all lists in the workspace
 * 
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @returns Array of list objects
 */
export async function getAllLists(
  objectSlug?: string, 
  limit: number = 20
): Promise<AttioList[]> {
  const api = getAttioClient();
  let path = `/lists?limit=${limit}`;
  
  if (objectSlug) {
    path += `&objectSlug=${objectSlug}`;
  }
  
  try {
    const response = await api.get<AttioListResponse<AttioList>>(path);
    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error('Invalid parameters when fetching lists');
    }
    throw error;
  }
}

/**
 * Gets details for a specific list
 * 
 * @param listId - The ID of the list
 * @returns List details
 */
export async function getListDetails(
  listId: string
): Promise<AttioList> {
  const api = getAttioClient();
  const path = `/lists/${listId}`;
  
  try {
    const response = await api.get<AttioSingleResponse<AttioList>>(path);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`List with ID ${listId} not found`);
    }
    throw error;
  }
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
  const api = getAttioClient();
  
  // Try the primary endpoint first
  try {
    const path = `/lists/${listId}/entries/query`;
    const response = await api.post<AttioListResponse<AttioListEntry>>(path, {
      limit,
      offset
    });
    return response.data.data || [];
  } catch (primaryError) {
    // Try fallback endpoints
    try {
      const fallbackPath = `/lists-entries/query`;
      const fallbackResponse = await api.post<AttioListResponse<AttioListEntry>>(fallbackPath, {
        list_id: listId,
        limit,
        offset
      });
      return fallbackResponse.data.data || [];
    } catch (fallbackError) {
      // Last resort fallback
      try {
        const lastPath = `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}`;
        const lastResponse = await api.get<AttioListResponse<AttioListEntry>>(lastPath);
        return lastResponse.data.data || [];
      } catch (lastError: any) {
        if (lastError.response?.status === 404) {
          throw new Error(`List entries for list ${listId} not found`);
        }
        throw lastError;
      }
    }
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
  const api = getAttioClient();
  const path = `/lists/${listId}/entries`;
  
  try {
    const response = await api.post<AttioSingleResponse<AttioListEntry>>(path, {
      record_id: recordId
    });
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error(`Failed to add record: ${error.response.data.message || 'Invalid parameters'}`);
    } else if (error.response?.status === 404) {
      throw new Error(`List with ID ${listId} not found`);
    }
    throw error;
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
  const api = getAttioClient();
  const path = `/lists/${listId}/entries/${entryId}`;
  
  try {
    await api.delete(path);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`List entry ${entryId} in list ${listId} not found`);
    }
    throw error;
  }
}