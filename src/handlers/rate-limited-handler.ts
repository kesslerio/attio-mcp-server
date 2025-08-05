/**
 * Rate-limited handler functionality for Attio MCP server
 * Provides wrapper functions to apply rate limiting to API handlers
 */

import { FilterValidationError } from '../errors/api-errors.js';
import { checkFilterRateLimit } from '../utils/rate-limiter.js';

/**
 * Error response for rate limit exceeded
 */
interface RateLimitError {
  error: string;
  message: string;
  retryAfter: number;
}

/**
 * Generic API response interface
 */
interface ApiResponse {
  content: {
    type: string;
    text: string;
  }[];
  isError: boolean;
}

/**
 * Apply rate limiting to a filter-based handler
 *
 * @param handler - The original handler function
 * @param endpointName - Name of the endpoint for rate limiting tracking
 * @returns Rate-limited handler function
 */
export function withRateLimiting<T extends any[]>(
  handler: (...args: T) => Promise<any>,
  endpointName: string
): (...args: T) => Promise<any> {
  return async (...args: T) => {
    // First argument is typically the request object
    const req = args[0];

    // Check rate limit
    const rateLimit = checkFilterRateLimit(req, endpointName);

    // If rate limit exceeded, return error
    if (!rateLimit.allowed) {
      const error: RateLimitError = {
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${Math.ceil(
          rateLimit.msUntilReset / 1000
        )} seconds.`,
        retryAfter: Math.ceil(rateLimit.msUntilReset / 1000),
      };

      // Format error for API response
      const response: ApiResponse = {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };

      return response;
    }

    try {
      // Call original handler
      return await handler(...args);
    } catch (error) {
      // Format error for API response
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const response: ApiResponse = {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };

      return response;
    }
  };
}

/**
 * Apply rate limiting to a search handler with proper headers
 *
 * @param handler - The original handler function
 * @param endpointName - Name of the endpoint for rate limiting tracking
 * @returns Rate-limited handler function with headers
 */
export function withSearchRateLimiting<T extends any[]>(
  handler: (...args: T) => Promise<any>,
  endpointName: string
): (...args: T) => Promise<any> {
  return async (...args: T) => {
    // First argument is typically the request object
    const req = args[0];

    // Add response object if not present
    if (!req.res) {
      req.res = {
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      };
    }

    // Check rate limit
    const rateLimit = checkFilterRateLimit(req, endpointName);

    // Add rate limit headers
    req.res.setHeader('X-RateLimit-Limit', 60);
    req.res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    req.res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);

    // If rate limit exceeded, return error
    if (!rateLimit.allowed) {
      req.res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${Math.ceil(
          rateLimit.msUntilReset / 1000
        )} seconds.`,
        retryAfter: Math.ceil(rateLimit.msUntilReset / 1000),
      });

      // Format error for API response
      const response: ApiResponse = {
        content: [
          {
            type: 'text',
            text: `Error: Rate limit exceeded. Try again in ${Math.ceil(
              rateLimit.msUntilReset / 1000
            )} seconds.`,
          },
        ],
        isError: true,
      };

      return response;
    }

    try {
      // Call original handler
      return await handler(...args);
    } catch (error) {
      // Format error for API response
      const errorMessage =
        error instanceof FilterValidationError
          ? error.message
          : error instanceof Error
            ? `Unexpected error: ${error.message}`
            : `Unknown error: ${String(error)}`;

      const response: ApiResponse = {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };

      return response;
    }
  };
}
