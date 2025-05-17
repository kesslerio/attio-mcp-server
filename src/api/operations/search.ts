/**
 * Search operations for Attio objects
 * Handles basic and advanced search functionality
 */

import { getAttioClient } from '../attio-client.js';
import { 
  AttioRecord, 
  ResourceType, 
  AttioListResponse
} from '../../types/attio.js';
import { callWithRetry, RetryConfig } from './retry.js';
import { ListEntryFilters } from './types.js';
import { transformFiltersToApiFormat } from '../../utils/record-utils.js';
import { FilterValidationError } from '../../errors/api-errors.js';

/**
 * Generic function to search any object type by name, email, or phone (when applicable)
 * 
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export async function searchObject<T extends AttioRecord>(
  objectType: ResourceType, 
  query: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/query`;
  
  // Use different search logic based on object type
  let filter = {};
  
  if (objectType === ResourceType.PEOPLE) {
    // For people, search by name, email, or phone
    filter = {
      "$or": [
        { name: { "$contains": query } },
        { email: { "$contains": query } },
        { phone: { "$contains": query } }
      ]
    };
  } else {
    // For other types (like companies), search by name only
    filter = {
      name: { "$contains": query }
    };
  }
  
  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioListResponse<T>>(path, {
        filter
      });
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects from the original Axios error.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to search any object type with advanced filtering capabilities
 * 
 * @param objectType - The type of object to search (people or companies)
 * @param filters - Optional filters to apply
 * @param limit - Maximum number of results to return (optional)
 * @param offset - Number of results to skip (optional)
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export async function advancedSearchObject<T extends AttioRecord>(
  objectType: ResourceType,
  filters?: ListEntryFilters,
  limit?: number,
  offset?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/query`;
  
  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;
  
  // Create request body with parameters and filters
  const createRequestBody = () => {
    // Start with base parameters
    const body: any = {
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
          console.log('[advancedSearchObject] Transformed filters:', {
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
          console.error('[advancedSearchObject] Filter validation error:', {
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
  
  return callWithRetry(async () => {
    try {
      const requestBody = createRequestBody();
      const response = await api.post<AttioListResponse<T>>(path, requestBody);
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to list any object type with pagination and sorting
 * 
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export async function listObjects<T extends AttioRecord>(
  objectType: ResourceType, 
  limit?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioListResponse<T>>(path, {
        params: limit ? { limit } : undefined
      });
      return response.data.data || [];
    } catch (error: any) {
      throw error;
    }
  }, retryConfig);
}