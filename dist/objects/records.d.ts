import { BatchConfig, BatchResponse } from "../api/attio-operations.js";
import { AttioRecord, RecordAttributes, RecordListParams } from "../types/attio.js";
/**
 * Creates a new record for a specific object type
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param attributes - Record attributes as key-value pairs
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Created record
 */
export declare function createObjectRecord<T extends AttioRecord>(objectSlug: string, attributes: RecordAttributes, objectId?: string): Promise<T>;
/**
 * Gets details for a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to retrieve
 * @param attributes - Optional list of attribute slugs to include
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Record details
 */
export declare function getObjectRecord<T extends AttioRecord>(objectSlug: string, recordId: string, attributes?: string[], objectId?: string): Promise<T>;
/**
 * Updates a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to update
 * @param attributes - Record attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Updated record
 */
export declare function updateObjectRecord<T extends AttioRecord>(objectSlug: string, recordId: string, attributes: RecordAttributes, objectId?: string): Promise<T>;
/**
 * Deletes a specific record
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param recordId - ID of the record to delete
 * @param objectId - Optional object ID (alternative to slug)
 * @returns True if deletion was successful
 */
export declare function deleteObjectRecord(objectSlug: string, recordId: string, objectId?: string): Promise<boolean>;
/**
 * Lists records for a specific object type with filtering options
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param options - Optional listing options (pagination, filtering, etc.)
 * @param objectId - Optional object ID (alternative to slug)
 * @returns Array of records
 */
export declare function listObjectRecords<T extends AttioRecord>(objectSlug: string, options?: Omit<RecordListParams, 'objectSlug' | 'objectId'>, objectId?: string): Promise<T[]>;
/**
 * Creates multiple records in a batch operation
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of record attributes to create
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with created records
 */
export declare function batchCreateObjectRecords<T extends AttioRecord>(objectSlug: string, records: RecordAttributes[], objectId?: string, batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<T>>;
/**
 * Updates multiple records in a batch operation
 *
 * @param objectSlug - Object slug (e.g., 'companies', 'people')
 * @param records - Array of records with IDs and attributes to update
 * @param objectId - Optional object ID (alternative to slug)
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with updated records
 */
export declare function batchUpdateObjectRecords<T extends AttioRecord>(objectSlug: string, records: Array<{
    id: string;
    attributes: RecordAttributes;
}>, objectId?: string, batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<T>>;
/**
 * Helper function to format record attribute values based on their type
 *
 * @param key - Attribute key
 * @param value - Attribute value to format
 * @returns Properly formatted attribute value for the API
 */
export declare function formatRecordAttribute(key: string, value: any): any;
/**
 * Formats a complete set of record attributes for API requests
 *
 * @param attributes - Raw attribute key-value pairs
 * @returns Formatted attributes object ready for API submission
 */
export declare function formatRecordAttributes(attributes: Record<string, any>): RecordAttributes;
//# sourceMappingURL=records.d.ts.map