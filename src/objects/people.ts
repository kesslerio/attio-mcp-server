/**
 * People-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { 
  searchObject, 
  listObjects, 
  getObjectDetails, 
  getObjectNotes, 
  createObjectNote 
} from "../api/attio-operations.js";
import { 
  ResourceType, 
  Person, 
  AttioNote 
} from "../types/attio.js";

/**
 * Searches for people by name, email, or phone number
 * 
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeople(query: string): Promise<Person[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await searchPeopleByQuery(query);
  } catch (error) {
    // Just rethrow the error if it's from our own implementation
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation
    try {
      const api = getAttioClient();
      const path = "/objects/people/records/query";
      
      const response = await api.post(path, {
        filter: {
          "$or": [
            { name: { "$contains": query } },
            { email: { "$contains": query } },
            { phone: { "$contains": query } }
          ]
        }
      });
      return response.data.data || [];
    } catch (fallbackError) {
      // Ensure we pass through the original error
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Searches for people by name, email, or phone number using an OR filter
 * 
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeopleByQuery(query: string): Promise<Person[]> {
  const api = getAttioClient();
  const path = "/objects/people/records/query";
  
  try {
    const response = await api.post(path, {
      filter: {
        "$or": [
          { name: { "$contains": query } },
          { email: { "$contains": query } },
          { phone: { "$contains": query } }
        ]
      }
    });
    return response.data.data || [];
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Searches specifically for people by email
 * 
 * @param email - Email address to search for
 * @returns Array of person results
 */
export async function searchPeopleByEmail(email: string): Promise<Person[]> {
  const api = getAttioClient();
  const path = "/objects/people/records/query";
  
  try {
    const response = await api.post(path, {
      filter: {
        email: { "$contains": email }
      }
    });
    return response.data.data || [];
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Searches specifically for people by phone number
 * 
 * @param phone - Phone number to search for
 * @returns Array of person results
 */
export async function searchPeopleByPhone(phone: string): Promise<Person[]> {
  const api = getAttioClient();
  const path = "/objects/people/records/query";
  
  try {
    const response = await api.post(path, {
      filter: {
        phone: { "$contains": phone }
      }
    });
    return response.data.data || [];
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));

  }
}

/**
 * Lists people sorted by most recent interaction
 * 
 * @param limit - Maximum number of people to return (default: 20)
 * @returns Array of person results
 */
export async function listPeople(limit: number = 20): Promise<Person[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await listObjects<Person>(ResourceType.PEOPLE, limit);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    
    const response = await api.post(path, {
      limit,
      sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
    });
    return response.data.data || [];
  }
}

/**
 * Gets details for a specific person
 * 
 * @param personId - The ID of the person
 * @returns Person details
 */
export async function getPersonDetails(personId: string): Promise<Person> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await getObjectDetails<Person>(ResourceType.PEOPLE, personId);
  } catch (error) {
    // If it's an error from the original implementation, just pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation
    try {
      const api = getAttioClient();
      const path = `/objects/people/records/${personId}`;
      
      const response = await api.get(path);
      if (response && response.data) {
        return response.data;
      }
      throw new Error(`No data returned for person ${personId}`);
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Gets notes for a specific person
 * 
 * @param personId - The ID of the person
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export async function getPersonNotes(personId: string, limit: number = 10, offset: number = 0): Promise<AttioNote[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await getObjectNotes(ResourceType.PEOPLE, personId, limit, offset);
  } catch (error) {
    // Fallback implementation
    try {
      const api = getAttioClient();
      const path = `/notes?limit=${limit}&offset=${offset}&parent_object=people&parent_record_id=${personId}`;
      
      const response = await api.get(path);
      return response.data.data || [];
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}

/**
 * Creates a note for a specific person
 * 
 * @param personId - The ID of the person
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export async function createPersonNote(personId: string, title: string, content: string): Promise<AttioNote> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await createObjectNote(ResourceType.PEOPLE, personId, title, content);
  } catch (error) {
    // Fallback implementation
    try {
      const api = getAttioClient();
      const path = 'notes';
      
      const response = await api.post(path, {
        data: {
          format: "plaintext",
          parent_object: "people",
          parent_record_id: personId,
          title: `[AI] ${title}`,
          content
        },
      });
      return response.data;
    } catch (fallbackError) {
      throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
    }
  }
}