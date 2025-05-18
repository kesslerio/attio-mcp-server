/**
 * Error types for tool operations
 */
/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error) {
    return error instanceof Error && 'response' in error;
}
/**
 * Type guard to check if error has response data
 */
export function hasResponseData(error) {
    return (error !== null &&
        typeof error === 'object' &&
        'response' in error &&
        error.response !== null &&
        typeof error.response === 'object' &&
        'data' in error.response);
}
//# sourceMappingURL=error-types.js.map