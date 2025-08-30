/**
 * Security configuration for request size limits and DoS protection
 *
 * These limits help prevent denial-of-service attacks by restricting
 * the size of batch operations and request payloads.
 */

/**
 * Maximum sizes for batch operations by resource type
 * These limits prevent memory exhaustion and API overload
 */
export const BATCH_SIZE_LIMITS = {
  // Universal batch limits
  DEFAULT: parseInt(process.env.MAX_BATCH_SIZE || '100', 10),

  // Resource-specific limits (can be more restrictive)
  COMPANIES: parseInt(process.env.MAX_BATCH_SIZE_COMPANIES || '100', 10),
  PEOPLE: parseInt(process.env.MAX_BATCH_SIZE_PEOPLE || '100', 10),
  RECORDS: parseInt(process.env.MAX_BATCH_SIZE_RECORDS || '100', 10),
  TASKS: parseInt(process.env.MAX_BATCH_SIZE_TASKS || '50', 10),
  NOTES: parseInt(process.env.MAX_BATCH_SIZE_NOTES || '50', 10),
  LISTS: parseInt(process.env.MAX_BATCH_SIZE_LISTS || '100', 10),

  // Search operations (may return many results)
  SEARCH: parseInt(process.env.MAX_BATCH_SIZE_SEARCH || '50', 10),

  // Bulk delete operations (more restrictive for safety)
  DELETE: parseInt(process.env.MAX_BATCH_SIZE_DELETE || '50', 10),
} as const;

/**
 * Maximum payload sizes for different operation types
 * Prevents excessively large requests that could cause memory issues
 */
export const PAYLOAD_SIZE_LIMITS = {
  // Maximum size of a single record's data in bytes
  SINGLE_RECORD: parseInt(process.env.MAX_RECORD_SIZE || '1048576', 10), // 1MB default

  // Maximum total payload size for batch operations in bytes
  BATCH_TOTAL: parseInt(process.env.MAX_BATCH_PAYLOAD || '10485760', 10), // 10MB default

  // Maximum size for search query strings
  SEARCH_QUERY: parseInt(process.env.MAX_SEARCH_QUERY_SIZE || '1024', 10), // 1KB default

  // Maximum size for filter objects
  FILTER_OBJECT: parseInt(process.env.MAX_FILTER_SIZE || '10240', 10), // 10KB default
} as const;

/**
 * Rate limiting configuration for batch operations
 * Helps prevent API rate limit violations and ensures fair usage
 */
export const RATE_LIMITS = {
  // Maximum concurrent batch requests
  MAX_CONCURRENT_REQUESTS: parseInt(
    process.env.MAX_CONCURRENT_BATCH_REQUESTS || '5',
    10
  ),

  // Delay between batch chunks in milliseconds
  BATCH_DELAY_MS: parseInt(process.env.BATCH_DELAY_MS || '100', 10),

  // Maximum requests per minute for batch operations
  MAX_BATCH_REQUESTS_PER_MINUTE: parseInt(
    process.env.MAX_BATCH_RPM || '60',
    10
  ),
} as const;

/**
 * Validation messages for limit violations
 */
export const LIMIT_ERROR_MESSAGES = {
  BATCH_SIZE_EXCEEDED: (size: number, limit: number, operation?: string) =>
    `Batch size (${size}) exceeds maximum allowed (${limit})${operation ? ` for ${operation}` : ''}. ` +
    `Please split into smaller batches for security and performance.`,

  PAYLOAD_SIZE_EXCEEDED: (size: number, limit: number) =>
    `Request payload size (${formatBytes(size)}) exceeds maximum allowed (${formatBytes(limit)}). ` +
    `Please reduce the amount of data in your request.`,

  SINGLE_RECORD_SIZE_EXCEEDED: (size: number, limit: number) =>
    `Single record size (${formatBytes(size)}) exceeds maximum allowed (${formatBytes(limit)}). ` +
    `Please reduce the amount of data in this record.`,

  SEARCH_QUERY_TOO_LONG: (length: number, limit: number) =>
    `Search query length (${length} characters) exceeds maximum allowed (${limit} characters). ` +
    `Please use a shorter search query.`,

  FILTER_TOO_COMPLEX: (size: number, limit: number) =>
    `Filter object size (${formatBytes(size)}) exceeds maximum allowed (${formatBytes(limit)}). ` +
    `Please simplify your filter criteria.`,

  RATE_LIMIT_EXCEEDED: (requests: number, limit: number) =>
    `Request rate (${requests} requests) exceeds maximum allowed (${limit} per minute). ` +
    `Please slow down your requests or use smaller batches.`,
} as const;

/**
 * Helper function to format bytes for human-readable error messages
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Get the batch size limit for a specific resource type
 */
export function getBatchSizeLimit(resourceType?: string): number {
  if (!resourceType) return BATCH_SIZE_LIMITS.DEFAULT;

  return (
    (BATCH_SIZE_LIMITS as Record<string, number>)[upperType] ||
    BATCH_SIZE_LIMITS.DEFAULT
  );
}

/**
 * Configuration validation on module load
 */
function validateConfiguration(): void {
  // Ensure all limits are positive numbers
  for (const [key, value] of Object.entries(BATCH_SIZE_LIMITS)) {
    if (value <= 0 || isNaN(value)) {
      throw new Error(`Invalid batch size limit for ${key}: ${value}`);
    }
  }

  for (const [key, value] of Object.entries(PAYLOAD_SIZE_LIMITS)) {
    if (value <= 0 || isNaN(value)) {
      throw new Error(`Invalid payload size limit for ${key}: ${value}`);
    }
  }

  for (const [key, value] of Object.entries(RATE_LIMITS)) {
    if (value <= 0 || isNaN(value)) {
      throw new Error(`Invalid rate limit for ${key}: ${value}`);
    }
  }
}

// Validate configuration on module load
validateConfiguration();

/**
 * Export type definitions for use in other modules
 */
export type BatchSizeLimitKey = keyof typeof BATCH_SIZE_LIMITS;
export type PayloadSizeLimitKey = keyof typeof PAYLOAD_SIZE_LIMITS;
export type RateLimitKey = keyof typeof RATE_LIMITS;
