/**
 * Apply rate limiting to a filter-based handler
 *
 * @param handler - The original handler function
 * @param endpointName - Name of the endpoint for rate limiting tracking
 * @returns Rate-limited handler function
 */
export declare function withRateLimiting<T extends any[]>(handler: (...args: T) => Promise<any>, endpointName: string): (...args: T) => Promise<any>;
/**
 * Apply rate limiting to a search handler with proper headers
 *
 * @param handler - The original handler function
 * @param endpointName - Name of the endpoint for rate limiting tracking
 * @returns Rate-limited handler function with headers
 */
export declare function withSearchRateLimiting<T extends any[]>(handler: (...args: T) => Promise<any>, endpointName: string): (...args: T) => Promise<any>;
//# sourceMappingURL=rate-limited-handler.d.ts.map