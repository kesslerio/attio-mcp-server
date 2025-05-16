import { getAttioClient } from "./attio-client.js";
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  AttioRecord, 
  AttioNote, 
  ResourceType, 
  AttioListResponse,
  AttioSingleResponse,
  Person,
  Company,
  AttioList,
  AttioListEntry,
  BatchRequestItem as BatchRequestItemType,
  BatchItemResult as BatchItemResultType,
  BatchResponse as BatchResponseType,
  BatchConfig as BatchConfigType,
  RecordCreateParams,
  RecordUpdateParams,
  RecordListParams,
  RecordBatchCreateParams,
  RecordBatchUpdateParams,
  RecordAttributes
} from "../types/attio.js";

// Re-export batch types for convenience
export type BatchRequestItem<T> = BatchRequestItemType<T>;
export type BatchItemResult<R> = BatchItemResultType<R>;
export type BatchResponse<R> = BatchResponseType<R>;
export type BatchConfig = BatchConfigType;
import { ErrorType } from '../utils/error-handler.js';
import { 
  processListEntries, 
  API_PARAMS, 
  transformFiltersToApiFormat
} from '../utils/record-utils.js';
import { FilterValidationError } from '../errors/api-errors.js';

/**
 * Configuration options for API call retry
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds before the first retry */
  initialDelay: number;
  /** Maximum delay in milliseconds between retries */
  maxDelay: number;
  /** Whether to use exponential backoff for retry delays */
  useExponentialBackoff: boolean;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: number[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  useExponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Calculate delay time for retry with optional exponential backoff
 * 
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay time in milliseconds
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  if (!config.useExponentialBackoff) {
    return config.initialDelay;
  }
  
  // Exponential backoff with jitter
  const exponentialDelay = config.initialDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.5 + 0.75; // Random value between 0.75 and 1.25
  const delay = exponentialDelay * jitter;
  
  // Cap at maximum delay
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an error should trigger a retry
 * 
 * @param error - Error to check
 * @param config - Retry configuration
 * @returns Whether the error should trigger a retry
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  // Network errors should be retried
  if (!error.response) {
    return true;
  }
  
  // Check if status code is in the retryable list
  const statusCode = error.response.status;
  return config.retryableStatusCodes.includes(statusCode);
}

/**
 * Execute an API call with retry logic
 * 
 * @param fn - Function that returns a promise for the API call
 * @param config - Retry configuration
 * @returns Promise that resolves with the API response
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Merge with default config
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  
  let attempt = 0;
  let lastError: any;
  
  while (attempt <= retryConfig.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt >= retryConfig.maxRetries || !isRetryableError(error, retryConfig)) {
        throw error;
      }
      
      // Calculate delay and wait before retrying
      const delay = calculateRetryDelay(attempt, retryConfig);
      await sleep(delay);
      
      attempt++;
      
      // Log retry attempt if in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Retrying API call (attempt ${attempt}/${retryConfig.maxRetries}) after ${delay}ms delay`);
      }
    }
  }
  
  // This should never be reached due to the throw in the catch block,
  // but TypeScript needs it for type safety
  throw lastError;
}

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
  limit: number = 20,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/query`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioListResponse<T>>(path, {
        limit,
        sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
      });
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to get details for a specific record
 * 
 * @param objectType - The type of object to get (people or companies)
 * @param recordId - ID of the record
 * @param retryConfig - Optional retry configuration
 * @returns Record details
 */
