/**
 * Common type definitions for reducing any-type usage
 * Part of Phase 3 CI/CD improvements
 */

// Generic record type for API responses
export type ApiRecord = Record<string, unknown>;

// Generic result type for API operations
export interface ApiResult {
  data?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

// Batch operation result
export interface BatchResult {
  results: Array<{
    success: boolean;
    data?: unknown;
    error?: unknown;
    index?: number;
  }>;
}

// Common field/attribute value structure
export interface FieldValue {
  value: unknown;
  [key: string]: unknown;
}

// Note structure
export interface Note {
  id: string;
  title?: string;
  content?: string;
  created_at?: string;
  created_by?: ApiRecord;
  parent_object?: string;
  parent_record_id?: string;
  [key: string]: unknown;
}

// Company/Person record structure
export interface EntityRecord {
  id: string;
  name?: string;
  domain?: string;
  email?: string;
  values?: Record<string, FieldValue | FieldValue[]>;
  [key: string]: unknown;
}

// List record structure  
export interface ListRecord {
  id: string;
  name?: string;
  api_slug?: string;
  [key: string]: unknown;
}

// Prompt structure
export interface Prompt {
  id: string;
  title?: string;
  content?: string;
  [key: string]: unknown;
}

// Format result function type
export type FormatResultFunction<T = unknown, R = string> = (result: T) => R;

// Common handler result
export interface HandlerResult {
  content?: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}