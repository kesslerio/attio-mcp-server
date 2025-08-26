/**
 * CRUD operations for Attio objects
 * Handles create, read, update, and delete operations
 */

import { getAttioClient } from '../attio-client.js';
import {
  AttioRecord,
  ResourceType,
  AttioSingleResponse,
  AttioListResponse,
  RecordCreateParams,
  RecordUpdateParams,
  RecordListParams,
} from '../../types/attio.js';
import { secureValidateFields } from '../../utils/validation/field-validation.js';
import { callWithRetry, RetryConfig } from './retry.js';

/**
 * Helper function to construct object path
 * @private
 */
function getObjectPath(objectSlug: string, objectId?: string): string {
  // If object ID is provided, use it, otherwise use the slug
  return `/objects/${objectId || objectSlug}`;
}

/**
 * Extract ID from various API response shapes
 * @private
 */
function extractAnyId(obj: any): string | undefined {
  if (!obj) return;
  return (
    obj?.id?.record_id ??
    obj?.id?.company_id ??
    obj?.id?.person_id ??
    obj?.id?.list_id ??
    obj?.id?.task_id ??
    (typeof obj?.id === 'string' ? obj.id : undefined) ??
    obj?.record_id ??
    obj?.company_id ??
    obj?.person_id ??
    obj?.list_id ??
    obj?.task_id
  );
}

/**
 * Transforms raw API response to ensure proper AttioRecord structure
 * @private
 */
function ensureAttioRecordStructure<T extends AttioRecord>(rawData: any, allowEmpty = false): T {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid API response: no data found');
  }

  // Guard against empty objects that slip through, but allow them if explicitly requested
  if (Object.keys(rawData).length === 0) {
    if (allowEmpty) {
      return rawData as T; // Allow empty objects to pass through for fallback handling
    }
    throw new Error('Invalid API response: empty data object');
  }

  // Debug logging to understand the actual API response structure
  if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
    console.error('[ensureAttioRecordStructure] Raw data received:', {
      type: typeof rawData,
      keys: Object.keys(rawData || {}),
      hasId: !!rawData.id,
      idType: typeof rawData.id,
      idKeys: rawData.id ? Object.keys(rawData.id) : [],
      idValue: rawData.id,
      hasValues: !!rawData.values,
      valuesType: typeof rawData.values,
      fullData: JSON.stringify(rawData, null, 2)
    });
  }

  // If already has the proper structure, return as-is
  if (rawData.id && rawData.id.record_id && rawData.values) {
    return rawData as T;
  }

  // Transform to proper AttioRecord structure
  let result: any = { ...rawData };

  // Ensure id.record_id structure exists
  if (!result.id || !result.id.record_id) {
    // Probe across common wrappers in order using the helper
    const extractedId =
      extractAnyId(result) ??
      extractAnyId(result?.data) ??
      extractAnyId(result?.data?.data) ??
      extractAnyId(result?.data?.record) ??
      extractAnyId(result?.data?.items?.[0]);

    if (extractedId) {
      // Ensure canonical shape
      result.id = { record_id: extractedId };
      // Also use nested data structure if available
      if (result.data?.values) {
        result.values = result.data.values;
      }
    } else {
      throw new Error('Invalid API response: record missing ID structure');
    }
  }

  // Ensure values object exists
  if (!result.values) {
    if (result.data?.values) {
      result.values = result.data.values;
    } else {
      result.values = {};
    }
  }

  return result as T;
}

/**
 * Generic function to get details for a specific record
 *
 * @param objectType - The type of object to get (people or companies)
 * @param recordId - ID of the record
 * @param options - Optional configuration including field filtering and retry config
 * @returns Record details
 */
