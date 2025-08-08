/**
 * Unit tests for enhanced validation utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateReadOnlyFields,
  validateFieldExistence,
  validateSelectField,
  validateRecordFields,
  createEnhancedErrorResponse,
  EnhancedValidationResult,
  EnhancedErrorResponse
} from '../../src/utils/enhanced-validation.js';

// Mock the attribute-types module
vi.mock('../../src/api/attribute-types.js', () => ({
  getObjectAttributeMetadata: vi.fn(),
  getFieldValidationRules: vi.fn(),
  AttioAttributeMetadata: {}
}));

import { getObjectAttributeMetadata, getFieldValidationRules } from '../../src/api/attribute-types.js';

describe('Enhanced Validation Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateReadOnlyFields', () => {
    it('should pass validation when no read-only fields are provided', () => {
      const data = { name: 'Test Company', website: 'https://test.com' };
      const readOnlyFields: string[] = [];

      const result = validateReadOnlyFields(data, readOnlyFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.readOnlyFields).toHaveLength(0);
    });

    it('should pass validation when read-only fields are not in data', () => {
      const data = { name: 'Test Company', website: 'https://test.com' };
      const readOnlyFields = ['id', 'created_at'];

      const result = validateReadOnlyFields(data, readOnlyFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.readOnlyFields).toHaveLength(0);
    });

    it('should fail validation when read-only fields are provided in data', () => {
      const data = { name: 'Test Company', id: 'some-id', created_at: '2023-01-01' };
      const readOnlyFields = ['id', 'created_at'];

      const result = validateReadOnlyFields(data, readOnlyFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toBe("Field 'id' is read-only and cannot be modified");
      expect(result.errors[1]).toBe("Field 'created_at' is read-only and cannot be modified");
      expect(result.readOnlyFields).toEqual(['id', 'created_at']);
    });

    it('should ignore fields with undefined values', () => {
      const data = { name: 'Test Company', id: undefined };
      const readOnlyFields = ['id'];

      const result = validateReadOnlyFields(data, readOnlyFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFieldExistence', () => {
    it('should pass validation when all required fields are present', () => {
      const data = { name: 'Test Company', email: 'test@example.com' };
      const requiredFields = ['name', 'email'];

      const result = validateFieldExistence(data, requiredFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should fail validation when required fields are missing', () => {
      const data = { name: 'Test Company' };
      const requiredFields = ['name', 'email', 'phone'];

      const result = validateFieldExistence(data, requiredFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toBe("Required field 'email' is missing or empty");
      expect(result.errors[1]).toBe("Required field 'phone' is missing or empty");
      expect(result.missingFields).toEqual(['email', 'phone']);
    });

    it('should fail validation when required fields are null or empty', () => {
      const data = { name: '', email: null, phone: undefined };
      const requiredFields = ['name', 'email', 'phone'];

      const result = validateFieldExistence(data, requiredFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.missingFields).toEqual(['name', 'email', 'phone']);
    });
  });

  describe('validateSelectField', () => {
    const validOptions = ['option1', 'option2', 'option3'];

    it('should pass validation for valid single select value', () => {
      const result = validateSelectField('option1', validOptions, 'testField');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for valid multiselect values', () => {
      const result = validateSelectField(['option1', 'option3'], validOptions, 'testField');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid single select value', () => {
      const result = validateSelectField('invalid_option', validOptions, 'testField');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid option 'invalid_option' for testField. Valid options: option1, option2, option3");
    });

    it('should fail validation for invalid multiselect values', () => {
      const result = validateSelectField(['option1', 'invalid_option'], validOptions, 'testField');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid option 'invalid_option' for testField. Valid options: option1, option2, option3");
    });

    it('should pass validation for null or undefined values', () => {
      expect(validateSelectField(null, validOptions).isValid).toBe(true);
      expect(validateSelectField(undefined, validOptions).isValid).toBe(true);
    });

    it('should use default field label when none provided', () => {
      const result = validateSelectField('invalid_option', validOptions);
      expect(result.errors[0]).toContain('for field.');
    });
  });

  describe('validateRecordFields', () => {
    const mockMetadata = new Map();
    const mockValidationRules = {
      type: 'string',
      required: false,
      unique: false,
      allowMultiple: false
    };

    beforeEach(() => {
      mockMetadata.clear();
      
      // Mock attribute metadata
      mockMetadata.set('name', {
        api_slug: 'name',
        type: 'text',
        is_required: true,
        is_writable: true,
        is_unique: false
      });
      mockMetadata.set('email', {
        api_slug: 'email',
        type: 'email',
        is_required: true,
        is_writable: true,
        is_unique: true
      });
      mockMetadata.set('created_at', {
        api_slug: 'created_at',
        type: 'timestamp',
        is_required: false,
        is_writable: false,
        is_unique: false
      });

      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(getFieldValidationRules).mockResolvedValue(mockValidationRules);
    });

    it('should pass validation for valid record data', async () => {
      const data = { name: 'Test Company', email: 'test@example.com' };
      
      const result = await validateRecordFields('companies', data, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for read-only fields', async () => {
      const data = { name: 'Test Company', created_at: '2023-01-01' };
      
      const result = await validateRecordFields('companies', data, false);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Field 'created_at' is read-only and cannot be modified");
      expect(result.readOnlyFields).toContain('created_at');
    });

    it('should fail validation for missing required fields in create operations', async () => {
      const data = { name: 'Test Company' }; // Missing required email field
      
      const result = await validateRecordFields('companies', data, false);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('email');
    });

    it('should not check required fields for update operations', async () => {
      const data = { name: 'Updated Company' }; // Missing email, but it's an update
      
      const result = await validateRecordFields('companies', data, true);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should warn about unrecognized fields', async () => {
      const data = { name: 'Test Company', unknown_field: 'value' };
      
      const result = await validateRecordFields('companies', data, false);

      expect(result.warnings).toContain("Field 'unknown_field' is not recognized for resource type 'companies'");
    });

    it('should handle metadata fetch errors gracefully', async () => {
      vi.mocked(getObjectAttributeMetadata).mockRejectedValue(new Error('API error'));
      
      const data = { name: 'Test Company' };
      const result = await validateRecordFields('companies', data, false);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate fields: API error');
    });

    it('should warn when no metadata is available', async () => {
      vi.mocked(getObjectAttributeMetadata).mockResolvedValue(new Map());
      
      const data = { name: 'Test Company' };
      const result = await validateRecordFields('companies', data, false);

      expect(result.warnings).toContain("No attribute metadata found for resource type 'companies'. Validation may be incomplete.");
    });
  });

  describe('createEnhancedErrorResponse', () => {
    it('should create basic error response', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1']
      };

      const response: EnhancedErrorResponse = createEnhancedErrorResponse(validation, 'test-operation');

      expect(response.error).toBe('Error 1; Error 2');
      expect(response.warnings).toEqual(['Warning 1']);
      expect(response.operation).toBe('test-operation');
    });

    it('should include suggestions for missing fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Missing fields'],
        warnings: [],
        missingFields: ['name', 'email']
      };

      const response = createEnhancedErrorResponse(validation, 'create-record');

      expect(response.suggestions).toContain('Add required fields: name, email');
      expect(response.suggestions).toContain('Ensure all required fields have values before creating a record');
    });

    it('should include suggestions for read-only fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Read-only field error'],
        warnings: [],
        readOnlyFields: ['id', 'created_at']
      };

      const response = createEnhancedErrorResponse(validation, 'update-record');

      expect(response.suggestions).toContain('Remove read-only fields: id, created_at');
      expect(response.suggestions).toContain('Use separate calls to update read-only fields if they support it, or remove them from the update');
    });

    it('should include suggestions for invalid fields', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Invalid field values'],
        warnings: [],
        invalidFields: ['email', 'phone']
      };

      const response = createEnhancedErrorResponse(validation, 'create-record');

      expect(response.suggestions).toContain('Fix invalid field values for: email, phone');
    });

    it('should not include suggestions when there are no issues to suggest fixes for', () => {
      const validation: EnhancedValidationResult = {
        isValid: false,
        errors: ['Generic error'],
        warnings: []
      };

      const response = createEnhancedErrorResponse(validation, 'test-operation');

      expect(response.suggestions).toBeUndefined();
    });
  });
});