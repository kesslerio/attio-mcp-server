/**
 * Tests for enhanced structured logging system
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  debug,
  info,
  warn,
  error,
  setLogContext,
  getLogContext,
  clearLogContext,
  generateCorrelationId,
  createScopedLogger,
  withLogging,
  PerformanceTimer,
  LogLevel,
  OperationType,
  operationStart,
  operationSuccess,
  operationFailure,
} from '../../src/utils/logger.js';

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe('Structured Logging System', () => {
  let mockConsoleLog: vi.Mock;
  let mockConsoleWarn: vi.Mock;
  let mockConsoleError: vi.Mock;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockConsoleLog = vi.fn();
    mockConsoleWarn = vi.fn();
    mockConsoleError = vi.fn();

    // Mock console methods
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;

    // Clear log context
    clearLogContext();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Basic Logging Functions', () => {
    test('debug logs with structured format', () => {
      debug('test-module', 'Test debug message', { key: 'value' });

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test debug message',
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            level: 'DEBUG',
            module: 'test-module',
          }),
          data: { key: 'value' },
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test debug message',
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          level: 'DEBUG',
          module: 'test-module',
        }),
        data: { key: 'value' },
      }));
>>>>>>> origin/main
    });

    test('info logs with structured format', () => {
      info('test-module', 'Test info message');

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test info message',
          metadata: expect.objectContaining({
            level: 'INFO',
            module: 'test-module',
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test info message',
        metadata: expect.objectContaining({
          level: 'INFO',
          module: 'test-module',
        }),
      }));
>>>>>>> origin/main
    });

    test('warn logs with structured format', () => {
      warn('test-module', 'Test warning message', { warning: true });

      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleWarn.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test warning message',
          metadata: expect.objectContaining({
            level: 'WARN',
            module: 'test-module',
          }),
          data: { warning: true },
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test warning message',
        metadata: expect.objectContaining({
          level: 'WARN',
          module: 'test-module',
        }),
        data: { warning: true },
      }));
>>>>>>> origin/main
    });

    test('error logs with structured format and error object', () => {
      const testError = new Error('Test error');
      error('test-module', 'Test error message', testError, {
        context: 'test',
      });

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test error message',
          metadata: expect.objectContaining({
            level: 'ERROR',
            module: 'test-module',
          }),
          data: { context: 'test' },
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
            stack: expect.any(String),
          }),
        })
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test error message',
        metadata: expect.objectContaining({
          level: 'ERROR',
          module: 'test-module',
        }),
        data: { context: 'test' },
        error: expect.objectContaining({
          message: 'Test error',
          name: 'Error',
          stack: expect.any(String),
        }),
      })
>>>>>>> origin/main
      );
    });
  });

  describe('Log Context Management', () => {
    test('setLogContext and getLogContext work correctly', () => {
      const context = {
        correlationId: 'test-correlation-id',
        sessionId: 'test-session-id',
        operation: 'test-operation',
        operationType: OperationType.API_CALL,
      };

      setLogContext(context);
      const retrievedContext = getLogContext();

      expect(retrievedContext).toEqual(context);
    });

    test('clearLogContext clears the context', () => {
      setLogContext({ correlationId: 'test-id' });
      clearLogContext();

      const context = getLogContext();
      expect(context).toEqual({});
    });

    test('generateCorrelationId generates unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    test('logs include context information', () => {
      setLogContext({
        correlationId: 'test-correlation-id',
        operation: 'test-operation',
        operationType: OperationType.TOOL_EXECUTION,
      });

      debug('test-module', 'Test message with context');

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test message with context',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'test-module',
            correlationId: 'test-correlation-id',
            operation: 'test-operation',
            operationType: OperationType.TOOL_EXECUTION,
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test message with context',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          correlationId: 'test-correlation-id',
          operation: 'test-operation',
          operationType: OperationType.TOOL_EXECUTION,
        }),
      }));
>>>>>>> origin/main
    });
  });

  describe('PerformanceTimer', () => {
    test('tracks timing correctly', async () => {
      const timer = new PerformanceTimer(
        'test-module',
        'test-operation',
        OperationType.API_CALL
      );

      // Wait a bit to ensure some time passes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = timer.end('Operation completed');

      expect(duration).toBeGreaterThan(0);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Operation completed',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'test-module',
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: expect.objectContaining({
            duration: expect.stringMatching(/^\d+ms$/),
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Operation completed',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          operation: 'test-operation',
          operationType: OperationType.API_CALL,
        }),
        data: expect.objectContaining({
          duration: expect.stringMatching(/^\d+ms$/),
        }),
      }));
>>>>>>> origin/main
    });
  });

  describe('Operation Logging Functions', () => {
    test('operationStart returns PerformanceTimer and logs start', () => {
      const timer = operationStart(
        'test-module',
        'test-operation',
        OperationType.API_CALL,
        { param: 'value' }
      );

      expect(timer).toBeInstanceOf(PerformanceTimer);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Starting operation: test-operation',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'test-module',
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: { param: 'value' },
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Starting operation: test-operation',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          operation: 'test-operation',
          operationType: OperationType.API_CALL,
        }),
        data: { param: 'value' },
      }));
>>>>>>> origin/main
    });

    test('operationSuccess logs success with duration', () => {
      operationSuccess(
        'test-module',
        'test-operation',
        { count: 5 },
        OperationType.API_CALL,
        150
      );

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Operation successful: test-operation',
          metadata: expect.objectContaining({
            level: 'INFO',
            module: 'test-module',
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: expect.objectContaining({
            count: 5,
            duration: '150ms',
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Operation successful: test-operation',
        metadata: expect.objectContaining({
          level: 'INFO',
          module: 'test-module',
          operation: 'test-operation',
          operationType: OperationType.API_CALL,
        }),
        data: expect.objectContaining({
          count: 5,
          duration: '150ms',
        }),
      }));
>>>>>>> origin/main
    });

    test('operationFailure logs failure with error and duration', () => {
      const testError = new Error('Operation failed');

      operationFailure(
        'test-module',
        'test-operation',
        testError,
        { context: 'test' },
        OperationType.API_CALL,
        100
      );

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Operation failed: test-operation',
          metadata: expect.objectContaining({
            level: 'ERROR',
            module: 'test-module',
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: expect.objectContaining({
            context: 'test',
            duration: '100ms',
          }),
          error: expect.objectContaining({
            message: 'Operation failed',
            name: 'Error',
            stack: expect.any(String),
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Operation failed: test-operation',
        metadata: expect.objectContaining({
          level: 'ERROR',
          module: 'test-module',
          operation: 'test-operation',
          operationType: OperationType.API_CALL,
        }),
        data: expect.objectContaining({
          context: 'test',
          duration: '100ms',
        }),
        error: expect.objectContaining({
          message: 'Operation failed',
          name: 'Error',
          stack: expect.any(String),
        }),
      }));
>>>>>>> origin/main
    });
  });

  describe('Scoped Logger', () => {
    test('createScopedLogger returns logger with pre-configured context', () => {
      const scopedLogger = createScopedLogger(
        'scoped-module',
        'scoped-operation',
        OperationType.VALIDATION
      );

      scopedLogger.debug('Scoped debug message', { test: true });

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Scoped debug message',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'scoped-module',
            operation: 'scoped-operation',
            operationType: OperationType.VALIDATION,
          }),
          data: { test: true },
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Scoped debug message',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'scoped-module',
          operation: 'scoped-operation',
          operationType: OperationType.VALIDATION,
        }),
        data: { test: true },
      }));
>>>>>>> origin/main
    });

    test('scoped logger operationStart works correctly', () => {
      const scopedLogger = createScopedLogger(
        'scoped-module',
        'base-operation'
      );
      const timer = scopedLogger.operationStart(
        'specific-operation',
        OperationType.API_CALL
      );

      expect(timer).toBeInstanceOf(PerformanceTimer);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Starting operation: specific-operation',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'scoped-module',
            operation: 'specific-operation',
            operationType: OperationType.API_CALL,
          }),
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Starting operation: specific-operation',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'scoped-module',
          operation: 'specific-operation',
          operationType: OperationType.API_CALL,
        }),
      }));
>>>>>>> origin/main
    });
  });

  describe('withLogging Utility', () => {
    test('withLogging wraps successful operations', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await withLogging(
        'test-module',
        'test-operation',
        OperationType.DATA_PROCESSING,
        mockOperation,
        { input: 'test' }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();

      // Should log operation start, timer end, and success (3 calls total)
      expect(mockConsoleError).toHaveBeenCalledTimes(3);
<<<<<<< HEAD

      // Check operation start log
      const startLogCall = mockConsoleError.mock.calls[0][0];
      const startLogEntry = JSON.parse(startLogCall);
      expect(startLogEntry.message).toContain(
        'Starting operation: test-operation'
      );

      // Check operation success log (last call)
      const successLogCall = mockConsoleError.mock.calls[2][0];
      const successLogEntry = JSON.parse(successLogCall);
      expect(successLogEntry.message).toContain(
        'Operation successful: test-operation'
      );
=======
      
      // Check operation start log
      const startLogCall = mockConsoleError.mock.calls[0][0];
      const startLogEntry = JSON.parse(startLogCall);
      expect(startLogEntry.message).toContain('Starting operation: test-operation');
      
      // Check operation success log (last call)
      const successLogCall = mockConsoleError.mock.calls[2][0];
      const successLogEntry = JSON.parse(successLogCall);
      expect(successLogEntry.message).toContain('Operation successful: test-operation');
>>>>>>> origin/main
    });

    test('withLogging wraps failed operations', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await expect(
        withLogging(
          'test-module',
          'test-operation',
          OperationType.DATA_PROCESSING,
          mockOperation,
          { input: 'test' }
        )
      ).rejects.toThrow('Operation failed');

      expect(mockOperation).toHaveBeenCalled();

      // Should log operation start, timer end, and failure (3 calls total)
      expect(mockConsoleError).toHaveBeenCalledTimes(3);
<<<<<<< HEAD

      // Check operation start log
      const startLogCall = mockConsoleError.mock.calls[0][0];
      const startLogEntry = JSON.parse(startLogCall);
      expect(startLogEntry.message).toContain(
        'Starting operation: test-operation'
      );

      // Check operation failure log (last call)
      const failureLogCall = mockConsoleError.mock.calls[2][0];
      const failureLogEntry = JSON.parse(failureLogCall);
      expect(failureLogEntry.message).toContain(
        'Operation failed: test-operation'
      );
=======
      
      // Check operation start log
      const startLogCall = mockConsoleError.mock.calls[0][0];
      const startLogEntry = JSON.parse(startLogCall);
      expect(startLogEntry.message).toContain('Starting operation: test-operation');
      
      // Check operation failure log (last call)
      const failureLogCall = mockConsoleError.mock.calls[2][0];
      const failureLogEntry = JSON.parse(failureLogCall);
      expect(failureLogEntry.message).toContain('Operation failed: test-operation');
>>>>>>> origin/main
    });
  });

  describe('JSON Log Format', () => {
    const originalLogFormat = process.env.LOG_FORMAT;

    beforeEach(() => {
      process.env.LOG_FORMAT = 'json';
    });

    afterEach(() => {
      if (originalLogFormat) {
        process.env.LOG_FORMAT = originalLogFormat;
      } else {
        delete process.env.LOG_FORMAT;
      }
    });

    test('outputs JSON format when LOG_FORMAT=json', () => {
      debug('test-module', 'Test JSON message', { key: 'value' });

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
<<<<<<< HEAD

      expect(logCall).toMatch(/^\{.*\}$/); // Should be a JSON string

=======
      
      expect(logCall).toMatch(/^\{.*\}$/) // Should be a JSON string
      
>>>>>>> origin/main
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toMatchObject({
        message: 'Test JSON message',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          timestamp: expect.any(String),
        }),
        data: { key: 'value' },
      });
    });
  });

  describe('Operation Types', () => {
    test('all operation types are available', () => {
      expect(OperationType.API_CALL).toBe('api_call');
      expect(OperationType.TOOL_EXECUTION).toBe('tool_execution');
      expect(OperationType.DATA_PROCESSING).toBe('data_processing');
      expect(OperationType.VALIDATION).toBe('validation');
      expect(OperationType.TRANSFORMATION).toBe('transformation');
      expect(OperationType.SYSTEM).toBe('system');
    });

    test('logs include operation type when specified', () => {
      debug(
        'test-module',
        'Test with operation type',
        { data: 'test' },
        'custom-operation',
        OperationType.TRANSFORMATION
      );

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const logCall = mockConsoleError.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
<<<<<<< HEAD

      expect(logEntry).toEqual(
        expect.objectContaining({
          message: 'Test with operation type',
          metadata: expect.objectContaining({
            level: 'DEBUG',
            module: 'test-module',
            operation: 'custom-operation',
            operationType: OperationType.TRANSFORMATION,
          }),
          data: { data: 'test' },
        })
      );
=======
      
      expect(logEntry).toEqual(expect.objectContaining({
        message: 'Test with operation type',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          operation: 'custom-operation',
          operationType: OperationType.TRANSFORMATION,
        }),
        data: { data: 'test' },
      }));
>>>>>>> origin/main
    });
  });
});
