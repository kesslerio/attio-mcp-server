/**
 * People-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { 
  searchObject,
  advancedSearchObject,
  listObjects, 
  getObjectDetails, 
  getObjectNotes, 
  createObjectNote,
  batchSearchObjects,
  batchGetObjectDetails,
  BatchConfig,
  BatchResponse,
  ListEntryFilters,
  ListEntryFilter
} from "../api/attio-operations.js";
import { 
  ResourceType, 
  Person, 
  AttioNote,
  FilterConditionType
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
      
      // Use only the name filter as it's the most reliable
      // Email and phone are accessed through a nested structure
      const response = await api.post(path, {
        filter: {
          name: { "$contains": query }
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
    // Use only name filter to avoid the 'unknown attribute slug: email' error
    // The API needs a different structure for accessing email and phone
    const response = await api.post(path, {
      filter: {
        name: { "$contains": query }
      }
    });
    
    // Post-processing to filter by email/phone if the query looks like it might be one
    let results = response.data.data || [];
    
    // If it looks like an email, do client-side filtering
    if (query.includes('@') && results.length > 0) {
      results = results.filter((person: Person) => 
        person.values?.email?.some((email: {value: string}) => 
          email.value?.toLowerCase().includes(query.toLowerCase())
        )
      );
    }
    
    return results;
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
    // Fetch all people and filter client-side by email
    // This avoids the 'unknown attribute slug: email' error
    // In a production environment with many records, we would need pagination
    const response = await api.post(path, {
      // We're intentionally not filtering server-side due to API limitations
      // with the email attribute structure
      limit: 100 // Increased limit to get more potential matches
    });
    
    // Filter the results client-side by email
    const results = (response.data.data || []) as Person[];
    return results.filter((person: Person) => 
      person.values?.email?.some((emailObj: {value: string}) => 
        emailObj.value?.toLowerCase().includes(email.toLowerCase())
      )
    );
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
    // Fetch all people and filter client-side by phone
    // This avoids the 'unknown attribute slug: phone' error
    // Similar approach to searchPeopleByEmail
    const response = await api.post(path, {
      // We're intentionally not filtering server-side due to API limitations
      // with the phone attribute structure
      limit: 100 // Increased limit to get more potential matches
    });
    
    // Filter the results client-side by phone
    const results = (response.data.data || []) as Person[];
    return results.filter((person: Person) => 
      person.values?.phone?.some((phoneObj: {value: string}) => 
        phoneObj.value?.toLowerCase().includes(phone.toLowerCase())
      )
    );
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

/**
 * Performs batch searches for people by name, email, or phone
 * 
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export async function batchSearchPeople(
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person[]>> {
  try {
    // Use the generic batch search objects operation
    return await batchSearchObjects<Person>(ResourceType.PEOPLE, queries, batchConfig);
  } catch (error) {
    // If the error is serious enough to abort the batch, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation - execute each search individually and combine results
    const results: BatchResponse<Person[]> = {
      results: [],
      summary: {
        total: queries.length,
        succeeded: 0,
        failed: 0
      }
    };
    
    // Process each query individually
    await Promise.all(queries.map(async (query, index) => {
      try {
        const people = await searchPeople(query);
        results.results.push({
          id: `search_people_${index}`,
          success: true,
          data: people
        });
        results.summary.succeeded++;
      } catch (searchError) {
        results.results.push({
          id: `search_people_${index}`,
          success: false,
          error: searchError
        });
        results.summary.failed++;
      }
    }));
    
    return results;
  }
}

/**
 * Gets details for multiple people in batch
 * 
 * @param personIds - Array of person IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with person details for each ID
 */
