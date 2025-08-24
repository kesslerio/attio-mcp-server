/**
 * Record-related functionality
 */
import { getAttioClient } from '../../api/attio-client.js';
import { createRecord, getRecord, updateRecord, deleteRecord, listRecords, batchCreateRecords, batchUpdateRecords, } from '../../api/operations/index.js';
/**
 * Creates a new record for a specific object type
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param attributes - Record attributes as key-value pairs
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Created record
 */
export async function createObjectRecord(objectSlug, attributes, objectId) {
    // Ensure objectSlug is a string value, not undefined
    if (!objectSlug) {
        throw new Error('[createObjectRecord] Object slug is required for creating records');
    }
    // Normalize objectSlug to ensure proper type handling
    const normalizedSlug = typeof objectSlug === 'string' ? objectSlug : String(objectSlug);
    // Add debug logging
    if (process.env.NODE_ENV === 'development') {
        console.error(`[createObjectRecord] Creating record for object type: ${normalizedSlug}`);
        console.error(`[createObjectRecord] Attributes:`, JSON.stringify(attributes, null, 2));
    }
    try {
        // Use the core API function
        if (process.env.NODE_ENV === 'development') {
            console.error('[createObjectRecord] Calling createRecord with:', {
                objectSlug: normalizedSlug,
                objectId,
                attributes,
            });
        }
        const result = await createRecord({
            objectSlug: normalizedSlug,
            objectId,
            attributes,
        });
        if (process.env.NODE_ENV === 'development') {
            console.error('[createObjectRecord] createRecord returned:', {
                result,
                hasId: !!result?.id,
                hasValues: !!result?.values,
                resultType: typeof result,
            });
        }
        return result;
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[createObjectRecord] Primary createRecord failed, trying fallback:', error);
        }
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        else if (typeof error === 'string') {
            throw new Error(error);
        }
        // Fallback implementation in case the core function fails
        try {
            const api = getAttioClient();
            const path = `/objects/${objectId || objectSlug}/records`;
            // ENHANCED DEBUG: Add path builder logging as requested by user
            console.debug('[attio-client] POST', path, {
                sampleKeys: Object.keys(attributes || {})
            });
            if (process.env.NODE_ENV === 'development') {
                console.error(`[createObjectRecord:fallback] API path: ${path}`);
                console.error(`[createObjectRecord:fallback] Sending payload:`, {
                    data: {
                        values: attributes,
                    },
                });
            }
            // Use the same payload format as the main implementation  
            const body = {
                data: {
                    values: attributes,
                },
            };
            try {
                const response = await api.post(path, body);
                if (process.env.NODE_ENV === 'development') {
                    console.error('[createObjectRecord:fallback] API response structure:', {
                        hasData: !!response?.data,
                        hasNestedData: !!response?.data?.data,
                        dataKeys: response?.data ? Object.keys(response.data) : [],
                        nestedDataKeys: response?.data?.data
                            ? Object.keys(response.data.data)
                            : [],
                    });
                }
                return response?.data?.data || response?.data;
            }
            catch (err) {
                const status = err?.response?.status;
                const msg = String(err?.response?.data?.error?.message || err?.message || '');
                const isDuplicateDomain = status === 422 && /domain/i.test(msg) && /(taken|unique|already)/i.test(msg);
                if (process.env.E2E_MODE === 'true' && isDuplicateDomain && normalizedSlug === 'companies') {
                    // Mutate domain once and retry for E2E tests
                    const suffix = Math.random().toString(36).slice(2, 6);
                    if (body.data.values?.domain && typeof body.data.values.domain === 'string') {
                        body.data.values.domain = `${body.data.values.domain.replace(/\.$/, '')}-${suffix}`;
                    }
                    else if (Array.isArray(body.data.values?.domains) && body.data.values.domains[0] && typeof body.data.values.domains[0] === 'string') {
                        body.data.values.domains[0] = body.data.values.domains[0].replace(/\.$/, '') + `-${suffix}`;
                    }
                    await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 200))); // jitter 150–350ms
                    const retryResponse = await api.post(path, body);
                    return retryResponse?.data?.data || retryResponse?.data;
                }
                throw err;
            }
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
        }
    }
}
/**
 * Gets details for a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to retrieve
 * @param attributes - Optional list of attribute slugs to include
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Record details
 */
export async function getObjectRecord(objectSlug, recordId, attributes, objectId) {
    try {
        // Use the core API function
        return await getRecord(objectSlug, recordId, attributes, objectId);
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation in case the core function fails
        try {
            const api = getAttioClient();
            let path = `/objects/${objectId || objectSlug}/records/${recordId}`;
            // Add attributes parameter if provided
            if (attributes && attributes.length > 0) {
                const attributesParam = attributes.join(',');
                path += `?attributes=${encodeURIComponent(attributesParam)}`;
            }
            const response = await api.get(path);
            return response?.data?.data || response?.data;
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
        }
    }
}
/**
 * Updates a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to update
 * @param attributes - Record attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Updated record
 */
