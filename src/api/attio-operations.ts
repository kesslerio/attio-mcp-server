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
  AttioListEntry
} from "../types/attio.js";
import { ErrorType } from '../utils/error-handler.js';
import { processListEntries, API_PARAMS } from '../utils/record-utils.js';

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
      if (error.response?.status === 404) {
        throw new Error(`No ${objectType} found matching '${query}'`);
      }
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
      if (error.response?.status === 400) {
        throw new Error(`Invalid parameters when listing ${objectType}`);
      }
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
      if (error.response?.status === 404) {
        throw new Error(`${objectType.charAt(0).toUpperCase() + objectType.slice(1, -1)} with ID ${recordId} not found`);
      }
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
      if (error.response?.status === 404) {
        throw new Error(`Notes for ${objectType.slice(0, -1)} ${recordId} not found`);
      }
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
      if (error.response?.status === 400) {
        throw new Error(`Failed to create note: ${error.response.data.message || 'Invalid parameters'}`);
      } else if (error.response?.status === 404) {
        throw new Error(`${objectType.charAt(0).toUpperCase() + objectType.slice(1, -1)} with ID ${recordId} not found`);
      }
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
      if (error.response?.status === 400) {
        throw new Error('Invalid parameters when fetching lists');
      }
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
      if (error.response?.status === 404) {
        throw new Error(`List with ID ${listId} not found`);
      }
      throw error;
    }
  }, retryConfig);
}

/**
 * Gets entries for a specific list
 * 
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (default: 20)
 * @param offset - Number of entries to skip (default: 0)
 * @param retryConfig - Optional retry configuration
 * @returns Array of list entries
 */
export async function getListEntries(
  listId: string, 
  limit: number = 20, 
  offset: number = 0,
  retryConfig?: Partial<RetryConfig>
): Promise<AttioListEntry[]> {
  const api = getAttioClient();
  
  // Define a function to try all endpoints with proper retry logic
  return callWithRetry(async () => {
    // Try the primary endpoint with expanded record data using explicit parameter names
    try {
      const path = `/lists/${listId}/entries/query`;
      const response = await api.post<AttioListResponse<AttioListEntry>>(path, {
        "limit": limit,
        "offset": offset,
        "expand": ["record"] // Use explicit string array for expand parameter
      });
      
      // Process response to ensure record_id is correctly extracted
      const entries = response.data.data || [];
      return processListEntries(entries);
    } catch (error: any) {
      const primaryError = error;
      if (process.env.NODE_ENV === 'development') {
        console.log('[getListEntries] Primary endpoint failed:', primaryError.message || 'Unknown error', {
          path: `/lists/${listId}/entries/query`,
          listId,
          limit,
          offset
        });
      }
      
      // Try fallback endpoints with explicit parameter names
      try {
        const fallbackPath = `/lists-entries/query`;
        const fallbackResponse = await api.post<AttioListResponse<AttioListEntry>>(fallbackPath, {
          "list_id": listId,
          "limit": limit,
          "offset": offset,
          "expand": ["record"] // Use explicit string array for expand parameter
        });
        
        const entries = fallbackResponse.data.data || [];
        return processListEntries(entries);
      } catch (error: any) {
        const fallbackError = error;
        if (process.env.NODE_ENV === 'development') {
          console.log('[getListEntries] Fallback endpoint failed:', fallbackError.message || 'Unknown error', {
            path: `/lists-entries/query`,
            listId,
            limit,
            offset
          });
        }
        
        // Last resort fallback with explicit query parameters
        try {
          const lastPath = `/lists-entries?list_id=${listId}&limit=${limit}&offset=${offset}&expand=record`;
          const lastResponse = await api.get<AttioListResponse<AttioListEntry>>(lastPath);
          
          const entries = lastResponse.data.data || [];
          return processListEntries(entries);
        } catch (lastError: any) {
          if (lastError.response?.status === 404) {
            throw new Error(`List entries for list ${listId} not found`);
          }
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
      if (error.response?.status === 400) {
        throw new Error(`Failed to add record: ${error.response.data.message || 'Invalid parameters'}`);
      } else if (error.response?.status === 404) {
        throw new Error(`List with ID ${listId} not found`);
      }
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
      if (error.response?.status === 404) {
        throw new Error(`List entry ${entryId} in list ${listId} not found`);
      }
      throw error;
    }
  }, retryConfig);
}