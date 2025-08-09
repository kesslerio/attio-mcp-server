/**
 * Type definitions for API operations
 * Provides specific types to replace any types in API operations
 */

/**
 * Standard error interface for Axios errors and API responses
 */
export interface ApiError {
  message: string;
  response?: {
    status: number;
    statusText: string;
    data?: unknown;
    headers?: Record<string, string>;
  };
  request?: unknown;
  code?: string;
  config?: unknown;
  stack?: string;
}

/**
 * Search request body interface
 */
export interface SearchRequestBody extends Record<string, unknown> {
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sorts?: Array<{
    attribute: string;
    field?: string;
    direction: 'asc' | 'desc';
  }>;
  expand?: string[];
}

/**
 * List operation request body interface
 */
export interface ListRequestBody {
  limit?: number;
  offset?: number;
  sorts?: Array<{
    attribute: string;
    field?: string;
    direction: 'asc' | 'desc';
  }>;
}

/**
 * Task creation data interface
 */
export interface TaskCreateData {
  content: string;
  format: 'plaintext';  // Required field for Attio API
  assignee?: {
    id: string;
    type: string;
  };
  deadline_at?: string;  // Correct field name (was due_date)
  linked_records?: Array<{
    id: string;
  }>;
}

/**
 * Task update data interface
 */
export interface TaskUpdateData {
  // Note: content is immutable and cannot be updated after creation
  is_completed?: boolean;  // Correct field name and type (was status: string)
  assignee?: {
    id: string;
    type: string;
  };
  deadline_at?: string;  // Correct field name (was due_date)
  linked_records?: Array<{
    id: string;
  }>;
}

/**
 * Generic logging details interface
 */
export interface LogDetails {
  [key: string]: unknown;
}

/**
 * Validation error details interface
 */
export interface ValidationErrorDetails {
  path: string[];
  message: string;
}

/**
 * Filter value types that can be used in list entry filters
 */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | string[]
  | number[]
  | Record<string, unknown>;

/**
 * API request configuration interface
 */
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * Batch operation error interface
 */
export interface BatchOperationError {
  index: number;
  error: ApiError;
  item: unknown;
}

/**
 * Configuration object for select field options
 */
export interface SelectFieldConfig {
  options?: Array<{
    value: string | number | boolean;
    label?: string;
  }>;
  select?: {
    options?: Array<{
      value: string | number | boolean;
      label?: string;
    }>;
  };
  [key: string]: unknown;
}

/**
 * Error response from list record addition
 */
export interface ListErrorResponse {
  response?: {
    data?: {
      validation_errors?: ValidationErrorDetails[];
      message?: string;
    };
    status?: number;
  };
  message?: string;
}