export async function getObjectDetails<T extends AttioRecord>(
  objectType: ResourceType, 
  recordId: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const api = getAttioClient();
  const path = `/objects/${objectType}/records/${recordId}`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioSingleResponse<T>>(path);
      return response.data.data || response.data;
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to get notes for a specific record
 * 
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param limit - Maximum number of notes to return
 * @param offset - Number of notes to skip
 * @param retryConfig - Optional retry configuration
 * @returns Array of notes
 */
export async function getObjectNotes(
  objectType: ResourceType, 
  recordId: string, 
  limit: number = 10, 
  offset: number = 0,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioNote[]> {
  const api = getAttioClient();
  const path = `/notes?limit=${limit}&offset=${offset}&parent_object=${objectType}&parent_record_id=${recordId}`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioListResponse<AttioNote>>(path);
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to create a note for any object type
 * 
 * @param objectType - The type of parent object (people or companies)
 * @param recordId - ID of the parent record
 * @param noteTitle - Title of the note
 * @param noteText - Content of the note
 * @param retryConfig - Optional retry configuration
 * @returns Created note
 */
export async function createObjectNote(
  objectType: ResourceType, 
  recordId: string, 
  noteTitle: string, 
  noteText: string,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioNote> {
  const api = getAttioClient();
  const path = "/notes";
  
  return callWithRetry(async () => {
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
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

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
 * Filter definition for list entries
 */
export interface ListEntryFilter {
  attribute: {
    slug: string;
  };
  condition: string;
  value: any;
  /**
   * Optional logical operator to use when combined with other filters
   * If not provided, default is 'and'
   */
  logicalOperator?: 'and' | 'or';
}

/**
 * Parameters for filtering list entries
 */
export interface ListEntryFilters {
  /**
   * Individual filter conditions to apply
   */
  filters?: ListEntryFilter[];
  /**
   * When true, at least one filter must match (equivalent to OR)
   * When false or omitted, all filters must match (equivalent to AND)
   */
  matchAny?: boolean;
  /**
   * Optional array of attribute groups for complex nested conditions
   * Each group is treated as a unit with its own logical operator
   */
  filterGroups?: Array<{
    filters: ListEntryFilter[];
    matchAny?: boolean;
  }>;
}

/**
 * Gets entries for a specific list
 * 
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (optional)
 * @param offset - Number of entries to skip (optional)
 * @param filters - Optional filters to apply to list entries
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
      const entries = response.data.data || [];
      return processListEntries(entries);
    } catch (error: any) {
      const primaryError = error;
      
      logOperation('Primary endpoint failed', { 
        path: `/lists/${listId}/entries/query`,
        error: primaryError.message || 'Unknown error' 
      }, true);
      
      // Try fallback endpoints with proper parameter handling
      try {
        const fallbackPath = `/lists-entries/query`;
        const requestBody = {
          ...createRequestBody(),
          "list_id": listId
        };
        
        logOperation('Attempt 2: Calling fallback endpoint', { 
          path: fallbackPath, 
          requestBody: JSON.stringify(requestBody) 
        });
        
        const fallbackResponse = await api.post<AttioListResponse<AttioListEntry>>(fallbackPath, requestBody);
        
        logOperation('Fallback endpoint successful', { 
          resultCount: fallbackResponse.data.data?.length || 0 
        });
        
        const entries = fallbackResponse.data.data || [];
        return processListEntries(entries);
      } catch (error: any) {
        const fallbackError = error;
        
        logOperation('Fallback endpoint failed', { 
          path: `/lists-entries/query`,
          error: fallbackError.message || 'Unknown error' 
        }, true);
        
        // Last resort fallback with proper query parameter handling
        // Note: The GET endpoint doesn't support complex filters, so we only use this as a last resort
        // when no filters are applied
        try {
          // If we have filters, we need to fail fast since GET endpoint doesn't support them
          if (filters && filters.filters && filters.filters.length > 0) {
            throw new Error(
              'GET endpoint cannot be used with filters. This is a limitation of the Attio API. ' +
              'When using filters, only POST endpoints with JSON body are supported. ' +
              'The previous POST endpoints have failed but we cannot fall back to GET method ' +
              'while keeping your filter criteria.'
            );
          }
          
          // Build the URL with explicit parameters using consistent naming
          const params = new URLSearchParams();
          params.append('list_id', listId);
          params.append('expand', 'record');
          
          // Always include limit and offset parameters with default values
          params.append('limit', String(safeLimit !== undefined ? safeLimit : 20));
          params.append('offset', String(safeOffset !== undefined ? safeOffset : 0));
          
          const lastPath = `/lists-entries?${params.toString()}`;
          
          logOperation('Attempt 3: Calling last resort endpoint', { path: lastPath });
          
          const lastResponse = await api.get<AttioListResponse<AttioListEntry>>(lastPath);
          
          logOperation('Last resort endpoint successful', { 
            resultCount: lastResponse.data.data?.length || 0 
          });
          
          const entries = lastResponse.data.data || [];
          return processListEntries(entries);
        } catch (lastError: any) {
          // Combine all errors for better debugging
          const allErrors = {
            primary: primaryError.message || 'Unknown error',
            fallback: fallbackError.message || 'Unknown error',
            lastResort: lastError.message || 'Unknown error'
          };
          
          logOperation('All attempts failed', { allErrors }, true);
          
          if (lastError.response?.status === 404) {
            throw new Error(`List entries for list ${listId} not found. All attempts failed.`);
          }
          
          // Let upstream handlers create specific, rich error objects from the lastError.
          throw lastError;
        }
      }
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
  
  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioSingleResponse<AttioListEntry>>(path, {
        record_id: recordId
      });
      return response.data.data || response.data;
    } catch (error: any) {
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

/**
 * Gets a specific object path based on slug or ID
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Proper path segment for the API URL
 */
function getObjectPath(objectSlug: string, objectId?: string): string {
  // If object ID is provided, use it, otherwise use the slug
  return `/objects/${objectId || objectSlug}`;
}

/**
 * Creates a new record
 * 
 * @param params - Record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Created record
 */
export async function createRecord<T extends AttioRecord>(
  params: RecordCreateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioSingleResponse<T>>(path, {
        attributes: params.attributes
      });
      
      return response.data.data;
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Gets a specific record by ID
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to retrieve
 * @param attributes - Optional list of attribute slugs to include
 * @param objectId - Optional object ID (alternative to slug)
 * @param retryConfig - Optional retry configuration
 * @returns Record details
 */
export async function getRecord<T extends AttioRecord>(
  objectSlug: string,
  recordId: string,
  attributes?: string[],
  objectId?: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const api = getAttioClient();
  const objectPath = getObjectPath(objectSlug, objectId);
  let path = `${objectPath}/records/${recordId}`;
  
  // Add attributes parameter if provided
  if (attributes && attributes.length > 0) {
    // Use array syntax for multiple attributes
    const params = new URLSearchParams();
    attributes.forEach(attr => params.append('attributes[]', attr));
    path += `?${params.toString()}`;
  }
  
  return callWithRetry(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[getRecord] Final request path:', path);
      }
      const response = await api.get<AttioSingleResponse<T>>(path);
      return response.data.data;
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Updates a specific record
 * 
 * @param params - Record update parameters
 * @param retryConfig - Optional retry configuration
 * @returns Updated record
 */
export async function updateRecord<T extends AttioRecord>(
  params: RecordUpdateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records/${params.recordId}`;
  
  return callWithRetry(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateRecord] Request path:', path);
        console.log('[updateRecord] Attributes:', JSON.stringify(params.attributes, null, 2));
      }
      
      const response = await api.patch<AttioSingleResponse<T>>(path, {
        attributes: params.attributes
      });
      
      return response.data.data;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[updateRecord] Error:', error.message);
        console.error('[updateRecord] Response:', error.response?.data);
      }
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Deletes a specific record
 * 
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to delete
 * @param objectId - Optional object ID (alternative to slug)
 * @param retryConfig - Optional retry configuration
 * @returns True if deletion was successful
 */
export async function deleteRecord(
  objectSlug: string,
  recordId: string,
  objectId?: string,
  retryConfig?: Partial<RetryConfig>
): Promise<boolean> {
  const api = getAttioClient();
  const objectPath = getObjectPath(objectSlug, objectId);
  const path = `${objectPath}/records/${recordId}`;
  
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

/**
 * Lists records with filtering options
 * 
 * @param params - Record listing parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export async function listRecords<T extends AttioRecord>(
  params: RecordListParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (params.page) {
    queryParams.append('page', String(params.page));
  }
  
  if (params.pageSize) {
    queryParams.append('pageSize', String(params.pageSize));
  }
  
  if (params.query) {
    queryParams.append('query', params.query);
  }
  
  if (params.attributes && params.attributes.length > 0) {
    queryParams.append('attributes', params.attributes.join(','));
  }
  
  if (params.sort) {
    queryParams.append('sort', params.sort);
  }
  
  if (params.direction) {
    queryParams.append('direction', params.direction);
  }
  
  const path = `${objectPath}/records${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioListResponse<T>>(path);
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Creates multiple records in a batch operation
 * 
 * @param params - Batch record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of created records
 */
export async function batchCreateRecords<T extends AttioRecord>(
  params: RecordBatchCreateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records/batch`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioListResponse<T>>(path, {
        records: params.records.map(record => ({ attributes: record.attributes }))
      });
      
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Updates multiple records in a batch operation
 * 
 * @param params - Batch record update parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of updated records
 */
export async function batchUpdateRecords<T extends AttioRecord>(
  params: RecordBatchUpdateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records/batch`;
  
  return callWithRetry(async () => {
    try {
      const response = await api.patch<AttioListResponse<T>>(path, {
        records: params.records.map(record => ({
          id: record.id,
          attributes: record.attributes
        }))
      });
      
      return response.data.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}

/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  continueOnError: true,
  retryConfig: DEFAULT_RETRY_CONFIG
};

/**
 * Execute a batch of operations with chunking, error handling, and retry support
 * 
 * @param operations - Array of operations to process in batch
 * @param apiCall - Function that processes a single operation
 * @param config - Batch configuration options
 * @returns Batch response with individual results and summary
 */
export async function executeBatchOperations<T, R>(
  operations: BatchRequestItem<T>[],
  apiCall: (params: T) => Promise<R>,
  config: Partial<BatchConfig> = {}
): Promise<BatchResponse<R>> {
  // Merge with default config
  const batchConfig: BatchConfig = {
    ...DEFAULT_BATCH_CONFIG,
    ...config
  };
  
  // Initialize batch response
  const batchResponse: BatchResponse<R> = {
    results: [],
    summary: {
      total: operations.length,
      succeeded: 0,
      failed: 0
    }
  };
  
  // Process operations in chunks to respect maxBatchSize
  const chunks = [];
  for (let i = 0; i < operations.length; i += batchConfig.maxBatchSize) {
    chunks.push(operations.slice(i, i + batchConfig.maxBatchSize));
  }
  
  // Process each chunk
  for (const chunk of chunks) {
    // Process operations in the current chunk
    await Promise.all(chunk.map(async (operation) => {
      const result: BatchItemResult<R> = {
        id: operation.id,
        success: false
      };
      
      try {
        // Execute the operation with retry logic if configured
        if (batchConfig.retryConfig) {
          result.data = await callWithRetry(
            () => apiCall(operation.params),
            batchConfig.retryConfig
          );
        } else {
          result.data = await apiCall(operation.params);
        }
        
        // Mark as successful
        result.success = true;
        batchResponse.summary.succeeded++;
      } catch (error) {
        // Handle operation failure
        result.success = false;
        result.error = error;
        batchResponse.summary.failed++;
        
        // If configured to abort on error, throw the error to stop processing
        if (!batchConfig.continueOnError) {
          throw error;
        }
      }
      
      // Add result to batch response
      batchResponse.results.push(result);
    }));
  }
  
  return batchResponse;
}

/**
 * Generic function to perform batch searches for any object type
 * 
 * @param objectType - Type of object to search (people or companies)
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results
 */
export async function batchSearchObjects<T extends AttioRecord>(
  objectType: ResourceType,
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T[]>> {
  // Convert queries to batch request items
  const operations: BatchRequestItem<string>[] = queries.map((query, index) => ({
    params: query,
    id: `search_${objectType}_${index}`
  }));
  
  // Execute batch operations using the searchObject function
  return executeBatchOperations<string, T[]>(
    operations,
    (query) => searchObject<T>(objectType, query),
    batchConfig
  );
}

/**
 * Generic function to get details for multiple records of any object type
 * 
 * @param objectType - Type of object to get details for (people or companies)
 * @param recordIds - Array of record IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with record details
 */
export async function batchGetObjectDetails<T extends AttioRecord>(
  objectType: ResourceType,
  recordIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T>> {
  // Convert record IDs to batch request items
  const operations: BatchRequestItem<string>[] = recordIds.map((recordId) => ({
    params: recordId,
    id: `get_${objectType}_${recordId}`
  }));
  
  // Execute batch operations using the getObjectDetails function
  return executeBatchOperations<string, T>(
    operations,
    (recordId) => getObjectDetails<T>(objectType, recordId),
    batchConfig
  );
}