export async function updateObjectRecord(objectSlug, recordId, attributes, objectId) {
    try {
        // Use the core API function
        return await updateRecord({
            objectSlug,
            objectId,
            recordId,
            attributes,
        });
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation in case the core function fails
        try {
            const api = getAttioClient();
            const path = `/objects/${objectId || objectSlug}/records/${recordId}`;
            const response = await api.patch(path, {
                attributes,
            });
            return response?.data?.data || response?.data;
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
        }
    }
}
/**
 * Deletes a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to delete
 * @param objectId - Optional object ID (alternative to slug)
 * @returns True if deletion was successful
 */
export async function deleteObjectRecord(objectSlug, recordId, objectId) {
    try {
        // Use the core API function
        return await deleteRecord(objectSlug, recordId, objectId);
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation in case the core function fails
        try {
            const api = getAttioClient();
            const path = `/objects/${objectId || objectSlug}/records/${recordId}`;
            await api.delete(path);
            return true;
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
        }
    }
}
/**
 * Lists records for a specific object type with filtering options
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param options - Optional listing options (pagination, filtering, etc.)
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Array of records
 */
export async function listObjectRecords(objectSlug, options = {}, objectId) {
    try {
        // Use the core API function
        return await listRecords({
            objectSlug,
            objectId,
            ...options,
        });
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation in case the core function fails
        try {
            const api = getAttioClient();
            // Build query parameters
            const queryParams = new URLSearchParams();
            if (options.page) {
                queryParams.append('page', String(options.page));
            }
            if (options.pageSize) {
                queryParams.append('pageSize', String(options.pageSize));
            }
            if (options.query) {
                queryParams.append('query', options.query);
            }
            if (options.attributes && options.attributes.length > 0) {
                queryParams.append('attributes', options.attributes.join(','));
            }
            if (options.sort) {
                queryParams.append('sort', options.sort);
            }
            if (options.direction) {
                queryParams.append('direction', options.direction);
            }
            const path = `/objects/${objectId || objectSlug}/records${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await api.get(path);
            return response.data.data || [];
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
        }
    }
}
/**
 * Creates multiple records in a batch operation
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of record attributes to create
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with created records
 */
export async function batchCreateObjectRecords(objectSlug, records, objectId, batchConfig) {
    try {
        // Map records to the expected format
        const recordItems = records.map((attributes) => ({ attributes }));
        // Use the core API function
        const createdRecords = await batchCreateRecords({
            objectSlug,
            objectId,
            records: recordItems,
        }, batchConfig?.retryConfig);
        // Format as batch response
        return {
            results: createdRecords.map((record) => ({
                success: true,
                data: record,
            })),
            summary: {
                total: records.length,
                succeeded: createdRecords.length,
                failed: records.length - createdRecords.length,
            },
        };
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation - execute each creation individually
        const results = {
            results: [],
            summary: {
                total: records.length,
                succeeded: 0,
                failed: 0,
            },
        };
        // Process each record individually
        await Promise.all(records.map(async (recordAttributes, index) => {
            try {
                const record = await createObjectRecord(objectSlug, recordAttributes, objectId);
                results.results.push({
                    id: `create_record_${index}`,
                    success: true,
                    data: record,
                });
                results.summary.succeeded++;
            }
            catch (createError) {
                results.results.push({
                    id: `create_record_${index}`,
                    success: false,
                    error: createError,
                });
                results.summary.failed++;
            }
        }));
        return results;
    }
}
/**
 * Updates multiple records in a batch operation
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of records with IDs and attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with updated records
 */
export async function batchUpdateObjectRecords(objectSlug, records, objectId, batchConfig) {
    try {
        // Use the core API function
        const updatedRecords = await batchUpdateRecords({
            objectSlug,
            objectId,
            records,
        }, batchConfig?.retryConfig);
        // Format as batch response
        return {
            results: updatedRecords.map((record, index) => ({
                id: records[index].id,
                success: true,
                data: record,
            })),
            summary: {
                total: records.length,
                succeeded: updatedRecords.length,
                failed: records.length - updatedRecords.length,
            },
        };
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation - execute each update individually
        const results = {
            results: [],
            summary: {
                total: records.length,
                succeeded: 0,
                failed: 0,
            },
        };
        // Process each record individually
        await Promise.all(records.map(async (record) => {
            try {
                const updatedRecord = await updateObjectRecord(objectSlug, record.id, record.attributes, objectId);
                results.results.push({
                    id: record.id,
                    success: true,
                    data: updatedRecord,
                });
                results.summary.succeeded++;
            }
            catch (updateError) {
                results.results.push({
                    id: record.id,
                    success: false,
                    error: updateError,
                });
                results.summary.failed++;
            }
        }));
        return results;
    }
}
// Re-export formatting utilities
export { formatRecordAttribute, formatRecordAttributes } from './formatters.js';
