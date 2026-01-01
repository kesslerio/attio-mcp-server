/**
 * Common type definitions for Attio API responses and entities
 */
import { RetryConfig } from '../api/operations/index.js';

/**
 * Shared JSON object type used across the codebase to replace repetitive
 * `Record<string, unknown>` declarations while preserving type safety.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Base interface for Attio record values
 */
export interface AttioValue<T> {
  value: T;
  [key: string]: unknown; // Additional fields that might be present
}

/**
 * Enhanced interface for field values that can contain display names
 * Supports both direct value access and full_name for name fields
 */
export interface AttioFieldValue {
  value?: string;
  full_name?: string; // Used in name fields as alternative to value
  [key: string]: unknown;
}

/**
 * Interface for record values with specific display name fields
 * Used by formatResult functions for consistent field access
 */
export interface AttioRecordValues {
  name?: AttioFieldValue[];
  full_name?: AttioFieldValue[];
  title?: AttioFieldValue[];
  content?: AttioFieldValue[];
  email?: AttioFieldValue[];
  website?: AttioFieldValue[];
  phone?: AttioFieldValue[];
  industry?: AttioFieldValue[];
  [key: string]: unknown; // Other fields
}

/**
 * Identifier shape returned by Attio for note resources
 */
export interface AttioNoteIdentifier {
  note_id?: string;
  record_id?: string;
  workspace_id?: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Nested values payload used by Attio notes API (mirrors record value arrays)
 */
export interface AttioNoteValues {
  title?: AttioFieldValue[];
  content?: AttioFieldValue[];
  [key: string]: unknown;
}

/**
 * Union type for fields that can be used as display names
 * Ordered by priority: name → full_name → title → content
 */
export type DisplayNameField = 'name' | 'full_name' | 'title' | 'content';

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
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUALS = 'gte',
  LESS_THAN_OR_EQUALS = 'lte',

  // Date range specific conditions (using proper API operators)
  // Note: BEFORE uses LESS_THAN, AFTER uses GREATER_THAN_OR_EQUALS
  BETWEEN = 'between',

