/**
 * Batch operations for Attio API
 * Handles bulk operations with chunking and error handling
 */
import { getAttioClient } from '../attio-client.js';
import { callWithRetry, DEFAULT_RETRY_CONFIG } from './retry.js';
import { searchObject } from './search.js';
import { getObjectDetails } from './crud.js';
/**
 * Helper function to construct object path
 * @private
 */
function getObjectPath(objectSlug, objectId) {
    // If object ID is provided, use it, otherwise use the slug
    return `/objects/${objectId || objectSlug}`;
}
/**
 * Creates multiple records in a batch operation
 *
 * @param params - Batch record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of created records
 */
export async function batchCreateRecords(params, retryConfig) {
    const api = getAttioClient();
    const objectPath = getObjectPath(params.objectSlug, params.objectId);
    const path = `${objectPath}/records/batch`;
    return callWithRetry(async () => {
        try {
            const response = await api.post(path, {
                records: params.records.map(record => ({ attributes: record.attributes }))
            });
            return response.data.data || [];
        }
        catch (error) {
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
export async function batchUpdateRecords(params, retryConfig) {
    const api = getAttioClient();
    const objectPath = getObjectPath(params.objectSlug, params.objectId);
    const path = `${objectPath}/records/batch`;
    return callWithRetry(async () => {
        try {
            const response = await api.patch(path, {
                records: params.records.map(record => ({
                    id: record.id,
                    attributes: record.attributes
                }))
            });
            return response.data.data || [];
        }
        catch (error) {
            // Let upstream handlers create specific, rich error objects.
            throw error;
        }
    }, retryConfig);
}
/**
 * Default batch configuration
 */
export const DEFAULT_BATCH_CONFIG = {
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
export async function executeBatchOperations(operations, apiCall, config = {}) {
    // Merge with default config
    const batchConfig = {
        ...DEFAULT_BATCH_CONFIG,
        ...config
    };
    // Initialize batch response
    const batchResponse = {
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
            const result = {
                id: operation.id,
                success: false
            };
            try {
                // Execute the operation with retry logic if configured
                if (batchConfig.retryConfig) {
                    result.data = await callWithRetry(() => apiCall(operation.params), batchConfig.retryConfig);
                }
                else {
                    result.data = await apiCall(operation.params);
                }
                // Mark as successful
                result.success = true;
                batchResponse.summary.succeeded++;
            }
            catch (error) {
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
export async function batchSearchObjects(objectType, queries, batchConfig) {
    // Convert queries to batch request items
    const operations = queries.map((query, index) => ({
        params: query,
        id: `search_${objectType}_${index}`
    }));
    // Execute batch operations using the searchObject function
    return executeBatchOperations(operations, (query) => searchObject(objectType, query), batchConfig);
}
/**
 * Generic function to get details for multiple records of any object type
 *
 * @param objectType - Type of object to get details for (people or companies)
 * @param recordIds - Array of record IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with record details
 */
export async function batchGetObjectDetails(objectType, recordIds, batchConfig) {
    // Convert record IDs to batch request items
    const operations = recordIds.map((recordId) => ({
        params: recordId,
        id: `get_${objectType}_${recordId}`
    }));
    // Execute batch operations using the getObjectDetails function
    return executeBatchOperations(operations, (recordId) => getObjectDetails(objectType, recordId), batchConfig);
}
//# sourceMappingURL=batch.js.map