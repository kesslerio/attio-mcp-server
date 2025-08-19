/**
 * Comprehensive E2E Test Logger
 *
 * Provides detailed logging for E2E tests with structured JSON output,
 * API request/response tracking, timing information, and error context.
 *
 * Features:
 * - Structured JSON logging for easy parsing and analysis
 * - API request/response logging with timing
 * - Test data lifecycle tracking
 * - Error logging with full context and stack traces
 * - Sanitized parameter logging (removes sensitive data)
 * - Separate log files per test suite
 * - Performance metrics and statistics
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type {
  LogParameters,
  LogResponse,
  LogMetadata,
  ApiError,
} from '../types';

export interface LogEntry {
  timestamp: string;
  testSuite: string;
  testName?: string;
  operation:
    | 'tool_call'
    | 'test_data_creation'
    | 'test_data_cleanup'
    | 'error'
    | 'info';
  toolName?: string;
  parameters?: LogParameters;
  response?: LogResponse;
  timing?: {
    start: number;
    end: number;
    duration: number;
  };
  success: boolean;
  error?: ApiError;
  metadata?: LogMetadata;
}

export interface TestRunSummary {
  testSuite: string;
  startTime: string;
  endTime?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalApiCalls: number;
  successfulApiCalls: number;
  failedApiCalls: number;
  averageResponseTime: number;
  createdRecords: Array<{ type: string; id: string; timestamp: string }>;
  errors: Array<{ timestamp: string; message: string; testName?: string }>;
}

class E2ELogger {
  private logsDir: string;
  private currentTestSuite?: string;
  private currentTestRun?: TestRunSummary;
  private apiCallTimes: number[] = [];
  private runId?: string;

  constructor() {
    // Create logs directory in test/e2e/logs
    this.logsDir = join(process.cwd(), 'test', 'e2e', 'logs');
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Start logging for a test suite
   */
  startTestSuite(testSuiteName: string): void {
    this.currentTestSuite = testSuiteName;
    this.currentTestRun = {
      testSuite: testSuiteName,
      startTime: new Date().toISOString(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalApiCalls: 0,
      successfulApiCalls: 0,
      failedApiCalls: 0,
      averageResponseTime: 0,
      createdRecords: [],
      errors: [],
    };

    this.log({
      timestamp: new Date().toISOString(),
      testSuite: testSuiteName,
      operation: 'info',
      success: true,
      metadata: { message: `Starting test suite: ${testSuiteName}` },
    });
  }

  /**
   * End logging for a test suite and write summary
   */
  endTestSuite(): void {
    if (!this.currentTestRun || !this.currentTestSuite) return;

    this.currentTestRun.endTime = new Date().toISOString();
    this.currentTestRun.averageResponseTime =
      this.apiCallTimes.length > 0
        ? this.apiCallTimes.reduce((a, b) => a + b, 0) /
          this.apiCallTimes.length
        : 0;

    // Write test run summary
    const summaryFile = join(
      this.logsDir,
      `${this.currentTestSuite}-summary-${Date.now()}.json`
    );
    writeFileSync(summaryFile, JSON.stringify(this.currentTestRun, null, 2));

    this.log({
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite,
      operation: 'info',
      success: true,
      metadata: {
        message: `Completed test suite: ${this.currentTestSuite}`,
        summary: this.currentTestRun,
      },
    });

    // Reset for next test suite
    this.currentTestSuite = undefined;
    this.currentTestRun = undefined;
    this.apiCallTimes = [];
  }

  /**
   * Log a tool call with timing and response data
   */
  logToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    response: any,
    timing: { start: number; end: number },
    testName?: string,
    error?: Error
  ): void {
    const duration = timing.end - timing.start;
    this.apiCallTimes.push(duration);

    if (this.currentTestRun) {
      this.currentTestRun.totalApiCalls++;
      if (error) {
        this.currentTestRun.failedApiCalls++;
      } else {
        this.currentTestRun.successfulApiCalls++;
      }
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'tool_call',
      toolName,
      parameters: this.sanitizeParameters(parameters),
      response: this.sanitizeResponse(response),
      timing: {
        start: timing.start,
        end: timing.end,
        duration,
      },
      success: !error,
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as unknown).code,
      };

      if (this.currentTestRun) {
        this.currentTestRun.errors.push({
          timestamp: logEntry.timestamp,
          message: error.message,
          testName,
        });
      }
    }

    this.log(logEntry);
  }

  /**
   * Log test data creation
   */
  logTestDataCreation(
    type: string,
    id: string,
    data: any,
    testName?: string
  ): void {
    if (this.currentTestRun) {
      this.currentTestRun.createdRecords.push({
        type,
        id,
        timestamp: new Date().toISOString(),
      });
    }

    this.log({
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'test_data_creation',
      success: true,
      metadata: {
        recordType: type,
        recordId: id,
        recordData: this.sanitizeResponse(data),
      },
    });
  }

  /**
   * Log test data cleanup
   */
  logTestDataCleanup(
    type: string,
    id: string,
    success: boolean,
    error?: Error,
    testName?: string
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'test_data_cleanup',
      success,
      metadata: {
        recordType: type,
        recordId: id,
      },
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    this.log(logEntry);
  }

  /**
   * Log test completion
   */
  logTestCompletion(testName: string, passed: boolean, error?: Error): void {
    if (this.currentTestRun) {
      this.currentTestRun.totalTests++;
      if (passed) {
        this.currentTestRun.passedTests++;
      } else {
        this.currentTestRun.failedTests++;
      }
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'info',
      success: passed,
      metadata: { testResult: passed ? 'PASSED' : 'FAILED' },
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    this.log(logEntry);
  }

  /**
   * Log general information
   */
  logInfo(
    message: string,
    metadata?: Record<string, unknown>,
    testName?: string
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'info',
      success: true,
      metadata: { message, ...metadata },
    });
  }

  /**
   * Log errors with full context
   */
  logError(
    error: Error,
    context?: Record<string, unknown>,
    testName?: string
  ): void {
    if (this.currentTestRun) {
      this.currentTestRun.errors.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        testName,
      });
    }

    this.log({
      timestamp: new Date().toISOString(),
      testSuite: this.currentTestSuite || 'unknown',
      testName,
      operation: 'error',
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as unknown).code,
      },
      metadata: context,
    });
  }

  /**
   * Write log entry to file
   */
  private log(entry: LogEntry): void {
    const logFile = this.getLogFile();
    const logLine = JSON.stringify(entry) + '\n';

    try {
      appendFileSync(logFile, logLine);
    } catch (error: unknown) {
      console.error('Failed to write log entry:', error);
    }

    // Also log to console in development for immediate feedback
    if (process.env.NODE_ENV === 'development' || process.env.E2E_DEBUG_LOGS) {
      console.error(
        `[E2E-LOG] ${entry.operation.toUpperCase()}: ${entry.toolName || entry.metadata?.message || 'info'}`
      );
      if (entry.error) {
        console.error(`[E2E-ERROR] ${entry.error.message}`);
      }
    }
  }

  /**
   * Get log file path for current test suite
   */
  private getLogFile(): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const testSuite =
      this.currentTestSuite || this.inferTestSuiteFromCallStack() || 'unknown';

    // Use a more stable filename that doesn't change during the test suite run
    const runId = this.getOrCreateRunId();
    return join(this.logsDir, `${testSuite}-${timestamp}-${runId}.jsonl`);
  }

  /**
   * Infer test suite name from call stack when not explicitly set
   */
  private inferTestSuiteFromCallStack(): string | null {
    const stack = new Error().stack;
    if (!stack) return null;

    // Look for test file names in the stack
    const testFilePattern = /\/test\/e2e\/suites\/([^\/]+)\.e2e\.test\.ts/;
    const match = stack.match(testFilePattern);

    if (match && match[1]) {
      return match[1]; // Extract the test suite name from filename
    }

    // Fallback patterns for other test file structures
    const fallbackPattern = /\/([^\/]+)\.e2e\.test\.ts/;
    const fallbackMatch = stack.match(fallbackPattern);

    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    return null;
  }

  /**
   * Get or create a stable run ID for the current test session
   */
  private getOrCreateRunId(): string {
    if (!this.runId) {
      // Create a stable run ID based on start time
      const startTime = new Date();
      this.runId = `${startTime.getHours().toString().padStart(2, '0')}${startTime.getMinutes().toString().padStart(2, '0')}${startTime.getSeconds().toString().padStart(2, '0')}`;
    }
    return this.runId;
  }

  /**
   * Sanitize parameters by removing sensitive data
   */
  private sanitizeParameters(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitiveKeys = [
      'api_key',
      'apiKey',
      'token',
      'password',
      'secret',
      'authorization',
      'auth',
      'key',
      'credentials',
    ];

    const sanitized = { ...params };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Sanitize response data by limiting size and removing sensitive data
   */
  private sanitizeResponse(response: any): any {
    if (!response) return response;

    // Convert response to string to check size
    const responseStr = JSON.stringify(response);

    // If response is too large (>10KB), create a safe preview
    if (responseStr.length > 10000) {
      return {
        _truncated: true,
        _originalSize: responseStr.length,
        _preview: {
          type: 'truncated',
          length: responseStr.length,
          sample: responseStr.substring(0, 500), // Raw string sample, no parsing
        },
        _message:
          'Response truncated for logging. Original size: ' +
          responseStr.length +
          ' characters',
      };
    }

    return response;
  }

  /**
   * Get current test run statistics
   */
  getCurrentStats(): TestRunSummary | undefined {
    return this.currentTestRun;
  }
}

