/**
 * Split: ValidationService fields and email validations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { isValidEmail } from '../../src/utils/validation/email-validation.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { validateFields } from '../../src/handlers/tool-configs/universal/field-mapper.js';
import { ValidationService } from '../../src/services/ValidationService.js';

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateFields).mockClear();
  });

  describe('validateFieldsWithErrorHandling', () => {
    it('should pass for valid field validation', () => {
      vi.mocked(validateFields).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      } as any);
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
      } as any);
        UniversalResourceType.COMPANIES,
        {},
        false
      );
      expect(result.valid).toBe(false);
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
      } as any);
      expect(() => {
        ValidationService.validateFieldsWithErrorHandling(
          UniversalResourceType.PEOPLE,
          {},
          true
        );
      }).toThrow();
    });

    it('should truncate suggestions in error message', () => {
        { length: 10 },
        (_, i) => `Suggestion ${i + 1}`
      );
      vi.mocked(validateFields).mockReturnValue({
        valid: false,
        errors: ['Error'],
        warnings: [],
        suggestions: manySuggestions,
      } as any);
        UniversalResourceType.COMPANIES,
        {},
        false
      );
      expect(result.errorMessage).toContain('... and 7 more suggestions');
    });
  });

  describe('validateEmailAddresses', () => {
    it('should validate complex email structures and throw on invalid formats', () => {
        email_addresses: [
          { value: 'valid@email.com' },
          { value: 'invalid-email' },
          null,
          { nested: { value: 'another@email.com' } },
        ],
      } as any;

      vi.mocked(isValidEmail).mockImplementation((v: string) => /@/.test(v));

      expect(() => {
        ValidationService.validateEmailAddresses(recordData);
      }).toThrow(/Invalid email format/i);

      // Called on both valid and invalid string emails
      expect(isValidEmail).toHaveBeenCalledWith('valid@email.com');
      expect(isValidEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('should handle null or undefined record data', () => {
      expect(() => {
        ValidationService.validateEmailAddresses(null as any);
        ValidationService.validateEmailAddresses(undefined as any);
        ValidationService.validateEmailAddresses('not-an-object' as any);
      }).not.toThrow();
    });
  });
});
