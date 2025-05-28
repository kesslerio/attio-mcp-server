/**
 * Tests for enhanced tool dispatcher logging functionality
 */

import {
  initializeToolContext,
  createToolLogger,
  logToolRequest,
  logToolSuccess,
  logToolError,
  logToolValidationError,
  logToolConfigError,
  logToolFallback,
} from '../../../src/handlers/tools/dispatcher/logging.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { PerformanceTimer, getLogContext, clearLogContext } from '../../../src/utils/logger.js';

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

describe('Tool Dispatcher Logging', () => {
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

  describe('Tool Context Initialization', () => {
    test('initializeToolContext sets correlation ID and context', () => {
      const correlationId = initializeToolContext('test-tool');
      const context = getLogContext();

      expect(correlationId).toBeTruthy();
      expect(typeof correlationId).toBe('string');
      expect(context.correlationId).toBe(correlationId);
      expect(context.operation).toBe('test-tool');
      expect(context.operationType).toBe('tool_execution');
    });

    test('initializeToolContext generates unique correlation IDs', () => {
      const id1 = initializeToolContext('tool1');
      const id2 = initializeToolContext('tool2');

      expect(id1).not.toBe(id2);
    });
  });

  describe('Tool Logger Creation', () => {
    test('createToolLogger returns scoped logger', () => {
      const logger = createToolLogger('test-tool', 'search');
      
      logger.debug('Test debug message');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[tool:test-tool] [DEBUG] Test debug message',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'search',
            operationType: 'tool_execution',
          })
        })
      );
    });

    test('createToolLogger works without toolType', () => {
      const logger = createToolLogger('test-tool');
      
      logger.info('Test info message');

      expect(mockConsoleLog).toHaveBeenCalledWith('[tool:test-tool] [INFO] Test info message');
    });
  });

  describe('Tool Request Logging', () => {
    test('logToolRequest logs structured request data and returns timer', () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            query: 'test search',
            limit: 10,
          }
        }
      };

      const timer = logToolRequest('search', 'test-tool', mockRequest);

      expect(timer).toBeInstanceOf(PerformanceTimer);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation: execute'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'execute',
            operationType: 'tool_execution',
          }),
          data: expect.objectContaining({
            toolType: 'search',
            toolName: 'test-tool',
            argumentsCount: 2,
            hasArguments: true,
          })
        })
      );
    });

    test('logToolRequest handles request without arguments', () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
        }
      };

      const timer = logToolRequest('list', 'test-tool', mockRequest);

      expect(timer).toBeInstanceOf(PerformanceTimer);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation: execute'),
        expect.objectContaining({
          data: expect.objectContaining({
            argumentsCount: 0,
            hasArguments: false,
          })
        })
      );
    });

    test('logToolRequest includes arguments in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { query: 'test' }
        }
      };

      logToolRequest('search', 'test-tool', mockRequest);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            arguments: { query: 'test' }
          })
        })
      );

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Tool Success Logging', () => {
    test('logToolSuccess logs success with result summary', async () => {
      const timer = new PerformanceTimer('tool:test-tool', 'execute', 'tool_execution' as any);
      
      // Wait a bit to ensure some time passes
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = {
        content: [
          { type: 'text', text: 'Result 1' },
          { type: 'text', text: 'Result 2' }
        ]
      };

      logToolSuccess('test-tool', 'search', result, timer);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Operation successful: execute'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'execute',
            operationType: 'tool_execution',
          }),
          data: expect.objectContaining({
            success: true,
            hasContent: true,
            contentLength: 2,
            resultType: 'array',
          })
        })
      );
    });

    test('logToolSuccess handles result without content', async () => {
      const timer = new PerformanceTimer('tool:test-tool', 'execute', 'tool_execution' as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = {};

      logToolSuccess('test-tool', 'search', result, timer);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Operation successful: execute'),
        expect.objectContaining({
          data: expect.objectContaining({
            success: true,
            hasContent: false,
            contentLength: 0,
            resultType: 'undefined',
          })
        })
      );
    });
  });

  describe('Tool Error Logging', () => {
    test('logToolError logs error with context and timing', async () => {
      const timer = new PerformanceTimer('tool:test-tool', 'execute', 'tool_execution' as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      const testError = new Error('Tool execution failed');
      const additionalInfo = { parameter: 'value', attemptCount: 1 };

      logToolError('test-tool', 'search', testError, timer, additionalInfo);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed: execute'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'execute',
            operationType: 'tool_execution',
          }),
          data: expect.objectContaining({
            toolType: 'search',
            toolName: 'test-tool',
            errorType: 'Error',
            hasStack: true,
            parameter: 'value',
            attemptCount: 1,
          }),
          error: expect.objectContaining({
            message: 'Tool execution failed',
            name: 'Error',
            stack: expect.any(String),
          })
        })
      );
    });

    test('logToolError handles non-Error objects', async () => {
      const timer = new PerformanceTimer('tool:test-tool', 'execute', 'tool_execution' as any);
      await new Promise(resolve => setTimeout(resolve, 10));

      const errorString = 'String error message';

      logToolError('test-tool', 'search', errorString, timer);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed: execute'),
        expect.objectContaining({
          data: expect.objectContaining({
            errorType: 'string',
            hasStack: false,
          }),
          error: expect.objectContaining({
            message: 'String error message',
            name: 'Unknown',
          })
        })
      );
    });
  });

  describe('Tool Validation Error Logging', () => {
    test('logToolValidationError logs validation errors', () => {
      logToolValidationError(
        'test-tool',
        'search',
        'Required parameter missing',
        { missingParam: 'query' }
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[tool:test-tool] [WARN] Validation failed: Required parameter missing',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'search',
            operationType: 'validation',
          }),
          data: { missingParam: 'query' }
        })
      );
    });
  });

  describe('Tool Configuration Error Logging', () => {
    test('logToolConfigError logs configuration errors', () => {
      logToolConfigError(
        'test-tool',
        'Tool configuration not found',
        { requestedTool: 'test-tool' }
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[tool:registry] [ERROR] Configuration error for tool test-tool: Tool configuration not found',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:registry',
            operation: 'config-lookup',
            operationType: 'system',
          }),
          data: { requestedTool: 'test-tool' }
        })
      );
    });
  });

  describe('Tool Fallback Logging', () => {
    test('logToolFallback logs fallback attempts', () => {
      logToolFallback(
        'test-tool',
        'search',
        'Primary API endpoint failed',
        'fallback-search-endpoint'
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[tool:test-tool] [WARN] Using fallback method: fallback-search-endpoint',
        expect.objectContaining({
          metadata: expect.objectContaining({
            module: 'tool:test-tool',
            operation: 'search',
            operationType: 'api_call',
          }),
          data: expect.objectContaining({
            reason: 'Primary API endpoint failed',
            fallbackMethod: 'fallback-search-endpoint',
          })
        })
      );
    });
  });

  describe('Integration with Log Context', () => {
    test('tool logging includes correlation ID from context', () => {
      const correlationId = initializeToolContext('test-tool');
      const logger = createToolLogger('test-tool', 'search');

      logger.debug('Test message with correlation');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[tool:test-tool] [DEBUG] Test message with correlation',
        expect.objectContaining({
          metadata: expect.objectContaining({
            correlationId,
            operation: 'test-tool',
            operationType: 'tool_execution',
          })
        })
      );
    });

    test('multiple tool executions have different correlation IDs', () => {
      const id1 = initializeToolContext('tool1');
      const logger1 = createToolLogger('tool1');
      logger1.debug('Message from tool1');

      const id2 = initializeToolContext('tool2');
      const logger2 = createToolLogger('tool2');
      logger2.debug('Message from tool2');

      expect(id1).not.toBe(id2);
      
      const calls = mockConsoleLog.mock.calls;
      const metadata1 = calls[0][1].metadata;
      const metadata2 = calls[1][1].metadata;

      expect(metadata1.correlationId).toBe(id1);
      expect(metadata2.correlationId).toBe(id2);
    });
  });
});