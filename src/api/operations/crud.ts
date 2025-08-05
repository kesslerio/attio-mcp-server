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
    const response = await api.get<AttioSingleResponse<T>>(path);
    return response?.data?.data || response?.data;
  }, retryConfig);
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
    const response = await api.post<AttioSingleResponse<T>>(path, {
      data: {
        values: params.attributes,
      },
    });

    return response.data.data;
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
    try {
      if (process.env.NODE_ENV === 'development') {
        console.error('[getRecord] Final request path:', path);
      }
      const response = await api.get<AttioSingleResponse<T>>(path);
      return response?.data?.data;
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
      // The API expects 'data.values' structure
      const payload = {
        data: {
          values: params.attributes,
        },
      };

      const response = await api.patch<AttioSingleResponse<T>>(path, payload);

      return response?.data?.data;
    } catch (error: any) {
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

  const path = `${objectPath}/records${
    queryParams.toString() ? '?' + queryParams.toString() : ''
  }`;

  return callWithRetry(async () => {
    try {
      const response = await api.get<AttioListResponse<T>>(path);
      return response?.data?.data || [];
    } catch (error: any) {
      // Let upstream handlers create specific, rich error objects.
      throw error;
    }
  }, retryConfig);
}
