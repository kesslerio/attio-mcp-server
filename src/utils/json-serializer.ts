/**
 * Safe JSON serialization utilities to prevent MCP protocol breakdown
 * Handles circular references, non-serializable values, and large objects
 */

/**
 * Interface for serialization options
 */
export interface SerializationOptions {
  /** Maximum depth for nested objects */
  maxDepth?: number;
  /** Maximum string length before truncation */
  maxStringLength?: number;
  /** Whether to include stack traces in error objects */
  includeStackTraces?: boolean;
  /** Custom replacer function */
  replacer?: (key: string, value: any) => any;
}

/**
 * Default serialization options
 */
const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 20, // Increased from 10 to handle complex Attio API responses
  maxStringLength: 25000, // 25KB max string length - more reasonable for MCP
  includeStackTraces: false,
  replacer: (key, value) => value,
};

/**
 * Safe JSON stringify that handles circular references and non-serializable values
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
  const seen = new WeakSet();
  let depth = 0;

  // Performance monitoring for large objects
  const startTime = performance.now();

  const replacer = function (key: string, value: any): any {
    // Apply custom replacer first
    value = opts.replacer(key, value);

    // Handle null and undefined
    if (value === null) return null;
    if (value === undefined) return null;

    // Handle primitives
    if (typeof value !== 'object') {
      // Truncate very long strings
      if (typeof value === 'string' && value.length > opts.maxStringLength) {
        return value.substring(0, opts.maxStringLength) + '... [truncated]';
      }
      // Handle functions
      if (typeof value === 'function') {
        return '[Function: ' + (value.name || 'anonymous') + ']';
      }
      // Handle symbols
      if (typeof value === 'symbol') {
        return '[Symbol: ' + value.toString() + ']';
      }
      // Handle bigint
      if (typeof value === 'bigint') {
        return '[BigInt: ' + value.toString() + ']';
      }
      return value;
    }

    // Handle circular references
    if (seen.has(value)) {
      return '[Circular Reference]';
    }

    // Track depth to prevent infinite recursion
    if (depth >= opts.maxDepth) {
      return '[Max Depth Reached]';
    }

    seen.add(value);
    depth++;

    try {
      // Handle special object types
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

      if (value instanceof Date) {
        if (isNaN(value.getTime())) {
          return '[Invalid Date]';
        }
        return value.toISOString();
      }

      if (value instanceof RegExp) {
        return '[RegExp: ' + value.toString() + ']';
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

      // Handle arrays
      if (Array.isArray(value)) {
        const result = value.map((item, index) => {
          try {
            return replacer(index.toString(), item);
          } catch (error) {
            console.error(
              `[safeJsonStringify] Array item serialization failed at index ${index} (depth ${depth}):`,
              error
            );
            return (
              '[Serialization Error: ' +
              (error instanceof Error ? error.message : 'Unknown') +
              ']'
            );
          }
        });
        depth--;
        return result;
      }

      // Handle plain objects
      const result: any = {};
      for (const [objKey, objValue] of Object.entries(value)) {
        try {
          result[objKey] = replacer(objKey, objValue);
        } catch (error) {
          console.error(
            `[safeJsonStringify] Object property serialization failed for key '${objKey}' (depth ${depth}):`,
            error
          );
          result[objKey] =
            '[Serialization Error: ' +
            (error instanceof Error ? error.message : 'Unknown') +
            ']';
        }
      }

      depth--;
      return result;
    } finally {
      seen.delete(value);
    }
  };

  try {
    const result = JSON.stringify(obj, replacer as any, 2);

    // Performance monitoring and logging
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(
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

    return JSON.stringify(
      {
        error: 'Serialization failed',
        message: error instanceof Error ? error.message : String(error),
        originalType: typeof obj,
        timestamp: new Date().toISOString(),
        duration: `${duration.toFixed(2)}ms`,
      },
      null,
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
 * @param obj - The object to check
 * @param maxDepth - Maximum depth to check
 * @returns True if circular references are detected
 */
export function hasCircularReferences(
  obj: any,
  maxDepth: number = 10
): boolean {
  const seen = new WeakSet();

  function check(value: any, depth: number): boolean {
    if (depth > maxDepth) return false;
    if (value === null || typeof value !== 'object') return false;

    if (seen.has(value)) return true;

    seen.add(value);

    try {
      if (Array.isArray(value)) {
        return value.some((item) => check(item, depth + 1));
      } else {
        return Object.values(value).some((val) => check(val, depth + 1));
      }
    } finally {
      seen.delete(value);
    }
  }

  return check(obj, 0);
}

/**
 * Creates a safe copy of an object that can be JSON serialized
 *
 * @param obj - The object to copy
 * @param options - Serialization options
 * @returns Safe copy of the object
 */
export function createSafeCopy(
  obj: any,
  options: SerializationOptions = {}
): any {
  const jsonString = safeJsonStringify(obj, options);
  const validation = validateJsonString(jsonString);

  if (!validation.isValid) {
    console.error(
      '[createSafeCopy] Failed to create safe copy:',
      validation.error
    );
    return {
      error: 'Failed to create safe copy',
      message: validation.error,
      originalType: typeof obj,
    };
  }

  return validation.data;
}

/**
 * Sanitizes MCP response objects to prevent JSON parsing errors
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

  // Create safe copy with MCP-specific options optimized for Attio responses
  return createSafeCopy(response, {
    maxDepth: 25, // Increased for complex Attio list/company relationship structures
    maxStringLength: 40000, // 40KB for response content - reasonable limit
    includeStackTraces: process.env.NODE_ENV === 'development',
  });
}
