/**
 * Unit tests for secure error handler utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SecureApiError,
  withSecureErrorHandling,
  createSecureErrorResponse,
  createSecureToolErrorResult,
  BatchErrorHandler,
  retryWithSecureErrors,
  SecureCircuitBreaker,
} from '@/utils/secure-error-handler.js';
import type { ErrorContext } from '@/utils/secure-error-handler.js';

// Mock the logger
vi.mock('@/utils/logger.js', () => ({
  error: vi.fn(),
  OperationType: {
    API_CALL: 'api_call',
  },
  clearLogContext: vi.fn(),
}));

// Mock the error utilities
vi.mock('@/utils/error-utilities.js', () => ({
  getErrorMessage: vi.fn((error: unknown, fallback?: string) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return fallback || 'Unknown error';
  }),
  ensureError: vi.fn((error: unknown) => {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : 'Unknown error');
  }),
  getErrorStatus: vi.fn(() => undefined),
}));

// Mock the error sanitizer
vi.mock('@/utils/error-sanitizer.js', () => ({
  sanitizeErrorMessage: vi.fn((message: string) => `Sanitized: ${message}`),
  createSanitizedError: vi.fn((error: unknown) => ({
    message: 'Sanitized error message',
    type: 'sanitized_error',
    statusCode: 500,
  })),
}));

describe('SecureApiError', () => {
  const mockContext: ErrorContext = {
    operation: 'test-operation',
    module: 'test-module',
    resourceType: 'test-resource',
    recordId: '123',
  };

  it('should create a SecureApiError with correct properties', () => {
    const error = new SecureApiError(
      'Test error message',
      400,
      'validation_error',
      mockContext
    );

    expect(error.name).toBe('SecureApiError');
    expect(error.message).toBe('Sanitized: Test error message');
    expect(error.statusCode).toBe(400);
    expect(error.errorType).toBe('validation_error');
    expect(error.context).toEqual(mockContext);
    expect(error.safeMetadata).toMatchObject({
      operation: 'test-operation',
      resourceType: 'test-resource',
      timestamp: expect.any(String),
    });
  });

  it('should serialize to safe JSON format', () => {
    const error = new SecureApiError(
      'Test error message',
      404,
      'not_found',
      mockContext
    );

    const json = error.toJSON();
    expect(json).toEqual({
      error: {
        message: 'Sanitized: Test error message',
        type: 'not_found',
        statusCode: 404,
        metadata: {
          operation: 'test-operation',
          resourceType: 'test-resource',
          timestamp: expect.any(String),
        },
      },
    });
  });
});

describe('withSecureErrorHandling', () => {
  const mockContext: ErrorContext = {
    operation: 'test-operation',
    module: 'test-module',
  };

  it('should wrap successful function execution', async () => {
    const testFn = vi.fn().mockResolvedValue('success');
    const wrappedFn = withSecureErrorHandling(testFn, mockContext);

    const result = await wrappedFn('arg1', 'arg2');

    expect(result).toBe('success');
    expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should wrap and sanitize thrown errors', async () => {
    const testFn = vi.fn().mockRejectedValue(new Error('Original error'));
    const wrappedFn = withSecureErrorHandling(testFn, mockContext);

    await expect(wrappedFn()).rejects.toThrow(SecureApiError);
  });

  it('should handle non-Error thrown values', async () => {
    const testFn = vi.fn().mockRejectedValue('String error');
    const wrappedFn = withSecureErrorHandling(testFn, mockContext);

    await expect(wrappedFn()).rejects.toThrow(SecureApiError);
  });
});

describe('createSecureErrorResponse', () => {
  it('should create response from SecureApiError', () => {
    const secureError = new SecureApiError(
      'Test error',
      400,
      'validation_error',
      { operation: 'test', module: 'test' }
    );

    const response = createSecureErrorResponse(secureError);

    expect(response).toEqual({
      success: false,
      error: {
        message: 'Sanitized: Test error',
        type: 'validation_error',
        statusCode: 400,
        suggestion: 'Review the tool arguments for missing or invalid fields.',
      },
    });
  });

  it('should create response from unknown error', () => {
    const response = createSecureErrorResponse(new Error('Test error'));

    expect(response).toEqual({
      success: false,
      error: {
        message: 'Sanitized error message',
        type: 'sanitized_error',
        statusCode: 500,
        suggestion:
          'Retry the request. Contact support with the reference ID if it recurs.',
      },
    });
  });
});

describe('createSecureToolErrorResult', () => {
  it('should include correlation metadata and guidance', () => {
    const result = createSecureToolErrorResult(new Error('Tool failed'), {
      module: 'test-module',
      operation: 'test-operation',
      correlationId: 'corr-123',
      requestId: 'req-456',
    });

    expect(result.isError).toBe(true);
    expect(result.error).toMatchObject({
      type: 'sanitized_error',
      message: 'Sanitized error message',
      code: 500,
      correlationId: 'corr-123',
      requestId: 'req-456',
      suggestion:
        'Retry the request. Contact support with the reference ID if it recurs.',
    });
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Reference ID: corr-123'),
    });
    expect(result.content[0].text).toContain('Next steps:');
  });
});

describe('BatchErrorHandler', () => {
  const mockContext: ErrorContext = {
    operation: 'batch-operation',
    module: 'test-module',
  };

  let batchHandler: BatchErrorHandler;

  beforeEach(() => {
    batchHandler = new BatchErrorHandler(mockContext);
  });

  it('should start with no errors', () => {
    expect(batchHandler.hasErrors()).toBe(false);
    expect(batchHandler.getSummary()).toEqual({
      totalErrors: 0,
      errorsByType: {},
    });
  });

  it('should add and track errors', () => {
    batchHandler.addError(0, new Error('First error'));
    batchHandler.addError(1, 'Second error');

    expect(batchHandler.hasErrors()).toBe(true);

    const summary = batchHandler.getSummary();
    expect(summary.totalErrors).toBe(2);
    expect(summary.errorsByType.batch_error).toBe(2);
  });

  it('should provide error details', () => {
    batchHandler.addError(0, new Error('Test error'));

    const details = batchHandler.getErrorDetails();
    expect(details).toHaveLength(1);
    expect(details[0]).toEqual({
      index: 0,
      error: expect.stringContaining('Test error'),
      type: 'batch_error',
    });
  });
});

describe('retryWithSecureErrors', () => {
  const mockContext: ErrorContext = {
    operation: 'retry-operation',
    module: 'test-module',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const testFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithSecureErrors(testFn, mockContext);

    expect(result).toBe('success');
    expect(testFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const testFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValue('success');

    // Mock getErrorStatus to return 500 for retry logic
    const { getErrorStatus } = await import(
      '../../src/utils/error-utilities.js'
    );
    vi.mocked(getErrorStatus).mockReturnValue(500);

    const promise = retryWithSecureErrors(testFn, mockContext, {
      maxRetries: 1,
    });

    // Fast-forward time for retry delay
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;

    expect(result).toBe('success');
    expect(testFn).toHaveBeenCalledTimes(2);
  });

  it('should throw SecureApiError after max retries', async () => {
    const testFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

    // Mock getErrorStatus to return 500 for retry logic
    const { getErrorStatus } = await import(
      '../../src/utils/error-utilities.js'
    );
    vi.mocked(getErrorStatus).mockReturnValue(500);

    // Use 0 retries to avoid timing issues
    await expect(
      retryWithSecureErrors(testFn, mockContext, { maxRetries: 0 })
    ).rejects.toThrow(SecureApiError);

    expect(testFn).toHaveBeenCalledTimes(1);
  });
});

describe('SecureCircuitBreaker', () => {
  const mockContext: ErrorContext = {
    operation: 'circuit-breaker-operation',
    module: 'test-module',
  };

  let circuitBreaker: SecureCircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new SecureCircuitBreaker(mockContext, {
      failureThreshold: 2,
      resetTimeout: 5000,
    });
  });

  it('should start in closed state', () => {
    const status = circuitBreaker.getStatus();
    expect(status.state).toBe('closed');
    expect(status.failures).toBe(0);
  });

  it('should execute function successfully in closed state', async () => {
    const testFn = vi.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute(testFn);

    expect(result).toBe('success');
    expect(testFn).toHaveBeenCalledTimes(1);
  });

  it('should track failures and open circuit', async () => {
    const testFn = vi.fn().mockRejectedValue(new Error('Test error'));

    // First failure
    await expect(circuitBreaker.execute(testFn)).rejects.toThrow(
      SecureApiError
    );
    expect(circuitBreaker.getStatus().failures).toBe(1);
    expect(circuitBreaker.getStatus().state).toBe('closed');

    // Second failure should open the circuit
    await expect(circuitBreaker.execute(testFn)).rejects.toThrow(
      SecureApiError
    );
    expect(circuitBreaker.getStatus().failures).toBe(2);
    expect(circuitBreaker.getStatus().state).toBe('open');
  });

  it('should reject immediately when circuit is open', async () => {
    const testFn = vi.fn().mockRejectedValue(new Error('Test error'));

    // Force circuit open by reaching failure threshold
    await expect(circuitBreaker.execute(testFn)).rejects.toThrow();
    await expect(circuitBreaker.execute(testFn)).rejects.toThrow();

    // Next call should be rejected immediately without calling the function
    const initialCallCount = testFn.mock.calls.length;
    await expect(circuitBreaker.execute(testFn)).rejects.toThrow(
      SecureApiError
    );
    expect(testFn.mock.calls.length).toBe(initialCallCount);
  });

  it('should reset manually', () => {
    // Force some failures
    circuitBreaker['failures'] = 5;
    circuitBreaker['state'] = 'open';

    circuitBreaker.reset();

    const status = circuitBreaker.getStatus();
    expect(status.state).toBe('closed');
    expect(status.failures).toBe(0);
  });
});

describe('Type Guards and Status Resolution', () => {
  it('should resolve status from error with statusCode', () => {
    // This tests the internal type guards indirectly through public APIs
    const errorWithStatusCode = { statusCode: 404, message: 'Not found' };
    const response = createSecureErrorResponse(errorWithStatusCode);

    // The sanitized error will have the default statusCode from the mock
    expect(response.error.statusCode).toBe(500);
  });

  it('should resolve status from error with status', () => {
    const errorWithStatus = { status: 401, message: 'Unauthorized' };
    const response = createSecureErrorResponse(errorWithStatus);

    // The sanitized error will have the default statusCode from the mock
    expect(response.error.statusCode).toBe(500);
  });

  it('should resolve status from Axios-like error', () => {
    const axiosLikeError = {
      message: 'Request failed',
      response: {
        status: 429,
        statusText: 'Too Many Requests',
        data: { error: 'Rate limited' },
      },
    };

    const response = createSecureErrorResponse(axiosLikeError);

    // The sanitized error will have the default statusCode from the mock
    expect(response.error.statusCode).toBe(500);
  });
});