export async function getObjectDetails<T extends AttioRecord>(
  objectType: ResourceType,
  recordId: string,
  options?: {
    fields?: string[]; // NEW: Field filtering support
    retryConfig?: Partial<RetryConfig>;
  }
): Promise<T> {
  const api = getAttioClient();
  let path = `/objects/${objectType}/records/${recordId}`;

  // NEW: Add field filtering to query parameters with security validation
  if (options?.fields && options.fields.length > 0) {
    // Validate and sanitize field names to prevent injection attacks
    const validatedFields = secureValidateFields(
      options.fields,
      objectType,
      'field filtering in get-record-details'
    );

    if (validatedFields.length > 0) {
      const fieldsParam = validatedFields.join(',');
      path += `?fields=${encodeURIComponent(fieldsParam)}`;
    }
  }

  return callWithRetry(async () => {
    const response = await api.get<AttioSingleResponse<T>>(path);
    return response?.data?.data || response?.data;
  }, options?.retryConfig);
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
    // Debug log the request being made
    if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
      console.error('[createRecord] Making API request:', {
        path,
        requestBody: {
          data: {
            values: params.attributes,
          },
        }
      });
    }
    
    const response = await api.post<AttioSingleResponse<T>>(path, {
      data: {
        values: params.attributes,
      },
    });
    
    // Debug log the full response
    if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
      console.error('[createRecord] Full API response:', {
        status: response?.status,
        statusText: response?.statusText,
        headers: response?.headers,
        data: response?.data,
        dataType: typeof response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : []
      });
    }

    // Extract raw data from response using Agent A's pattern
    let rawResult = response?.data?.data ?? response?.data ?? response;

    // Additional extraction patterns for different Attio API response formats
    if (!rawResult && response?.data?.attributes) {
      // Some APIs return { data: { attributes: {...}, id: {...} } }
      rawResult = response.data as any;
    }

    // Handle array responses by taking first element
    if (Array.isArray(rawResult) && rawResult.length > 0) {
      rawResult = rawResult[0];
    }

    // Final validation with debug logging
    if (!rawResult || typeof rawResult !== 'object') {
      console.error('DEBUG: Failed response extraction. Response structure:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        hasNestedData: !!response?.data?.data,
        dataKeys: response?.data ? Object.keys(response.data) : [],
        dataType: typeof response?.data,
        rawDataType: typeof rawResult,
      });
      throw new Error('Invalid API response structure: no data found');
    }

    // Transform to proper AttioRecord structure with id.record_id
    try {
      // Allow empty objects for companies to enable fallback handling at higher levels
      const isCompaniesRequest = params.objectSlug === 'companies' || params.objectId === 'companies';
      const result = ensureAttioRecordStructure<T>(rawResult, isCompaniesRequest);
      return result;
    } catch (error) {
      // Robust fallback for { data: {} } responses - query the just-created record by name
      const name = (params?.attributes as any)?.name?.value ?? (params?.attributes as any)?.name;
      if (name && error instanceof Error && error.message.includes('missing ID structure')) {
        if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
          console.error('[createRecord] Fallback: querying just-created record by name:', name);
        }
        try {
          // Use the documented query endpoint with exact name match
          const queryResponse = await api.post(path + '/query', {
            filter: { name },
            limit: 1,
          });
          
          const found = queryResponse?.data?.data?.[0];
          if (found) {
            const fallbackResult = ensureAttioRecordStructure<T>(found);
            if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
              console.error('[createRecord] Fallback successful, found record:', fallbackResult.id?.record_id);
            }
            return fallbackResult;
          }
        } catch (lookupError) {
          if (process.env.NODE_ENV === 'development' || process.env.E2E_MODE === 'true') {
            console.error('[createRecord] Fallback query failed:', lookupError);
          }
        }
      }
      
      // If fallback didn't work, rethrow original error
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
    attributes.forEach((attr) => params.append('attributes[]', attr));
    path += `?${params.toString()}`;
  }

  return callWithRetry(async () => {
    const response = await api.get<AttioSingleResponse<T>>(path);
    return response?.data?.data || response?.data;
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
    // The API expects 'data.values' structure
    const payload = {
      data: {
        values: params.attributes,
      },
    };

    const response = await api.patch<AttioSingleResponse<T>>(path, payload);

    // Extract raw data from response using consistent pattern
    const rawResult = response?.data?.data ?? response?.data ?? response;

    // Transform to proper AttioRecord structure with id.record_id
    const result = ensureAttioRecordStructure<T>(rawResult);

    return result;
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
    await api.delete(path);
    return true;
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

  const path = `${objectPath}/records${
    queryParams.toString() ? '?' + queryParams.toString() : ''
  }`;

  return callWithRetry(async () => {
    const response = await api.get<AttioListResponse<T>>(path);
    // Ensure we always return an array, never undefined/null/objects
    const items = Array.isArray(response?.data?.data) 
      ? response.data.data 
      : Array.isArray(response?.data?.records) 
      ? response.data.records 
      : Array.isArray(response?.data)
      ? response.data
      : [];
    return items;
  }, retryConfig);
}
