/**
 * Response formatting utilities for standardizing MCP tool responses
 */
/**
 * Format a simple success response with a text message
 *
 * @param message - Success message text
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatSuccessResponse(message, metadata) {
    return {
        content: [
            {
                type: 'text',
                text: message
            }
        ],
        isError: false,
        metadata
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
export function formatListResponse(title, items, formatter, pagination, metadata) {
    const itemsText = items.length > 0
        ? items.map(formatter).join('\n')
        : 'No items found';
    const countText = pagination?.total !== undefined
        ? `${items.length} of ${pagination.total} total`
        : `${items.length}`;
    const paginationText = pagination?.hasMore
        ? `\n\nShowing ${countText} items. More items available.`
        : `\n\nShowing ${countText} items.`;
    return {
        content: [
            {
                type: 'text',
                text: `${title}:\n${itemsText}\n\nShowing ${countText} items${pagination?.hasMore ? '. More items available.' : '.'}`
            }
        ],
        isError: false,
        metadata: {
            items,
            pagination,
            ...metadata
        }
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
export function formatRecordResponse(title, record, formatter, metadata) {
    return {
        content: [
            {
                type: 'text',
                text: `${title}:\n${formatter(record)}`
            }
        ],
        isError: false,
        metadata: {
            record,
            ...metadata
        }
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
export function formatJsonResponse(title, data, metadata) {
    return {
        content: [
            {
                type: 'text',
                text: `${title}:\n${JSON.stringify(data, null, 2)}`
            }
        ],
        isError: false,
        metadata: {
            data,
            ...metadata
        }
    };
}
/**
 * Format a response with markdown content
 *
 * @param title - Title for the markdown content
 * @param markdown - The markdown content
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatMarkdownResponse(title, markdown, metadata) {
    return {
        content: [
            {
                type: 'markdown',
                text: `# ${title}\n\n${markdown}`
            }
        ],
        isError: false,
        metadata
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
export function formatMultiPartResponse(title, parts, metadata) {
    return {
        content: [
            {
                type: 'text',
                text: title
            },
            ...parts
        ],
        isError: false,
        metadata
    };
}
/**
 * Format an empty response (no content)
 *
 * @param metadata - Optional metadata to include
 * @returns Formatted tool response
 */
export function formatEmptyResponse(metadata) {
    return {
        content: [],
        isError: false,
        metadata
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
export function formatErrorResponse(message, code = 500, type = 'unknown_error', details) {
    return {
        content: [
            {
                type: 'text',
                text: `ERROR [${type}]: ${message}${details ? '\n\nDetails: ' + JSON.stringify(details, null, 2) : ''}`
            }
        ],
        isError: true,
        error: {
            code,
            message,
            type,
            details
        }
    };
}
//# sourceMappingURL=response-formatter.js.map