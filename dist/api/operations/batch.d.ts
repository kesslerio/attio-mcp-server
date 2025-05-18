/**
 * Batch operations for Attio API
 * Handles bulk operations with chunking and error handling
 */
import { AttioRecord, ResourceType, RecordBatchCreateParams, RecordBatchUpdateParams } from '../../types/attio.js';
import { BatchRequestItem, BatchResponse, BatchConfig } from './types.js';
import { RetryConfig } from './retry.js';
/**
 * Creates multiple records in a batch operation
 *
 * @param params - Batch record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of created records
 */
export declare function batchCreateRecords<T extends AttioRecord>(params: RecordBatchCreateParams, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Updates multiple records in a batch operation
 *
 * @param params - Batch record update parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of updated records
 */
export declare function batchUpdateRecords<T extends AttioRecord>(params: RecordBatchUpdateParams, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Default batch configuration
 */
export declare const DEFAULT_BATCH_CONFIG: BatchConfig;
/**
 * Execute a batch of operations with chunking, error handling, and retry support
 *
 * @param operations - Array of operations to process in batch
 * @param apiCall - Function that processes a single operation
 * @param config - Batch configuration options
 * @returns Batch response with individual results and summary
 */
export declare function executeBatchOperations<T, R>(operations: BatchRequestItem<T>[], apiCall: (params: T) => Promise<R>, config?: Partial<BatchConfig>): Promise<BatchResponse<R>>;
/**
 * Generic function to perform batch searches for any object type
 *
 * @param objectType - Type of object to search (people or companies)
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results
 */
export declare function batchSearchObjects<T extends AttioRecord>(objectType: ResourceType, queries: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<T[]>>;
/**
 * Generic function to get details for multiple records of any object type
 *
 * @param objectType - Type of object to get details for (people or companies)
 * @param recordIds - Array of record IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with record details
 */
export declare function batchGetObjectDetails<T extends AttioRecord>(objectType: ResourceType, recordIds: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<T>>;
//# sourceMappingURL=batch.d.ts.map