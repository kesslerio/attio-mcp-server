/**
 * Rate-limited handler functionality for Attio MCP server
 * Provides wrapper functions to apply rate limiting to API handlers
 */
import { checkFilterRateLimit } from '../utils/rate-limiter.js';
import { FilterValidationError } from '../errors/api-errors.js';

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
export interface ApiResponse {
  content: {
    type: string;
    text: string;
  }[];
  isError: boolean;
}

/**
 * Request object with response methods
 */
interface RequestWithResponse {
  res?: {
    setHeader: (key: string, value: unknown) => void;
    status: (code: number) => { json: (data: unknown) => void };
  };
  [key: string]: unknown;
}

/**
 * Apply rate limiting to a filter-based handler
 *
 * @param handler - The original handler function
 * @param endpointName - Name of the endpoint for rate limiting tracking
 * @returns Rate-limited handler function
 */
export function withRateLimiting<T extends readonly unknown[], R>(
  handler: (...args: T) => Promise<R>,
  endpointName: string
): (...args: T) => Promise<R | ApiResponse> {
  return async (...args: T) => {
    // First argument is typically the request object
    const req: RequestWithResponse = args[0] as RequestWithResponse;

    // Check rate limit

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
    } catch (error: unknown) {
      // Format error for API response
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
export function withSearchRateLimiting<T extends readonly unknown[], R>(
  handler: (...args: T) => Promise<R>,
  endpointName: string
): (...args: T) => Promise<R | ApiResponse> {
  return async (...args: T) => {
    // First argument is typically the request object
    const req: RequestWithResponse = args[0] as RequestWithResponse;

    // Add response object if not present
    if (!req.res) {
      req.res = {
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      };
    }

    // Check rate limit

    // Add rate limit headers
    if (req.res) {
      req.res.setHeader('X-RateLimit-Limit', 60);
      req.res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
      req.res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
    }

    // If rate limit exceeded, return error
    if (!rateLimit.allowed) {
      if (req.res) {
        req.res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${Math.ceil(
            rateLimit.msUntilReset / 1000
          )} seconds.`,
          retryAfter: Math.ceil(rateLimit.msUntilReset / 1000),
        });
      }

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
    } catch (error: unknown) {
      // Format error for API response
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
