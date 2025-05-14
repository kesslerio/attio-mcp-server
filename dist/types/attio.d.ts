/**
 * Common type definitions for Attio API responses and entities
 */
import { RetryConfig } from "../api/attio-operations.js";
/**
 * Base interface for Attio record values
 */
export interface AttioValue<T> {
    value: T;
    [key: string]: any;
}
/**
 * Valid filter condition types for Attio API
 */
export declare enum FilterConditionType {
    EQUALS = "equals",
    NOT_EQUALS = "not_equals",
    CONTAINS = "contains",
    NOT_CONTAINS = "not_contains",
    STARTS_WITH = "starts_with",
    ENDS_WITH = "ends_with",
    GREATER_THAN = "greater_than",
    LESS_THAN = "less_than",
    GREATER_THAN_OR_EQUALS = "greater_than_or_equals",
    LESS_THAN_OR_EQUALS = "less_than_or_equals",
    IS_EMPTY = "is_empty",
    IS_NOT_EMPTY = "is_not_empty",
    IS_SET = "is_set",
    IS_NOT_SET = "is_not_set"
}
/**
 * Type guard to check if a string is a valid filter condition
 *
 * This function validates that a given string represents a valid filter condition
 * type as defined in the FilterConditionType enum. It provides type safety when
 * working with filter conditions from external input.
 *
 * @param condition - The string condition to check
 * @returns True if the condition is a valid FilterConditionType, false otherwise
 *
 * @example
 * ```typescript
 * const userCondition = "equals";
 *
 * if (isValidFilterCondition(userCondition)) {
 *   // TypeScript knows userCondition is a FilterConditionType here
 *   // Safe to use in filter operations
 * } else {
 *   // Handle invalid condition
 *   throw new FilterValidationError(`Invalid filter condition: ${userCondition}`);
 * }
 * ```
 */
export declare function isValidFilterCondition(condition: string): condition is FilterConditionType;
/**
 * Base interface for Attio records (common between people and companies)
 */
export interface AttioRecord {
    id: {
        record_id: string;
        [key: string]: any;
    };
    values: {
        name?: Array<AttioValue<string>>;
        email?: Array<AttioValue<string>>;
        phone?: Array<AttioValue<string>>;
        industry?: Array<AttioValue<string>>;
        website?: Array<AttioValue<string>>;
        [key: string]: any;
    };
    [key: string]: any;
}
/**
 * Interface for a batch request item
 */
export interface BatchRequestItem<T> {
    params: T;
    id?: string;
}
/**
 * Interface for a batch operation result item
 */
export interface BatchItemResult<R> {
    id?: string;
    success: boolean;
    data?: R;
    error?: any;
}
/**
 * Interface for a batch operation response
 */
export interface BatchResponse<R> {
    results: BatchItemResult<R>[];
    summary: {
        total: number;
        succeeded: number;
        failed: number;
    };
}
/**
 * Configuration options for batch operations
 */
export interface BatchConfig {
    maxBatchSize: number;
    continueOnError: boolean;
    retryConfig?: RetryConfig;
}
/**
 * Note record type
 */
export interface AttioNote {
    id: {
        note_id: string;
        [key: string]: any;
    };
    title: string;
    content: string;
    format: string;
    parent_object: string;
    parent_record_id: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}
/**
 * List record type
 */
export interface AttioList {
    id: {
        list_id: string;
        [key: string]: any;
    };
    title: string;
    name?: string;
    description?: string;
    object_slug: string;
    workspace_id: string;
    created_at: string;
    updated_at: string;
    entry_count?: number;
    [key: string]: any;
}
/**
 * List entry record type
 */
export interface AttioListEntry {
    id: {
        entry_id: string;
        [key: string]: any;
    };
    list_id: string;
    record_id?: string;
    created_at: string;
    updated_at?: string;
    record?: AttioRecord;
    [key: string]: any;
}
/**
 * Resource type enum for better type safety
 */
export declare enum ResourceType {
    PEOPLE = "people",
    COMPANIES = "companies",
    LISTS = "lists",
    RECORDS = "records"
}
/**
 * API error response shape
 */
export interface AttioErrorResponse {
    status?: number;
    data?: any;
    headers?: Record<string, string>;
    error?: string;
    message?: string;
    details?: any;
    [key: string]: any;
}
/**
 * API response containing a list of records
 */
export interface AttioListResponse<T> {
    data: T[];
    pagination?: {
        total_count: number;
        next_cursor?: string;
        [key: string]: any;
    };
    has_more?: boolean;
    next_cursor?: string;
    [key: string]: any;
}
/**
 * API response containing a single record
 */
export interface AttioSingleResponse<T> {
    data: T;
    [key: string]: any;
}
export interface Person extends AttioRecord {
    values: {
        name?: Array<{
            value: string;
        }>;
        email?: Array<{
            value: string;
        }>;
        phone?: Array<{
            value: string;
        }>;
        [key: string]: any;
    };
}
export interface Company extends AttioRecord {
    values: {
        name?: Array<{
            value: string;
        }>;
        website?: Array<{
            value: string;
        }>;
        industry?: Array<{
            value: string;
        }>;
        [key: string]: any;
    };
}
/**
 * Record attribute types
 */
export interface RecordAttributes {
    [key: string]: any;
}
/**
 * Parameters for creating a record
 */
export interface RecordCreateParams {
    objectSlug: string;
    objectId?: string;
    attributes: RecordAttributes;
}
/**
 * Parameters for updating a record
 */
export interface RecordUpdateParams {
    objectSlug: string;
    objectId?: string;
    recordId: string;
    attributes: RecordAttributes;
}
/**
 * Parameters for listing records
 */
export interface RecordListParams {
    objectSlug: string;
    objectId?: string;
    page?: number;
    pageSize?: number;
    query?: string;
    attributes?: string[];
    sort?: string;
    direction?: 'asc' | 'desc';
}
/**
 * Record item for batch operations
 */
export interface BatchRecordItem {
    id?: string;
    attributes: RecordAttributes;
}
/**
 * Parameters for batch creating records
 */
export interface RecordBatchCreateParams {
    objectSlug: string;
    objectId?: string;
    records: Omit<BatchRecordItem, 'id'>[];
}
/**
 * Parameters for batch updating records
 */
export interface RecordBatchUpdateParams {
    objectSlug: string;
    objectId?: string;
    records: BatchRecordItem[];
}
//# sourceMappingURL=attio.d.ts.map