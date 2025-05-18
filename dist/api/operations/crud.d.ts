/**
 * CRUD operations for Attio objects
 * Handles create, read, update, and delete operations
 */
import { AttioRecord, ResourceType, RecordCreateParams, RecordUpdateParams, RecordListParams } from '../../types/attio.js';
import { RetryConfig } from './retry.js';
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
//# sourceMappingURL=crud.d.ts.map