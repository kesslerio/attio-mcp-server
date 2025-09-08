/**
 * Constants for Customer Success Playbook Test Suite
 * 
 * Centralizes magic numbers and hard-coded values to improve maintainability
 * and make test configuration more explicit.
 */

/**
 * Test data constants
 */
export const TEST_CONSTANTS = {
  /**
   * Fallback company ID used when dynamic resolution fails
   * Format: sample-company-id-123
   */
  FALLBACK_COMPANY_ID: 'sample-company-id-123',

  /**
   * Timeframe window for historical data searches
   * Set to 365 days to accommodate sparse test data environments
   */
  TIMEFRAME_DAYS: 365,

  /**
   * Maximum concurrent API requests for rate limiting protection
   * Conservative limit to avoid Attio API 429 (Too Many Requests) errors
   * Attio typically allows ~10 req/sec, we use 4 concurrent for safety margin
   */
  MAX_CONCURRENT_REQUESTS: 4,

  /**
   * Default pagination limits for test queries
   */
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,

  /**
   * Test timeout values (in milliseconds)
   */
  TIMEOUTS: {
    SHORT: 5000,    // 5 seconds for quick operations
    MEDIUM: 15000,  // 15 seconds for API calls
    LONG: 30000,    // 30 seconds for complex operations
  },

  /**
   * Error patterns for validation
   */
  ERROR_PATTERNS: {
    NOT_FOUND: /not found|404/i,
    INVALID_REQUEST: /invalid request|400/i,
    RATE_LIMITED: /rate limit|429/i,
  },
} as const;

/**
 * Tool-specific constants
 */
export const TOOL_CONSTANTS = {
  /**
   * Expected field names in tool responses
   */
  EXPECTED_FIELDS: {
    SEARCH: ['id', 'values', 'resource_type'],
    CREATE: ['id', 'values', 'success'],
    UPDATE: ['id', 'values', 'success'],
    DELETE: ['success', 'record_id'],
  },

  /**
   * Validation levels for test results
   */
  VALIDATION_LEVELS: {
    FRAMEWORK: 'framework',
    API: 'api', 
    DATA: 'data',
    BUSINESS_LOGIC: 'business_logic',
  },
} as const;

/**
 * Type definitions for constants
 */
export type ValidationLevel = typeof TOOL_CONSTANTS.VALIDATION_LEVELS[keyof typeof TOOL_CONSTANTS.VALIDATION_LEVELS];
export type ErrorPattern = keyof typeof TEST_CONSTANTS.ERROR_PATTERNS;