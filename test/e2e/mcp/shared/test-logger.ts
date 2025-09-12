/**
 * Structured Test Logger
 * Provides consistent logging for MCP tests with proper formatting and levels
 * Replaces direct console.log usage for better test observability
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  testSuite?: string;
  testCase?: string;
  taskId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

class TestLogger {
  private level: LogLevel;
  private enableColors: boolean;

  constructor(level: LogLevel = LogLevel.INFO, enableColors: boolean = true) {
    this.level = level;
    this.enableColors = enableColors;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.sss
    const levelName = LogLevel[level];

    let formattedMessage = `[${timestamp}] ${levelName}: ${message}`;

    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      formattedMessage += ` | ${contextStr}`;
    }

    return formattedMessage;
  }

  private colorize(message: string, level: LogLevel): string {
    if (!this.enableColors) return message;

    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // cyan
      [LogLevel.INFO]: '\x1b[32m', // green
      [LogLevel.WARN]: '\x1b[33m', // yellow
      [LogLevel.ERROR]: '\x1b[31m', // red
    };

    const reset = '\x1b[0m';
    return `${colors[level]}${message}${reset}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const colorizedMessage = this.colorize(formattedMessage, level);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(colorizedMessage);
        break;
      case LogLevel.INFO:
        console.info(colorizedMessage);
        break;
      case LogLevel.WARN:
        console.warn(colorizedMessage);
        break;
      case LogLevel.ERROR:
        console.error(colorizedMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Task-specific logging methods for common operations
   */

  taskCreated(taskId: string, title: string, context?: LogContext): void {
    this.info(`Task created successfully`, {
      taskId,
      title,
      operation: 'create',
      ...context,
    });
  }

  taskUpdated(
    taskId: string,
    updateData: Record<string, unknown>,
    context?: LogContext
  ): void {
    this.info(`Task updated successfully`, {
      taskId,
      operation: 'update',
      fields: Object.keys(updateData).join(', '),
      ...context,
    });
  }

  taskDeleted(taskId: string, context?: LogContext): void {
    this.info(`Task deleted successfully`, {
      taskId,
      operation: 'delete',
      ...context,
    });
  }

  taskAssigned(
    taskId: string,
    assigneeCount: number,
    context?: LogContext
  ): void {
    this.info(`Task assignment updated`, {
      taskId,
      assigneeCount,
      operation: 'assign',
      ...context,
    });
  }

  testStarted(testCase: string, testSuite: string, context?: LogContext): void {
    this.debug(`Test started`, {
      testCase,
      testSuite,
      operation: 'test_start',
      ...context,
    });
  }

  testCompleted(
    testCase: string,
    testSuite: string,
    duration: number,
    context?: LogContext
  ): void {
    this.info(`Test completed`, {
      testCase,
      testSuite,
      duration,
      operation: 'test_complete',
      ...context,
    });
  }

  testFailed(
    testCase: string,
    testSuite: string,
    error: string,
    context?: LogContext
  ): void {
    this.error(`Test failed`, {
      testCase,
      testSuite,
      error,
      operation: 'test_fail',
      ...context,
    });
  }

  cleanupStarted(
    resourceType: string,
    count: number,
    context?: LogContext
  ): void {
    this.debug(`Cleanup started`, {
      resourceType,
      count,
      operation: 'cleanup_start',
      ...context,
    });
  }

  cleanupCompleted(
    resourceType: string,
    cleaned: number,
    failed: number,
    context?: LogContext
  ): void {
    const level = failed > 0 ? LogLevel.WARN : LogLevel.INFO;
    const message =
      failed > 0
        ? `Cleanup completed with warnings`
        : `Cleanup completed successfully`;

    this.log(level, message, {
      resourceType,
      cleaned,
      failed,
      operation: 'cleanup_complete',
      ...context,
    });
  }

  apiCall(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log(level, `API call completed`, {
      method,
      endpoint,
      status,
      duration,
      operation: 'api_call',
      ...context,
    });
  }

  performance(
    operation: string,
    duration: number,
    threshold?: number,
    context?: LogContext
  ): void {
    const level =
      threshold && duration > threshold ? LogLevel.WARN : LogLevel.DEBUG;
    const message =
      threshold && duration > threshold
        ? `Performance warning: operation exceeded threshold`
        : `Performance measurement`;

    this.log(level, message, {
      operation,
      duration,
      threshold,
      ...context,
    });
  }
}

/**
 * Default test logger instance
 * Can be overridden by setting TEST_LOG_LEVEL environment variable
 */
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.TEST_LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
};

const shouldUseColors = (): boolean => {
  return process.env.NO_COLOR !== '1' && process.env.CI !== 'true';
};

export const testLogger = new TestLogger(getLogLevel(), shouldUseColors());

/**
 * Performance timing utility
 */
export class PerfTimer {
  private startTime: number;
  private operation: string;
  private context: LogContext;

  constructor(operation: string, context?: LogContext) {
    this.operation = operation;
    this.context = context || {};
    this.startTime = Date.now();
  }

  end(threshold?: number): number {
    const duration = Date.now() - this.startTime;
    testLogger.performance(this.operation, duration, threshold, this.context);
    return duration;
  }
}

/**
 * Convenience function for timing operations
 */
export function timeOperation<T>(
  operation: string,
  fn: () => T | Promise<T>,
  threshold?: number,
  context?: LogContext
): Promise<T> {
  const timer = new PerfTimer(operation, context);

  return Promise.resolve(fn())
    .then((result) => {
      timer.end(threshold);
      return result;
    })
    .catch((error) => {
      timer.end(threshold);
      throw error;
    });
}
