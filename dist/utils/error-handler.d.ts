/**
 * Error handling utility for creating consistent error responses
 */
import { AttioErrorResponse } from "../types/attio.js";
/**
 * Enum for categorizing different types of errors
 */
export declare enum ErrorType {
    VALIDATION_ERROR = "validation_error",
    API_ERROR = "api_error",
    AUTHENTICATION_ERROR = "authentication_error",
    RATE_LIMIT_ERROR = "rate_limit_error",
    NETWORK_ERROR = "network_error",
    NOT_FOUND_ERROR = "not_found_error",
    SERVER_ERROR = "server_error",
    PARAMETER_ERROR = "parameter_error",
    SERIALIZATION_ERROR = "serialization_error",
    FORMAT_ERROR = "format_error",
    UNKNOWN_ERROR = "unknown_error"
}
/**
 * Interface for error details with improved type safety
 */
export interface ErrorDetails {
    code: number;
    message: string;
    type: ErrorType;
    details?: {
        status?: number;
        method?: string;
        path?: string;
        detail?: string;
        responseData?: Record<string, any>;
        originalError?: string;
        [key: string]: any;
    };
}
/**
 * Custom error class for Attio API errors
 */
export declare class AttioApiError extends Error {
    status: number;
    detail: string;
    path: string;
    method: string;
    responseData: any;
    type: ErrorType;
    constructor(message: string, status: number, detail: string, path: string, method: string, type?: ErrorType, responseData?: any);
}
/**
 * Creates a specific API error based on status code and context
 *
 * @param status - HTTP status code
 * @param path - API path
 * @param method - HTTP method
 * @param responseData - Response data from API
 * @returns Appropriate error instance
 */
export declare function createAttioError(error: any): Error;
/**
 * Creates a specific API error based on status code and context
 *
 * @param status - HTTP status code
 * @param path - API path
 * @param method - HTTP method
 * @param responseData - Response data from API
 * @returns Appropriate error instance
 */
export declare function createApiError(status: number, path: string, method: string, responseData?: any): Error;
/**
 * Format an error into a standardized response based on error type
 *
 * @param error - The error to format
 * @param type - The error type
 * @param details - Additional error details
 * @returns Formatted error response
 */
export declare function formatErrorResponse(error: Error, type?: ErrorType, details?: any): {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
    error: {
        code: number;
        message: string;
        type: ErrorType;
        details: any;
    };
};
/**
 * Creates a detailed error response for API errors, suitable for returning to MCP clients
 *
 * @param error - The caught error
 * @param url - The API URL that was called
 * @param method - The HTTP method used
 * @param responseData - Any response data received
 * @returns Formatted error result
 */
export declare function createErrorResult(error: Error, url: string, method: string, responseData?: AttioErrorResponse): {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
    error: {
        code: number;
        message: string;
        type: ErrorType;
        details: any;
    };
};
//# sourceMappingURL=error-handler.d.ts.map