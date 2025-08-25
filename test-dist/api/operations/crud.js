/**
 * CRUD operations for Attio objects
 * Handles create, read, update, and delete operations
 */
import { getAttioClient } from '../attio-client.js';
import { secureValidateFields } from '../../utils/validation/field-validation.js';
import { callWithRetry } from './retry.js';
/**
 * Helper function to construct object path
 * @private
 */
function getObjectPath(objectSlug, objectId) {
    // If object ID is provided, use it, otherwise use the slug
    return `/objects/${objectId || objectSlug}`;
}
/**
 * Generic function to get details for a specific record
 *
 * @param objectType - The type of object to get (people or companies)
 * @param recordId - ID of the record
 * @param options - Optional configuration including field filtering and retry config
 * @returns Record details
 */
export async function getObjectDetails(objectType, recordId, options) {
    const api = getAttioClient();
    let path = `/objects/${objectType}/records/${recordId}`;
    // NEW: Add field filtering to query parameters with security validation
    if (options?.fields && options.fields.length > 0) {
        // Validate and sanitize field names to prevent injection attacks
        const validatedFields = secureValidateFields(options.fields, objectType, 'field filtering in get-record-details');
        if (validatedFields.length > 0) {
            const fieldsParam = validatedFields.join(',');
            path += `?fields=${encodeURIComponent(fieldsParam)}`;
        }
    }
    return callWithRetry(async () => {
        const response = await api.get(path);
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
export async function createRecord(params, retryConfig) {
    const api = getAttioClient();
    const objectPath = getObjectPath(params.objectSlug, params.objectId);
    const path = `${objectPath}/records`;
    return callWithRetry(async () => {
        const response = await api.post(path, {
            data: {
                values: params.attributes,
            },
        });
        // Handle different response structures
        let result;
        if (response?.data?.data) {
            // Standard nested structure
            result = response.data.data;
        }
        else if (response?.data && typeof response.data === 'object') {
            // Direct data structure
            if (Array.isArray(response.data)) {
                // If it's an array, take the first element (should be the created record)
                result = response.data[0];
            }
            else {
                result = response.data;
            }
        }
        else {
            throw new Error('Invalid API response structure: no data found');
        }
        // Ensure we have a valid record with an ID
        if (!result || !('id' in result)) {
            throw new Error('Invalid API response: record missing ID');
        }
        return result;
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
export async function getRecord(objectSlug, recordId, attributes, objectId, retryConfig) {
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
        const response = await api.get(path);
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
export async function updateRecord(params, retryConfig) {
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
        const response = await api.patch(path, payload);
        return response?.data?.data || response?.data;
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
export async function deleteRecord(objectSlug, recordId, objectId, retryConfig) {
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
export async function listRecords(params, retryConfig) {
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
        const response = await api.get(path);
        return response?.data?.data || [];
    }, retryConfig);
}
