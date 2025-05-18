/**
 * CRUD operations for Attio objects
 * Handles create, read, update, and delete operations
 */
import { getAttioClient } from '../attio-client.js';
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
 * @param retryConfig - Optional retry configuration
 * @returns Record details
 */
export async function getObjectDetails(objectType, recordId, retryConfig) {
    const api = getAttioClient();
    const path = `/objects/${objectType}/records/${recordId}`;
    return callWithRetry(async () => {
        try {
            const response = await api.get(path);
            return response.data.data || response.data;
        }
        catch (error) {
            // Let upstream handlers create specific, rich error objects.
            throw error;
        }
    }, retryConfig);
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
        try {
            const response = await api.post(path, {
                data: {
                    values: params.attributes
                }
            });
            return response.data.data;
        }
        catch (error) {
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
export async function getRecord(objectSlug, recordId, attributes, objectId, retryConfig) {
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
            const response = await api.get(path);
            return response.data.data;
        }
        catch (error) {
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
export async function updateRecord(params, retryConfig) {
    const api = getAttioClient();
    const objectPath = getObjectPath(params.objectSlug, params.objectId);
    const path = `${objectPath}/records/${params.recordId}`;
    return callWithRetry(async () => {
        try {
            console.log('[updateRecord] Request path:', path);
            console.log('[updateRecord] Attributes:', JSON.stringify(params.attributes, null, 2));
            // The API expects 'data.values' structure
            const payload = {
                data: {
                    values: params.attributes
                }
            };
            console.log('[updateRecord] Full payload:', JSON.stringify(payload, null, 2));
            const response = await api.patch(path, payload);
            return response.data.data;
        }
        catch (error) {
            console.error('[updateRecord] Error:', error.message);
            console.error('[updateRecord] Response data:', error.response?.data);
            console.error('[updateRecord] Response status:', error.response?.status);
            console.error('[updateRecord] Response headers:', error.response?.headers);
            console.error('[updateRecord] Request config:', error.config);
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
export async function deleteRecord(objectSlug, recordId, objectId, retryConfig) {
    const api = getAttioClient();
    const objectPath = getObjectPath(objectSlug, objectId);
    const path = `${objectPath}/records/${recordId}`;
    return callWithRetry(async () => {
        try {
            await api.delete(path);
            return true;
        }
        catch (error) {
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
        try {
            const response = await api.get(path);
            return response.data.data || [];
        }
        catch (error) {
            // Let upstream handlers create specific, rich error objects.
            throw error;
        }
    }, retryConfig);
}
//# sourceMappingURL=crud.js.map