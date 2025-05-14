/**
 * Logger utility for consistent logging across the application
 */
/**
 * Log level enum for controlling verbosity
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
/**
 * Current log level based on environment
 */
export declare const CURRENT_LOG_LEVEL: LogLevel;
/**
 * Log a debug message (only in development)
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export declare function debug(module: string, message: string, data?: any): void;
/**
 * Log an info message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export declare function info(module: string, message: string, data?: any): void;
/**
 * Log a warning message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param data - Optional data to include with the log
 */
export declare function warn(module: string, message: string, data?: any): void;
/**
 * Log an error message
 *
 * @param module - Name of the module/function logging the message
 * @param message - Message to log
 * @param error - Optional error object
 * @param data - Optional additional data
 */
export declare function error(module: string, message: string, error?: any, data?: any): void;
/**
 * Logs the start of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param params - Parameters for the operation
 */
export declare function operationStart(module: string, operation: string, params?: any): void;
/**
 * Logs the successful completion of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation being performed
 * @param resultSummary - Summary of the operation result (e.g., count of items)
 */
export declare function operationSuccess(module: string, operation: string, resultSummary?: any): void;
/**
 * Logs the failure of an API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the operation that failed
 * @param errorObj - The error object
 * @param context - Additional context information
 */
export declare function operationFailure(module: string, operation: string, errorObj: any, context?: any): void;
/**
 * Logs the start of a fallback API operation
 *
 * @param module - Name of the module/function
 * @param operation - Name of the fallback operation
 * @param reason - Reason for falling back
 */
export declare function fallbackStart(module: string, operation: string, reason: string): void;
declare const _default: {
    debug: typeof debug;
    info: typeof info;
    warn: typeof warn;
    error: typeof error;
    operationStart: typeof operationStart;
    operationSuccess: typeof operationSuccess;
    operationFailure: typeof operationFailure;
    fallbackStart: typeof fallbackStart;
};
export default _default;
//# sourceMappingURL=logger.d.ts.map