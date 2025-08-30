/**
 * Test suite for ValidationService
 *
 * Tests all validation functionality extracted from shared-handlers.ts
 * as part of Issue #489 Phase 2.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationService } from '../../../src/services/ValidationService.js';
import { UniversalResourceType } from '../../../src/handlers/tool-configs/universal/types.js';
import { UniversalValidationError } from '../../../src/handlers/tool-configs/universal/schemas.js';
import { EnhancedApiError } from '../../../src/errors/enhanced-api-errors.js';

// Mock the dependencies
vi.mock('../../../src/utils/validation/email-validation.js', () => ({
  isValidEmail: vi.fn(),
}));

vi.mock('../../../src/utils/validation.js', () => ({
  isValidId: vi.fn(),
}));

vi.mock('../../../src/utils/validation/uuid-validation.js', () => ({
  isValidUUID: vi.fn(),
  createInvalidUUIDError: vi.fn(),
}));

vi.mock('../../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    markTiming: vi.fn(),
    endOperation: vi.fn(),
  },
}));

vi.mock('../../../src/handlers/tool-configs/universal/field-mapper.js', () => {
  // Define the mock constants here to avoid circular dependency
  const mockFieldMappings = {
    companies: {
      validFields: ['name', 'domain', 'industry'],
    },
    people: {
      validFields: ['first_name', 'last_name', 'email_addresses'],
    },
  };

  return {
    validateFields: vi.fn(),
    FIELD_MAPPINGS: mockFieldMappings,
  };
});

import { isValidEmail } from '../../../src/utils/validation/email-validation.js';
import { isValidId } from '../../../src/utils/validation.js';
import {
  isValidUUID,
  createInvalidUUIDError,
} from '../../../src/utils/validation/uuid-validation.js';
import { enhancedPerformanceTracker } from '../../../src/middleware/performance-enhanced.js';
import { validateFields } from '../../../src/handlers/tool-configs/universal/field-mapper.js';

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createValidationError', () => {
    it('should create validation error with default resource type', () => {
      const message = 'Test validation error';
      const error = ValidationService.createValidationError(message);

      expect(error).toEqual({
        error: true,
        message,
        details: 'resource validation failed',
        timestamp: expect.any(String),
      });
    });

    it('should create validation error with custom resource type', () => {
      const message = 'Custom validation error';
      const resourceType = 'companies';
      const error = ValidationService.createValidationError(
        message,
        resourceType
      );

      expect(error).toEqual({
        error: true,
        message,
        details: 'companies validation failed',
        timestamp: expect.any(String),
      });
    });

    it('should include valid ISO timestamp', () => {
      const error = ValidationService.createValidationError('test');
      expect(new Date(error.timestamp).toISOString()).toBe(error.timestamp);
    });
  });

  describe('validateLimitParameter', () => {
    it('should pass for valid limit values', () => {
      expect(() => {
        ValidationService.validateLimitParameter(1);
        ValidationService.validateLimitParameter(50);
        ValidationService.validateLimitParameter(100);
      }).not.toThrow();
    });

    it('should pass for undefined limit', () => {
      expect(() => {
        ValidationService.validateLimitParameter(undefined);
      }).not.toThrow();
    });

    it('should throw for non-integer limit', () => {
      expect(() => {
        ValidationService.validateLimitParameter(1.5);
      }).toThrow('limit must be a positive integer greater than 0');
    });

    it('should throw for zero or negative limit', () => {
      expect(() => {
        ValidationService.validateLimitParameter(0);
      }).toThrow('limit must be a positive integer greater than 0');

      expect(() => {
        ValidationService.validateLimitParameter(-5);
      }).toThrow('limit must be a positive integer greater than 0');
    });

    it('should throw for limit exceeding maximum', () => {
      expect(() => {
        ValidationService.validateLimitParameter(101);
      }).toThrow('limit must not exceed 100');
    });

    it('should respect custom maximum limit', () => {
      expect(() => {
        ValidationService.validateLimitParameter(150, undefined, 200);
      }).not.toThrow();

      expect(() => {
        ValidationService.validateLimitParameter(250, undefined, 200);
      }).toThrow('limit must not exceed 200');
    });

    it('should call performance tracker on error when perfId provided', () => {
      const perfId = 'test-perf-id';

      expect(() => {
        ValidationService.validateLimitParameter(0, perfId);
      }).toThrow();

      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalledWith(
        perfId,
        false,
        'Invalid limit parameter',
        400
      );
    });
  });

  describe('validateOffsetParameter', () => {
    it('should pass for valid offset values', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(0);
        ValidationService.validateOffsetParameter(50);
        ValidationService.validateOffsetParameter(10000);
      }).not.toThrow();
    });

    it('should pass for undefined offset', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(undefined);
      }).not.toThrow();
    });

    it('should throw for non-integer offset', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(2.5);
      }).toThrow('offset must be a non-negative integer');
    });

    it('should throw for negative offset', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(-1);
      }).toThrow('offset must be a non-negative integer');
    });

    it('should throw for offset exceeding maximum', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(10001);
      }).toThrow('offset must not exceed 10000');
    });

    it('should respect custom maximum offset', () => {
      expect(() => {
        ValidationService.validateOffsetParameter(5000, undefined, 6000);
      }).not.toThrow();

      expect(() => {
        ValidationService.validateOffsetParameter(7000, undefined, 6000);
      }).toThrow('offset must not exceed 6000');
    });
  });

  describe('validatePaginationParameters', () => {
    it('should validate both limit and offset together', () => {
      expect(() => {
        ValidationService.validatePaginationParameters({
          limit: 50,
          offset: 100,
        });
      }).not.toThrow();
    });

    it('should throw if either parameter is invalid', () => {
      expect(() => {
        ValidationService.validatePaginationParameters({
          limit: -1,
          offset: 100,
        });
      }).toThrow();

      expect(() => {
        ValidationService.validatePaginationParameters({
          limit: 50,
          offset: -1,
        });
      }).toThrow();
    });

    it('should pass for empty parameters', () => {
      expect(() => {
        ValidationService.validatePaginationParameters({});
      }).not.toThrow();
    });
  });

  describe('validateUUID', () => {
    it('should pass for valid UUIDs in non-task resources', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);

      expect(() => {
        ValidationService.validateUUID(
          'valid-uuid',
          UniversalResourceType.COMPANIES
        );
      }).not.toThrow();

      expect(isValidUUID).toHaveBeenCalledWith('valid-uuid');
    });

    it('should skip validation for tasks resource', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);

      expect(() => {
        ValidationService.validateUUID('task-id', UniversalResourceType.TASKS);
      }).not.toThrow();

      // Should not call UUID validation for tasks
      expect(isValidUUID).not.toHaveBeenCalled();
    });

    it('should throw for invalid UUIDs in non-task resources', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(createInvalidUUIDError).mockImplementation(
        () => new EnhancedApiError('Invalid UUID', 400, '/test', 'TEST')
      );

      expect(() => {
        ValidationService.validateUUID(
          'invalid-uuid',
          UniversalResourceType.PEOPLE,
          'CREATE'
        );
      }).toThrow('Invalid UUID');

      expect(createInvalidUUIDError).toHaveBeenCalledWith(
        'invalid-uuid',
        UniversalResourceType.PEOPLE,
        'CREATE'
      );
    });

    it('should track performance when perfId provided', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);
      const perfId = 'test-perf-id';

      ValidationService.validateUUID(
        'valid-uuid',
        UniversalResourceType.COMPANIES,
        'GET',
        perfId
      );

      expect(enhancedPerformanceTracker.markTiming).toHaveBeenCalledWith(
        perfId,
        'validation',
        expect.any(Number)
      );
    });
  });

  describe('truncateSuggestions', () => {
    it('should return suggestions unchanged when under limit', () => {
      const suggestions = ['suggestion 1', 'suggestion 2'];
      const result = ValidationService.truncateSuggestions(suggestions);

      expect(result).toEqual(suggestions);
    });

    it('should truncate suggestions when over default limit', () => {
      const suggestions = ['s1', 's2', 's3', 's4', 's5'];
      const result = ValidationService.truncateSuggestions(suggestions);

      expect(result).toEqual(['s1', 's2', 's3', '... and 2 more suggestions']);
    });

    it('should respect custom max count', () => {
      const suggestions = ['s1', 's2', 's3', 's4'];
      const result = ValidationService.truncateSuggestions(suggestions, 2);

      expect(result).toEqual(['s1', 's2', '... and 2 more suggestions']);
    });

    it('should handle empty arrays', () => {
      const result = ValidationService.truncateSuggestions([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateEmailAddresses', () => {
    beforeEach(() => {
      vi.mocked(isValidEmail).mockClear();
    });

    it('should pass for valid email addresses', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      expect(() => {
        ValidationService.validateEmailAddresses({
          email: 'test@example.com',
        });
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle different email field formats', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        email_addresses: 'user@domain.com',
        emails: ['user2@domain.com'],
        emailAddress: 'user3@domain.com',
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledTimes(3);
    });

    it('should handle email objects with email_address field', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        email_addresses: [{ email_address: 'user@domain.com' }],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledWith('user@domain.com');
    });

    it('should handle email objects with email field', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        emails: [{ email: 'user@domain.com' }],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledWith('user@domain.com');
    });

    it('should handle email objects with value field (Issue #511)', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        email_addresses: [{ value: 'user@domain.com', type: 'work' }],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledWith('user@domain.com');
    });

    it('should handle mixed email formats including value objects (Issue #511)', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        email_addresses: [
          'simple@example.com',
          { value: 'work@example.com', type: 'work', primary: true },
          { email: 'alternate@example.com' },
          { email_address: 'legacy@example.com' },
        ],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledTimes(4);
      expect(isValidEmail).toHaveBeenCalledWith('simple@example.com');
      expect(isValidEmail).toHaveBeenCalledWith('work@example.com');
      expect(isValidEmail).toHaveBeenCalledWith('alternate@example.com');
      expect(isValidEmail).toHaveBeenCalledWith('legacy@example.com');
    });

    it('should validate rich email metadata objects with value field (Issue #511)', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        email_addresses: [
          {
            value: 'primary@example.com',
            type: 'work',
            primary: true,
            label: 'Work Email',
          },
          {
            value: 'secondary@example.com',
            type: 'personal',
            primary: false,
          },
        ],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      expect(isValidEmail).toHaveBeenCalledTimes(2);
      expect(isValidEmail).toHaveBeenCalledWith('primary@example.com');
      expect(isValidEmail).toHaveBeenCalledWith('secondary@example.com');
    });

    it('should throw for invalid emails in value objects (Issue #511)', () => {
      vi.mocked(isValidEmail).mockReturnValue(false);

      const recordData = {
        email_addresses: [{ value: 'invalid-email', type: 'work' }],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).toThrow(UniversalValidationError);

      expect(isValidEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('should throw UniversalValidationError for invalid emails', () => {
      vi.mocked(isValidEmail).mockReturnValue(false);

      expect(() => {
        ValidationService.validateEmailAddresses({
          email: 'invalid-email',
        });
      }).toThrow(UniversalValidationError);
    });

    it('should provide helpful error message for invalid emails', () => {
      vi.mocked(isValidEmail).mockReturnValue(false);

      try {
        ValidationService.validateEmailAddresses({
          email: 'bad-email',
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UniversalValidationError);
        if (error instanceof UniversalValidationError) {
          expect(error.message).toContain('Invalid email format: "bad-email"');
          expect(error.message).toContain('user@example.com');
        }
      }
    });

    it('should skip invalid email formats gracefully', () => {
      vi.mocked(isValidEmail).mockReturnValue(true);

      const recordData = {
        emails: [
          'valid@email.com',
          { invalidFormat: 'not-an-email' },
          null,
          { email: 'another@email.com' },
        ],
      };

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).not.toThrow();

      // Should only validate the valid email formats
      expect(isValidEmail).toHaveBeenCalledTimes(2);
      expect(isValidEmail).toHaveBeenCalledWith('valid@email.com');
      expect(isValidEmail).toHaveBeenCalledWith('another@email.com');
    });

    it('should handle null or undefined record data', () => {
      expect(() => {
        ValidationService.validateEmailAddresses(
          null as unknown as Record<string, unknown>
        );
        ValidationService.validateEmailAddresses(
          undefined as unknown as Record<string, unknown>
        );
        ValidationService.validateEmailAddresses(
          'not-an-object' as unknown as Record<string, unknown>
        );
      }).not.toThrow();
    });
  });

  describe('validateFieldsWithErrorHandling', () => {
    beforeEach(() => {
      vi.mocked(validateFields).mockClear();
    });

    it('should pass for valid field validation', () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });

      const result = ValidationService.validateFieldsWithErrorHandling(
        UniversalResourceType.COMPANIES,
        { name: 'Test Company' },
        false
      );

      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return error message for invalid validation when not throwing', () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        errors: ['Name is required'],
        warnings: ['Domain should be provided'],
        suggestions: ['Try using a valid company name'],
      });

      const result = ValidationService.validateFieldsWithErrorHandling(
        UniversalResourceType.COMPANIES,
        {},
        false
      );

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain(
        'Field validation failed for companies'
      );
      expect(result.errorMessage).toContain('❌ Name is required');
      expect(result.errorMessage).toContain('💡 Suggestions:');
      expect(result.errorMessage).toContain('Available fields for companies:');
    });

    it('should throw UniversalValidationError for invalid validation when throwing enabled', () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        errors: ['Required field missing'],
        warnings: [],
        suggestions: ['Add required field'],
      });

      expect(() => {
        ValidationService.validateFieldsWithErrorHandling(
          UniversalResourceType.PEOPLE,
          {},
          true
        );
      }).toThrow(UniversalValidationError);
    });

    it('should truncate suggestions in error message', () => {
      const manySuggestions = Array.from(
        { length: 10 },
        (_, i) => `Suggestion ${i + 1}`
      );

      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        errors: ['Error'],
        warnings: [],
        suggestions: manySuggestions,
      });

      const result = ValidationService.validateFieldsWithErrorHandling(
        UniversalResourceType.COMPANIES,
        {},
        false
      );

      expect(result.errorMessage).toContain('... and 7 more suggestions');
    });
  });

  describe('isValidRecordId', () => {
    it('should return true for valid UUIDs', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);

      expect(ValidationService.isValidRecordId('valid-uuid')).toBe(true);
      expect(isValidUUID).toHaveBeenCalledWith('valid-uuid');
    });

    it('should fallback to generic ID validation when UUID fails', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(isValidId).mockReturnValue(true);

      expect(ValidationService.isValidRecordId('generic-id')).toBe(true);
      expect(isValidId).toHaveBeenCalledWith('generic-id');
    });

    it('should return false when both validations fail', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(isValidId).mockReturnValue(false);

      expect(ValidationService.isValidRecordId('invalid-id')).toBe(false);
    });

    it('should skip generic validation when allowGeneric is false', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);

      expect(ValidationService.isValidRecordId('id', false)).toBe(false);
      expect(isValidId).not.toHaveBeenCalled();
    });
  });

  describe('validateUniversalOperation', () => {
    it('should return valid for successful validation', () => {
      vi.mocked(isValidUUID).mockReturnValue(true);
      vi.mocked(validateFields).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });
      vi.mocked(isValidEmail).mockReturnValue(true);

      const result = ValidationService.validateUniversalOperation({
        resourceType: UniversalResourceType.COMPANIES,
        recordId: 'valid-uuid',
        recordData: { name: 'Test', email: 'test@example.com' },
        limit: 10,
        offset: 0,
        operation: 'CREATE',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect all validation errors', () => {
      vi.mocked(isValidUUID).mockReturnValue(false);
      vi.mocked(createInvalidUUIDError).mockImplementation(
        () => new EnhancedApiError('Invalid UUID', 400, '/test', 'TEST')
      );
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        errors: ['Field error'],
        warnings: [],
        suggestions: [],
      });

      const result = ValidationService.validateUniversalOperation({
        resourceType: UniversalResourceType.PEOPLE,
        recordId: 'invalid-uuid',
        recordData: {},
        limit: -1,
        operation: 'UPDATE',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle partial parameter validation', () => {
      const result = ValidationService.validateUniversalOperation({
        resourceType: UniversalResourceType.TASKS,
        limit: 50,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty strings gracefully', () => {
      expect(() => {
        ValidationService.createValidationError('');
        ValidationService.truncateSuggestions(['']);
      }).not.toThrow();
    });

    it('should handle very large suggestion arrays efficiently', () => {
      const largeSuggestions = Array.from(
        { length: 1000 },
        (_, i) => `Suggestion ${i}`
      );

      const start = performance.now();
      const result = ValidationService.truncateSuggestions(largeSuggestions, 5);
      const end = performance.now();

      expect(result.length).toBe(6); // 5 + truncation message
      expect(end - start).toBeLessThan(50); // Should be fast
    });

    it('should preserve original arrays when truncating', () => {
      const original = ['s1', 's2', 's3', 's4'];
      const truncated = ValidationService.truncateSuggestions(original, 2);

      expect(original).toEqual(['s1', 's2', 's3', 's4']); // Unchanged
      expect(truncated).toEqual(['s1', 's2', '... and 2 more suggestions']);
    });
  });
});
