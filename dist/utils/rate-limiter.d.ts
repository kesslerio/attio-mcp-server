/**
 * Rate limiter utility for Attio MCP server
 * Provides simple rate limiting functionality for API endpoints
 */
/**
 * Configuration for the rate limiter
 */
export interface RateLimiterConfig {
    /** Maximum number of requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Whether to track requests by IP address (default: true) */
    trackByIp?: boolean;
    /** Optional key function to determine the rate limiting key */
    keyFn?: (req: any) => string;
}
/**
 * Rate limiter implementation
 */
export declare class RateLimiter {
    private requests;
    private config;
    /**
     * Create a new rate limiter
     *
     * @param config - Rate limiter configuration
     */
    constructor(config: RateLimiterConfig);
    /**
     * Check if a request is allowed
     *
     * @param req - Request object (with IP address or other identifying info)
     * @returns Object with allowed status and rate limit info
     */
    check(req: any): {
        allowed: boolean;
        remaining: number;
        resetTime: number;
        msUntilReset: number;
    };
    /**
     * Cleanup old entries to prevent memory leaks
     */
    cleanup(): void;
    /**
     * Get the key to track a request by
     *
     * @param req - Request object
     * @returns Key for rate limiting
     */
    private getKey;
}
/**
 * Get or create a rate limiter for a specific endpoint
 *
 * @param endpoint - Endpoint to rate limit
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export declare function getRateLimiter(endpoint: string, config: RateLimiterConfig): RateLimiter;
/**
 * Middleware for rate limiting Express requests
 *
 * @param config - Rate limiter configuration
 * @returns Express middleware function
 */
export declare function rateLimiterMiddleware(config: RateLimiterConfig): (req: any, res: any, next: () => void) => void;
/**
 * Rate limiting for filter operations
 *
 * @param req - Request object
 * @param endpoint - Endpoint being accessed
 * @returns Object with allowed status and rate limit info
 */
export declare function checkFilterRateLimit(req: any, endpoint: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    msUntilReset: number;
};
/**
 * Rate limiting for relationship queries
 *
 * @param req - Request object
 * @param relationshipType - Type of relationship being queried
 * @param isNested - Whether this is a nested relationship query
 * @returns Object with allowed status and rate limit info
 */
export declare function checkRelationshipQueryRateLimit(req: any, relationshipType: string, isNested?: boolean): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    msUntilReset: number;
};
//# sourceMappingURL=rate-limiter.d.ts.map