/**
 * OpenAI-compliant types for ChatGPT connector tools
 * These types match the exact requirements for OpenAI tool integration
 */

/**
 * Search result item matching OpenAI's required format
 */
export interface OpenAISearchResult {
  /** Unique identifier for the result */
  id: string;
  /** Display title for the result */
  title: string;
  /** Text content/description of the result */
  text: string;
  /** URL or reference link for the result */
  url: string;
}

/**
 * Fetch result matching OpenAI's required format
 */
export interface OpenAIFetchResult {
  /** Unique identifier for the record */
  id: string;
  /** Display title for the record */
  title: string;
  /** Full text content of the record */
  text: string;
  /** URL or reference link for the record */
  url: string;
  /** Optional metadata for additional information */
  metadata?: Record<string, any>;
}

/**
 * OpenAI tool function signatures
 */
export interface OpenAITools {
  /**
   * Search for records matching a query
   * @param query - Search query string
   * @returns Array of search results in OpenAI format
   */
  search(query: string): Promise<OpenAISearchResult[]>;

  /**
   * Fetch detailed information for a specific record
   * @param id - Record identifier
   * @returns Detailed record information in OpenAI format
   */
  fetch(id: string): Promise<OpenAIFetchResult>;
}

/**
 * Attio record types that can be transformed to OpenAI format
 */
export type SupportedAttioType =
  | 'companies'
  | 'people'
  | 'lists'
  | 'tasks'
  | 'records';

/**
 * Configuration for OpenAI tool behavior
 */
export interface OpenAIToolConfig {
  /** Maximum number of search results to return */
  maxSearchResults?: number;
  /** Include metadata in fetch results */
  includeMetadata?: boolean;
  /** Base URL for generating result URLs */
  baseUrl?: string;
  /** Custom field mappings for title/text extraction */
  fieldMappings?: {
    title?: string[];
    text?: string[];
  };
}

/**
 * Error response format for OpenAI tools
 */
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: 'invalid_request_error' | 'api_error' | 'rate_limit_error';
    code?: string;
  };
}
