import { AttioRecord, AttioNote, ResourceType, AttioList, AttioListEntry, BatchRequestItem as BatchRequestItemType, BatchItemResult as BatchItemResultType, BatchResponse as BatchResponseType, BatchConfig as BatchConfigType, RecordCreateParams, RecordUpdateParams, RecordListParams, RecordBatchCreateParams, RecordBatchUpdateParams } from "../types/attio.js";
export type BatchRequestItem<T> = BatchRequestItemType<T>;
export type BatchItemResult<R> = BatchItemResultType<R>;
export type BatchResponse<R> = BatchResponseType<R>;
export type BatchConfig = BatchConfigType;
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
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Execute an API call with retry logic
 *
 * @param fn - Function that returns a promise for the API call
 * @param config - Retry configuration
 * @returns Promise that resolves with the API response
 */
export declare function callWithRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
/**
 * Generic function to search any object type by name, email, or phone (when applicable)
 *
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export declare function searchObject<T extends AttioRecord>(objectType: ResourceType, query: string, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Generic function to list any object type with pagination and sorting
 *
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export declare function listObjects<T extends AttioRecord>(objectType: ResourceType, limit?: number, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
/**
 * Generic function to get details for a specific record
 *
 * @param objectType - The type of object to get (people or companies)
 * @param recordId - ID of the record
 * @param retryConfig - Optional retry configuration
 * @returns Record details
 */
export declare function getObjectDetails<T extends AttioRecord>(objectType: ResourceType, recordId: string, retryConfig?: Partial<RetryConfig>): Promise<T>;
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
export declare function getObjectNotes(objectType: ResourceType, recordId: string, limit?: number, offset?: number, retryConfig?: Partial<RetryConfig>): Promise<AttioNote[]>;
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
export declare function createObjectNote(objectType: ResourceType, recordId: string, noteTitle: string, noteText: string, retryConfig?: Partial<RetryConfig>): Promise<AttioNote>;
/**
 * Gets all lists in the workspace
 *
 * @param objectSlug - Optional object type to filter lists by (e.g., 'companies', 'people')
 * @param limit - Maximum number of lists to fetch (default: 20)
 * @param retryConfig - Optional retry configuration
 * @returns Array of list objects
 */
export declare function getAllLists(objectSlug?: string, limit?: number, retryConfig?: Partial<RetryConfig>): Promise<AttioList[]>;
/**
 * Gets details for a specific list
 *
 * @param listId - The ID of the list
 * @param retryConfig - Optional retry configuration
 * @returns List details
 */
export declare function getListDetails(listId: string, retryConfig?: Partial<RetryConfig>): Promise<AttioList>;
/**
 * Filter definition for list entries
 */
export interface ListEntryFilter {
    attribute: {
        slug: string;
    };
    condition: string;
    value: any;
    /**
     * Optional logical operator to use when combined with other filters
     * If not provided, default is 'and'
     */
    logicalOperator?: 'and' | 'or';
}
/**
 * Parameters for filtering list entries
 */
export interface ListEntryFilters {
    /**
     * Individual filter conditions to apply
     */
    filters?: ListEntryFilter[];
    /**
     * When true, at least one filter must match (equivalent to OR)
     * When false or omitted, all filters must match (equivalent to AND)
     */
    matchAny?: boolean;
    /**
     * Optional array of attribute groups for complex nested conditions
     * Each group is treated as a unit with its own logical operator
     */
    filterGroups?: Array<{
        filters: ListEntryFilter[];
        matchAny?: boolean;
    }>;
}
/**
 * Gets entries for a specific list
 *
 * @param listId - The ID of the list
 * @param limit - Maximum number of entries to fetch (optional)
 * @param offset - Number of entries to skip (optional)
 * @param filters - Optional filters to apply to list entries
 * @param retryConfig - Optional retry configuration
 * @returns Array of list entries
 */
export declare function getListEntries(listId: string, limit?: number, offset?: number, filters?: ListEntryFilters, retryConfig?: Partial<RetryConfig>): Promise<AttioListEntry[]>;
/**
 * Adds a record to a list
 *
 * @param listId - The ID of the list
 * @param recordId - The ID of the record to add
 * @param retryConfig - Optional retry configuration
 * @returns The created list entry
 */
export declare function addRecordToList(listId: string, recordId: string, retryConfig?: Partial<RetryConfig>): Promise<AttioListEntry>;
/**
 * Removes a record from a list
 *
 * @param listId - The ID of the list
 * @param entryId - The ID of the list entry to remove
 * @param retryConfig - Optional retry configuration
 * @returns True if successful
 */
export declare function removeRecordFromList(listId: string, entryId: string, retryConfig?: Partial<RetryConfig>): Promise<boolean>;
/**
 * Creates a new record
 *
 * @param params - Record creation parameters
 * @param retryConfig - Optional retry configuration
 * @returns Created record
 */
export declare function createRecord<T extends AttioRecord>(params: RecordCreateParams, retryConfig?: Partial<RetryConfig>): Promise<T>;
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
export declare function getRecord<T extends AttioRecord>(objectSlug: string, recordId: string, attributes?: string[], objectId?: string, retryConfig?: Partial<RetryConfig>): Promise<T>;
/**
 * Updates a specific record
 *
 * @param params - Record update parameters
 * @param retryConfig - Optional retry configuration
 * @returns Updated record
 */
export declare function updateRecord<T extends AttioRecord>(params: RecordUpdateParams, retryConfig?: Partial<RetryConfig>): Promise<T>;
/**
 * Deletes a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to delete
 * @param objectId - Optional object ID (alternative to slug)
 * @param retryConfig - Optional retry configuration
 * @returns True if deletion was successful
 */
export declare function deleteRecord(objectSlug: string, recordId: string, objectId?: string, retryConfig?: Partial<RetryConfig>): Promise<boolean>;
/**
 * Lists records with filtering options
 *
 * @param params - Record listing parameters
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export declare function listRecords<T extends AttioRecord>(params: RecordListParams, retryConfig?: Partial<RetryConfig>): Promise<T[]>;
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
//# sourceMappingURL=attio-operations.d.ts.map