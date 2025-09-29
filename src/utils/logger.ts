/**
 * Enhanced structured logging utility for consistent logging across the application
 */

import { randomUUID } from 'crypto';
import { safeJsonStringify } from '@/utils/json-serializer.js';
import type { JsonObject } from '@/types/attio.js';
import {
  sanitizeErrorDetail,
  sanitizeLogMessage,
  sanitizeLogPayload,
  sanitizeMetadata,
} from '@/utils/log-sanitizer.js';

/**
 * Log level enum for controlling verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Operation types for better log categorization
 */
export enum OperationType {
  API_CALL = 'api_call',
  TOOL_EXECUTION = 'tool_execution',
  DATA_PROCESSING = 'data_processing',
  VALIDATION = 'validation',
  TRANSFORMATION = 'transformation',
  SYSTEM = 'system',
}

/**
 * Structured log metadata interface
 */
export interface LogMetadata {
  timestamp: string;
  level: string;
  module: string;
  operation?: string;
  operationType?: OperationType;
  correlationId?: string;
  sessionId?: string;
  duration?: number;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  message: string;
  metadata: LogMetadata;
  data?: JsonObject;
  error?: {
    message: string;
    name: string;
    stack?: string;
    code?: string | number;
  };
}

/**
 * Context for tracking related operations
 */
interface LogContext {
  correlationId?: string;
  sessionId?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  operationType?: OperationType;
}

/**
 * Parse log level from environment variable
 */
function parseLogLevel(envValue?: string): LogLevel {
  if (!envValue) return LogLevel.DEBUG;

  const normalized = envValue.toUpperCase();
  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'NONE':
    case 'OFF':
      return LogLevel.NONE;
    default:
      // If invalid, fallback to environment-based defaults
      return process.env.NODE_ENV === 'production'
        ? LogLevel.INFO
        : LogLevel.DEBUG;
  }
}

/**
 * Current log level based on environment configuration
 * Priority: MCP_LOG_LEVEL > LOG_LEVEL > NODE_ENV-based defaults
 */
export const CURRENT_LOG_LEVEL = (() => {
  // Force DEBUG during Vitest runs for deterministic logging in tests
  if (process.env.VITEST === 'true') {
    return LogLevel.DEBUG;
  }
  // First check MCP-specific log level
  if (process.env.MCP_LOG_LEVEL) {
    return parseLogLevel(process.env.MCP_LOG_LEVEL);
  }

  // Then check generic log level
  if (process.env.LOG_LEVEL) {
    return parseLogLevel(process.env.LOG_LEVEL);
  }

  // Finally fallback to NODE_ENV-based defaults
  return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
})();

/**
 * Global log context storage
 */
let globalContext: LogContext = {};

/**
 * Set global logging context for correlation tracking
 */
export function setLogContext(context: Partial<LogContext>): void {
  globalContext = { ...globalContext, ...context };
}

/**
 * Get current logging context
 */
export function getLogContext(): LogContext {
  return { ...globalContext };
}

/**
 * Clear logging context
 */
export function clearLogContext(): void {
  globalContext = {};
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Create structured log metadata
 */
function createLogMetadata(
  level: string,
  module: string,
  operation?: string,
  operationType?: OperationType,
  additionalMetadata?: JsonObject
): LogMetadata {
  const sanitizedMetadata = sanitizeMetadata(additionalMetadata);
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    operation: operation || globalContext.operation,
    operationType: operationType || globalContext.operationType,
    correlationId: globalContext.correlationId,
    sessionId: globalContext.sessionId,
    requestId: globalContext.requestId,
    userId: globalContext.userId,
    ...(sanitizedMetadata || {}),
  };
}

/**
 * Format and output structured log entry
 */
function outputLog(
  entry: LogEntry,
  logFunction: (message: string, ...args: unknown[]) => void
): void {
  if (process.env.LOG_FORMAT === 'json') {
    // Output compact JSON using safe stringify to prevent errors
    logFunction(safeJsonStringify(entry, { indent: 0 }));
  } else {
    // Output pretty-printed JSON to maintain human readability for console,
    // while ensuring it's a single, valid JSON string to prevent MCP parsing errors.
    logFunction(safeJsonStringify(entry, { indent: 2 }));
  }
}

/**
 * Log a debug message (only in development)
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 * @param operation - Optional operation name
 * @param operationType - Optional operation type
 */
