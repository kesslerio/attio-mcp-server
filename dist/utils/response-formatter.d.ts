/**
 * Response formatting utilities for standardizing MCP tool responses
 */
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
        details?: any;
    };
    metadata?: Record<string, any>;
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
export declare function formatSuccessResponse(message: string, metadata?: Record<string, any>): ToolResponse;
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
export declare function formatListResponse<T>(title: string, items: T[], formatter: (item: T) => string, pagination?: {
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
}, metadata?: Record<string, any>): ToolResponse;
/**
 * Format a single record response
 *
 * @param title - Title for the record
 * @param record - The record to format
 * @param formatter - Function to format the record to a string
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export declare function formatRecordResponse<T>(title: string, record: T, formatter: (record: T) => string, metadata?: Record<string, any>): ToolResponse;
/**
 * Format a response with a detailed JSON view
 *
 * @param title - Title for the JSON data
 * @param data - The data to format as JSON
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export declare function formatJsonResponse(title: string, data: any, metadata?: Record<string, any>): ToolResponse;
/**
 * Format a response with markdown content
 *
 * @param title - Title for the markdown content
 * @param markdown - The markdown content
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export declare function formatMarkdownResponse(title: string, markdown: string, metadata?: Record<string, any>): ToolResponse;
/**
 * Format a multi-part response with different content types
 *
 * @param title - Title for the response
 * @param parts - Array of content parts to include
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export declare function formatMultiPartResponse(title: string, parts: ResponseContent[], metadata?: Record<string, any>): ToolResponse;
/**
 * Format an empty response (no content)
 *
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export declare function formatEmptyResponse(metadata?: Record<string, any>): ToolResponse;
/**
 * Format a standardized error response
 *
 * @param message - Error message
 * @param code - Error code (HTTP status code or custom code)
 * @param type - Error type (e.g., validation_error, not_found, etc.)
 * @param details - Optional error details
 * @returns Formatted error response
 */
export declare function formatErrorResponse(message: string, code?: number, type?: string, details?: any): ToolResponse;
//# sourceMappingURL=response-formatter.d.ts.map