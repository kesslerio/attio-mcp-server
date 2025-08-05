/**
 * TypeScript interfaces for tool dispatcher and handler operations
 * Replaces explicit any types with proper interfaces
 */


/**
 * Generic tool request arguments interface
 */
export interface ToolRequestArguments {
  [key: string]: unknown;
}

/**
 * Tool execution request context
 */
export interface ToolExecutionRequest {
  params: {
    arguments: ToolRequestArguments;
    name: string;
  };
}

/**
 * Tool execution error context for logging
 */
export interface ToolErrorContext {
  [key: string]: unknown;
}

/**
 * Attribute validation parameters
 */
export interface AttributeValidationParams {
  [key: string]: unknown;
}

/**
 * Company operation response data
 */
export interface CompanyOperationResponse {
  operation: string;
  companyId: string;
  status: 'success' | 'error';
  data?: unknown;
  message?: string;
  timestamp: string;
}

/**
 * Person operation response data
 */
export interface PersonOperationResponse {
  operation: string;
  personId: string;
  status: 'success' | 'error';
  data?: unknown;
  message?: string;
  timestamp: string;
}

/**
 * Generic API operation result
 */
export interface ApiOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string | number;
    details?: unknown;
  };
}

/**
 * Tool configuration registry entry
 */
export interface ToolConfig {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: ToolRequestArguments) => Promise<ApiOperationResult>;
}

/**
 * Batch operation request item
 */
export interface BatchOperationItem<T = unknown> {
  id?: string;
  params: T;
}

/**
 * Batch operation result item
 */
export interface BatchOperationResult<T = unknown> {
  id?: string;
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string | number;
    details?: unknown;
  };
}

/**
 * Company creation attributes
 */
export interface CompanyCreateAttributes {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Company update attributes
 */
export interface CompanyUpdateAttributes {
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Person creation attributes
 */
export interface PersonCreateAttributes {
  name?: string;
  email_addresses?: string[];
  phone_numbers?: string[];
  job_title?: string;
  company?: string;
  [key: string]: unknown;
}

/**
 * Person update attributes
 */
export interface PersonUpdateAttributes {
  name?: string;
  email_addresses?: string[];
  phone_numbers?: string[];
  job_title?: string;
  company?: string;
  [key: string]: unknown;
}

/**
 * Search filter parameters
 */
export interface SearchFilterParams {
  filters: Array<{
    attribute: {
      slug: string;
    };
    condition: string;
    value: unknown;
  }>;
  matchAny?: boolean;
}

/**
 * List filter parameters
 */
export interface ListFilterParams {
  attributeSlug: string;
  condition: string;
  value: unknown;
}

/**
 * Advanced filter parameters
 */
export interface AdvancedFilterParams {
  filters: SearchFilterParams;
  limit?: number;
  offset?: number;
}

/**
 * Note creation parameters
 */
export interface NoteCreateParams {
  content: string;
  title?: string;
  companyId?: string;
  personId?: string;
  uri?: string;
}

/**
 * Task creation parameters
 */
export interface TaskCreateParams {
  content: string;
  status?: string;
  assignee?: string;
  due_date?: string;
  linked_records?: Array<{
    id: string;
    object_slug?: string;
  }>;
}

/**
 * JSON serialization options
 */
export interface JsonSerializationOptions {
  includeUndefined?: boolean;
  includeNulls?: boolean;
  maxDepth?: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
  code?: string | number;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Generic API response
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Validation result
 */
export type ValidationResult = true | string;

/**
 * Filter condition value types
 */
export type FilterValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number>
  | Record<string, unknown>;

/**
 * Attribute value types for Attio records
 */
export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | Array<{ value: unknown }>
  | Record<string, unknown>;

/**
 * Company field input value types
 */
export type CompanyFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<unknown>
  | Record<string, unknown>;

/**
 * Processed company field value types
 */
export type ProcessedFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

/**
 * Contact information value interface
 */
export interface ContactValue {
  email_address?: string;
  phone_number?: string;
  value?: string;
  [key: string]: unknown;
}

/**
 * Note interface for displaying notes
 */
export interface NoteDisplay {
  title?: string;
  content?: string;
  timestamp?: string;
  [key: string]: unknown;
}
