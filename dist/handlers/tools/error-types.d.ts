/**
 * Error types for tool operations
 */
/**
 * Interface for API errors with response data
 */
export interface ApiError extends Error {
    response?: {
        data: any;
        status: number;
    };
    details?: any;
}
/**
 * Interface for ValueMatchError with original error
 */
export interface ValueMatchApiError extends Error {
    originalError?: ApiError;
    details?: any;
}
/**
 * Type guard to check if error is an ApiError
 */
export declare function isApiError(error: unknown): error is ApiError;
/**
 * Type guard to check if error has response data
 */
export declare function hasResponseData(error: unknown): error is {
    response: {
        data: any;
    };
};
//# sourceMappingURL=error-types.d.ts.map