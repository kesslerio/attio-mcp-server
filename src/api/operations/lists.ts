/**
 * List operations for Attio
 * Handles list management and list entry operations
 */

import { getAttioClient } from '../attio-client.js';
import { 
  AttioList,
  AttioListEntry,
  AttioListResponse,
  AttioSingleResponse
} from '../../types/attio.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { ListEntryFilters } from './types.js';
import { 
  processListEntries, 
  transformFiltersToApiFormat
} from '../../utils/record-utils.js';
import { FilterValidationError } from '../../errors/api-errors.js';

/**
 * Gets all lists in the workspace
 * 
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @param retryConfig - Optional retry configuration
 * @returns Array of list objects
 */
export async function getAllLists(
  objectSlug?: string, 
  limit: number = 20,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioList[]> {
  const api = getAttioClient();
  let path = `/lists?limit=${limit}`;
  
  if (objectSlug) {
    path += `&objectSlug=${objectSlug}`;
  }
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioListResponse<AttioList>>(path);
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Gets details for a specific list
 * 
 * @param listId - The ID of the list
 * @param retryConfig - Optional retry configuration
 * @returns List details
 */
export async function getListDetails(
  listId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioList> {
  const api = getAttioClient();
  const path = `/lists/${listId}`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioSingleResponse<AttioList>>(path);
      return response.data.data || response.data;
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Gets entries in a list with pagination and filtering
 * 
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch
 * @param offset - Number of entries to skip
 * @param filters - Optional filters to apply
 * @param retryConfig - Optional retry configuration
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string, 
  limit?: number, 
  offset?: number,
  filters?: ListEntryFilters,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry[]> {
  const api = getAttioClient();
  
  // Input validation - make sure we have a valid listId
  if (!listId) {
    throw new Error('Invalid list ID: No ID provided');
  }
  
  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;
  
  // Create request body with parameters and filters
  const createRequestBody = () => {
    // Start with base parameters
    const body: any = {
      "expand": ["record"],
      "limit": safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      "offset": safeOffset !== undefined ? safeOffset : 0 // Default to 0 if not specified
    };
    
    try {
      // Use our shared utility to transform filters to API format
      const filterObject = transformFiltersToApiFormat(filters, true);
      
      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;
        
        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[getListEntries] Transformed filters:', {
            originalFilters: JSON.stringify(filters),
            transformedFilters: JSON.stringify(filterObject.filter),
            useOrLogic: filters?.matchAny === true,
            filterCount: filters?.filters?.length || 0
          });
        }
      }
    } catch (err: any) {
      const error = err as Error;
      
      if (error instanceof FilterValidationError) {
        // Log the problematic filters for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error('[getListEntries] Filter validation error:', {
            error: error.message,
            providedFilters: JSON.stringify(filters)
          });
        }
        
        // Rethrow with more context
        throw new Error(`Filter validation failed: ${error.message}`);
      }
      throw error; // Rethrow other errors
    }
    
    return body;
  };
  
  // Enhanced logging function
  const logOperation = (stage: string, details: any, isError = false) => {
    if (process.env.NODE_ENV === 'development') {
      const prefix = isError ? 'ERROR' : (stage.includes('failed') ? 'WARNING' : 'INFO');
      console.log(`[getListEntries] ${prefix} - ${stage}`, {
        ...details,
        listId,
        limit: safeLimit,
        offset: safeOffset,
        hasFilters: filters && filters.filters ? filters.filters.length > 0 : false,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Define a function to try all endpoints with proper retry logic
  return callWithRetry(async () => {
    // Try the primary endpoint with expanded record data
    try {
      const path = `/lists/${listId}/entries/query`;
      const requestBody = createRequestBody();
      
      logOperation('Attempt 1: Calling primary endpoint', { 
        path, 
        requestBody: JSON.stringify(requestBody) 
      });
      
      const response = await api.post<AttioListResponse<AttioListEntry>>(path, requestBody);
      
      logOperation('Primary endpoint successful', { 
        resultCount: response.data.data?.length || 0 
      });
      
      // Process response to ensure record_id is correctly extracted
      const entries = processListEntries(response.data.data || []);
      return entries;
    } catch (error: any) {
      logOperation('Primary endpoint failed', { 
        error: error.message, 
        status: error.response?.status 
      }, true);
      throw error;
    }
  }, retryConfig);
}

/**
 * Adds a record to a list
 * 
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @param retryConfig - Optional retry configuration
 * @returns The created list entry
 */
export async function addRecordToList(
  listId: string, 
  recordId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry> {
  const api = getAttioClient();
  const path = `/lists/${listId}/entries`;
  
  // Input validation to ensure required parameters
  if (!listId || typeof listId !== 'string') {
    throw new Error('Invalid list ID: Must be a non-empty string');
  }
  
  if (!recordId || typeof recordId !== 'string') {
    throw new Error('Invalid record ID: Must be a non-empty string');
  }
  
  return callWithRetry(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[addRecordToList] Adding record to list at ${path}`);
        console.log(`- List ID: ${listId}`);
        console.log(`- Record ID: ${recordId}`);
        console.log(`- Request payload: ${JSON.stringify({ data: { record_id: recordId } })}`);
      }
      
      // Attio API expects a specific structure with a 'data' object wrapper
      // for adding records to lists. The 'data' object is required by the API
      // and contains the record_id and potentially a record_type field.
      const response = await api.post<AttioSingleResponse<AttioListEntry>>(path, {
        data: {
          record_id: recordId
          // record_type could be included here if needed for specific record types
        }
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[addRecordToList] Success: ${JSON.stringify(response.data)}`);
      }
      
      return response.data.data || response.data;
    } catch (error: any) {
      // Enhanced error logging
      if (process.env.NODE_ENV === 'development') {
        console.error(`[addRecordToList] Error adding record ${recordId} to list ${listId}:`, 
          error.message || 'Unknown error');
        console.error('Status:', error.response?.status);
        console.error('Response data:', JSON.stringify(error.response?.data || {}));
      }
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Removes a record from a list
 * 
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @param retryConfig - Optional retry configuration
 * @returns True if successful
 */
export async function removeRecordFromList(
  listId: string, 
  entryId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const path = `/lists/${listId}/entries/${entryId}`;
  
  return callWithRetry(async () => {
    try {
      await api.delete(path);
      return true;
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}