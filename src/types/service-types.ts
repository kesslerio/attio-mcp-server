/**
 * Service-specific type definitions for improved type safety
 *
 * This file contains interfaces and types used across various services
 * to replace generic 'any' types with proper type definitions.
 */

/**
 * Generic attribute structure from Attio API
 */
export interface AttioAttribute {
  api_slug: string;
  title: string;
  name?: string;
  type: string;
  description?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_multivalue?: boolean;
  default_value?: unknown;
  options?: unknown[];
}

/**
 * Attribute response structure from API
 */
export interface AttributeResponse {
  data: AttioAttribute[];
  meta?: {
    count?: number;
    next_cursor?: string;
  };
}

/**
 * Field mapping result with type safety
 */
export interface FieldMappingResult<T = Record<string, unknown>> {
  mapped: T;
  warnings: string[];
  errors?: string[];
  collisions?: string[];
  suggestions?: string[];
}

/**
 * Person field input structure for type-safe field picking
 */
export interface PersonFieldInput {
  name?: unknown;
  email_addresses?: unknown;
  phone_numbers?: unknown;
  title?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  job_title?: unknown;
  [key: string]: unknown;
}

/**
 * Allowed person fields output structure
 */
export interface AllowedPersonFields {
  name?: string | unknown[];
  email_addresses?: string[];
  phone_numbers?: string[];
  title?: string;
  [key: string]: unknown;
}

/**
 * E2E test markers structure
 */
export interface E2EMarkers {
  prefix?: string;
  suffix?: string;
  runId?: string;
  testMode?: boolean;
}

/**
 * E2E metadata for test data generation
 */
export interface E2EMeta {
  runId?: string;
  testSuite?: string;
  markers?: E2EMarkers;
}

/**
 * Axios error structure (partial, for error handling)
 */
export interface AxiosErrorLike {
  response?: {
    status?: number;
    statusText?: string;
    data?: {
      error?: {
        message?: string;
        code?: string;
      };
      message?: string;
      code?: string;
    };
  };
  message?: string;
  code?: string;
  config?: {
    url?: string;
    method?: string;
  };
}

/**
 * List membership route parameters
 */
export interface ListMembershipParams {
  list_id?: string;
  listId?: string;
  record_id?: string;
  recordId?: string;
  object?: string;
  [key: string]: unknown;
}

/**
 * Generic API response structure
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  meta?: {
    count?: number;
    next_cursor?: string;
    has_more?: boolean;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Validation message extraction context
 */
export interface ValidationErrorContext {
  response?: {
    data?: {
      message?: string;
      detail?: string;
      error?:
        | {
            message?: string;
            details?: unknown;
          }
        | string;
      errors?: Array<{
        message?: string;
        field?: string;
      }>;
    };
  };
  message?: string;
}

/**
 * Performance tracking data
 */
export interface PerformanceData {
  operation: string;
  duration: number;
  resource_type?: string;
  cache_hit?: boolean;
  error?: string;
  timestamp: number;
}

/**
 * Cache entry base structure
 */
export interface CacheEntryBase {
  timestamp: number;
  data: unknown;
}

/**
 * Type-safe record for field transformations
 */
export interface TransformableRecord extends Record<string, unknown> {
  // Common fields across all record types
  id?: string | { record_id: string };
  created_at?: string;
  updated_at?: string;

  // Type-specific fields (optional)
  name?: unknown;
  values?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

/**
 * Utility type for making specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Utility type for partial record with known string keys
 */
export type PartialRecord<K extends string | number | symbol, T> = {
  [P in K]?: T;
};

/**
 * Type-safe unknown object (better than any)
 */
export type UnknownRecord = Record<string, unknown>;

/**
 * Type guard for checking if value is an object
 */
export function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/**
 * Type guard for checking if value is an Attio attribute
 */
export function isAttioAttribute(value: unknown): value is AttioAttribute {
  return (
    isRecord(value) &&
    typeof value.api_slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.type === 'string'
  );
}
