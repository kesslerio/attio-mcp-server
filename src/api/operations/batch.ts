/**
 * Batch operations for Attio API
 * Handles bulk operations with chunking and error handling
 * Includes DoS protection through size and payload validation
 * Enhanced for Issue #471: Batch Search Operations Support
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

// Import universal types for enhanced batch search support
import { 
  UniversalResourceType, 
  UniversalSearchParams 
} from '../../handlers/tool-configs/universal/types.js';

// Import UniversalSearchService for resource type conversions
import { UniversalSearchService } from '../../services/UniversalSearchService.js';

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
        } catch (error: unknown) {
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

// =============================================================================
// ENHANCED BATCH OPERATIONS FOR UNIVERSAL TOOLS (Issue #471)
// =============================================================================

/**
 * Universal batch search interface for Issue #471
 * Returns results in the format expected by universal tools with error isolation
 */
export interface UniversalBatchSearchResult {
  success: boolean;
  query: string;
  result?: AttioRecord[];
  error?: string;
}

/**
 * Type guard to check if a universal resource type is supported by legacy API
 */
function isLegacyResourceType(universalType: UniversalResourceType): universalType is UniversalResourceType.COMPANIES | UniversalResourceType.PEOPLE {
  return universalType === UniversalResourceType.COMPANIES || universalType === UniversalResourceType.PEOPLE;
}

/**
 * Convert UniversalResourceType to ResourceType for legacy API compatibility
 * Uses explicit type guards to ensure type safety
 */
function convertUniversalResourceType(universalType: UniversalResourceType): ResourceType {
  // Use type guard for safe conversion
  if (!isLegacyResourceType(universalType)) {
    throw new Error(`Resource type ${universalType} is not supported by legacy batch API. Use UniversalSearchService path instead.`);
  }

  switch (universalType) {
    case UniversalResourceType.COMPANIES:
      return ResourceType.COMPANIES;
    case UniversalResourceType.PEOPLE:
      return ResourceType.PEOPLE;
    default:
      // This should never be reached due to type guard, but TypeScript requires it
      throw new Error(`Unsupported universal resource type: ${universalType}`);
  }
}

/**
 * Enhanced batch search for universal tools with error isolation
 * Supports all universal resource types and returns formatted results
 * 
 * @param resourceType - Universal resource type to search
 * @param queries - Array of search query strings
 * @param searchParams - Additional search parameters (limit, offset, filters)
 * @param batchConfig - Optional batch configuration
 * @returns Array of search results with error isolation
 * @throws Error if validation fails
 */
export async function universalBatchSearch(
  resourceType: UniversalResourceType,
  queries: string[],
  searchParams?: {
    limit?: number;
    offset?: number;
    filters?: Record<string, unknown>;
  },
  batchConfig?: Partial<BatchConfig>
): Promise<UniversalBatchSearchResult[]> {
  // Performance timing start
  const performanceStart = performance.now();
  
  // Validate batch size for search operations
  const sizeValidation = validateBatchSize(queries, 'search', resourceType);
  if (!sizeValidation.isValid) {
    // Get current batch size limit for enhanced error message
    const maxSize = getBatchSizeLimit(resourceType) || 100;
    const enhancedError = `${sizeValidation.error}. Attempted to search ${queries.length} queries, but maximum allowed for ${resourceType} is ${maxSize}. Consider breaking your search into smaller batches or using sequential search operations.`;
    throw new Error(enhancedError);
  }

  const { limit, offset, filters } = searchParams || {};
  
  // Log batch search initiation
  console.log(`[Performance] Starting batch search for ${resourceType}: ${queries.length} queries`);
  
  try {
    // Handle resource types not supported by legacy batch API
    if ([
      UniversalResourceType.LISTS,
      UniversalResourceType.RECORDS, 
      UniversalResourceType.TASKS,
      UniversalResourceType.DEALS
    ].includes(resourceType)) {
      // Use UniversalSearchService for these resource types
      const result = await handleUniversalResourceTypeBatchSearch(
        resourceType, 
        queries, 
        { limit, offset, filters }
      );
      
      // Log performance metrics
      const performanceEnd = performance.now();
      const duration = performanceEnd - performanceStart;
      const successCount = result.filter(r => r.success).length;
      console.log(`[Performance] Batch search completed for ${resourceType}: ${duration.toFixed(2)}ms, ${successCount}/${queries.length} successful`);
      
      return result;
    }

    // For companies and people, use the existing optimized batch API
    const legacyResourceType = convertUniversalResourceType(resourceType);
    
    const batchResponse = await batchSearchObjects<AttioRecord>(
      legacyResourceType,
      queries,
      batchConfig
    );

    // Convert BatchResponse format to UniversalBatchSearchResult format
    const result = batchResponse.results.map((result, index) => ({
      success: result.success,
      query: queries[index],
      result: result.success ? result.data : undefined,
      error: result.success ? undefined : 
        (result.error instanceof Error ? result.error.message : String(result.error))
    }));
    
    // Log performance metrics
    const performanceEnd = performance.now();
    const duration = performanceEnd - performanceStart;
    const successCount = result.filter(r => r.success).length;
    console.log(`[Performance] Batch search completed for ${resourceType}: ${duration.toFixed(2)}ms, ${successCount}/${queries.length} successful`);
    
    return result;

  } catch (error: unknown) {
    // Log performance metrics for failed operations
    const performanceEnd = performance.now();
    const duration = performanceEnd - performanceStart;
    console.log(`[Performance] Batch search failed for ${resourceType}: ${duration.toFixed(2)}ms, error: ${error instanceof Error ? error.message : String(error)}`);
    
    // If batch operation fails completely, return error for all queries
    const errorMessage = error instanceof Error ? error.message : String(error);
    return queries.map(query => ({
      success: false,
      query,
      error: errorMessage
    }));
  }
}

