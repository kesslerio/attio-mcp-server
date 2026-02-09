/**
 * Safe JSON serialization utilities to prevent MCP protocol breakdown
 * Handles circular references, non-serializable values, and large objects
 *
 * Uses fast-safe-stringify for improved performance and reliability
 *
 * IMPORTANT MCP PROTOCOL WARNING:
 * Never use console.log() in this file or any MCP-related code.
 * Always route diagnostics through the structured logger or safe MCP logging helpers.
 * Using console.log will break the MCP protocol, as it writes to stdout
 * which is used for client-server communication.
 */
// Support both CJS and ESM default export shapes for fast-safe-stringify
import * as fastSafeStringifyNs from 'fast-safe-stringify';

type ScopedLogger = {
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (
    message: string,
    errorObj?: unknown,
    data?: Record<string, unknown>
  ) => void;
};

let serializerLoggerPromise: Promise<ScopedLogger> | null = null;
let safeCopyLoggerPromise: Promise<ScopedLogger> | null = null;

const noopLogger: ScopedLogger = {
  warn: () => {
    // intentionally noop when logging is unavailable
  },
  error: () => {
    // intentionally noop when logging is unavailable
  },
};

function getSerializationLogger(
  operation: 'safeJsonStringify' | 'createSafeCopy'
): Promise<ScopedLogger> {
  if (operation === 'safeJsonStringify') {
    if (!serializerLoggerPromise) {
      serializerLoggerPromise = import('./logger.js')
        .then(
          (module) =>
            module.createScopedLogger(
              'utils.json-serializer',
              'safeJsonStringify',
              module.OperationType.SYSTEM
            ) as ScopedLogger
        )
        .catch(() => noopLogger);
    }
    return serializerLoggerPromise;
  }

  if (!safeCopyLoggerPromise) {
    safeCopyLoggerPromise = import('./logger.js')
      .then(
        (module) =>
          module.createScopedLogger(
            'utils.json-serializer',
            'createSafeCopy',
            module.OperationType.SYSTEM
          ) as ScopedLogger
      )
      .catch(() => noopLogger);
  }
  return safeCopyLoggerPromise;
}

type FastSafeStringifyFn = (
  value: unknown,
  replacer?: (key: string, value: unknown) => unknown,
  space?: string | number
) => string;

const fastSafeStringify: FastSafeStringifyFn =
  ((fastSafeStringifyNs as Record<string, unknown>)
    .default as FastSafeStringifyFn) ||
  (fastSafeStringifyNs as unknown as FastSafeStringifyFn);

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
  replacer?: (key: string, value: unknown) => unknown;
  /** Indent spaces for pretty printing (default: 2) */
  indent?: number;
}

/**
 * Default serialization options
 */
const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 20, // Kept for backward compatibility
  maxStringLength: 25000, // 25KB max string length - more reasonable for MCP
  includeStackTraces: false,
  replacer: (key: string, value: unknown) => value,
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
  obj: unknown,
  options: SerializationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Performance monitoring for large objects
  const startTime = performance.now();

  try {
    // Create a custom replacer to handle non-standard values
    const customReplacer = (key: string, value: unknown): unknown => {
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
        const errorObj: Record<string, unknown> = {
          name: value.name,
          message: value.message,
        };
        if (opts.includeStackTraces && value.stack) {
          errorObj.stack = value.stack;
        }
        if ('cause' in value && value.cause) {
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
      const durationMs = Math.round(duration * 100) / 100;
      void getSerializationLogger('safeJsonStringify')
        .then((logger) =>
          logger.warn(
            `Slow serialization detected: ${durationMs}ms for ${typeof obj}`,
            {
              durationMs,
              serializedLength: result.length,
            }
          )
        )
        .catch(() => {
          // Logger unavailable; nothing else to do in non-critical path
        });
    }

    return result;
  } catch (error: unknown) {
    // Enhanced error context
    const duration = performance.now() - startTime;
    const durationMs = Math.round(duration * 100) / 100;
    void getSerializationLogger('safeJsonStringify')
      .then((logger) =>
        logger.error(
          `Serialization failed after ${durationMs}ms for ${typeof obj}`,
          error,
          {
            durationMs,
            valueType: typeof obj,
          }
        )
      )
      .catch(() => {
        // Logger unavailable; nothing else to do in non-critical path
      });

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
  data?: unknown;
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
  } catch (error: unknown) {
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
export function hasCircularReferences(
  obj: unknown,
  maxDepth: number = 10
): boolean {
  const seen = new WeakSet();

  function check(value: unknown, depth: number): boolean {
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
 * Uses fast-safe-stringify for improved performance and reliability
 *
 * @param obj - The object to copy
 * @param options - Serialization options
 * @returns Safe copy of the object
 */
export function createSafeCopy(
  obj: unknown,
  options: SerializationOptions = {}
): unknown {
  try {
    // Fast path: directly use fast-safe-stringify to create a JSON string
    const jsonString = safeJsonStringify(obj, options);

    // Parse it back to create the safe copy
    return JSON.parse(jsonString);
  } catch (error: unknown) {
    void getSerializationLogger('createSafeCopy')
      .then((logger) =>
        logger.error('Failed to create safe copy', error, {
          message: error instanceof Error ? error.message : String(error),
          originalType: typeof obj,
        })
      )
      .catch(() => {
        // Logger unavailable; nothing else to do in non-critical path
      });

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
export function sanitizeMcpResponse(response: unknown): unknown {
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
      maxStringLength: 500000, // 500KB for response content - needed for bulk search results
      includeStackTraces: false,
    });
  } catch (error: unknown) {
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
