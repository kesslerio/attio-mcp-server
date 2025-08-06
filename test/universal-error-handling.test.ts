/**
 * Tests for enhanced universal error handling
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CrossResourceValidator,
  ErrorType,
  HttpStatusCode,
  InputSanitizer,
  UniversalValidationError,
  validateUniversalToolParams,
} from '../src/handlers/tool-configs/universal/schemas.js';
import { UniversalResourceType } from '../src/handlers/tool-configs/universal/types.js';

describe('Enhanced Universal Error Handling', () => {
  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in strings', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = InputSanitizer.sanitizeString(maliciousInput);
      expect(sanitized).toBe('alert("xss")Hello');
    });

    it('should normalize email addresses', () => {
      const email = '  TEST@EXAMPLE.COM  ';
      const normalized = InputSanitizer.normalizeEmail(email);
      expect(normalized).toBe('test@example.com');
    });

    it('should sanitize objects recursively', () => {
      const obj = {
        name: '<script>evil</script>Company',
        email: '  ADMIN@COMPANY.COM  ',
        nested: {
          description: 'onclick=alert(1)Safe description',
        },
      };

      const sanitized = InputSanitizer.sanitizeObject(obj);
      expect(sanitized.name).toBe('evilCompany');
      expect(sanitized.email).toBe('admin@company.com');
      expect(sanitized.nested.description).toBe('alert(1)Safe description');
    });
  });

  describe('Error Classification', () => {
    it('should create UniversalValidationError with proper classification', () => {
      const error = new UniversalValidationError(
        'Test error message',
        ErrorType.USER_ERROR,
        {
          field: 'test_field',
          suggestion: 'Try this instead',
          example: 'field: "correct_value"',
        }
      );

      expect(error.message).toBe('Test error message');
      expect(error.errorType).toBe(ErrorType.USER_ERROR);
      expect(error.field).toBe('test_field');
      expect(error.suggestion).toBe('Try this instead');
      expect(error.example).toBe('field: "correct_value"');
    });
  });

  describe('Enhanced Validation Messages', () => {
    it('should provide helpful suggestions for invalid resource types', () => {
      const params = { resource_type: 'company' }; // Missing 's'

      try {
        validateUniversalToolParams('search-records', params);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(UniversalValidationError);
        const validationError = error as UniversalValidationError;
        expect(validationError.suggestion).toContain('companies');
        expect(validationError.example).toContain(
          'companies, people, records, tasks'
        );
      }
    });

    it('should provide detailed missing parameter errors', () => {
      const params = { resource_type: UniversalResourceType.COMPANIES };

      try {
        validateUniversalToolParams('create-record', params);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(UniversalValidationError);
        const validationError = error as UniversalValidationError;
        expect(validationError.field).toBe('record_data');
        expect(validationError.suggestion).toContain(
          'Provide the data for creating'
        );
        expect(validationError.example).toContain('record_data:');
      }
    });

    it('should handle batch operations validation with specific messages', () => {
      const params = {
        resource_type: UniversalResourceType.COMPANIES,
        operation_type: 'create',
        // Missing records array
      };

      try {
        validateUniversalToolParams('batch-operations', params);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(UniversalValidationError);
        const validationError = error as UniversalValidationError;
        expect(validationError.field).toBe('records');
        expect(validationError.suggestion).toContain('array of record data');
        expect(validationError.example).toContain('records:');
      }
    });
  });

  describe('Parameter Sanitization', () => {
    it('should return sanitized parameters from validation', () => {
      const params = {
        resource_type: UniversalResourceType.COMPANIES,
        query: '  <script>alert(1)</script>Search Term  ',
      };

      const sanitized = validateUniversalToolParams('search-records', params);
      expect(sanitized.query).toBe('alert(1)Search Term');
      expect(sanitized.resource_type).toBe(UniversalResourceType.COMPANIES);
    });
  });

  describe('String Similarity Suggestions', () => {
    it('should suggest common resource type alternatives', () => {
      const testCases = [
        { input: 'person', expected: 'people' },
        { input: 'contact', expected: 'people' },
        { input: 'organization', expected: 'companies' },
        { input: 'task', expected: 'tasks' },
      ];

      for (const testCase of testCases) {
        try {
          validateUniversalToolParams('search-records', {
            resource_type: testCase.input,
          });
          expect.fail(
            `Should have thrown validation error for ${testCase.input}`
          );
        } catch (error) {
          expect(error).toBeInstanceOf(UniversalValidationError);
          const validationError = error as UniversalValidationError;
          expect(validationError.suggestion).toContain(testCase.expected);
        }
      }
    });
  });
});

describe('Cross-Resource Validation', () => {
  describe('Company Validation', () => {
    it('should validate company existence (mock test)', async () => {
      // This is a unit test - we'd need integration tests with real API for full validation
      // For now, just test that the validation function exists and can be called
      expect(typeof CrossResourceValidator.validateCompanyExists).toBe(
        'function'
      );
      expect(typeof CrossResourceValidator.validateRecordRelationships).toBe(
        'function'
      );
    });

    it('should handle people record validation structure', async () => {
      const recordData = {
        name: 'John Doe',
        company_id: 'comp_123',
      };

      // Mock the company validation to return failure result for this test
      const originalValidate = CrossResourceValidator.validateCompanyExists;
      CrossResourceValidator.validateCompanyExists = async () => ({
        exists: false,
        error: {
          type: 'not_found' as const,
          message: "Company with ID 'comp_123' does not exist",
          httpStatusCode: HttpStatusCode.NOT_FOUND,
        },
      });

      try {
        await CrossResourceValidator.validateRecordRelationships(
          UniversalResourceType.PEOPLE,
          recordData
        );
        expect.fail(
          'Should have thrown validation error for non-existent company'
        );
      } catch (error) {
        expect(error).toBeInstanceOf(UniversalValidationError);
        const validationError = error as UniversalValidationError;
        expect(validationError.field).toBe('company_id');
        expect(validationError.suggestion).toContain(
          'Verify the company ID exists'
        );
      } finally {
        // Restore original function
        CrossResourceValidator.validateCompanyExists = originalValidate;
      }
    });
  });
});