  // Existence conditions
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IS_SET = 'is_set',
  IS_NOT_SET = 'is_not_set',
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
export function isValidFilterCondition(
  condition: string
): condition is FilterConditionType {
  return Object.values(FilterConditionType).includes(
    condition as FilterConditionType
  );
}

/**
 * Time units for relative date expressions
 */
export enum RelativeDateUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
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
  LAST_YEAR = 'last_year',
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
export interface DateRange extends Record<string, unknown> {
  start?: string | RelativeDate;
  end?: string | RelativeDate;
  preset?: string;
}

/**
 * Numeric range specification for filtering
 */
export interface NumericRange extends Record<string, unknown> {
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
  CUSTOM = 'custom',
}

/**
 * Activity history related filtering options
 */
export interface ActivityFilter extends Record<string, unknown> {
  dateRange: DateRange;
  interactionType?: InteractionType;
}

/**
 * Base interface for Attio records (common between people and companies)
 */
export interface AttioRecord {
  id: {
    record_id: string;
    [key: string]: unknown;
  };
  values: {
    name?: string;
    email?: string;
    phone?: string;
    industry?: string;
    website?: string;
    title?: string;
    content?: string;
    description?: string;
    [key: string]: unknown; // Other fields
  };
  [key: string]: unknown; // Additional top-level fields
}

/**
 * Enhanced AttioRecord with validation metadata
 * Used when validation warnings/suggestions need to be passed with the record
 */
export interface EnhancedAttioRecord extends AttioRecord {
  validationMetadata?: {
    warnings: string[];
    suggestions: string[];
    actualValues?: Record<string, unknown>;
  };
}

/**
 * Universal record type for operations that handle both regular records and lists
 * Issue #1068: Lists don't have a values wrapper (list-native format)
 *
 * Use this union type in universal tool configs and services to support both:
 * - AttioRecord: Regular records with values wrapper (companies, people, deals, tasks)
 * - AttioList: Lists with top-level fields, no values wrapper
 *
 * This makes "lists don't have values" a first-class type contract.
 *
 * @see src/handlers/tool-configs/universal/core/*
 * @see src/services/Universal*Service.ts
 */
export type UniversalRecord = AttioRecord | AttioList;

/**
 * Type guard to check if a UniversalRecord is an AttioRecord (has values wrapper)
 *
 * @param record - The record to check
 * @returns true if the record is an AttioRecord with a values object
 *
 * @example
 * if (isAttioRecord(record)) {
 *   // Safe to access record.values
 *   const name = record.values.name;
 * }
 */
export function isAttioRecord(record: UniversalRecord): record is AttioRecord {
  return 'values' in record && record.values !== undefined;
}

/**
 * Type guard to check if a UniversalRecord is an AttioList (has list_id, no values wrapper)
 *
 * @param record - The record to check
 * @returns true if the record is an AttioList with list_id in its id object
 *
 * @example
 * if (isAttioList(record)) {
 *   // Safe to access top-level list fields
 *   const title = record.title;
 *   const listId = record.id.list_id;
 * }
 */
export function isAttioList(record: UniversalRecord): record is AttioList {
  return (
    'id' in record &&
    typeof record.id === 'object' &&
    record.id !== null &&
    'list_id' in record.id
  );
}

/**
 * Get the record ID regardless of record type (record_id for AttioRecord, list_id for AttioList)
 *
 * @param record - The UniversalRecord to extract ID from
 * @returns The record_id or list_id as a string
 *
 * @remarks
 * If a record has both values and list_id (unusual but possible), list_id takes precedence.
 *
 * @example
 * const id = getRecordId(record);
 * // Works for both companies: { id: { record_id: "123" } }
 * // and lists: { id: { list_id: "456" } }
 */
export function getRecordId(record: UniversalRecord): string {
  if (isAttioList(record)) {
    return record.id.list_id;
  }
  return record.id.record_id;
}

/**
 * @deprecated Use UniversalRecord instead
 * AttioListRecord: Transitional type that extends AttioRecord (requires values)
 *
 * This type contradicts the list-native format goal and will be removed.
 * Use UniversalRecord for code that needs to handle both records and lists.
 *
 * @see Issue #1068 - Fix universal tools list format
 * @see src/services/search-strategies/ListSearchStrategy.ts
 */
export type AttioListRecord = AttioRecord & {
  id: AttioRecord['id'] & {
    list_id: string;
  };
};

/**
 * Interface for a batch request item
 */
export interface BatchRequestItem<T> {
  params: T; // The parameters for this specific operation
  id?: string; // Optional ID to track this specific request
}

/**
 * Interface for a batch operation result item
 */
export interface BatchItemResult<R> {
  id?: string; // Optional ID matching the request ID if provided
  success: boolean; // Whether this specific operation succeeded
  data?: R; // The result data if successful
  error?: unknown; // Error information if failed
}

/**
 * Interface for a batch operation response
 */
export interface BatchResponse<R> {
  results: BatchItemResult<R>[]; // Individual results for each request
  summary: {
    total: number; // Total number of operations attempted
    succeeded: number; // Number of successful operations
    failed: number; // Number of failed operations
  };
}

/**
 * Configuration options for batch operations
 */
export interface BatchConfig {
  maxBatchSize: number; // Maximum number of operations in a single batch
  continueOnError: boolean; // Whether to continue processing remaining items on error
  retryConfig?: RetryConfig; // Optional retry configuration for batch operations
}

// Person and Company interfaces are defined in detail below

/**
 * Note record type
 */
export interface AttioNote {
  id?: AttioNoteIdentifier | string | null;
  note_id?: string | null;
  record_id?: string | null;
  title?: string | null;
  content?: string | null;
  content_markdown?: string | null;
  content_plaintext?: string | null;
  format?: string | null;
  parent_object?: string | null;
  parent_record_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  values?: AttioNoteValues | null;
  [key: string]: unknown; // Additional fields
}

/**
 * List record type
 */
export interface AttioList {
  id: {
    list_id: string;
    [key: string]: unknown;
  };
  title: string;
  name?: string; // Adding name property as it appears in some API responses
  description?: string;
  object_slug: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  entry_count?: number;
  [key: string]: unknown; // Additional fields
}

/**
 * List entry record type
 */
export interface AttioListEntry {
  id?: {
    entry_id?: string;
    [key: string]: unknown;
  };
  list_id?: string;
  record_id?: string; // Record ID - may come from different properties
  parent_record_id?: string; // Alternative property name for record ID
  reference_id?: string; // Another alternative ID property
  object_id?: string; // Another alternative ID property
  created_at?: string;
  updated_at?: string;
  record?: {
    id?: {
      record_id?: string;
      [key: string]: unknown;
    };
    record_id?: string; // Sometimes directly on record object
    reference_id?: string; // Alternative ID field
    values?: Record<string, unknown>;
    object_slug?: string;
    uri?: string; // URI that might contain record ID
    [key: string]: unknown;
  };
  values?: Record<string, unknown>; // May contain record information
  [key: string]: unknown; // Additional fields that vary by API response
}

/**
 * Task record type
 */
export interface AttioTask {
  id: {
    task_id: string;
    [key: string]: unknown;
  };
  content: string;
  content_plaintext?: string;
  status: string;
  is_completed?: boolean;
  deadline_at?: string | null;
  assignees: Array<{
    referenced_actor_type: 'workspace-member';
    referenced_actor_id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    [key: string]: unknown;
  }>;
  // Deprecated: Use assignees array instead
  assignee?: {
    id: string;
    type: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  due_date?: string;
  linked_records?: Array<{
    id?: string;
    target_object?: string;
    target_record_id?: string;
    object_id?: string;
    object_slug?: string;
    title?: string;
    [key: string]: unknown;
  }>;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/**
 * Workspace Member record type
 */
export interface AttioWorkspaceMember {
  id: {
    workspace_member_id: string;
    [key: string]: unknown;
  };
  first_name?: string;
  last_name?: string;
  email_address?: string;
  avatar_url?: string;
  access_level?: 'admin' | 'editor' | 'viewer' | 'guest';
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/**
 * Resource type enum for better type safety
 */
export enum ResourceType {
  PEOPLE = 'people',
  COMPANIES = 'companies',
  DEALS = 'deals',
  LISTS = 'lists',
  RECORDS = 'records',
  TASKS = 'tasks',
  WORKSPACE_MEMBERS = 'workspace_members',
}

/**
 * Relationship types in Attio
 * Defines the types of relationships between different record types
 */
export enum RelationshipType {
  WORKS_AT = 'works_at', // Person to Company relationship
  EMPLOYS = 'employs', // Company to Person relationship
  BELONGS_TO_LIST = 'in_list', // Any record to List relationship
  HAS_NOTE = 'has_note', // Any record to Note relationship
}

/**
 * API error response shape
 */
export interface AttioErrorResponse {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  error?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

/**
 * API response containing a list of records
 */
export interface AttioListResponse<T> {
  data: T[];
  pagination?: {
    total_count: number;
    next_cursor?: string;
    [key: string]: unknown;
  };
  has_more?: boolean;
  next_cursor?: string;
  [key: string]: unknown;
}

/**
 * API response containing a single record
 * Note: Attio API sometimes returns nested structure { data: { data: T } }
 * and sometimes returns direct structure { data: T }. Use fallback logic:
 * `response?.data?.data || response?.data`
 */
export interface AttioSingleResponse<T> {
  data: T;
  [key: string]: unknown;
}

// Specific record types
export interface Person extends AttioRecord {
  values: {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

/**
 * Attributes for creating a person via MCP tools
 */
export interface PersonCreateAttributes {
  name?: string;
  email_addresses?: string[];
  phone_numbers?: string[];
  job_title?: string;
  company?: string;
  [key: string]: unknown;
}

export interface Company extends AttioRecord {
  values: {
    name?: string;
    website?: string;
    industry?: string;
    [key: string]: unknown;
  };
}

/**
 * Record attribute types
 */
export interface RecordAttributes {
  [key: string]: unknown; // Generic attribute map
}

/**
 * Parameters for creating a record
 */
export interface RecordCreateParams {
  objectSlug: string; // Object slug (e.g., 'companies', 'people')
  objectId?: string; // Alternative to objectSlug - direct object ID
  attributes: RecordAttributes; // Record attributes as key-value pairs
}

/**
 * Parameters for updating a record
 */
export interface RecordUpdateParams {
  objectSlug: string; // Object slug (e.g., 'companies', 'people')
  objectId?: string; // Alternative to objectSlug - direct object ID
  recordId: string; // ID of the record to update
  attributes: RecordAttributes; // Record attributes to update
}

/**
 * Parameters for listing records
 */
export interface RecordListParams {
  objectSlug: string; // Object slug (e.g., 'companies', 'people')
  objectId?: string; // Alternative to objectSlug - direct object ID
  page?: number; // Page number to retrieve (starting at 1)
  pageSize?: number; // Number of items per page
  query?: string; // Search query to filter records
  attributes?: string[]; // List of attribute slugs to include
  sort?: string; // Attribute slug to sort by
  direction?: 'asc' | 'desc'; // Sort direction
}

/**
 * Record item for batch operations
 */
export interface BatchRecordItem {
  id?: string; // Record ID for updates, omit for creation
  attributes: RecordAttributes; // Record attributes
}

/**
 * Parameters for batch creating records
 */
export interface RecordBatchCreateParams {
  objectSlug: string; // Object slug (e.g., 'companies', 'people')
  objectId?: string; // Alternative to objectSlug - direct object ID
  records: Omit<BatchRecordItem, 'id'>[]; // Array of records to create
}

/**
 * Parameters for batch updating records
 */
export interface RecordBatchUpdateParams {
  objectSlug: string; // Object slug (e.g., 'companies', 'people')
  objectId?: string; // Alternative to objectSlug - direct object ID
  records: BatchRecordItem[]; // Array of records to update with their IDs
}
