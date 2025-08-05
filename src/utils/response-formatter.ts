/**
 * Response formatting utilities for standardizing MCP tool responses
 */
import { safeJsonStringify, sanitizeMcpResponse } from './json-serializer.js';

/**
 * Interface for a simple text content item
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Interface for a markdown content item
 */
export interface MarkdownContent {
  type: 'markdown';
  text: string;
}

/**
 * Content types that can be included in responses
 */
export type ResponseContent = TextContent | MarkdownContent;

/**
 * Base interface for all tool responses
 */
export interface ToolResponse {
  content: ResponseContent[];
  isError: boolean;
  error?: {
    code: number;
    message: string;
    type?: string;
    details?: unknown;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for list responses
 */
export interface ListResponse<T> {
  items: T[];
  pagination?: {
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
  };
}

/**
 * Format a simple success response with a text message
 *
 * @param message - Success message text
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatSuccessResponse(
  message: string,
  metadata?: Record<string, unknown>
): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    isError: false,
    metadata,
  };
}

/**
 * Format a list response with items
 *
 * @param title - Title for the list
 * @param items - Array of items to format
 * @param formatter - Function to format each item to a string
 * @param pagination - Optional pagination information
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatListResponse<T>(
  title: string,
  items: T[],
  formatter: (item: T) => string,
  pagination?: { total?: number; hasMore?: boolean; nextCursor?: string },
  metadata?: Record<string, unknown>
): ToolResponse {
  const itemsText =
    items.length > 0 ? items.map(formatter).join('\n') : 'No items found';

  const countText =
    pagination?.total !== undefined
      ? `${items.length} of ${pagination.total} total`
      : `${items.length}`;

  const _paginationText = pagination?.hasMore
    ? `\n\nShowing ${countText} items. More items available.`
    : `\n\nShowing ${countText} items.`;

  return {
    content: [
      {
        type: 'text',
        text: `${title}:\n${itemsText}\n\nShowing ${countText} items${
          pagination?.hasMore ? '. More items available.' : '.'
        }`,
      },
    ],
    isError: false,
    metadata: {
      items,
      pagination,
      ...metadata,
    },
  };
}

/**
 * Format a single record response
 *
 * @param title - Title for the record
 * @param record - The record to format
 * @param formatter - Function to format the record to a string
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatRecordResponse<T>(
  title: string,
  record: T,
  formatter: (record: T) => string,
  metadata?: Record<string, unknown>
): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `${title}:\n${formatter(record)}`,
      },
    ],
    isError: false,
    metadata: {
      record,
      ...metadata,
    },
  };
}

/**
 * Format a response with a detailed JSON view
 *
 * @param title - Title for the JSON data
 * @param data - The data to format as JSON
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatJsonResponse(
  title: string,
  data: unknown,
  metadata?: Record<string, unknown>
): ToolResponse {
  const response = {
    content: [
      {
        type: 'text',
        text: `${title}:\n${safeJsonStringify(data, { maxDepth: 8 })}`,
      },
    ],
    isError: false,
    metadata: {
      data,
      ...metadata,
    },
  };

  return sanitizeMcpResponse(response);
}

/**
 * Format a response with markdown content
 *
 * @param title - Title for the markdown content
 * @param markdown - The markdown content
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatMarkdownResponse(
  title: string,
  markdown: string,
  metadata?: Record<string, unknown>
): ToolResponse {
  return {
    content: [
      {
        type: 'markdown',
        text: `# ${title}\n\n${markdown}`,
      },
    ],
    isError: false,
    metadata,
  };
}

/**
 * Format a multi-part response with different content types
 *
 * @param title - Title for the response
 * @param parts - Array of content parts to include
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatMultiPartResponse(
  title: string,
  parts: ResponseContent[],
  metadata?: Record<string, unknown>
): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: title,
      },
      ...parts,
    ],
    isError: false,
    metadata,
  };
}

/**
 * Format an empty response (no content)
 *
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatEmptyResponse(
  metadata?: Record<string, unknown>
): ToolResponse {
  return {
    content: [],
    isError: false,
    metadata,
  };
}

/**
 * Format a standardized error response
 *
 * @param message - Error message
 * @param code - Error code (HTTP status code or custom code)
 * @param type - Error type (e.g., validation_error, not_found, etc.)
 * @param details - Optional error details
 * @returns Formatted error response
 */
export function formatErrorResponse(
  message: string,
  code = 500,
  type = 'unknown_error',
  details?: unknown
): ToolResponse {
  const response = {
    content: [
      {
        type: 'text',
        text: `ERROR [${type}]: ${message}${
          details
            ? '\n\nDetails: ' + safeJsonStringify(details, { maxDepth: 5 })
            : ''
        }`,
      },
    ],
    isError: true,
    error: {
      code,
      message,
      type,
      details,
    },
  };

  return sanitizeMcpResponse(response);
}
