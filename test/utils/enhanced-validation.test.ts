/**
 * Unit tests for enhanced validation utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the attribute-types module
vi.mock('../../src/api/attribute-types.js', () => ({
  getObjectAttributeMetadata: vi.fn(),
  getFieldValidationRules: vi.fn(),
  AttioAttributeMetadata: {},
}));

import {
  getObjectAttributeMetadata,
  getFieldValidationRules,
} from '../../src/api/attribute-types.js';

describe('Enhanced Validation Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateReadOnlyFields', () => {
    it('should pass validation when no read-only fields are provided', () => {
      const readOnlyFields: string[] = [];


      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.readOnlyFields).toHaveLength(0);
    });

    it('should pass validation when read-only fields are not in data', () => {


      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.readOnlyFields).toHaveLength(0);
    });

    it('should fail validation when read-only fields are provided in data', () => {
        name: 'Test Company',
        id: 'some-id',
        created_at: '2023-01-01',
      };


      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toBe(
        "Field 'id' is read-only and cannot be modified"
      );
      expect(result.errors[1]).toBe(
        "Field 'created_at' is read-only and cannot be modified"
      );
      expect(result.readOnlyFields).toEqual(['id', 'created_at']);
    });

    it('should ignore fields with undefined values', () => {


      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFieldExistence', () => {
    it('should pass validation when all required fields are present', () => {


      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should fail validation when required fields are missing', () => {


      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toBe(
        "Required field 'email' is missing or empty"
      );
      expect(result.errors[1]).toBe(
        "Required field 'phone' is missing or empty"
      );
      expect(result.missingFields).toEqual(['email', 'phone']);
    });

    it('should fail validation when required fields are null or empty', () => {


      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.missingFields).toEqual(['name', 'email', 'phone']);
    });
  });

  describe('validateSelectField', () => {

    it('should pass validation for valid single select value', () => {

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for valid multiselect values', () => {
        ['option1', 'option3'],
        validOptions,
        'testField'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid single select value', () => {
        'invalid_option',
        validOptions,
        'testField'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe(
        "Invalid option 'invalid_option' for testField. Valid options: option1, option2, option3"
      );
    });

    it('should fail validation for invalid multiselect values', () => {
        ['option1', 'invalid_option'],
        validOptions,
        'testField'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe(
        "Invalid option 'invalid_option' for testField. Valid options: option1, option2, option3"
      );
    });

    it('should pass validation for null or undefined values', () => {
      expect(validateSelectField(null, validOptions).isValid).toBe(true);
      expect(validateSelectField(undefined, validOptions).isValid).toBe(true);
    });

    it('should use default field label when none provided', () => {
      expect(result.errors[0]).toContain('for field.');
    });
  });

  describe('validateRecordFields', () => {
      type: 'string',
      required: false,
      unique: false,
      allowMultiple: false,
    };

    beforeEach(() => {
      mockMetadata.clear();

      // Mock attribute metadata
      mockMetadata.set('name', {
        api_slug: 'name',
        type: 'text',
        is_required: true,
        is_writable: true,
        is_unique: false,
      });
      mockMetadata.set('email', {
        api_slug: 'email',
        type: 'email',
        is_required: true,
        is_writable: true,
        is_unique: true,
      });
      mockMetadata.set('created_at', {
        api_slug: 'created_at',
        type: 'timestamp',
        is_required: false,
        is_writable: false,
        is_unique: false,
      });

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getFieldValidationRules).mockResolvedValue(mockValidationRules);
    });

    it('should pass validation for valid record data', async () => {


      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for read-only fields', async () => {


      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Field 'created_at' is read-only and cannot be modified"
      );
      expect(result.readOnlyFields).toContain('created_at');
    });

    it('should fail validation for missing required fields in create operations', async () => {


      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('email');
    });

    it('should not check required fields for update operations', async () => {


      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should warn about unrecognized fields', async () => {


      expect(result.warnings).toContain(
        "Field 'unknown_field' is not recognized for resource type 'companies'"
      );
    });

    it('should handle metadata fetch errors gracefully', async () => {
      vi.mocked(getObjectAttributeMetadata).mockRejectedValue(
        new Error('API error')
      );


      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate fields: API error');
    });

    it('should warn when no metadata is available', async () => {
      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(new Map());


      expect(result.warnings).toContain(
        "No attribute metadata found for resource type 'companies'. Validation may be incomplete."
      );
    });
  });

  describe('createEnhancedErrorResponse', () => {
    it('should create basic error response', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
      };

      const response: EnhancedErrorResponse = createEnhancedErrorResponse(
        validation,
        'test-operation'
      );

      expect(response.error).toBe('Error 1; Error 2');
      expect(response.warnings).toEqual(['Warning 1']);
      expect(response.operation).toBe('test-operation');
    });

    it('should include suggestions for missing fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Missing fields'],
        warnings: [],
        missingFields: ['name', 'email'],
      };


      expect(response.suggestions).toContain(
        'Add required fields: name, email'
      );
      expect(response.suggestions).toContain(
        'Ensure all required fields have values before creating a record'
      );
    });

    it('should include suggestions for read-only fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Read-only field error'],
        warnings: [],
        readOnlyFields: ['id', 'created_at'],
      };


      expect(response.suggestions).toContain(
        'Remove read-only fields: id, created_at'
      );
      expect(response.suggestions).toContain(
        'Use separate calls to update read-only fields if they support it, or remove them from the update'
      );
    });

    it('should include suggestions for invalid fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Invalid field values'],
        warnings: [],
        invalidFields: ['email', 'phone'],
      };


      expect(response.suggestions).toContain(
        'Fix invalid field values for: email, phone'
      );
    });

    it('should not include suggestions when there are no issues to suggest fixes for', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Generic error'],
        warnings: [],
      };

        validation,
        'test-operation'
      );

      expect(response.suggestions).toBeUndefined();
    });
  });
});