export function debug(
  module: string,
  message: string,
  data?: JsonObject,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
    const sanitizedMessage = sanitizeLogMessage(message);
    const sanitizedData = data
      ? (sanitizeLogPayload(data) as JsonObject)
      : undefined;
    const entry: LogEntry = {
      message: sanitizedMessage,
      metadata: createLogMetadata('DEBUG', module, operation, operationType),
      ...(sanitizedData ? { data: sanitizedData } : {}),
    };
    outputLog(entry, console.error); // Use stderr instead of stdout to avoid interfering with MCP protocol
  }
}

/**
 * Log an info message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 * @param operation - Optional operation name
 * @param operationType - Optional operation type
 */
export function info(
  module: string,
  message: string,
  data?: JsonObject,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
    const sanitizedMessage = sanitizeLogMessage(message);
    const sanitizedData = data
      ? (sanitizeLogPayload(data) as JsonObject)
      : undefined;
    const entry: LogEntry = {
      message: sanitizedMessage,
      metadata: createLogMetadata('INFO', module, operation, operationType),
      ...(sanitizedData ? { data: sanitizedData } : {}),
    };
    outputLog(entry, console.error); // Use stderr instead of stdout to avoid interfering with MCP protocol
  }
}

/**
 * Log a warning message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 * @param operation - Optional operation name
 * @param operationType - Optional operation type
 */
export function warn(
  module: string,
  message: string,
  data?: JsonObject,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
    const sanitizedMessage = sanitizeLogMessage(message);
    const sanitizedData = data
      ? (sanitizeLogPayload(data) as JsonObject)
      : undefined;
    const entry: LogEntry = {
      message: sanitizedMessage,
      metadata: createLogMetadata('WARN', module, operation, operationType),
      ...(sanitizedData ? { data: sanitizedData } : {}),
    };
    outputLog(entry, console.warn);
  }
}

/**
 * Log an error message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param errorObj - Optional error object
 * @param data - Optional additional data
 * @param operation - Optional operation name
 * @param operationType - Optional operation type
 */
export function error(
  module: string,
  message: string,
  errorObj?: unknown,
  data?: JsonObject,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
    const sanitizedMessage = sanitizeLogMessage(message);
    const sanitizedData = data
      ? (sanitizeLogPayload(data) as JsonObject)
      : undefined;
    const sanitizedError = sanitizeErrorDetail(errorObj);
    const entry: LogEntry = {
      message: sanitizedMessage,
      metadata: createLogMetadata('ERROR', module, operation, operationType),
      ...(sanitizedData ? { data: sanitizedData } : {}),
      ...(sanitizedError ? { error: sanitizedError } : {}),
    };
    outputLog(entry, console.error);
  }
}

/**
 * Performance timing utility for tracking operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private module: string;
  private operation: string;
  private operationType: OperationType;

  constructor(
    module: string,
    operation: string,
    operationType: OperationType = OperationType.SYSTEM
  ) {
    this.module = module;
    this.operation = operation;
    this.operationType = operationType;
    this.startTime = Date.now();
  }

  /**
   * End timing and log the duration
   */
  end(message?: string, data?: Record<string, unknown>): number {
    const duration = Date.now() - this.startTime;
    debug(
      this.module,
      message || `Operation completed: ${this.operation}`,
      { ...data, duration: `${duration}ms` },
      this.operation,
      this.operationType
    );
    return duration;
  }
}

/**
 * Enhanced operation start logging with timing
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param operationType - Type of operation for categorization
 * @param params - Parameters for the operation
 * @returns PerformanceTimer instance for tracking duration
 */
export function operationStart(
  module: string,
  operation: string,
  operationType: OperationType = OperationType.SYSTEM,
  params?: JsonObject
): PerformanceTimer {
  debug(
    module,
    `Starting operation: ${operation}`,
    params,
    operation,
    operationType
  );
  return new PerformanceTimer(module, operation, operationType);
}

/**
 * Logs the successful completion of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param resultSummary - Summary of the operation result (e.g., count of items)
 * @param operationType - Type of operation for categorization
 * @param duration - Optional duration in milliseconds
 */
export function operationSuccess(
  module: string,
  operation: string,
  resultSummary?: JsonObject,
  operationType: OperationType = OperationType.SYSTEM,
  duration?: number
): void {
  const logData = {
    ...resultSummary,
    ...(duration && { duration: `${duration}ms` }),
  };
  info(
    module,
    `Operation successful: ${operation}`,
    logData,
    operation,
    operationType
  );
}

