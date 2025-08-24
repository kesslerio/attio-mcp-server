/**
 * Enhanced structured logging utility for consistent logging across the application
 */
import { randomUUID } from 'crypto';
import { safeJsonStringify } from './json-serializer.js';
import { safeGet } from '../types/error-types.js';
/**
 * Log level enum for controlling verbosity
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
/**
 * Operation types for better log categorization
 */
export var OperationType;
(function (OperationType) {
    OperationType["API_CALL"] = "api_call";
    OperationType["TOOL_EXECUTION"] = "tool_execution";
    OperationType["DATA_PROCESSING"] = "data_processing";
    OperationType["VALIDATION"] = "validation";
    OperationType["TRANSFORMATION"] = "transformation";
    OperationType["SYSTEM"] = "system";
})(OperationType || (OperationType = {}));
/**
 * Current log level based on environment
 */
export const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production'
    ? LogLevel.INFO // In production, only log INFO and above
    : LogLevel.DEBUG; // In development, log everything
/**
 * Global log context storage
 */
let globalContext = {};
/**
 * Set global logging context for correlation tracking
 */
export function setLogContext(context) {
    globalContext = { ...globalContext, ...context };
}
/**
 * Get current logging context
 */
export function getLogContext() {
    return { ...globalContext };
}
/**
 * Clear logging context
 */
export function clearLogContext() {
    globalContext = {};
}
/**
 * Generate a new correlation ID
 */
export function generateCorrelationId() {
    return randomUUID();
}
/**
 * Create structured log metadata
 */
function createLogMetadata(level, module, operation, operationType, additionalMetadata) {
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
function outputLog(entry, logFunction) {
    if (process.env.LOG_FORMAT === 'json') {
        // Output compact JSON using safe stringify to prevent errors
        logFunction(safeJsonStringify(entry, { indent: 0 }));
    }
    else {
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
export function debug(module, message, data, operation, operationType) {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
        const entry = {
            message,
            metadata: createLogMetadata('DEBUG', module, operation, operationType),
            ...(data ? { data } : {}),
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
export function info(module, message, data, operation, operationType) {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
        const entry = {
            message,
            metadata: createLogMetadata('INFO', module, operation, operationType),
            ...(data ? { data } : {}),
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
export function warn(module, message, data, operation, operationType) {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
        const entry = {
            message,
            metadata: createLogMetadata('WARN', module, operation, operationType),
            ...(data ? { data } : {}),
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
export function error(module, message, errorObj, data, operation, operationType) {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
        const entry = {
            message,
            metadata: createLogMetadata('ERROR', module, operation, operationType),
            ...(data ? { data } : {}),
            ...(errorObj
                ? {
                    error: errorObj instanceof Error
                        ? {
                            message: errorObj.message,
                            name: errorObj.name,
                            stack: errorObj.stack,
                            code: errorObj.code,
                        }
                        : typeof errorObj === 'object' && errorObj !== null
                            ? {
                                message: safeGet(errorObj, 'message') ||
                                    JSON.stringify(errorObj),
                                name: safeGet(errorObj, 'name') || 'Unknown',
                                stack: safeGet(errorObj, 'stack'),
                                code: safeGet(errorObj, 'code'),
                                ...errorObj,
                            }
                            : { message: String(errorObj), name: 'Unknown' },
                }
                : {}),
        };
        outputLog(entry, console.error);
    }
}
/**
 * Performance timing utility for tracking operation duration
 */
export class PerformanceTimer {
    startTime;
    module;
    operation;
    operationType;
    constructor(module, operation, operationType = OperationType.SYSTEM) {
        this.module = module;
        this.operation = operation;
        this.operationType = operationType;
        this.startTime = Date.now();
    }
    /**
     * End timing and log the duration
     */
    end(message, data) {
        const duration = Date.now() - this.startTime;
        debug(this.module, message || `Operation completed: ${this.operation}`, { ...data, duration: `${duration}ms` }, this.operation, this.operationType);
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
export function operationStart(module, operation, operationType = OperationType.SYSTEM, params) {
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
export function operationSuccess(module, operation, resultSummary, operationType = OperationType.SYSTEM, duration) {
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
export function operationFailure(module, operation, errorObj, context, operationType = OperationType.SYSTEM, duration) {
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
export function fallbackStart(module, operation, reason, operationType = OperationType.API_CALL) {
    warn(module, `Trying fallback: ${operation}. Reason: ${reason}`, { reason }, operation, operationType);
}
/**
 * Creates a scoped logger instance with pre-configured context
 */
export function createScopedLogger(module, operation, operationType) {
    return {
        debug: (message, data) => debug(module, message, data, operation, operationType),
        info: (message, data) => info(module, message, data, operation, operationType),
        warn: (message, data) => warn(module, message, data, operation, operationType),
        error: (message, errorObj, data) => error(module, message, errorObj, data, operation, operationType),
        operationStart: (op, opType, params) => operationStart(module, op || operation || 'unknown', opType || operationType || OperationType.SYSTEM, params),
        operationSuccess: (op, resultSummary, opType, duration) => operationSuccess(module, op || operation || 'unknown', resultSummary, opType || operationType || OperationType.SYSTEM, duration),
        operationFailure: (op, errorObj, context, opType, duration) => operationFailure(module, op || operation || 'unknown', errorObj, context, opType || operationType || OperationType.SYSTEM, duration),
    };
}
/**
 * Utility for wrapping async operations with automatic logging
 */
export async function withLogging(module, operation, operationType, fn, context) {
    const timer = operationStart(module, operation, operationType, context);
    try {
        const result = await fn();
        const duration = timer.end();
        operationSuccess(module, operation, { success: true }, operationType, duration);
        return result;
    }
    catch (error) {
        const duration = timer.end();
        operationFailure(module, operation, error, context, operationType, duration);
        throw error;
    }
}
/**
 * Safe logging function that never interferes with MCP protocol
 * Always use this for any direct console logging that might occur during MCP operations
 *
 * @param message - Message to log
 * @param args - Additional arguments to log
 */
export function safeMcpLog(message, ...args) {
    // Always use console.error to avoid interfering with MCP protocol
    console.error(`[MCP_SAFE_LOG] ${message}`, ...args);
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
    safeMcpLog,
    PerformanceTimer,
    LogLevel,
    OperationType,
};
