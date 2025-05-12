/**
 * Common type definitions for Attio API responses and entities
 */
import { RetryConfig } from "../api/attio-operations.js";

/**
 * Base interface for Attio record values
 */
export interface AttioValue<T> {
  value: T;
  [key: string]: any; // Additional fields that might be present
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
  LISTS = 'lists'
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