export async function batchGetPeopleDetails(
  personIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<Person>> {
  try {
    // Use the generic batch get object details operation
    return await batchGetObjectDetails<Person>(ResourceType.PEOPLE, personIds, batchConfig);
  } catch (error) {
    // If the error is serious enough to abort the batch, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    
    // Fallback implementation - execute each get operation individually and combine results
    const results: BatchResponse<Person> = {
      results: [],
      summary: {
        total: personIds.length,
        succeeded: 0,
        failed: 0
      }
    };
    
    // Process each personId individually
    await Promise.all(personIds.map(async (personId) => {
      try {
        const person = await getPersonDetails(personId);
        results.results.push({
          id: `get_people_${personId}`,
          success: true,
          data: person
        });
        results.summary.succeeded++;
      } catch (getError) {
        results.results.push({
          id: `get_people_${personId}`,
          success: false,
          error: getError
        });
        results.summary.failed++;
      }
    }));
    
    return results;
  }
}

/**
 * Search for people using advanced filtering capabilities
 * 
 * @param filters - Filter conditions to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching person records
 */
export async function advancedSearchPeople(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<Person[]> {
  try {
    return await advancedSearchObject<Person>(
      ResourceType.PEOPLE,
      filters,
      limit,
      offset
    );
  } catch (error) {
    // Handle specific API limitations for email and phone filtering
    if (error instanceof Error && 
        (error.message.includes('unknown attribute slug: email') || 
         error.message.includes('unknown attribute slug: phone'))) {
      
      // If the error is related to email/phone filtering, try client-side filtering
      // First, determine what filter criteria to handle server-side vs. client-side
      const emailFilter = filters.filters?.find(f => f.attribute.slug === 'email');
      const phoneFilter = filters.filters?.find(f => f.attribute.slug === 'phone');
      
      // Create a new filter that excludes email and phone
      const serverFilters: ListEntryFilters = {
        ...filters,
        filters: filters.filters?.filter(f => 
          f.attribute.slug !== 'email' && f.attribute.slug !== 'phone'
        ) || []
      };
      
      // Fetch data from server with remaining filters
      const results = await advancedSearchObject<Person>(
        ResourceType.PEOPLE,
        serverFilters,
        // Increase limit to account for client-side filtering reducing results
        emailFilter || phoneFilter ? Math.max(100, limit || 100) : limit,
        offset
      );
      
      // Apply email filtering client-side
      let filteredResults = results;
      
      if (emailFilter) {
        filteredResults = filteredResults.filter(person => {
          if (!person.values?.email || !Array.isArray(person.values.email)) {
            return emailFilter.condition === FilterConditionType.IS_EMPTY || 
                   emailFilter.condition === FilterConditionType.IS_NOT_SET;
          }
          
          // Get array of email values
          const emails = person.values.email.map(e => e.value?.toLowerCase() || '');
          
          // Apply the appropriate condition
          switch (emailFilter.condition) {
            case FilterConditionType.EQUALS:
              return emails.some(e => e === emailFilter.value?.toLowerCase());
            case FilterConditionType.NOT_EQUALS:
              return !emails.some(e => e === emailFilter.value?.toLowerCase());
            case FilterConditionType.CONTAINS:
              return emails.some(e => e.includes(emailFilter.value?.toLowerCase() || ''));
            case FilterConditionType.NOT_CONTAINS:
              return !emails.some(e => e.includes(emailFilter.value?.toLowerCase() || ''));
            case FilterConditionType.STARTS_WITH:
              return emails.some(e => e.startsWith(emailFilter.value?.toLowerCase() || ''));
            case FilterConditionType.ENDS_WITH:
              return emails.some(e => e.endsWith(emailFilter.value?.toLowerCase() || ''));
            case FilterConditionType.IS_EMPTY:
              return emails.length === 0 || emails.every(e => e === '');
            case FilterConditionType.IS_NOT_EMPTY:
              return emails.length > 0 && emails.some(e => e !== '');
            default:
              return true; // Skip filtering for unsupported conditions
          }
        });
      }
      
      // Apply phone filtering client-side
      if (phoneFilter) {
        filteredResults = filteredResults.filter(person => {
          if (!person.values?.phone || !Array.isArray(person.values.phone)) {
            return phoneFilter.condition === FilterConditionType.IS_EMPTY || 
                   phoneFilter.condition === FilterConditionType.IS_NOT_SET;
          }
          
          // Get array of phone values
          const phones = person.values.phone.map(p => p.value?.toLowerCase() || '');
          
          // Apply the appropriate condition
          switch (phoneFilter.condition) {
            case FilterConditionType.EQUALS:
              return phones.some(p => p === phoneFilter.value?.toLowerCase());
            case FilterConditionType.NOT_EQUALS:
              return !phones.some(p => p === phoneFilter.value?.toLowerCase());
            case FilterConditionType.CONTAINS:
              return phones.some(p => p.includes(phoneFilter.value?.toLowerCase() || ''));
            case FilterConditionType.NOT_CONTAINS:
              return !phones.some(p => p.includes(phoneFilter.value?.toLowerCase() || ''));
            case FilterConditionType.STARTS_WITH:
              return phones.some(p => p.startsWith(phoneFilter.value?.toLowerCase() || ''));
            case FilterConditionType.ENDS_WITH:
              return phones.some(p => p.endsWith(phoneFilter.value?.toLowerCase() || ''));
            case FilterConditionType.IS_EMPTY:
              return phones.length === 0 || phones.every(p => p === '');
            case FilterConditionType.IS_NOT_EMPTY:
              return phones.length > 0 && phones.some(p => p !== '');
            default:
              return true; // Skip filtering for unsupported conditions
          }
        });
      }
      
      // Apply limit and offset to the client-side filtered results
      const safeLimit = typeof limit === 'number' ? limit : 20;
      const safeOffset = typeof offset === 'number' ? offset : 0;
      
      // Only apply limit and offset if they weren't already applied server-side
      if (emailFilter || phoneFilter) {
        return filteredResults.slice(safeOffset, safeOffset + safeLimit);
      }
      
      return filteredResults;
    }
    
    // For other errors, just throw them as is
    throw error;
  }
}

/**
 * Helper function to create filters for searching people by name
 * 
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
 */
export function createNameFilter(
  name: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'name' },
        condition: condition,
        value: name
      }
    ]
  };
}

/**
 * Helper function to create filters for searching people by email
 * 
 * @param email - Email to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for email search
 */
export function createEmailFilter(
  email: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'email' },
        condition: condition,
        value: email
      }
    ]
  };
}

/**
 * Helper function to create filters for searching people by phone
 * 
 * @param phone - Phone number to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for phone search
 */
export function createPhoneFilter(
  phone: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'phone' },
        condition: condition,
        value: phone
      }
    ]
  };
}