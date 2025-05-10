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
    return await searchObject<Person>(ResourceType.PEOPLE, query);
  } catch (error) {
    // Fallback implementation
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
    // Fallback implementation
    const api = getAttioClient();
    const path = `/objects/people/records/${personId}`;
    
    const response = await api.get(path);
    return response.data;
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
    const api = getAttioClient();
    const path = `/notes?limit=${limit}&offset=${offset}&parent_object=people&parent_record_id=${personId}`;
    
    const response = await api.get(path);
    return response.data.data || [];
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
  }
}
