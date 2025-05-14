/**
 * Logger utility for consistent logging across the application
 */
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
 * Current log level based on environment
 */
export const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production'
    ? LogLevel.INFO // In production, only log INFO and above
    : LogLevel.DEBUG; // In development, log everything
/**
 * Log a debug message (only in development)
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export function debug(module, message, data) {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
        console.log(`[${module}] [DEBUG] ${message}`, data || '');
    }
}
/**
 * Log an info message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export function info(module, message, data) {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
        console.log(`[${module}] [INFO] ${message}`, data || '');
    }
}
/**
 * Log a warning message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export function warn(module, message, data) {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
        console.warn(`[${module}] [WARN] ${message}`, data || '');
    }
}
/**
 * Log an error message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param error - Optional error object
 * @param data - Optional additional data
 */
export function error(module, message, error, data) {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
        const logData = {
            ...(data || {}),
            error: error instanceof Error ? {
                message: error.message,
                name: error.name,
                stack: error.stack
            } : error
        };
        console.error(`[${module}] [ERROR] ${message}`, logData);
    }
}
/**
 * Logs the start of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param params - Parameters for the operation
 */
export function operationStart(module, operation, params) {
    debug(module, `Starting operation: ${operation}`, params);
}
/**
 * Logs the successful completion of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param resultSummary - Summary of the operation result (e.g., count of items)
 */
export function operationSuccess(module, operation, resultSummary) {
    debug(module, `Operation successful: ${operation}`, resultSummary);
}
/**
 * Logs the failure of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation that failed
 * @param errorObj - The error object
 * @param context - Additional context information
 */
export function operationFailure(module, operation, errorObj, context) {
    error(module, `Operation failed: ${operation}`, errorObj, context);
}
/**
 * Logs the start of a fallback API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the fallback operation
 * @param reason - Reason for falling back
 */
export function fallbackStart(module, operation, reason) {
    warn(module, `Trying fallback: ${operation}. Reason: ${reason}`);
}
export default {
    debug,
    info,
    warn,
    error,
    operationStart,
    operationSuccess,
    operationFailure,
    fallbackStart
};
//# sourceMappingURL=logger.js.map