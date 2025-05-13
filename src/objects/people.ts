/**
 * People-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { 
  searchObject, 
  listObjects, 
  getObjectDetails, 
  getObjectNotes, 
  createObjectNote,
  batchSearchObjects,
  batchGetObjectDetails,
  BatchConfig,
  BatchResponse,
  ListEntryFilters
} from "../api/attio-operations.js";
import { 
  ResourceType, 
  Person, 
  AttioNote,
  FilterConditionType,
  DateRange,
  RelativeDate
} from "../types/attio.js";
import {
  createDateRangeFilter,
  createBeforeDateFilter,
  createAfterDateFilter,
  createNumericRangeFilter
} from "../utils/record-utils.js";
import { normalizeDateRange } from "../utils/date-utils.js";

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
 * Advanced search for people with date filtering capabilities
 * 
 * @param filters - Filter configuration
 * @param limit - Maximum number of records to return (default: 20)
 * @param offset - Number of records to skip (default: 0)
 * @returns Array of matching people
 */
export async function advancedSearchPeople(
  filters?: ListEntryFilters,
  limit: number = 20,
  offset: number = 0
): Promise<Person[]> {
  // Always ensure higher limit when filtering client-side for email/phone
  // to have enough data for post-filtering
  const apiLimit = limit * 3; // 3x to ensure we have enough data after client filtering
  
  try {
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    
    // Prepare base request parameters
    const requestParams: any = {
      limit: apiLimit,
      offset: offset
    };
    
    // Add filter configuration if present
    if (filters && filters.filters && filters.filters.length > 0) {
      // Transform filters to API format
      const apiFilters = require('../utils/record-utils.js').transformFiltersToApiFormat(filters);
      
      if (apiFilters.filter) {
        requestParams.filter = apiFilters.filter;
      }
    }
    
    const response = await api.post(path, requestParams);
    let results = response.data.data || [];
    
    // Check if we need to perform client-side filtering for email/phone
    if (filters && filters.filters) {
      const hasEmailFilter = filters.filters.some(f => 
        f.attribute.slug === 'email' || 
        (f.attribute.slug === 'contact' && f.value?.toString().includes('@'))
      );
      
      const hasPhoneFilter = filters.filters.some(f => 
        f.attribute.slug === 'phone' || 
        (f.attribute.slug === 'contact' && /\d{3,}/.test(f.value?.toString() || ''))
      );
      
      // Client-side email filtering
      if (hasEmailFilter) {
        const emailFilters = filters.filters.filter(f => 
          f.attribute.slug === 'email' || 
          (f.attribute.slug === 'contact' && f.value?.toString().includes('@'))
        );
        
        results = results.filter((person: Person) => {
          return emailFilters.some(filter => {
            // Skip if person has no email
            if (!person.values?.email) return false;
            
            const emailValue = filter.value?.toString().toLowerCase();
            return person.values.email.some((email: {value: string}) => {
              const personEmail = email.value?.toLowerCase() || '';
              
              switch (filter.condition) {
                case FilterConditionType.EQUALS:
                  return personEmail === emailValue;
                case FilterConditionType.NOT_EQUALS:
                  return personEmail !== emailValue;
                case FilterConditionType.CONTAINS:
                  return personEmail.includes(emailValue);
                case FilterConditionType.NOT_CONTAINS:
                  return !personEmail.includes(emailValue);
                case FilterConditionType.STARTS_WITH:
                  return personEmail.startsWith(emailValue);
                case FilterConditionType.ENDS_WITH:
                  return personEmail.endsWith(emailValue);
                case FilterConditionType.IS_EMPTY:
                  return !personEmail;
                case FilterConditionType.IS_NOT_EMPTY:
                  return !!personEmail;
                default:
                  return false;
              }
            });
          });
        });
      }
      
      // Client-side phone filtering
      if (hasPhoneFilter) {
        const phoneFilters = filters.filters.filter(f => 
          f.attribute.slug === 'phone' || 
          (f.attribute.slug === 'contact' && /\d{3,}/.test(f.value?.toString() || ''))
        );
        
        results = results.filter((person: Person) => {
          return phoneFilters.some(filter => {
            // Skip if person has no phone
            if (!person.values?.phone) return false;
            
            const phoneValue = filter.value?.toString().replace(/\D/g, '');
            return person.values.phone.some((phone: {value: string}) => {
              const personPhone = (phone.value || '').replace(/\D/g, '');
              
              switch (filter.condition) {
                case FilterConditionType.EQUALS:
                  return personPhone === phoneValue;
                case FilterConditionType.NOT_EQUALS:
                  return personPhone !== phoneValue;
                case FilterConditionType.CONTAINS:
                  return personPhone.includes(phoneValue);
                case FilterConditionType.NOT_CONTAINS:
                  return !personPhone.includes(phoneValue);
                case FilterConditionType.STARTS_WITH:
                  return personPhone.startsWith(phoneValue);
                case FilterConditionType.ENDS_WITH:
                  return personPhone.endsWith(phoneValue);
                case FilterConditionType.IS_EMPTY:
                  return !personPhone;
                case FilterConditionType.IS_NOT_EMPTY:
                  return !!personPhone;
                default:
                  return false;
              }
            });
          });
        });
      }
    }
    
    // Apply original limit and offset after client-side filtering
    return results.slice(0, limit);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Create a date filter for people based on creation date
 * 
 * @param dateRange - Date range for filtering
 * @returns Filter configuration
 */
export function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter('created_at', dateRange);
}

/**
 * Create a date filter for people based on last modified date
 * 
 * @param dateRange - Date range for filtering
 * @returns Filter configuration
 */
export function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter('updated_at', dateRange);
}

/**
 * Create a date filter for people based on last interaction date
 * 
 * @param dateRange - Date range for filtering
 * @returns Filter configuration
 */
export function createLastInteractionFilter(dateRange: DateRange): ListEntryFilters {
  return createDateRangeFilter('last_interaction', dateRange);
}