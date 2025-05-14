/**
 * Common type definitions for Attio API responses and entities
 */
import { RetryConfig, ListEntryFilter } from "../api/attio-operations.js";

/**
 * Base interface for Attio record values
 */
export interface AttioValue<T> {
  value: T;
  [key: string]: any; // Additional fields that might be present
}

/**
 * Valid filter condition types for Attio API
 */
export enum FilterConditionType {
  // Equality conditions
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  
  // String conditions
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  
  // Numeric/Date conditions
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUALS = 'greater_than_or_equals',
  LESS_THAN_OR_EQUALS = 'less_than_or_equals',
  
  // Date range specific conditions
  BEFORE = 'before',
  AFTER = 'after',
  BETWEEN = 'between',
  
  // Existence conditions
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IS_SET = 'is_set', 
  IS_NOT_SET = 'is_not_set'
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
export function isValidFilterCondition(condition: string): condition is FilterConditionType {
  return Object.values(FilterConditionType).includes(condition as FilterConditionType);
}

/**
 * Time units for relative date expressions
 */
export enum RelativeDateUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Supported date range preset values
 */
export enum DateRangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year'
}

/**
 * Representation of a relative date (e.g., "last 7 days")
 */
export interface RelativeDate {
  unit: RelativeDateUnit;
  value: number;
  direction: 'past' | 'future';
}

/**
 * Date range specification for filtering
 */
export interface DateRange {
  start?: string | RelativeDate;
  end?: string | RelativeDate;
  preset?: string;
}

/**
 * Numeric range specification for filtering
 */
export interface NumericRange {
  min?: number;
  max?: number;
  equals?: number;
}

/**
 * Interaction types for activity filtering
 */
export enum InteractionType {
  ANY = 'any',
  EMAIL = 'email',
  CALENDAR = 'calendar',
  PHONE = 'phone',
  MEETING = 'meeting',
  CUSTOM = 'custom'
}

/**
 * Activity history related filtering options
 */
export interface ActivityFilter {
  dateRange: DateRange;
  interactionType?: InteractionType;
}

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
    [key: string]: any; // Other fields
  };
  [key: string]: any; // Additional top-level fields
}

/**
 * Interface for a batch request item
 */
export interface BatchRequestItem<T> {
  params: T;      // The parameters for this specific operation
  id?: string;    // Optional ID to track this specific request
}

/**
 * Interface for a batch operation result item
 */
export interface BatchItemResult<R> {
  id?: string;     // Optional ID matching the request ID if provided
  success: boolean; // Whether this specific operation succeeded
  data?: R;        // The result data if successful
  error?: any;     // Error information if failed
}

/**
 * Interface for a batch operation response
 */
export interface BatchResponse<R> {
  results: BatchItemResult<R>[];  // Individual results for each request
  summary: {
    total: number;    // Total number of operations attempted
    succeeded: number; // Number of successful operations
    failed: number;    // Number of failed operations
  };
}

/**
 * Configuration options for batch operations
 */
export interface BatchConfig {
  maxBatchSize: number;     // Maximum number of operations in a single batch
  continueOnError: boolean; // Whether to continue processing remaining items on error
  retryConfig?: RetryConfig; // Optional retry configuration for batch operations
}

// Person and Company interfaces are defined in detail below

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
  [key: string]: any; // Additional fields
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
  name?: string; // Adding name property as it appears in some API responses
  description?: string;
  object_slug: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  entry_count?: number;
  [key: string]: any; // Additional fields
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
  record_id?: string; // Making this optional to better match the API reality
  created_at: string;
  updated_at?: string;
  record?: AttioRecord; // Optional included record data
  [key: string]: any; // Additional fields
}

/**
 * Resource type enum for better type safety
 */
export enum ResourceType {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  LISTS = 'lists',
  RECORDS = 'records'
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

// Specific record types
export interface Person extends AttioRecord {
  values: {
    name?: Array<{value: string}>;
    email?: Array<{value: string}>;
    phone?: Array<{value: string}>;
    [key: string]: any;
  };
}

export interface Company extends AttioRecord {
  values: {
    name?: Array<{value: string}>;
    website?: Array<{value: string}>;
    industry?: Array<{value: string}>;
    [key: string]: any;
  };
}

/**
 * Record attribute types
 */
export interface RecordAttributes {
  [key: string]: any; // Generic attribute map
}

/**
 * Parameters for creating a record
 */
export interface RecordCreateParams {
  objectSlug: string;        // Object slug (e.g., 'companies', 'people')
  objectId?: string;         // Alternative to objectSlug - direct object ID
  attributes: RecordAttributes; // Record attributes as key-value pairs
}

/**
 * Parameters for updating a record
 */
export interface RecordUpdateParams {
  objectSlug: string;        // Object slug (e.g., 'companies', 'people')
  objectId?: string;         // Alternative to objectSlug - direct object ID
  recordId: string;          // ID of the record to update
  attributes: RecordAttributes; // Record attributes to update
}

/**
 * Parameters for listing records
 */
export interface RecordListParams {
  objectSlug: string;        // Object slug (e.g., 'companies', 'people')
  objectId?: string;         // Alternative to objectSlug - direct object ID
  page?: number;             // Page number to retrieve (starting at 1)
  pageSize?: number;         // Number of items per page
  query?: string;            // Search query to filter records
  attributes?: string[];     // List of attribute slugs to include
  sort?: string;             // Attribute slug to sort by
  direction?: 'asc' | 'desc'; // Sort direction
}

/**
 * Record item for batch operations
 */
export interface BatchRecordItem {
  id?: string;               // Record ID for updates, omit for creation
  attributes: RecordAttributes; // Record attributes
}

/**
 * Parameters for batch creating records
 */
export interface RecordBatchCreateParams {
  objectSlug: string;        // Object slug (e.g., 'companies', 'people')
  objectId?: string;         // Alternative to objectSlug - direct object ID
  records: Omit<BatchRecordItem, 'id'>[]; // Array of records to create
}

/**
 * Parameters for batch updating records
 */
export interface RecordBatchUpdateParams {
  objectSlug: string;        // Object slug (e.g., 'companies', 'people')
  objectId?: string;         // Alternative to objectSlug - direct object ID
  records: BatchRecordItem[]; // Array of records to update with their IDs
}