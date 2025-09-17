/**
 * Typed response shapes for the Attio API client
 *
 * Design Decisions:
 * - Limited use of index signatures to maintain type safety while allowing API evolution
 * - Explicit optional properties for known Attio API fields
 * - Type guards for runtime validation of API responses
 * - Generic types to support different endpoint response shapes
 *
 * Provides strong typing for API responses and error handling
 */

import { AxiosResponse, AxiosError } from 'axios';

/**
 * Generic wrapper for Attio API responses
 *
 * Design: Explicitly defines known Attio API response fields without
 * a catch-all index signature to maintain type safety. Additional fields
 * that may be added by Attio in the future should be explicitly typed.
 *
 * @template T The shape of the response data
 */
export interface AttioResponse<T = unknown> {
  data: T;
  status?: number;
  message?: string;
  /** Additional metadata that may be present in responses */
  meta?: {
    total?: number;
    cursor?: string;
    has_more?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Attio API error data structure
 * Attached to error.serverData for consistent error handling
 */
export interface AttioServerError {
  status_code?: number;
  type?: string;
  code?: string;
  message?: string;
}

/**
 * Extended Axios error with Attio-specific serverData
 */
export interface AttioAxiosError extends AxiosError {
  serverData?: AttioServerError;
}

/**
 * Attribute schema response from Attio API
 *
 * Design: Explicit typing for known attribute properties with specific
 * types for common field types. Avoids catch-all index signature.
 */
export interface AttioAttributeSchema {
  id?: {
    attribute_id?: string;
    workspace_id?: string;
    object_id?: string;
  };
  api_slug: string;
  title: string;
  /** Common Attio attribute types */
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'status'
    | 'currency'
    | 'url'
    | 'email'
    | 'phone'
    | 'location'
    | 'rating'
    | 'interaction'
    | 'record-reference'
    | string;
  is_system?: boolean;
  is_required?: boolean;
  is_unique?: boolean;
  is_multiselect?: boolean;
  description?: string;
  default_value?: unknown;
  /** Configuration specific to attribute type */
  config?: {
    /** For select/multiselect attributes */
    options?: Array<{ id: string; title: string; color?: string }>;
    /** For number/currency attributes */
    precision?: number;
    /** For text attributes */
    max_length?: number;
    [key: string]: unknown;
  };
}

/**
 * Select option structure for select/status attributes
 *
 * Design: Explicit properties for known select option fields.
 * Note: `id` is optional as some API responses may not include it.
 */
export interface AttioSelectOption {
  id?: string;
  title: string;
  value: string;
  color?: string;
  order?: number;
  is_archived?: boolean;
  /** Additional Attio option metadata */
  created_at?: string;
  updated_at?: string;
}

/**
 * Status option structure for status attributes
 */
export interface AttioStatusOption extends AttioSelectOption {
  status_type?: 'active' | 'inactive' | 'completed' | 'custom';
}

/**
 * Type guard to check if an error has Attio server data
 */
export function hasAttioServerData(error: unknown): error is AttioAxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'serverData' in error &&
    typeof (error as AttioAxiosError).serverData === 'object'
  );
}

/**
 * Type guard to check if data is an Attio error response
 */
export function isAttioErrorData(data: unknown): data is AttioServerError {
  return (
    data !== null &&
    typeof data === 'object' &&
    ('status_code' in data || 'code' in data || 'message' in data)
  );
}

/**
 * Extract error data from various error shapes
 */
export function extractAttioError(
  error: unknown
): AttioServerError | undefined {
  if (hasAttioServerData(error)) {
    return error.serverData;
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    const data = axiosError.response?.data;
    if (isAttioErrorData(data)) {
      return data;
    }
  }

  return undefined;
}

/**
 * Type-safe wrapper for Axios responses
 */
export type TypedAxiosResponse<T> = AxiosResponse<AttioResponse<T>>;

/**
 * Helper to safely extract data from nested Attio responses
 * Handles both { data: T } and { data: { data: T } } patterns
 */
export function extractResponseData<T>(
  response: AxiosResponse<unknown> | unknown
): T | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  // Handle Axios response structure
  if ('data' in response) {
    const responseData = (response as AxiosResponse).data;

    // Handle nested { data: { data: T } }
    if (
      responseData &&
      typeof responseData === 'object' &&
      'data' in responseData
    ) {
      return responseData.data as T;
    }

    // Handle direct { data: T }
    return responseData as T;
  }

  // Handle raw data object
  if ('data' in response) {
    return (response as { data: T }).data;
  }

  return response as T;
}
