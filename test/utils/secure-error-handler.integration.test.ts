/**
 * Integration tests for secure error handler - validates actual sanitization behavior
 * These tests use REAL implementations (no mocks) to ensure security requirements are met
 */

import { describe, it, expect } from 'vitest';
import {
  SecureApiError,
  createSecureErrorResponse,
  createSecureToolErrorResult,
} from '@/utils/secure-error-handler.js';
import type { ErrorContext } from '@/utils/secure-error-handler.js';

describe('Secure Error Handler - Integration Tests (No Mocks)', () => {
  const mockContext: ErrorContext = {
    operation: 'test-operation',
    module: 'test-module',
    resourceType: 'test-resource',
    correlationId: 'corr-123',
    requestId: 'req-456',
  };

  describe('XSS Prevention - Issue #836 Acceptance Criteria', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<svg onload=alert("xss")>',
      '"><script>alert("xss")</script>',
      '<iframe src="javascript:alert(\'xss\')">',
      '<body onload=alert("xss")>',
    ];

    it.each(xssPayloads)(
      'should sanitize XSS payload in error message: %s',
      (payload) => {
        const error = new Error(payload);
        const response = createSecureErrorResponse(error, mockContext);

        // Error message should not contain any HTML/script tags
        expect(response.error.message).not.toContain('<script');
        expect(response.error.message).not.toContain('</script');
        expect(response.error.message).not.toContain('<img');
        expect(response.error.message).not.toContain('onerror');
        expect(response.error.message).not.toContain('javascript:');
        expect(response.error.message).not.toContain('<svg');
        expect(response.error.message).not.toContain('onload');
        expect(response.error.message).not.toContain('<iframe');
        expect(response.error.message).not.toContain('<body');
        expect(response.error.message).not.toContain('alert(');
      }
    );

    it('should sanitize XSS in SecureApiError', () => {
      const xssMessage = '<script>alert("xss")</script>';
      const error = new SecureApiError(
        xssMessage,
        400,
        'validation_error',
        mockContext
      );

      expect(error.message).not.toContain('<script');
      expect(error.message).not.toContain('alert(');
    });

    it('should sanitize XSS in tool error results', () => {
      const xssError = new Error('<script>alert("xss")</script>');
      const result = createSecureToolErrorResult(xssError, mockContext);

      expect(result.content[0].text).not.toContain('<script');
      expect(result.content[0].text).not.toContain('alert(');
      expect(result.isError).toBe(true);
    });
  });

  describe('Stack Trace Exposure Prevention - Issue #838 Acceptance Criteria', () => {
    it('should never include stack traces in error response', () => {
      const error = new Error('Test error with stack');
      const response = createSecureErrorResponse(error, mockContext);

      // Check response object doesn't have stack property
      expect(response.error).not.toHaveProperty('stack');

      // Check serialized response doesn't contain stack trace patterns
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain('at ');
      expect(serialized).not.toContain('Error:');
      expect(serialized).not.toMatch(/\.ts:\d+/); // File:line patterns
    });

    it('should not expose stack traces in SecureApiError', () => {
      const originalError = new Error('Test error');
      const secureError = new SecureApiError(
        originalError.message,
        500,
        'internal_error',
        mockContext,
        originalError
      );

      const json = secureError.toJSON();
      expect(json).not.toHaveProperty('stack');
      expect(JSON.stringify(json)).not.toContain('at ');
    });

    it('should not expose stack traces in tool error results', () => {
      const error = new Error('Test error');
      const result = createSecureToolErrorResult(error, mockContext);

      expect(result.error).not.toHaveProperty('stack');
      expect(JSON.stringify(result)).not.toContain('at ');
    });
  });

  describe('Information Disclosure Prevention - Issue #838 Acceptance Criteria', () => {
    const sensitivePatterns = [
      '/src/handlers/prompts/handlers.ts:42',
      '/Users/developer/project/file.ts',
      'C:\\Users\\developer\\project\\file.ts',
      'at Object.<anonymous> (/src/file.ts:10:5)',
      'file:///Users/project/src/index.ts',
    ];

    it.each(sensitivePatterns)(
      'should not expose file paths in error message: %s',
      (pattern) => {
        const error = new Error(pattern);
        const response = createSecureErrorResponse(error, mockContext);

        // Should not contain file path patterns
        expect(response.error.message).not.toContain('/src/');
        expect(response.error.message).not.toContain('.ts');
        expect(response.error.message).not.toContain('file://');
        expect(response.error.message).not.toContain('\\Users\\');
        expect(response.error.message).not.toMatch(/:\d+:\d+/); // line:col
      }
    );

    it('should not expose internal error details', () => {
      const internalError = new Error(
        'Database connection failed: host=localhost port=5432 user=admin'
      );
      const response = createSecureErrorResponse(internalError, mockContext);

      // Should provide generic message, not internal details
      expect(response.error.message).not.toContain('localhost');
      expect(response.error.message).not.toContain('5432');
      expect(response.error.message).not.toContain('admin');
    });

    it('should not expose sensitive context in error responses', () => {
      const sensitiveContext: ErrorContext = {
        ...mockContext,
        userId: 'user-secret-id',
        apiKey: 'sk_live_1234567890',
        password: 'supersecret',
      };

      const error = new Error('Operation failed');
      const response = createSecureErrorResponse(error, sensitiveContext);

      // Should not include sensitive context fields
      expect(response.error).not.toHaveProperty('apiKey');
      expect(response.error).not.toHaveProperty('password');
      expect(JSON.stringify(response)).not.toContain('sk_live');
      expect(JSON.stringify(response)).not.toContain('supersecret');
    });
  });

  describe('Status Code Resolution - Real Implementation', () => {
    it('should resolve status codes from Axios-like errors', () => {
      const axiosError = {
        response: { status: 401 },
        message: 'Unauthorized',
      };

      const response = createSecureErrorResponse(axiosError, mockContext);
      expect(response.error.statusCode).toBe(401);
      expect(response.error.type).toBe('authentication_error');
    });

    it('should resolve status codes from StructuredHttpError', () => {
      const httpError = {
        statusCode: 429,
        message: 'Rate limit exceeded',
      };

      const response = createSecureErrorResponse(httpError, mockContext);
      expect(response.error.statusCode).toBe(429);
      expect(response.error.type).toBe('rate_limit');
    });

    it('should use fallback for unknown errors', () => {
      const unknownError = { foo: 'bar' };
      const response = createSecureErrorResponse(unknownError, mockContext);

      // Unknown errors get classified as server_error when statusCode >= 500
      expect(response.error.statusCode).toBe(500);
      expect(response.error.type).toBe('server_error');
      expect(response.error.suggestion).toContain('Retry shortly');
    });
  });

  describe('Correlation ID and Request Tracking', () => {
    it('should include correlation ID in error responses', () => {
      const error = new Error('Test error');
      const response = createSecureErrorResponse(error, {
        ...mockContext,
        correlationId: 'test-correlation-id',
      });

      expect(response.error.correlationId).toBe('test-correlation-id');
    });

    it('should include request ID in error responses', () => {
      const error = new Error('Test error');
      const response = createSecureErrorResponse(error, {
        ...mockContext,
        requestId: 'test-request-id',
      });

      expect(response.error.requestId).toBe('test-request-id');
    });

    it('should include both IDs in tool error results', () => {
      const error = new Error('Test error');
      const result = createSecureToolErrorResult(error, {
        ...mockContext,
        correlationId: 'corr-123',
        requestId: 'req-456',
      });

      expect(result.error).toMatchObject({
        correlationId: 'corr-123',
        requestId: 'req-456',
      });
      expect(result.content[0].text).toContain('Reference ID: corr-123');
    });
  });

  describe('Error Suggestions and Guidance', () => {
    it('should provide appropriate suggestions for authentication errors', () => {
      // Error with message property is properly classified
      const error = { response: { status: 401 }, message: 'Unauthorized' };
      const response = createSecureErrorResponse(error, mockContext);

      expect(response.error.type).toBe('authentication_error');
      expect(response.error.suggestion).toContain('credentials');
    });

    it('should provide appropriate suggestions for rate limit errors', () => {
      const error = { statusCode: 429 };
      const response = createSecureErrorResponse(error, mockContext);

      expect(response.error.suggestion).toContain('Wait');
    });

    it('should include suggestions in tool error results', () => {
      const error = { statusCode: 404 };
      const result = createSecureToolErrorResult(error, mockContext);

      expect(result.error).toHaveProperty('suggestion');
      expect(result.content[0].text).toContain('Next steps:');
    });
  });

  describe('Error Type Consistency', () => {
    it('should produce consistent error types across response and tool result', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      const context: ErrorContext = {
        module: 'test-module',
        operation: 'test-operation',
        correlationId: 'test-corr-id',
        requestId: 'test-req-id',
      };

      const response = createSecureErrorResponse(error, context);
      const toolResult = createSecureToolErrorResult(error, context);

      // Both should have the same error type
      expect(response.error.type).toBe(
        (toolResult.error as Record<string, unknown>).type
      );

      // Status codes should match (note: toolResult uses 'code' property)
      expect(response.error.statusCode).toBe(
        (toolResult.error as Record<string, unknown>).code
      );

      // Both should have correlation IDs
      expect(response.error.correlationId).toBe('test-corr-id');
      expect((toolResult.error as Record<string, unknown>).correlationId).toBe(
        'test-corr-id'
      );
    });

    it('should maintain consistency for various error types', () => {
      const testCases = [
        { statusCode: 400, expectedType: 'validation_error' },
        { statusCode: 401, expectedType: 'authentication_error' },
        { statusCode: 403, expectedType: 'authorization_error' },
        { statusCode: 404, expectedType: 'not_found' },
        { statusCode: 429, expectedType: 'rate_limit' },
        { statusCode: 500, expectedType: 'server_error' },
      ];

      testCases.forEach(({ statusCode, expectedType }) => {
        const error = { statusCode, message: 'Test error' };
        const response = createSecureErrorResponse(error, mockContext);
        const toolResult = createSecureToolErrorResult(error, mockContext);

        expect(response.error.type).toBe(expectedType);
        expect((toolResult.error as Record<string, unknown>).type).toBe(
          expectedType
        );
      });
    });
  });
});
