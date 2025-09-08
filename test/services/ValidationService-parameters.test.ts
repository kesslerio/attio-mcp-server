/**
 * Split: ValidationService parameter validation (limit/offset/pagination)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';
import { isValidEmail } from '../../src/utils/validation/email-validation.js';
import { isValidUUID } from '../../src/utils/validation/uuid-validation.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { validateFields } from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { ValidationService } from '../../src/services/ValidationService.js';

describe('ValidationService', () => {
  beforeEach(() => vi.clearAllMocks());

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
      expect(() => ValidationService.validateLimitParameter(0)).toThrow(
        'limit must be a positive integer greater than 0'
      );
      expect(() => ValidationService.validateLimitParameter(-5)).toThrow(
        'limit must be a positive integer greater than 0'
      );
    });

    it('should throw for limit exceeding maximum', () => {
      expect(() => ValidationService.validateLimitParameter(101)).toThrow(
        'limit must not exceed 100'
      );
    });

    it('should respect custom maximum limit', () => {
      expect(() =>
        ValidationService.validateLimitParameter(150, undefined, 200)
      ).not.toThrow();
      expect(() =>
        ValidationService.validateLimitParameter(250, undefined, 200)
      ).toThrow('limit must not exceed 200');
    });

    it('should call performance tracker on error when perfId provided', () => {
      expect(() => {
        ValidationService.validateLimitParameter(0, perfId);
      }).toThrow();
      expect(enhancedPerformanceTracker.endOperation).toHaveBeenCalled();
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
      expect(() =>
        ValidationService.validateOffsetParameter(5000, undefined, 6000)
      ).not.toThrow();
      expect(() =>
        ValidationService.validateOffsetParameter(7000, undefined, 6000)
      ).toThrow('offset must not exceed 6000');
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
      expect(() =>
        ValidationService.validatePaginationParameters({
          limit: -1,
          offset: 100,
        })
      ).toThrow();
      expect(() =>
        ValidationService.validatePaginationParameters({
          limit: 50,
          offset: -1,
        })
      ).toThrow();
    });

    it('should pass for empty parameters', () => {
      expect(() => {
        ValidationService.validatePaginationParameters({});
      }).not.toThrow();
    });
  });

  // Additional helper validations preserved from original suite
  describe('createValidationError', () => {
    it('should create validation error with default resource type', () => {
      expect(error).toEqual({
        error: true,
        message,
        details: 'resource validation failed',
        timestamp: expect.any(String),
      });
    });

    it('should create validation error with custom resource type', () => {
        'Custom validation error',
        'companies'
      );
      expect(error.details).toBe('companies validation failed');
    });

    it('should include valid ISO timestamp', () => {
      expect(new Date(error.timestamp).toISOString()).toBe(error.timestamp);
    });
  });

  describe('truncateSuggestions', () => {
    it('should return suggestions unchanged when under limit', () => {
      expect(result).toEqual(suggestions);
    });

    it('should truncate suggestions when over default limit', () => {
      expect(result).toEqual(['s1', 's2', 's3', '... and 2 more suggestions']);
    });

    it('should respect custom max count', () => {
      expect(result).toEqual(['s1', 's2', '... and 2 more suggestions']);
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

        resourceType: UniversalResourceType.COMPANIES,
        recordId: 'valid-uuid',
        recordData: { name: 'Test', email: 'test@example.com' },
        limit: 10,
        offset: 0,
        operation: 'CREATE',
      });
      expect(result.valid).toBe(true);
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
        { length: 1000 },
        (_, i) => `Suggestion ${i}`
      );
      expect(result.length).toBe(6);
      expect(end - start).toBeLessThan(50);
    });

    it('should preserve original arrays when truncating', () => {
      expect(original).toEqual(['s1', 's2', 's3', 's4']);
      expect(truncated).toEqual(['s1', 's2', '... and 2 more suggestions']);
    });
  });
});