// Export singleton instance
export const e2eLogger = new E2ELogger();

// Export helper functions for test files
export function startTestSuite(suiteName: string): void {
  e2eLogger.startTestSuite(suiteName);
}

export function endTestSuite(): void {
  e2eLogger.endTestSuite();
}

export function logToolCall(
  toolName: string,
  parameters: Record<string, unknown>,
  response: any,
  timing: { start: number; end: number },
  testName?: string,
  error?: Error
): void {
  e2eLogger.logToolCall(
    toolName,
    parameters,
    response,
    timing,
    testName,
    error
  );
}

export function logTestDataCreation(
  type: string,
  id: string,
  data: any,
  testName?: string
): void {
  e2eLogger.logTestDataCreation(type, id, data, testName);
}

export function logTestDataCleanup(
  type: string,
  id: string,
  success: boolean,
  error?: Error,
  testName?: string
): void {
  e2eLogger.logTestDataCleanup(type, id, success, error, testName);
}

export function logInfo(
  message: string,
  metadata?: Record<string, unknown>,
  testName?: string
): void {
  e2eLogger.logInfo(message, metadata, testName);
}

export function logError(
  error: Error,
  context?: Record<string, unknown>,
  testName?: string
): void {
  e2eLogger.logError(error, context, testName);
}

export function logTestCompletion(
  testName: string,
  passed: boolean,
  error?: Error
): void {
  e2eLogger.logTestCompletion(testName, passed, error);
}
