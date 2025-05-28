/**
 * Enhanced structured logging utility for consistent logging across the application
 */

import { randomUUID } from 'crypto';
import { safeJsonStringify } from './json-serializer.js';

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
  [key: string]: any;
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  message: string;
  metadata: LogMetadata;
  data?: any;
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
 * Current log level based on environment
 */
export const CURRENT_LOG_LEVEL =
  process.env.NODE_ENV === 'production'
    ? LogLevel.INFO // In production, only log INFO and above
    : LogLevel.DEBUG; // In development, log everything

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
  additionalMetadata?: Record<string, any>
): LogMetadata {
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
    ...additionalMetadata,
  };
}

/**
 * Format and output structured log entry
 */
function outputLog(entry: LogEntry, logFunction: (message: string, ...args: any[]) => void): void {
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
  data?: any,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
    const entry: LogEntry = {
      message,
      metadata: createLogMetadata('DEBUG', module, operation, operationType),
      ...(data && { data }),
    };
    outputLog(entry, console.log);
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
  data?: any,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
    const entry: LogEntry = {
      message,
      metadata: createLogMetadata('INFO', module, operation, operationType),
      ...(data && { data }),
    };
    outputLog(entry, console.log);
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
  data?: any,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
    const entry: LogEntry = {
      message,
      metadata: createLogMetadata('WARN', module, operation, operationType),
      ...(data && { data }),
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
  errorObj?: any,
  data?: any,
  operation?: string,
  operationType?: OperationType
): void {
  if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
    const entry: LogEntry = {
      message,
      metadata: createLogMetadata('ERROR', module, operation, operationType),
      ...(data && { data }),
      ...(errorObj && {
        error: errorObj instanceof Error
          ? {
              message: errorObj.message,
              name: errorObj.name,
              stack: errorObj.stack,
              code: (errorObj as any).code,
            }
          : { message: String(errorObj), name: 'Unknown' },
      }),
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

  constructor(module: string, operation: string, operationType: OperationType = OperationType.SYSTEM) {
    this.module = module;
    this.operation = operation;
    this.operationType = operationType;
    this.startTime = Date.now();
  }

  /**
   * End timing and log the duration
   */
  end(message?: string, data?: any): number {
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
  params?: any
): PerformanceTimer {
  debug(module, `Starting operation: ${operation}`, params, operation, operationType);
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
  resultSummary?: any,
  operationType: OperationType = OperationType.SYSTEM,
  duration?: number
): void {
  const logData = {
    ...resultSummary,
    ...(duration && { duration: `${duration}ms` }),
  };
  info(module, `Operation successful: ${operation}`, logData, operation, operationType);
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
  errorObj: any,
  context?: any,
  operationType: OperationType = OperationType.SYSTEM,
  duration?: number
): void {
  const logData = {
    ...context,
    ...(duration && { duration: `${duration}ms` }),
  };
  error(module, `Operation failed: ${operation}`, errorObj, logData, operation, operationType);
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
  warn(module, `Trying fallback: ${operation}. Reason: ${reason}`, { reason }, operation, operationType);
}

/**
 * Creates a scoped logger instance with pre-configured context
 */
export function createScopedLogger(module: string, operation?: string, operationType?: OperationType) {
  return {
    debug: (message: string, data?: any) => debug(module, message, data, operation, operationType),
    info: (message: string, data?: any) => info(module, message, data, operation, operationType),
    warn: (message: string, data?: any) => warn(module, message, data, operation, operationType),
    error: (message: string, errorObj?: any, data?: any) => error(module, message, errorObj, data, operation, operationType),
    operationStart: (op?: string, opType?: OperationType, params?: any) => 
      operationStart(module, op || operation || 'unknown', opType || operationType || OperationType.SYSTEM, params),
    operationSuccess: (op?: string, resultSummary?: any, opType?: OperationType, duration?: number) =>
      operationSuccess(module, op || operation || 'unknown', resultSummary, opType || operationType || OperationType.SYSTEM, duration),
    operationFailure: (op?: string, errorObj?: any, context?: any, opType?: OperationType, duration?: number) =>
      operationFailure(module, op || operation || 'unknown', errorObj, context, opType || operationType || OperationType.SYSTEM, duration),
  };
}

/**
 * Utility for wrapping async operations with automatic logging
 */
export async function withLogging<T>(
  module: string,
  operation: string,
  operationType: OperationType,
  fn: () => Promise<T>,
  context?: any
): Promise<T> {
  const timer = operationStart(module, operation, operationType, context);
  try {
    const result = await fn();
    const duration = timer.end();
    operationSuccess(module, operation, { success: true }, operationType, duration);
    return result;
  } catch (error) {
    const duration = timer.end();
    operationFailure(module, operation, error, context, operationType, duration);
    throw error;
  }
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
  withLogging,
  PerformanceTimer,
  LogLevel,
  OperationType,
};
