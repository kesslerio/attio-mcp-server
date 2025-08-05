/**
 * Safe JSON serialization utilities to prevent MCP protocol breakdown
 * Handles circular references, non-serializable values, and large objects
 *
 * Uses fast-safe-stringify for improved performance and reliability
 *
 * IMPORTANT MCP PROTOCOL WARNING:
 * Never use console.log() in this file or any MCP-related code.
 * Always use console.error() or logger.safeMcpLog() instead.
 * Using console.log will break the MCP protocol, as it writes to stdout
 * which is used for client-server communication.
 */
import fastSafeStringify from 'fast-safe-stringify';

/**
 * Interface for serialization options
 */
export interface SerializationOptions {
  /** Maximum depth for nested objects (only used in the legacy implementation) */
  maxDepth?: number;
  /** Maximum string length before truncation */
  maxStringLength?: number;
  /** Whether to include stack traces in error objects */
  includeStackTraces?: boolean;
  /** Custom replacer function */
  replacer?: (key: string, value: any) => any;
  /** Indent spaces for pretty printing (default: 2) */
  indent?: number;
}

/**
 * Default serialization options
 */
const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 20, // Kept for backward compatibility
  maxStringLength: 25_000, // 25KB max string length - more reasonable for MCP
  includeStackTraces: false,
  replacer: (key, value) => value,
  indent: 2,
};

/**
 * Safe JSON stringify that handles circular references and non-serializable values
 *
 * Uses fast-safe-stringify for high performance and reliability
 *
 * @param obj - The object to stringify
 * @param options - Serialization options
 * @returns Safe JSON string
 */
export function safeJsonStringify(
  obj: any,
  options: SerializationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Performance monitoring for large objects
  const startTime = performance.now();

  try {
    // Create a custom replacer to handle non-standard values
    const customReplacer = (key: string, value: any): any => {
      // First apply user-provided replacer if any
      value = opts.replacer(key, value);

      // Handle undefined (normally skipped by JSON)
      if (value === undefined) {
        return null;
      }

      // Handle very long strings
      if (typeof value === 'string' && value.length > opts.maxStringLength) {
        return value.substring(0, opts.maxStringLength) + '... [truncated]';
      }

      // Handle special object types more gracefully
      if (value instanceof Error) {
        const errorObj: any = {
          name: value.name,
          message: value.message,
        };
        if (opts.includeStackTraces && value.stack) {
          errorObj.stack = value.stack;
        }
        if (value.cause) {
          errorObj.cause = value.cause;
        }
        return errorObj;
      }

      if (value instanceof Map) {
        return '[Map: ' + value.size + ' entries]';
      }

      if (value instanceof Set) {
        return '[Set: ' + value.size + ' items]';
      }

      if (ArrayBuffer && value instanceof ArrayBuffer) {
        return '[ArrayBuffer: ' + value.byteLength + ' bytes]';
      }

      return value;
    };

    // Use fast-safe-stringify with our custom replacer
    const result = fastSafeStringify(obj, customReplacer, opts.indent);

    // Performance monitoring and logging
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.error(
        `[safeJsonStringify] Slow serialization detected: ${duration.toFixed(
          2
        )}ms for ${typeof obj} (${result.length} chars)`
      );
    }

    return result;
  } catch (error) {
    // Enhanced error context
    const duration = performance.now() - startTime;
    console.error(
      `[safeJsonStringify] Serialization failed after ${duration.toFixed(
        2
      )}ms for ${typeof obj}:`,
      error
    );

    // Use fast-safe-stringify directly for the error fallback
    return fastSafeStringify(
      {
        error: 'Serialization failed',
        message: error instanceof Error ? error.message : String(error),
        originalType: typeof obj,
        timestamp: new Date().toISOString(),
        duration: `${duration.toFixed(2)}ms`,
      },
      undefined,
      2
    );
  }
}

/**
 * Validates that a JSON string is properly formed and can be parsed
 *
 * @param jsonString - The JSON string to validate
 * @returns Object with validation result and parsed data if successful
 */
export function validateJsonString(jsonString: string): {
  isValid: boolean;
  data?: any;
  error?: string;
  size: number;
} {
  const size = Buffer.byteLength(jsonString, 'utf8');

  try {
    const data = JSON.parse(jsonString);
    return {
      isValid: true,
      data,
      size,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error),
      size,
    };
  }
}

/**
 * Detects potential circular references in an object before serialization
 *
 * NOTE: This is less critical now with fast-safe-stringify, but kept for
 * compatibility with existing code that uses it.
 *
 * @param obj - The object to check
 * @param maxDepth - Maximum depth to check
 * @returns True if circular references are detected
 */
export function hasCircularReferences(obj: any, maxDepth = 10): boolean {
  const seen = new WeakSet();

  function check(value: any, depth: number): boolean {
    if (depth > maxDepth) return false;
    if (value === null || typeof value !== 'object') return false;

    if (seen.has(value)) return true;

    seen.add(value);

    try {
      if (Array.isArray(value)) {
        return value.some((item) => check(item, depth + 1));
      }
      return Object.values(value).some((val) => check(val, depth + 1));
    } finally {
      seen.delete(value);
    }
  }

  return check(obj, 0);
}

/**
 * Creates a safe copy of an object that can be JSON serialized
 *
 * Uses fast-safe-stringify for improved performance and reliability
 *
 * @param obj - The object to copy
 * @param options - Serialization options
 * @returns Safe copy of the object
 */
export function createSafeCopy(
  obj: any,
  options: SerializationOptions = {}
): any {
  try {
    // Fast path: directly use fast-safe-stringify to create a JSON string
    const jsonString = safeJsonStringify(obj, options);

    // Parse it back to create the safe copy
    return JSON.parse(jsonString);
  } catch (error) {
    console.error(
      '[createSafeCopy] Failed to create safe copy:',
      error instanceof Error ? error.message : String(error)
    );

    // Return a structured error object
    return {
      error: 'Failed to create safe copy',
      message: error instanceof Error ? error.message : String(error),
      originalType: typeof obj,
    };
  }
}

/**
 * Sanitizes MCP response objects to prevent JSON parsing errors
 *
 * Uses fast-safe-stringify to ensure all responses are safely serializable
 *
 * @param response - The MCP response object to sanitize
 * @returns Sanitized response object
 */
export function sanitizeMcpResponse(response: any): any {
  // Ensure response has the correct structure
  if (!response || typeof response !== 'object') {
    return {
      content: [
        {
          type: 'text',
          text: 'Invalid response structure',
        },
      ],
      isError: true,
      error: {
        code: 500,
        message: 'Response sanitization failed',
        type: 'sanitization_error',
      },
    };
  }

  try {
    // Create safe copy with MCP-specific options optimized for Attio responses
    return createSafeCopy(response, {
      maxStringLength: 40_000, // 40KB for response content - reasonable limit
      includeStackTraces: process.env.NODE_ENV === 'development',
    });
  } catch (error) {
    // Provide a valid fallback response if sanitization fails
    return {
      content: [
        {
          type: 'text',
          text: 'Error processing response. The server encountered an error while formatting the response data.',
        },
      ],
      isError: true,
      error: {
        code: 500,
        message:
          'Response sanitization failed: ' +
          (error instanceof Error ? error.message : String(error)),
        type: 'sanitization_error',
      },
    };
  }
}
