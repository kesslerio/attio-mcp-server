/**
 * Tests for enhanced structured logging system
 */

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

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe('Structured Logging System', () => {
  beforeEach(() => {
    // Mock console methods
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
    
    // Clear all mocks
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
    
    // Clear log context
    clearLogContext();
  });

  afterAll(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Basic Logging Functions', () => {
    test('debug logs with structured format', () => {
      debug('test-module', 'Test debug message', { key: 'value' });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [DEBUG] Test debug message',
        expect.objectContaining({
          metadata: expect.objectContaining({
            timestamp: expect.any(String),
            level: 'DEBUG',
            module: 'test-module',
          }),
          data: { key: 'value' }
        })
      );
    });

    test('info logs with structured format', () => {
      info('test-module', 'Test info message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[test-module] [INFO] Test info message');
    });

    test('warn logs with structured format', () => {
      warn('test-module', 'Test warning message', { warning: true });
      
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[test-module] [WARN] Test warning message',
        expect.objectContaining({
          metadata: expect.objectContaining({
            level: 'WARN',
            module: 'test-module',
          }),
          data: { warning: true }
        })
      );
    });

    test('error logs with structured format and error object', () => {
      const testError = new Error('Test error');
      error('test-module', 'Test error message', testError, { context: 'test' });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[test-module] [ERROR] Test error message',
        expect.objectContaining({
          metadata: expect.objectContaining({
            level: 'ERROR',
            module: 'test-module',
          }),
          data: { context: 'test' },
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
            stack: expect.any(String),
          })
        })
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

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [DEBUG] Test message with context',
        expect.objectContaining({
          metadata: expect.objectContaining({
            correlationId: 'test-correlation-id',
            operation: 'test-operation',
            operationType: OperationType.TOOL_EXECUTION,
          })
        })
      );
    });
  });

  describe('PerformanceTimer', () => {
    test('tracks timing correctly', async () => {
      const timer = new PerformanceTimer('test-module', 'test-operation', OperationType.API_CALL);
      
      // Wait a bit to ensure some time passes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = timer.end('Operation completed');
      
      expect(duration).toBeGreaterThan(0);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [DEBUG] Operation completed',
        expect.objectContaining({
          data: expect.objectContaining({
            duration: expect.stringMatching(/^\d+ms$/)
          })
        })
      );
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
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [DEBUG] Starting operation: test-operation',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: { param: 'value' }
        })
      );
    });

    test('operationSuccess logs success with duration', () => {
      operationSuccess(
        'test-module',
        'test-operation',
        { count: 5 },
        OperationType.API_CALL,
        150
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [INFO] Operation successful: test-operation',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: expect.objectContaining({
            count: 5,
            duration: '150ms'
          })
        })
      );
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

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[test-module] [ERROR] Operation failed: test-operation',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'test-operation',
            operationType: OperationType.API_CALL,
          }),
          data: expect.objectContaining({
            context: 'test',
            duration: '100ms'
          }),
          error: expect.objectContaining({
            message: 'Operation failed',
            name: 'Error'
          })
        })
      );
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

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[scoped-module] [DEBUG] Scoped debug message',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'scoped-module',
            operation: 'scoped-operation',
            operationType: OperationType.VALIDATION,
          }),
          data: { test: true }
        })
      );
    });

    test('scoped logger operationStart works correctly', () => {
      const scopedLogger = createScopedLogger('scoped-module', 'base-operation');
      const timer = scopedLogger.operationStart('specific-operation', OperationType.API_CALL);

      expect(timer).toBeInstanceOf(PerformanceTimer);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[scoped-module] [DEBUG] Starting operation: specific-operation',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'scoped-module',
            operation: 'specific-operation',
            operationType: OperationType.API_CALL,
          })
        })
      );
    });
  });

  describe('withLogging Utility', () => {
    test('withLogging wraps successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await withLogging(
        'test-module',
        'test-operation',
        OperationType.DATA_PROCESSING,
        mockOperation,
        { input: 'test' }
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      
      // Should log operation start
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation: test-operation'),
        expect.any(Object)
      );
      
      // Should log operation success
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Operation successful: test-operation'),
        expect.any(Object)
      );
    });

    test('withLogging wraps failed operations', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

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
      
      // Should log operation start
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation: test-operation'),
        expect.any(Object)
      );
      
      // Should log operation failure
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed: test-operation'),
        expect.any(Object)
      );
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

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/) // Should be a JSON string
      );

      const loggedJson = mockConsoleLog.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedJson);
      
      expect(parsedLog).toMatchObject({
        message: 'Test JSON message',
        metadata: expect.objectContaining({
          level: 'DEBUG',
          module: 'test-module',
          timestamp: expect.any(String)
        }),
        data: { key: 'value' }
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

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[test-module] [DEBUG] Test with operation type',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'custom-operation',
            operationType: OperationType.TRANSFORMATION,
          })
        })
      );
    });
  });
});