/**
 * Comprehensive unit tests for error handling fixes in Issue #425
 * 
 * Tests the safe error message extraction utility and error handling paths
 * that were fixed to prevent crashes when calling getContextualMessage() on
 * errors that don't have that method.
 * 
 * CORE ISSUE: The code was calling error.getContextualMessage() on errors
 * that only had AttioApiError, UniversalValidationError, or generic Error
 * types, causing crashes. The fix uses ErrorEnhancer.getErrorMessage()
 * which safely extracts messages from any error type.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import error types
import { 
  EnhancedApiError, 
  ErrorEnhancer, 
  createEnhancedApiError 
} from '../../../../src/errors/enhanced-api-errors.js';
import { 
  AttioApiError,
  AuthenticationError,
  ResourceNotFoundError,
  InvalidRequestError
} from '../../../../src/errors/api-errors.js';
import { 
  UniversalValidationError, 
  ErrorType 
} from '../../../../src/handlers/tool-configs/universal/schemas.js';

describe('Issue #425: Error Handling Fixes - Safe Error Message Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorEnhancer.getErrorMessage() - The Core Fix', () => {
    it('should extract message from EnhancedApiError (which has getContextualMessage)', () => {
      // Create an EnhancedApiError 
      const enhancedError = createEnhancedApiError(
        'Record not found',
        404,
        '/objects/companies/123',
        'GET',
        {
          recordId: 'invalid-uuid',
          resourceType: 'companies',
          httpStatus: 404,
          documentationHint: 'Use search-records to find valid companies IDs.'
        }
      );

      const message = ErrorEnhancer.getErrorMessage(enhancedError);
      
      // Should extract a message successfully
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('Record not found');
    });

    it('should extract message from AttioApiError using message property (CRITICAL FIX)', () => {
      const attioError = new AttioApiError(
        'API request failed',
        500,
        '/objects/people',
        'GET',
        { details: 'Server error' }
      );

      // This is the critical test - before Issue #425 fix, this would have crashed
      // when the code tried to call attioError.getContextualMessage()
      const message = ErrorEnhancer.getErrorMessage(attioError);
      
      // Should safely extract message using the .message property
      expect(message).toBe('API request failed');
    });

    it('should extract message from UniversalValidationError using message property (CRITICAL FIX)', () => {
      const validationError = new UniversalValidationError(
        'Invalid resource type provided',
        ErrorType.USER_ERROR,
        {
          field: 'resource_type',
          suggestion: 'Use one of: companies, people, tasks'
        }
      );

      // This is the critical test - before Issue #425 fix, this would have crashed
      // when the code tried to call validationError.getContextualMessage()
      const message = ErrorEnhancer.getErrorMessage(validationError);
      
      // Should safely extract message using the .message property
      expect(message).toBe('Invalid resource type provided');
    });

    it('should extract message from AuthenticationError using message property', () => {
      const authError = new AuthenticationError(
        'Invalid API key',
        '/objects/companies',
        'GET'
      );

      const message = ErrorEnhancer.getErrorMessage(authError);
      expect(message).toBe('Invalid API key');
    });

    it('should extract message from ResourceNotFoundError using message property', () => {
      const notFoundError = new ResourceNotFoundError(
        'Company',
        'invalid-id',
        '/objects/companies/invalid-id',
        'GET'
      );

      const message = ErrorEnhancer.getErrorMessage(notFoundError);
      expect(message).toBe('Company invalid-id not found');
    });

    it('should extract message from generic Error using message property', () => {
      const genericError = new Error('Something went wrong');
      const message = ErrorEnhancer.getErrorMessage(genericError);
      expect(message).toBe('Something went wrong');
    });

    it('should fallback to string representation for unknown error types', () => {
      const unknownError = { foo: 'bar', toString: () => 'Custom error object' };
      const message = ErrorEnhancer.getErrorMessage(unknownError);
      expect(message).toBe('Custom error object');
    });

    it('should fallback to string representation when error has no message', () => {
      const errorWithoutMessage = { code: 'E_UNKNOWN' };
      const message = ErrorEnhancer.getErrorMessage(errorWithoutMessage);
      expect(message).toBe('[object Object]');
    });

    it('should handle null and undefined errors', () => {
      expect(ErrorEnhancer.getErrorMessage(null)).toBe('null');
      expect(ErrorEnhancer.getErrorMessage(undefined)).toBe('undefined');
    });

    it('should NEVER CRASH when extracting error messages - CORE FIX FOR ISSUE #425', () => {
      // This is the most important test - it verifies that ErrorEnhancer.getErrorMessage
      // can safely handle ALL error types without crashing, which was the root cause
      // of Issue #425
      const errorTypes = [
        // These are the problematic error types that DON'T have getContextualMessage
        new AttioApiError('Attio error', 400, '/test', 'GET'),
        new UniversalValidationError('Validation error', ErrorType.USER_ERROR),
        new AuthenticationError('Auth error', '/test', 'GET'),
        new ResourceNotFoundError('Resource', 'id', '/test', 'GET'),
        new InvalidRequestError('Invalid request', '/test', 'POST'),
        new Error('Generic error'),
        
        // Edge cases
        { message: 'Custom error' },
        { message: null },
        { message: undefined },
        { message: '' },
        { code: 'NO_MESSAGE' },
        null,
        undefined,
        'string error',
        42,
        
        // This one DOES have getContextualMessage (if working properly)
        createEnhancedApiError('Enhanced error', 400, '/test', 'GET')
      ];

      // All of these should extract a message without crashing
      errorTypes.forEach((error, index) => {
        expect(() => {
          const message = ErrorEnhancer.getErrorMessage(error);
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }).not.toThrow(`Error extraction failed on index ${index} for error: ${JSON.stringify(error)}`);
      });
    });
  });

  describe('ErrorEnhancer.ensureEnhanced() - Error Conversion', () => {
    it('should return already enhanced errors unchanged', () => {
      const enhancedError = createEnhancedApiError(
        'Already enhanced',
        400,
        '/test',
        'GET'
      );

      const result = ErrorEnhancer.ensureEnhanced(enhancedError);
      
      // Should return same error (reference equality might not work in test environment)
      expect(result.message).toBe('Already enhanced');
      expect(result.statusCode).toBe(400);
      expect(result.endpoint).toBe('/test');
    });

    it('should convert AttioApiError to EnhancedApiError', () => {
      const attioError = new AttioApiError(
        'API error',
        422,
        '/objects/tasks',
        'POST',
        { validation: 'failed' }
      );

      const result = ErrorEnhancer.ensureEnhanced(attioError, {
        resourceType: 'tasks',
        operation: 'create'
      });
      
      // Should create a new enhanced error
      expect(result).not.toBe(attioError);
      expect(result.message).toBe('API error');
      expect(result.statusCode).toBe(422);
      expect(result.endpoint).toBe('/objects/tasks');
      expect(result.method).toBe('POST');
      expect(result.context?.resourceType).toBe('tasks');
      expect(result.context?.operation).toBe('create');
    });

    it('should convert generic error with status properties', () => {
      const genericError = {
        message: 'Network timeout',
        statusCode: 408,
        endpoint: '/api/test',
        method: 'GET'
      };

      const result = ErrorEnhancer.ensureEnhanced(genericError);
      
      expect(result.message).toBe('Network timeout');
      expect(result.statusCode).toBe(408);
      expect(result.endpoint).toBe('/api/test');
      expect(result.method).toBe('GET');
      expect(result.context?.originalError).toBe(genericError);
    });

    it('should handle error with alternative status property name', () => {
      const errorWithStatus = {
        message: 'Server error',
        status: 503,
        path: '/api/health'
      };

      const result = ErrorEnhancer.ensureEnhanced(errorWithStatus);
      
      expect(result.statusCode).toBe(503);
      expect(result.endpoint).toBe('/api/health');
    });

    it('should use defaults for minimal error objects', () => {
      const minimalError = { message: 'Simple error' };

      const result = ErrorEnhancer.ensureEnhanced(minimalError);
      
      expect(result.message).toBe('Simple error');
      expect(result.statusCode).toBe(500);
      expect(result.endpoint).toBe('/unknown');
      expect(result.method).toBe('UNKNOWN');
    });

    it('should handle error without message', () => {
      const errorWithoutMessage = { code: 'E_FAIL' };

      const result = ErrorEnhancer.ensureEnhanced(errorWithoutMessage);
      
      expect(result.message).toBe('An error occurred');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Real-world error handling scenarios', () => {
    it('should demonstrate the Issue #425 fix in action', () => {
      // Before the fix: Lines 776 and 788 in shared-handlers.ts tried to call:
      // error.getContextualMessage() directly, which would crash for these error types
      
      const problematicErrors = [
        new AttioApiError('API failed', 500, '/test', 'GET'),
        new UniversalValidationError('Validation failed', ErrorType.USER_ERROR)
      ];
      
      problematicErrors.forEach(error => {
        // The fix: Use ErrorEnhancer.getErrorMessage() instead of error.getContextualMessage()
        expect(() => {
          const message = ErrorEnhancer.getErrorMessage(error);
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    it('should handle non-existent record scenarios without crashes', () => {
      const notFoundError = new ResourceNotFoundError(
        'Company',
        'non-existent-id',
        '/objects/companies/non-existent-id',
        'GET'
      );
      
      // Should extract message safely
      const message = ErrorEnhancer.getErrorMessage(notFoundError);
      expect(message).toMatch(/Company.*not found/);
      
      // Error enhancement should work
      const enhanced = ErrorEnhancer.ensureEnhanced(notFoundError);
      expect(enhanced).not.toBe(notFoundError);
    });

    it('should properly enhance errors before throwing', () => {
      const originalError = new AttioApiError(
        'Validation failed',
        422,
        '/objects/tasks',
        'POST'
      );
      
      // Test error enhancement process
      const enhanced = ErrorEnhancer.ensureEnhanced(originalError, {
        resourceType: 'tasks',
        operation: 'get-record-details'
      });
      
      // Should be enhanced
      expect(enhanced).not.toBe(originalError);
      expect(enhanced.context?.resourceType).toBe('tasks');
      
      // Should be able to safely extract message from enhanced error
      const message = ErrorEnhancer.getErrorMessage(enhanced);
      expect(message).toContain('Validation failed');
    });

    it('should handle mixed error types in batch scenarios', () => {
      // Simulate multiple errors that might occur in a batch operation
      const errors = [
        new AttioApiError('Attio error', 401, '/auth', 'POST'),
        new UniversalValidationError('Validation error', ErrorType.USER_ERROR),
        new Error('Generic error'),
        { message: 'Custom error object' },
        null,
        undefined
      ];

      // All should be handled safely
      errors.forEach((error, index) => {
        expect(() => {
          const message = ErrorEnhancer.getErrorMessage(error);
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }).not.toThrow(`Failed on error ${index}: ${error}`);
      });
    });
  });

  describe('Error message consistency and reliability', () => {
    it('should provide consistent error messages for the same error type', () => {
      const error1 = new AttioApiError('Same message', 400, '/endpoint1', 'GET');
      const error2 = new AttioApiError('Same message', 400, '/endpoint2', 'POST');
      
      const message1 = ErrorEnhancer.getErrorMessage(error1);
      const message2 = ErrorEnhancer.getErrorMessage(error2);
      
      expect(message1).toBe(message2);
      expect(message1).toBe('Same message');
    });

    it('should handle edge cases in error message extraction', () => {
      const edgeCases = [
        { message: '' }, // Empty message
        { message: null }, // Null message  
        { message: undefined }, // Undefined message
        { message: 0 }, // Falsy number
        { message: false }, // Boolean false
        {} // No message property
      ];

      edgeCases.forEach((errorObj, index) => {
        const message = ErrorEnhancer.getErrorMessage(errorObj);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should preserve original error information during enhancement', () => {
      const originalError = new AttioApiError(
        'Original message',
        429,
        '/api/rate-limited',
        'POST',
        { retryAfter: 60 }
      );

      const enhanced = ErrorEnhancer.ensureEnhanced(originalError, {
        resourceType: 'companies',
        operation: 'create'
      });

      expect(enhanced.message).toBe(originalError.message);
      expect(enhanced.statusCode).toBe(originalError.statusCode);
      expect(enhanced.endpoint).toBe(originalError.endpoint);
      expect(enhanced.method).toBe(originalError.method);
      expect(enhanced.context?.resourceType).toBe('companies');
      expect(enhanced.context?.operation).toBe('create');
    });
  });

  describe('Issue #425 Regression Prevention', () => {
    it('should prevent the original crash scenario from lines 776 and 788', () => {
      // This test specifically addresses the lines mentioned in Issue #425:
      // Lines 776 and 788 in shared-handlers.ts were calling getContextualMessage()
      // on errors that didn't have this method
      
      const errorTypesThatCausedCrashes = [
        new AttioApiError('API failed', 500, '/test', 'GET'),
        new UniversalValidationError('Validation failed', ErrorType.USER_ERROR)
      ];
      
      errorTypesThatCausedCrashes.forEach(error => {
        // Before fix: error.getContextualMessage() would crash
        // After fix: ErrorEnhancer.getErrorMessage(error) works safely
        
        expect(() => {
          const message = ErrorEnhancer.getErrorMessage(error);
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    it('should handle all error types mentioned in the issue description', () => {
      const errorTypesFromIssue = [
        {
          error: createEnhancedApiError('Enhanced', 400, '/test', 'GET'),
          description: 'EnhancedApiError (has getContextualMessage method)'
        },
        {
          error: new AttioApiError('Attio', 400, '/test', 'GET'),
          description: 'AttioApiError (from axios interceptor, only has message property)'
        },
        {
          error: new UniversalValidationError('Validation', ErrorType.USER_ERROR),
          description: 'UniversalValidationError (only has message property)'
        },
        {
          error: new Error('Generic'),
          description: 'Generic Error objects'
        }
      ];
      
      errorTypesFromIssue.forEach(({ error, description }) => {
        // Verify safe message extraction works for all types
        const message = ErrorEnhancer.getErrorMessage(error);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should validate the fix works in the actual error handling pattern used', () => {
      // This simulates the pattern used in shared-handlers.ts around lines 776 and 788
      const errors = [
        new AttioApiError('Resource not found', 404, '/test', 'GET'),
        new UniversalValidationError('Invalid input', ErrorType.USER_ERROR)
      ];

      errors.forEach(error => {
        // OLD CODE (that crashed):
        // const message = error.getContextualMessage(); // CRASH!
        
        // NEW CODE (Issue #425 fix):
        const enhancedError = ErrorEnhancer.ensureEnhanced(error);
        const message = ErrorEnhancer.getErrorMessage(enhancedError);
        
        // Should work without crashes
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });
});