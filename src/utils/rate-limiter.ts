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
  keyFn?: (req: unknown) => string;
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }>;
  private config: RateLimiterConfig;

  /**
   * Create a new rate limiter
   *
   * @param config - Rate limiter configuration
   */
  constructor(config: RateLimiterConfig) {
    this.requests = new Map();
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      trackByIp: config.trackByIp !== false, // Default to true
      keyFn: config.keyFn,
    };
  }

  /**
   * Check if a request is allowed
   *
   * @param req - Request object (with IP address or other identifying info)
   * @returns Object with allowed status and rate limit info
   */
  check(req: unknown): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    msUntilReset: number;
  } {
    // Get the key to track this request by

    // Get or create record for this key
    let record = this.requests.get(key);
    if (!record || now > record.resetTime) {
      // If no record exists or the window has passed, create a new one
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.requests.set(key, record);
    }

    // Check if request is allowed

    // Increment counter if allowed
    if (allowed) {
      record.count++;
    }

    // Return result
    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - record.count),
      resetTime: record.resetTime,
      msUntilReset: Math.max(0, record.resetTime - now),
    };
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  cleanup(): void {
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get the key to track a request by
   *
   * @param req - Request object
   * @returns Key for rate limiting
   */
  private getKey(req: unknown): string {
    // Use custom key function if provided
    if (this.config.keyFn) {
      return this.config.keyFn(req);
    }

    // Track by IP if configured
    if (this.config.trackByIp) {
      req.ip ||
        req.connection?.remoteAddress ||
        req.headers?.['x-forwarded-for'] ||
        'unknown';
      return `ip:${ip}`;
    }

    // Default to a static key (not recommended for production)
    return 'global';
  }
}

// Global rate limiter instances
const rateLimiters: Map<string, RateLimiter> = new Map();

/**
 * Get or create a rate limiter for a specific endpoint
 *
 * @param endpoint - Endpoint to rate limit
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function getRateLimiter(
  endpoint: string,
  config: RateLimiterConfig
): RateLimiter {
  // Check if limiter already exists
  let limiter = rateLimiters.get(endpoint);
  if (!limiter) {
    // Create new limiter
    limiter = new RateLimiter(config);
    rateLimiters.set(endpoint, limiter);
  }

  return limiter;
}

/**
 * Middleware for rate limiting Express requests
 *
 * @param config - Rate limiter configuration
 * @returns Express middleware function
 */
export function rateLimiterMiddleware(config: RateLimiterConfig) {
  // Schedule cleanup every windowMs to prevent memory leaks
  setInterval(() => limiter.cleanup(), config.windowMs);

  return (req: unknown, res: unknown, next: () => void) => {
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);

    if (!result.allowed) {
      // Return 429 Too Many Requests
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(
          result.msUntilReset / 1000
        )} seconds.`,
        retryAfter: Math.ceil(result.msUntilReset / 1000),
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiting for filter operations
 *
 * @param req - Request object
 * @param endpoint - Endpoint being accessed
 * @returns Object with allowed status and rate limit info
 */
export function checkFilterRateLimit(
  req: unknown,
  endpoint: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  msUntilReset: number;
} {
  // Configuration for filter endpoints
  const config: RateLimiterConfig = {
    maxRequests: 60, // 60 requests
    windowMs: 60 * 1000, // per minute
    trackByIp: true, // track by IP address
  };

  // Get limiter for this endpoint

  // Check rate limit
  return limiter.check(req);
}
