/**
 * Test suite for ErrorService
 *
 * Tests error handling and suggestion functionality extracted from shared-handlers.ts
 * as part of Issue #489 Phase 3.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EnhancedApiError } from '../../../src/errors/enhanced-api-errors.js';
import { ErrorService } from '../../../src/services/ErrorService.js';

// Mock the dependencies
vi.mock('../../../src/handlers/tool-configs/universal/field-mapper.js', () => ({
  validateResourceType: vi.fn(),
  getFieldSuggestions: vi.fn(),
}));

import {
  validateResourceType,
  getFieldSuggestions,
} from '../../../src/handlers/tool-configs/universal/field-mapper.js';

describe('ErrorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUniversalError', () => {
    beforeEach(() => {
      // Set up default mock return for validateResourceType
      vi.mocked(validateResourceType).mockReturnValue({
        valid: true,
        suggestion: undefined,
      });
    });

    it('should pass through UniversalValidationError unchanged', () => {
        'Test error',
        ErrorType.USER_ERROR
      );

        'create',
        'companies',
        originalError
      );

      expect(result).toBe(originalError);
    });

    it('should pass through EnhancedApiError unchanged', () => {
        'Test error',
        400,
        '/api/test',
        'GET'
      );

        'update',
        'people',
        originalError
      );

      expect(result).toBe(originalError);
    });

    it('should extract message from Error objects', () => {

        'search',
        'tasks',
        originalError
      );

      expect(result).toBeInstanceOf(UniversalValidationError);
      expect(result.message).toContain('Test error message');
      expect(result.message).toContain(
        'Universal search failed for resource type tasks'
      );
    });

    it('should extract message from objects with message property', () => {

        'delete',
        'deals',
        originalError
      );

      expect(result).toBeInstanceOf(UniversalValidationError);
      expect(result.message).toContain('Object error message');
    });

    it('should handle string errors', () => {

        'create',
        'companies',
        originalError
      );

      expect(result).toBeInstanceOf(UniversalValidationError);
      expect(result.message).toContain('String error message');
    });

    it('should handle unknown error types', () => {

        'update',
        'people',
        originalError
      );

      expect(result).toBeInstanceOf(UniversalValidationError);
      expect(result.message).toContain('Unknown error');
    });

    it('should classify USER_ERROR for not found messages', () => {

        'get',
        'companies',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.USER_ERROR);
    });

    it('should classify USER_ERROR for invalid messages', () => {

        'create',
        'people',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.USER_ERROR);
    });

    it('should classify USER_ERROR for required messages', () => {

        'update',
        'tasks',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.USER_ERROR);
    });

    it('should classify USER_ERROR for 400 status codes', () => {

        'create',
        'deals',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.USER_ERROR);
    });

    it('should classify API_ERROR for 500+ status codes', () => {

        'search',
        'companies',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.API_ERROR);
    });

    it('should classify API_ERROR for network errors', () => {

        'get',
        'people',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.API_ERROR);
    });

    it('should default to SYSTEM_ERROR for unclassified errors', () => {

        'create',
        'tasks',
        originalError
      ) as UniversalValidationError;

      expect(result.errorType).toBe(ErrorType.SYSTEM_ERROR);
    });

    it('should include operation suggestion in error details', () => {
      vi.mocked(validateResourceType).mockReturnValue({
        valid: true,
        suggestion: undefined,
      });

      // Use a specific error that will generate a suggestion

        'create',
        'companies',
        originalError
      ) as UniversalValidationError;

      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain('wait a moment');
    });

    it('should include original error as cause', () => {

        'update',
        'people',
        originalError
      ) as UniversalValidationError;

      expect(result.cause).toBe(originalError);
    });
  });

  describe('getOperationSuggestion', () => {
    beforeEach(() => {
      vi.mocked(validateResourceType).mockReturnValue({
        valid: true,
        suggestion: undefined,
      });
    });

    it('should return resource type suggestion for invalid resource', () => {
      vi.mocked(validateResourceType).mockReturnValue({
        valid: false,
        suggestion: 'Use "companies" instead of "company"',
      });

        'create',
        'company',
        new Error('Invalid resource')
      );

      expect(result).toBe('Use "companies" instead of "company"');
    });

    it('should provide date format suggestions for date parsing errors', () => {

        'search',
        'companies',
        error
      );

      expect(result).toContain('relative dates like "last 7 days"');
      expect(result).toContain('ISO format (YYYY-MM-DD)');
    });

    it('should provide date range suggestions', () => {

        'search',
        'people',
        error
      );

      expect(result).toContain('Date ranges support formats like');
      expect(result).toContain('last 30 days');
    });

    it('should suggest simpler filters for unsupported filter combinations', () => {

        'search',
        'tasks',
        error
      );

      expect(result).toContain('simpler filter');
      expect(result).toContain('fetching all records');
    });

    it('should suggest batch size limits', () => {

        'create',
        'companies',
        error
      );

      expect(result).toContain('100 items at a time');
      expect(result).toContain('smaller batches');
    });

    it('should suggest rate limit handling', () => {

        'search',
        'people',
        error
      );

      expect(result).toContain('wait a moment');
      expect(result).toContain('reduce the frequency');
    });

    it('should provide deal-specific suggestions for company_id error', () => {
        'Cannot find attribute with slug/id "company_id"'
      );

        'create',
        'deals',
        error
      );

      expect(result).toContain('associated_company');
      expect(result).toContain('instead of "company_id"');
    });

    it('should provide deal-specific suggestions for deal_stage error', () => {

        'update',
        'deals',
        error
      );

      expect(result).toContain('Use "stage" instead of "deal_stage"');
    });

    it('should provide deal-specific suggestions for deal_value error', () => {

        'create',
        'deals',
        error
      );

      expect(result).toContain('Use "value" instead of "deal_value"');
    });

    it('should provide deal-specific suggestions for invalid value format', () => {
        'Invalid value was passed to attribute with slug "value"'
      );

        'create',
        'deals',
        error
      );

      expect(result).toContain('simple number');
      expect(result).toContain('9780');
    });

    it('should suggest field discovery for unknown attributes', () => {
        'Cannot find attribute with slug/id "unknown_field"'
      );
      vi.mocked(getFieldSuggestions).mockReturnValue(
        'Try using "name" or "email"'
      );

        'create',
        'companies',
        error
      );

      expect(result).toBe('Try using "name" or "email"');
      expect(getFieldSuggestions).toHaveBeenCalledWith(
        'companies',
        'unknown_field'
      );
    });

    it('should provide generic not found suggestions', () => {

        'get',
        'people',
        error
      );

      expect(result).toContain('Verify that the people record exists');
      expect(result).toContain('you have access to it');
    });

    it('should provide authentication suggestions for unauthorized errors', () => {

        'create',
        'tasks',
        error
      );

      expect(result).toContain('API permissions');
      expect(result).toContain('authentication credentials');
    });

    it('should provide duplicate record suggestions for create operations', () => {

        'create',
        'companies',
        error
      );

      expect(result).toContain('may already exist');
      expect(result).toContain('Try searching first');
    });

    it('should provide uniqueness constraint suggestions', () => {

        'create',
        'people',
        error
      );

      expect(result).toContain('unique values already exists');
      expect(result).toContain('use different values');
    });

    it('should handle string errors', () => {

        'search',
        'companies',
        error
      );

      expect(result).toContain('wait a moment');
    });

    it('should handle object errors with message property', () => {

        'search',
        'people',
        error
      );

      expect(result).toContain('relative dates');
    });

    it('should return undefined for unknown error patterns', () => {

        'create',
        'companies',
        error
      );

      expect(result).toBeUndefined();
    });

    it('should provide deal-specific suggestions for various field errors', () => {
        {
          error: 'description field not found',
          expected: 'do not have a "description" field',
        },
        {
          error: 'expected_close_date invalid',
          expected: 'do not have a built-in close date field',
        },
        {
          error: 'probability not supported',
          expected: 'do not have a built-in probability field',
        },
        {
          error: 'source field missing',
          expected: 'do not have a built-in source field',
        },
        {
          error: 'currency format invalid',
          expected: 'Currency is set automatically',
        },
        {
          error: 'contact association failed',
          expected: 'Use "associated_people"',
        },
        {
          error: 'notes field not found',
          expected: 'created separately using the notes API',
        },
        {
          error: 'tags not supported',
          expected: 'do not have a built-in tags field',
        },
        { error: 'deal_type unknown', expected: 'Deal types are not built-in' },
      ];

      testCases.forEach(({ error, expected }) => {
          'create',
          'deals',
          new Error(error)
        );
        expect(result).toContain(expected);
      });
    });

    it('should provide field suggestions for deal attribute errors', () => {

        'create',
        'deals',
        error
      );

      expect(result).toContain('Core fields: name, stage, value');
      expect(result).toContain('discover-attributes tool');
    });

    it('should provide generic field suggestions for non-deal resources', () => {
      // Clear the mock return to get the fallback suggestion
      vi.mocked(getFieldSuggestions).mockReturnValue(
        'Unable to provide suggestions for resource type companies'
      );

        'create',
        'companies',
        error
      );

      expect(result).toContain('discover-attributes tool');
      expect(result).toContain('available fields for companies');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined errors gracefully', () => {
      expect(() => {
        ErrorService.createUniversalError('create', 'companies', null);
        ErrorService.createUniversalError('create', 'companies', undefined);
      }).not.toThrow();
    });

    it('should handle empty error messages', () => {
        'create',
        'companies',
        new Error('')
      );

      // Should not crash and should return undefined for empty error
      expect(result).toBeUndefined();
    });

    it('should handle malformed error objects', () => {

        'create',
        'companies',
        malformedError
      );

      expect(result).toBeInstanceOf(UniversalValidationError);
      expect(result.message).toContain('Unknown error');
    });
  });
});
