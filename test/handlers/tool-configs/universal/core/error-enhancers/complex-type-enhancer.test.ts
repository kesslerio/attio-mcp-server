/**
 * Unit tests for Complex Type Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Tests location, phone-number, and personal-name field error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { complexTypeEnhancer } from '@/handlers/tool-configs/universal/core/error-enhancers/complex-type-enhancer.js';
import type { CrudErrorContext } from '@/handlers/tool-configs/universal/core/error-enhancers/types.js';

describe('complex-type-enhancer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('matches()', () => {
    it('should match "location" pattern in error message', () => {
      const error = new Error('Invalid location value provided');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "phone" pattern in error message', () => {
      const error = new Error('Invalid phone number format');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "personal-name" pattern in error message', () => {
      const error = new Error('Invalid personal-name structure');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(true);
    });

    it('should match "Invalid value" pattern', () => {
      const error = new Error('Invalid value provided');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(true);
    });

    it('should not match unrelated errors', () => {
      const error = new Error('Missing required field');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(false);
    });

    it('should match string errors', () => {
      const error = 'Invalid location provided';
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      expect(complexTypeEnhancer.matches(error, context)).toBe(true);
    });
  });

  describe('enhance() - location errors', () => {
    it('should show location example for location field error', async () => {
      const error = new Error('Invalid location value');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { primary_location: '123 Main St' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid location value');
      expect(result).toContain('Expected structure:');
      expect(result).toContain('"line_1": "123 Main St"');
      expect(result).toContain('"locality": "City"');
      expect(result).toContain('"region": "State"');
      expect(result).toContain('"postcode": "12345"');
      expect(result).toContain('"country_code": "US"');
      expect(result).toContain('pass an object, not a string');
    });

    it('should detect location from validation_errors field name', async () => {
      const error = {
        message: 'Invalid value',
        response: {
          data: {
            validation_errors: [
              { field: 'office_location', message: 'Invalid format' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid location value');
      expect(result).toContain('Expected structure:');
    });

    it('should detect location from field name in recordData', async () => {
      const error = new Error('Invalid value');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { office_location: 'New York' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid location value');
    });
  });

  describe('enhance() - phone errors', () => {
    it('should show phone example for phone field error', async () => {
      const error = new Error('Invalid phone number');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { phone: '555-1234' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid phone-number value');
      expect(result).toContain('Provide phone_number or original_phone_number');
      expect(result).toContain('"phone_number": "+15551234567"');
      expect(result).toContain('"country_code": "US"');
      expect(result).toContain('Strings are normalized to E.164');
    });

    it('should detect phone from validation_errors', async () => {
      const error = {
        message: 'Invalid value',
        response: {
          data: {
            validation_errors: [
              { field: 'mobile_phone', message: 'Invalid phone format' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid phone-number value');
    });
  });

  describe('enhance() - personal-name errors', () => {
    it('should show personal-name example for name field error', async () => {
      const error = new Error('Invalid personal-name');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
        recordData: { full_name: 'John Doe' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid personal-name value');
      expect(result).toContain('Provide first_name/last_name or full_name');
      expect(result).toContain('"first_name": "Jane"');
      expect(result).toContain('"last_name": "Doe"');
      expect(result).toContain('Strings are parsed automatically');
    });

    it('should detect personal-name from validation_errors', async () => {
      const error = {
        message: 'Invalid value',
        response: {
          data: {
            validation_errors: [
              { field: 'contact_name', message: 'Invalid name format' },
            ],
          },
        },
      };

      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'people',
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid personal-name value');
    });
  });

  describe('enhance() - edge cases', () => {
    it('should return null for unmatched error types', async () => {
      const error = new Error('Some other error message');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test Company' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toBeNull();
    });

    it('should handle missing recordData', async () => {
      const error = new Error('Invalid location value');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid location value');
    });

    it('should handle error message with "location" pattern but no location field', async () => {
      const error = new Error('Error in location validation');
      const context: CrudErrorContext = {
        operation: 'create',
        resourceType: 'companies',
        recordData: { name: 'Test' },
      };

      const result = await complexTypeEnhancer.enhance(error, context);

      expect(result).toContain('Invalid location value');
    });
  });

  describe('errorName', () => {
    it('should have correct error name', () => {
      expect(complexTypeEnhancer.errorName).toBe('validation_error');
    });
  });

  describe('name', () => {
    it('should have correct enhancer name', () => {
      expect(complexTypeEnhancer.name).toBe('complex-type');
    });
  });
});