/**
 * Logs the failure of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation that failed
 * @param errorObj - The error object
 * @param context - Additional context information
 * @param operationType - Type of operation for categorization
 * @param duration - Optional duration in milliseconds
 */
export function operationFailure(
  module: string,
  operation: string,
  errorObj: unknown,
  context?: JsonObject,
  operationType: OperationType = OperationType.SYSTEM,
  duration?: number
): void {
  const logData = {
    ...context,
    ...(duration && { duration: `${duration}ms` }),
  };
  error(
    module,
    `Operation failed: ${operation}`,
    errorObj,
    logData,
    operation,
    operationType
  );
}

/**
 * Logs the start of a fallback API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the fallback operation
 * @param reason - Reason for falling back
 * @param operationType - Type of operation for categorization
 */
export function fallbackStart(
  module: string,
  operation: string,
  reason: string,
  operationType: OperationType = OperationType.API_CALL
): void {
  warn(
    module,
    `Trying fallback: ${operation}. Reason: ${reason}`,
    { reason },
    operation,
    operationType
  );
}

/**
 * Creates a scoped logger instance with pre-configured context
 */
export class SecureLogger {
  constructor(
    private readonly module: string,
    private readonly operation?: string,
    private readonly operationType: OperationType = OperationType.SYSTEM
  ) {}

  debug(message: string, data?: JsonObject): void {
    debug(this.module, message, data, this.operation, this.operationType);
  }

  info(message: string, data?: JsonObject): void {
    info(this.module, message, data, this.operation, this.operationType);
  }

  warn(message: string, data?: JsonObject): void {
    warn(this.module, message, data, this.operation, this.operationType);
  }

  error(message: string, errorObj?: unknown, data?: JsonObject): void {
    error(
      this.module,
      message,
      errorObj,
      data,
      this.operation,
      this.operationType
    );
  }

  operationStart(
    op?: string,
    opType?: OperationType,
    params?: JsonObject
  ): PerformanceTimer {
    return operationStart(
      this.module,
      op || this.operation || 'unknown',
      opType || this.operationType,
      params
    );
  }

  operationSuccess(
    op?: string,
    resultSummary?: JsonObject,
    opType?: OperationType,
    duration?: number
  ): void {
    operationSuccess(
      this.module,
      op || this.operation || 'unknown',
      resultSummary,
      opType || this.operationType,
      duration
    );
  }

  operationFailure(
    op?: string,
    errorObj?: unknown,
    context?: JsonObject,
    opType?: OperationType,
    duration?: number
  ): void {
    operationFailure(
      this.module,
      op || this.operation || 'unknown',
      errorObj,
      context,
      opType || this.operationType,
      duration
    );
  }
}

export function createScopedLogger(
  module: string,
  operation?: string,
  operationType?: OperationType
) {
  return new SecureLogger(module, operation, operationType);
}

/**
 * Utility for wrapping async operations with automatic logging
 */
export async function withLogging<T>(
  module: string,
  operation: string,
  operationType: OperationType,
  fn: () => Promise<T>,
  context?: JsonObject
): Promise<T> {
  const timer = operationStart(module, operation, operationType, context);
  try {
    const result = await fn();
    const duration = timer.end();
    operationSuccess(
      module,
      operation,
      { success: true },
      operationType,
      duration
    );
    return result;
  } catch (error: unknown) {
    const duration = timer.end();
    operationFailure(
      module,
      operation,
      error,
      context,
      operationType,
      duration
    );
    throw error;
  }
}

export function safeMcpLog(message: string, ...args: unknown[]): void {
  // Always use console.error to avoid interfering with MCP protocol
  const sanitizedMessage = sanitizeLogMessage(message);
  const sanitizedArgs = args.map((arg) => {
    if (typeof arg === 'string') {
      return sanitizeLogMessage(arg);
    }
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeLogPayload(arg);
    }
    return arg;
  });
  console.error(`[MCP_SAFE_LOG] ${sanitizedMessage}`, ...sanitizedArgs);
}

export default {
  debug,
  info,
  warn,
  error,
  operationStart,
  operationSuccess,
  operationFailure,
  fallbackStart,
  setLogContext,
  getLogContext,
  clearLogContext,
  generateCorrelationId,
  createScopedLogger,
  SecureLogger,
  withLogging,
  safeMcpLog,
  PerformanceTimer,
  LogLevel,
  OperationType,
};
