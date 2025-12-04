/**
 * Core types for Attio MCP - edge-compatible, no Node.js dependencies
 */

/**
 * Resource types supported by the Attio API
 */
export type ResourceType =
  | 'companies'
  | 'people'
  | 'deals'
  | 'tasks'
  | 'records'
  | 'lists'
  | 'notes'
  | 'workspace_members';

/**
 * Generic JSON object type
 */
export type JsonObject = Record<string, unknown>;

/**
 * Attio record identifier structure
 */
export interface AttioRecordId {
  workspace_id: string;
  object_id: string;
  record_id: string;
}

/**
 * Attio field value structure
 */
export interface AttioFieldValue {
  value?: string | number | boolean | null;
  full_name?: string;
  email_address?: string;
  phone_number?: string;
  [key: string]: unknown;
}

/**
 * Attio record values map
 */
export type AttioRecordValues = Record<string, AttioFieldValue[] | undefined>;

/**
 * Attio record structure
 */
export interface AttioRecord {
  id: AttioRecordId;
  values: AttioRecordValues;
  created_at?: string;
  [key: string]: unknown;
}

/**
 * Attio list structure
 */
export interface AttioList {
  id: { list_id: string };
  api_slug: string;
  name: string;
  parent_object: string[];
  workspace_access: string;
  created_by_actor: { type: string; id: string };
  created_at: string;
}

/**
 * Attio list entry structure
 */
export interface AttioListEntry {
  id: { entry_id: string };
  list_id: string;
  parent_record_id: string;
  parent_object: string;
  created_at: string;
  entry_values: AttioRecordValues;
}

/**
 * Attio note structure
 */
export interface AttioNote {
  id: { note_id: string };
  parent_object: string;
  parent_record_id: string;
  title: string;
  content_plaintext: string;
  created_at: string;
  created_by_actor: { type: string; id: string };
}

/**
 * Filter condition types for advanced search
 */
export type FilterCondition =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equals'
  | 'less_than'
  | 'less_than_or_equals'
  | 'is_empty'
  | 'is_not_empty';

/**
 * Single filter definition for advanced search
 */
export interface AttioFilter {
  attribute: { slug: string };
  condition: FilterCondition;
  value?: unknown;
}

/**
 * Filter configuration for advanced search
 */
export interface AttioFilterConfig {
  filters: AttioFilter[];
  matchAny?: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * API response wrapper
 */
export interface AttioApiResponse<T> {
  data: T;
}

/**
 * Tool execution result for MCP
 */
export interface ToolResult {
  content: Array<
    | { type: 'text'; text: string }
    | {
        type: 'json';
        data: unknown;
      }
  >;
  isError: boolean;
}

/**
 * Tool mode - determines which tools are exposed
 */
export type ToolMode = 'full' | 'search';

/**
 * Configuration for creating a tool registry
 */
export interface ToolRegistryConfig {
  /** Which tools to expose. Defaults to all. */
  tools?: string[];
  /** Tool mode - 'full' for all tools, 'search' for read-only. Defaults to 'full'. */
  mode?: ToolMode;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for API requests (e.g., https://api.attio.com) */
  baseUrl: string;
  /** Authorization header value (e.g., Bearer token) */
  authorization: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

/**
 * HTTP response structure
 */
export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

/**
 * HTTP error structure
 */
export interface HttpError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Phone validation configuration
 */
export interface PhoneConfig {
  /** Default country code for numbers without international prefix (e.g., 'US', 'GB') */
  defaultCountry?: string;
}

/**
 * Configuration passed to tool handlers
 */
export interface ToolHandlerConfig {
  /** Phone validation configuration */
  phone?: PhoneConfig;
}
