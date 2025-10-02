/**
 * Test Constants
 * Centralized configuration values for MCP E2E tests
 */

/**
 * Quality gate thresholds
 */
export const QUALITY_GATES = {
  /** Minimum pass rate for P1 tests (80%) */
  P1_MIN_PASS_RATE: 80,

  /** Minimum pass rate for P0 tests (100%) */
  P0_MIN_PASS_RATE: 100,

  /** Minimum pass rate for P2 tests (70%) */
  P2_MIN_PASS_RATE: 70,
} as const;

/**
 * Batch operation sizes
 */
export const BATCH_SIZES = {
  /** Standard batch create size */
  BATCH_CREATE: 10,

  /** Standard batch update size */
  BATCH_UPDATE: 3,

  /** Batch search limit */
  BATCH_SEARCH: 5,
} as const;

/**
 * Pagination and limits
 */
export const PAGINATION = {
  /** Standard page size for performance tests */
  PERFORMANCE_PAGE_SIZE: 25,

  /** Standard relationship search limit */
  RELATIONSHIP_SEARCH_LIMIT: 5,

  /** Standard timeframe search limit */
  TIMEFRAME_SEARCH_LIMIT: 20,
} as const;
