/**
 * Batch operations for Attio API
 * Handles bulk operations with chunking and error handling
 * Includes DoS protection through size and payload validation
 */

import { getAttioClient } from '../attio-client.js';
import {
  AttioRecord,
  ResourceType,
  AttioListResponse,
  RecordBatchCreateParams,
  RecordBatchUpdateParams,
} from '../../types/attio.js';
import {
  BatchRequestItem,
  BatchItemResult,
  BatchResponse,
  BatchConfig,
} from './types.js';
import { callWithRetry, RetryConfig, DEFAULT_RETRY_CONFIG } from './retry.js';
import { searchObject } from './search.js';
import { getObjectDetails } from './crud.js';
import {
  validateBatchSize,
  validatePayloadSize,
} from '../../utils/batch-validation.js';
import { getBatchSizeLimit } from '../../config/security-limits.js';

/**
 * Helper function to construct object path
 * @private
 */
function getObjectPath(objectSlug: string, objectId?: string): string {
  // If object ID is provided, use it, otherwise use the slug
  return `/objects/${objectId || objectSlug}`;
}

/**
 * Creates multiple records in a batch operation
 * Includes validation for batch size and payload to prevent DoS
 *
 * @param params - Batch record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of created records
 * @throws Error if batch size or payload exceeds limits
 */
export async function batchCreateRecords<T extends AttioRecord>(
  params: RecordBatchCreateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  // Validate batch size
  const sizeValidation = validateBatchSize(
    params.records,
    'create',
    params.objectSlug
  );
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error);
  }
  
  // Validate payload size
  const payloadValidation = validatePayloadSize(params.records);
  if (!payloadValidation.isValid) {
    throw new Error(payloadValidation.error);
  }
  
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records/batch`;

  return callWithRetry(async () => {
    const response = await api.post<AttioListResponse<T>>(path, {
      records: params.records.map((record) => ({
        attributes: record.attributes,
      })),
    });

    return response?.data?.data || [];
  }, retryConfig);
}

/**
 * Updates multiple records in a batch operation
 * Includes validation for batch size and payload to prevent DoS
 *
 * @param params - Batch record update parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of updated records
 * @throws Error if batch size or payload exceeds limits
 */
export async function batchUpdateRecords<T extends AttioRecord>(
  params: RecordBatchUpdateParams,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  // Validate batch size
  const sizeValidation = validateBatchSize(
    params.records,
    'update',
    params.objectSlug
  );
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error);
  }
  
  // Validate payload size
  const payloadValidation = validatePayloadSize(params.records);
  if (!payloadValidation.isValid) {
    throw new Error(payloadValidation.error);
  }
  
  const api = getAttioClient();
  const objectPath = getObjectPath(params.objectSlug, params.objectId);
  const path = `${objectPath}/records/batch`;

  return callWithRetry(async () => {
    const response = await api.patch<AttioListResponse<T>>(path, {
      records: params.records.map((record) => ({
        id: record.id,
        attributes: record.attributes,
      })),
    });

    return response?.data?.data || [];
  }, retryConfig);
}

/**
 * Default batch configuration with security limits
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: Math.min(10, getBatchSizeLimit()), // Use the smaller of 10 or the configured limit
  continueOnError: true,
  retryConfig: DEFAULT_RETRY_CONFIG,
};

/**
 * Execute a batch of operations with chunking, error handling, and retry support
 * Includes validation for batch size to prevent DoS attacks
 *
 * @param operations - Array of operations to process in batch
 * @param apiCall - Function that processes a single operation
 * @param config - Batch configuration options
 * @returns Batch response with individual results and summary
 * @throws Error if batch size exceeds security limits
 */
export async function executeBatchOperations<T, R>(
  operations: BatchRequestItem<T>[],
  apiCall: (params: T) => Promise<R>,
  config: Partial<BatchConfig> = {}
): Promise<BatchResponse<R>> {
  // Validate overall batch size
  const sizeValidation = validateBatchSize(operations, 'execute');
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error);
  }
  
  // Merge with default config, ensuring maxBatchSize doesn't exceed limits
  const batchConfig: BatchConfig = {
    ...DEFAULT_BATCH_CONFIG,
    ...config,
    maxBatchSize: Math.min(
      config.maxBatchSize || DEFAULT_BATCH_CONFIG.maxBatchSize,
      getBatchSizeLimit()
    ),
  };

  // Initialize batch response
  const batchResponse: BatchResponse<R> = {
    results: [],
    summary: {
      total: operations.length,
      succeeded: 0,
      failed: 0,
    },
  };

  // Process operations in chunks to respect maxBatchSize
  const chunks = [];
  for (let i = 0; i < operations.length; i += batchConfig.maxBatchSize) {
    chunks.push(operations.slice(i, i + batchConfig.maxBatchSize));
  }

  // Process each chunk
  for (const chunk of chunks) {
    // Process operations in the current chunk
    await Promise.all(
      chunk.map(async (operation) => {
        const result: BatchItemResult<R> = {
          id: operation.id,
          success: false,
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
      })
    );
  }

  return batchResponse;
}

/**
 * Generic function to perform batch searches for any object type
 * Includes validation for query count to prevent DoS
 *
 * @param objectType - Type of object to search (people or companies)
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results
 * @throws Error if query count exceeds limits
 */
export async function batchSearchObjects<T extends AttioRecord>(
  objectType: ResourceType,
  queries: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T[]>> {
  // Validate batch size for search operations
  const sizeValidation = validateBatchSize(queries, 'search', objectType);
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error);
  }
  
  // Convert queries to batch request items
  const operations: BatchRequestItem<string>[] = queries.map(
    (query, index) => ({
      params: query,
      id: `search_${objectType}_${index}`,
    })
  );

  // Execute batch operations using the searchObject function
  return executeBatchOperations<string, T[]>(
    operations,
    (query) => searchObject<T>(objectType, query),
    batchConfig
  );
}

/**
 * Generic function to get details for multiple records of any object type
 * Includes validation for ID count to prevent DoS
 *
 * @param objectType - Type of object to get details for (people or companies)
 * @param recordIds - Array of record IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with record details
 * @throws Error if ID count exceeds limits
 */
export async function batchGetObjectDetails<T extends AttioRecord>(
  objectType: ResourceType,
  recordIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<BatchResponse<T>> {
  // Validate batch size
  const sizeValidation = validateBatchSize(recordIds, 'get', objectType);
  if (!sizeValidation.isValid) {
    throw new Error(sizeValidation.error);
  }
  
  // Convert record IDs to batch request items
  const operations: BatchRequestItem<string>[] = recordIds.map((recordId) => ({
    params: recordId,
    id: `get_${objectType}_${recordId}`,
  }));

  // Execute batch operations using the getObjectDetails function
  return executeBatchOperations<string, T>(
    operations,
    (recordId) => getObjectDetails<T>(objectType, recordId),
    batchConfig
  );
}