/**
 * Handle batch search for universal resource types not supported by legacy API
 * Uses UniversalSearchService with error isolation per query
 */
async function handleUniversalResourceTypeBatchSearch(
  resourceType: UniversalResourceType,
  queries: string[],
  searchParams: {
    limit?: number;
    offset?: number;
    filters?: Record<string, unknown>;
  }
): Promise<UniversalBatchSearchResult[]> {
  const results: UniversalBatchSearchResult[] = [];

  // Process each query independently with error isolation
  await Promise.allSettled(
    queries.map(async (query) => {
      try {
        const searchResult = await UniversalSearchService.searchRecords({
          resource_type: resourceType,
          query,
          filters: searchParams.filters,
          limit: searchParams.limit,
          offset: searchParams.offset
        } as UniversalSearchParams);

        results.push({
          success: true,
          query,
          result: searchResult
        });
      } catch (error: unknown) {
        results.push({
          success: false,
          query,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })
  );

  // Ensure results are in the same order as queries
  return queries.map(query => 
    results.find(r => r.query === query) || {
      success: false,
      query,
      error: 'Query processing failed'
    }
  );
}

/**
 * Enhanced batch get details for universal tools
 * Supports all universal resource types with error isolation
 * 
 * @param resourceType - Universal resource type
 * @param recordIds - Array of record IDs to fetch
 * @param batchConfig - Optional batch configuration  
 * @returns Array of get results with error isolation
 */
export async function universalBatchGetDetails(
  resourceType: UniversalResourceType,
  recordIds: string[],
  batchConfig?: Partial<BatchConfig>
): Promise<Array<{
  success: boolean;
  recordId: string;
  result?: AttioRecord;
  error?: string;
}>> {
  // Validate batch size
  const sizeValidation = validateBatchSize(recordIds, 'get', resourceType);
  if (!sizeValidation.isValid) {
    // Get current batch size limit for enhanced error message
    const maxSize = getBatchSizeLimit(resourceType) || 100;
    const enhancedError = `${sizeValidation.error}. Attempted to get ${recordIds.length} records, but maximum allowed for ${resourceType} is ${maxSize}. Consider breaking your request into smaller batches.`;
    throw new Error(enhancedError);
  }

  // For companies and people, use existing batch API
  if ([UniversalResourceType.COMPANIES, UniversalResourceType.PEOPLE].includes(resourceType)) {
    const legacyResourceType = convertUniversalResourceType(resourceType);
    
    try {
      const batchResponse = await batchGetObjectDetails<AttioRecord>(
        legacyResourceType,
        recordIds,
        batchConfig
      );

      return batchResponse.results.map((result, index) => ({
        success: result.success,
        recordId: recordIds[index],
        result: result.success ? result.data : undefined,
        error: result.success ? undefined : 
          (result.error instanceof Error ? result.error.message : String(result.error))
      }));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return recordIds.map(recordId => ({
        success: false,
        recordId,
        error: errorMessage
      }));
    }
  }

  // For other resource types, handle individually with error isolation
  // This would use the appropriate universal service methods
  return recordIds.map(recordId => ({
    success: false,
    recordId,
    error: `Batch get details not yet implemented for resource type: ${resourceType}`
  }));
}
