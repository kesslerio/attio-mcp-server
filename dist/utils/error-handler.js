/**
 * Enum for categorizing different types of errors
 */
export var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION_ERROR"] = "validation_error";
    ErrorType["API_ERROR"] = "api_error";
    ErrorType["AUTHENTICATION_ERROR"] = "authentication_error";
    ErrorType["RATE_LIMIT_ERROR"] = "rate_limit_error";
    ErrorType["NETWORK_ERROR"] = "network_error";
    ErrorType["NOT_FOUND_ERROR"] = "not_found_error";
    ErrorType["SERVER_ERROR"] = "server_error";
    ErrorType["PARAMETER_ERROR"] = "parameter_error";
    ErrorType["SERIALIZATION_ERROR"] = "serialization_error";
    ErrorType["FORMAT_ERROR"] = "format_error";
    ErrorType["UNKNOWN_ERROR"] = "unknown_error";
})(ErrorType || (ErrorType = {}));
/**
 * Custom error class for Attio API errors
 */
export class AttioApiError extends Error {
    status;
    detail;
    path;
    method;
    responseData;
    type;
    constructor(message, status, detail, path, method, type = ErrorType.API_ERROR, responseData = {}) {
        super(message);
        this.name = 'AttioApiError';
        this.status = status;
        this.detail = detail;
        this.path = path;
        this.method = method;
        this.type = type;
        this.responseData = responseData;
    }
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
export function createAttioError(error) {
    // If it's already an AttioApiError, return it
    if (error instanceof AttioApiError) {
        return error;
    }
    // Handle Axios errors
    if (error.isAxiosError && error.response) {
        const { status, data, config } = error.response;
        const path = config?.url || 'unknown';
        const method = config?.method?.toUpperCase() || 'UNKNOWN';
        return createApiError(status, path, method, data);
    }
    // Return the original error if we can't enhance it
    return error;
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
export function createApiError(status, path, method, responseData = {}) {
    const defaultMessage = responseData?.error?.message || responseData?.message || 'Unknown API error';
    const detail = responseData?.error?.detail || responseData?.detail || 'No additional details';
    let errorType = ErrorType.API_ERROR;
    let message = '';
    // Create specific error messages based on status code and context
    switch (status) {
        case 400:
            // Detect common parameter and format errors in the 400 response
            if (defaultMessage.includes('parameter') || defaultMessage.includes('param') || responseData?.error?.details?.includes('parameter')) {
                errorType = ErrorType.PARAMETER_ERROR;
                message = `Parameter Error: ${defaultMessage}`;
            }
            else if (defaultMessage.includes('format') || defaultMessage.includes('invalid')) {
                errorType = ErrorType.FORMAT_ERROR;
                message = `Format Error: ${defaultMessage}`;
            }
            else if (defaultMessage.includes('serialize') || defaultMessage.includes('parse')) {
                errorType = ErrorType.SERIALIZATION_ERROR;
                message = `Serialization Error: ${defaultMessage}`;
            }
            else {
                errorType = ErrorType.VALIDATION_ERROR;
                message = `Bad Request: ${defaultMessage}`;
            }
            break;
        case 401:
        case 403:
            errorType = ErrorType.AUTHENTICATION_ERROR;
            message = status === 401
                ? 'Authentication failed. Please check your API key.'
                : 'Permission denied. Your API key lacks the necessary permissions.';
            break;
        case 404:
            errorType = ErrorType.NOT_FOUND_ERROR;
            // Customize 404 message based on path
            if (path.includes('/objects/people/')) {
                message = `Person not found: ${path.split('/').pop()}`;
            }
            else if (path.includes('/objects/companies/')) {
                message = `Company not found: ${path.split('/').pop()}`;
            }
            else if (path.includes('/lists/')) {
                const listId = path.split('/').pop();
                if (path.includes('/entries')) {
                    message = `List entry not found in list ${path.split('/')[2]}`;
                }
                else {
                    message = `List not found: ${listId}`;
                }
            }
            else {
                message = `Resource not found: ${path}`;
            }
            break;
        case 422:
            errorType = ErrorType.PARAMETER_ERROR;
            message = `Unprocessable Entity: ${defaultMessage}`;
            break;
        case 429:
            errorType = ErrorType.RATE_LIMIT_ERROR;
            message = 'Rate limit exceeded. Please try again later.';
            break;
        case 500:
        case 502:
        case 503:
        case 504:
            errorType = ErrorType.SERVER_ERROR;
            message = `Attio API server error (${status}): ${defaultMessage}`;
            break;
        default:
            if (status >= 500) {
                errorType = ErrorType.SERVER_ERROR;
            }
            else if (status >= 400) {
                errorType = ErrorType.API_ERROR;
            }
            else {
                errorType = ErrorType.UNKNOWN_ERROR;
            }
            message = `API Error (${status}): ${defaultMessage}`;
            break;
    }
    return new AttioApiError(message, status, detail, path, method, errorType, responseData);
}
/**
 * Format an error into a standardized response based on error type
 *
 * @param error - The error to format
 * @param type - The error type
 * @param details - Additional error details
 * @returns Formatted error response
 */
export function formatErrorResponse(error, type = ErrorType.UNKNOWN_ERROR, details) {
    const errorCode = type === ErrorType.VALIDATION_ERROR ? 400 :
        type === ErrorType.AUTHENTICATION_ERROR ? 401 :
            type === ErrorType.RATE_LIMIT_ERROR ? 429 :
                type === ErrorType.NOT_FOUND_ERROR ? 404 :
                    type === ErrorType.SERVER_ERROR ? 500 :
                        type === ErrorType.PARAMETER_ERROR ? 400 :
                            type === ErrorType.FORMAT_ERROR ? 400 :
                                type === ErrorType.SERIALIZATION_ERROR ? 400 :
                                    500;
    // Enhance error message with helpful tips for specific error types
    let helpfulTip = '';
    if (type === ErrorType.PARAMETER_ERROR) {
        helpfulTip = '\n\nTIP: Check parameter names and formats. Use direct string parameters instead of constants or placeholders.';
    }
    else if (type === ErrorType.FORMAT_ERROR) {
        helpfulTip = '\n\nTIP: Ensure all parameters use the correct format as specified in the API documentation.';
    }
    else if (type === ErrorType.SERIALIZATION_ERROR) {
        helpfulTip = '\n\nTIP: Verify objects are properly serialized to strings where needed.';
    }
    return {
        content: [
            {
                type: "text",
                text: `ERROR [${type}]: ${error.message}${helpfulTip}${details ? '\n\nDetails: ' + JSON.stringify(details, null, 2) : ''}`,
            },
        ],
        isError: true,
        error: {
            code: errorCode,
            message: error.message,
            type,
            details,
        },
    };
}
/**
 * Creates a detailed error response for API errors, suitable for returning to MCP clients
 *
 * @param error - The caught error
 * @param url - The API URL that was called
 * @param method - The HTTP method used
 * @param responseData - Any response data received
 * @returns Formatted error result
 */
export function createErrorResult(error, url, method, responseData = {}) {
    // If it's already an AttioApiError, use it directly
    if (error instanceof AttioApiError) {
        const errorDetails = {
            status: error.status,
            method: error.method,
            path: error.path,
            detail: error.detail,
            responseData: error.responseData
        };
        return formatErrorResponse(error, error.type, errorDetails);
    }
    // For Axios errors with response data
    if (responseData && responseData.status) {
        try {
            // Create a specific API error
            const apiError = createApiError(responseData.status, url, method, responseData);
            const errorDetails = {
                status: apiError.status,
                method: apiError.method,
                path: apiError.path,
                detail: apiError.detail,
                responseData: apiError.responseData,
                originalError: error instanceof Error ? error.message : String(error)
            };
            return formatErrorResponse(apiError, apiError.type, errorDetails);
        }
        catch (formattingError) {
            // If error formatting fails, preserve the original error
            console.error('Error while formatting API error:', formattingError);
            const originalErrorDetails = {
                url,
                method,
                status: responseData.status,
                originalError: error instanceof Error ? error.message : String(error)
            };
            return formatErrorResponse(error instanceof Error ? error : new Error(String(error)), ErrorType.UNKNOWN_ERROR, originalErrorDetails);
        }
    }
    // For network or unknown errors
    let errorType = ErrorType.UNKNOWN_ERROR;
    // Try to determine error type based on message or instance
    if (error.message.includes('network') || error.message.includes('connection')) {
        errorType = ErrorType.NETWORK_ERROR;
    }
    else if (error.message.includes('timeout')) {
        errorType = ErrorType.NETWORK_ERROR;
    }
    const errorDetails = {
        method,
        url,
        status: responseData.status || 'Unknown',
        headers: responseData.headers || {},
        data: responseData.data || {}
    };
    return formatErrorResponse(error, errorType, errorDetails);
}
//# sourceMappingURL=error-handler.js.map