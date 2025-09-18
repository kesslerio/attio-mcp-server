/**
 * Common reusable type aliases for data handling and API operations
 */

/**
 * Generic object with unknown values - safe alternative to 'any'
 * Use for API responses, configuration objects, and data transformation
 */
export type UnknownObject = Record<string, unknown>;

/**
 * Filter object used in API queries and data filtering operations
 * Typically contains field names as keys with filter criteria as values
 */
export type FilterObject = Record<string, unknown>;

/**
 * API response data structure with unknown content
 * Use for raw API responses before type validation
 */
export type ApiResponseData = Record<string, unknown>;

/**
 * Configuration object with string keys and unknown values
 * Use for settings, options, and configuration parameters
 */
export type ConfigObject = Record<string, unknown>;

/**
 * Generic data transformation input/output
 * Use in normalization and mapping functions
 */
export type DataObject = Record<string, unknown>;

/**
 * Error context object for error handling and enhancement
 * Contains error metadata and debugging information
 */
export type ErrorContext = Record<string, unknown>;

/**
 * Logging metadata object for structured logging
 * Contains additional context for log entries
 */
export type LogMetadata = Record<string, unknown>;
