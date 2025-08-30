/**
 * Unit tests for enhanced error response utilities
 */

import { describe, it, expect } from 'vitest';

      expect(error.error).toContain(
        "Field validation failed for 'name' in companies"
      );
      expect(error.error_code).toBe(ValidationErrorCode.FIELD_VALIDATION_ERROR);
      expect(error.field).toBe('name');
      expect(error.suggestions).toEqual([
        'Provide a name value',
        'Name should not be empty',
      ]);
      expect(error.help_url).toBe(
        'https://docs.attio.com/api-reference/companies'
      );
      expect(error.context).toEqual({
        resource_type: 'companies',
        field_name: 'name',
      });
    });

    it('should create a field validation error without suggestions', () => {
        'email',
        'people',
        'Invalid email format'
      );

      expect(error.suggestions).toEqual([
        'Use get-attributes to see valid fields for people',
      ]);
    });
  });

  describe('createSelectOptionError', () => {
    it('should create a select option error with valid options', () => {
        'startup',
        'enterprise',
        'small_business',
        'non_profit',
      ]);

      expect(error.error).toContain(
        "Invalid value 'invalid_option' for select field 'company_type'"
      );
      expect(error.error).toContain(
        "Valid options are: ['startup', 'enterprise', 'small_business', 'non_profit']"
      );
      expect(error.error_code).toBe(ValidationErrorCode.INVALID_SELECT_OPTION);
      expect(error.field).toBe('company_type');
      expect(error.suggestions).toContain(
        'Choose one of: startup, enterprise, small_business...'
      );
      expect(error.context).toEqual({
        field_name: 'company_type',
        provided_value: 'invalid_option',
        valid_options: [
          'startup',
          'enterprise',
          'small_business',
          'non_profit',
        ],
      });
    });

    it('should handle few options without truncation', () => {
        'active',
        'inactive',
      ]);

      expect(error.suggestions[0]).toBe('Choose one of: active, inactive');
    });
  });

  describe('createMultiSelectOptionError', () => {
    it('should create a multi-select option error', () => {
        'tags',
        ['invalid_tag1', 'invalid_tag2'],
        ['important', 'urgent', 'follow_up', 'completed', 'archived']
      );

      expect(error.error).toContain(
        "Invalid values ['invalid_tag1', 'invalid_tag2'] for multi-select field 'tags'"
      );
      expect(error.error_code).toBe(
        ValidationErrorCode.INVALID_MULTI_SELECT_OPTION
      );
      expect(error.field).toBe('tags');
      expect(error.suggestions[0]).toContain(
        'Valid options include: important, urgent, follow_up, completed, archived'
      );
      expect(error.context).toEqual({
        field_name: 'tags',
        invalid_values: ['invalid_tag1', 'invalid_tag2'],
        valid_options: [
          'important',
          'urgent',
          'follow_up',
          'completed',
          'archived',
        ],
      });
    });
  });

  describe('createReadOnlyFieldError', () => {
    it('should create a read-only field error for single field', () => {

      expect(error.error).toContain(
        "Cannot update read-only field 'created_at'"
      );
      expect(error.error).toContain(
        'This field is automatically managed by the system'
      );
      expect(error.error_code).toBe(ValidationErrorCode.READ_ONLY_FIELD_UPDATE);
      expect(error.field).toBe('created_at');
      expect(error.suggestions).toContain(
        'Remove this field from your update request'
      );
      expect(error.context).toEqual({
        resource_type: 'companies',
        read_only_fields: ['created_at'],
      });
    });

    it('should create a read-only field error for multiple fields', () => {
        ['created_at', 'updated_at'],
        'people'
      );

      expect(error.error).toContain(
        "Cannot update read-only fields 'created_at', 'updated_at'"
      );
      expect(error.error).toContain(
        'These fields are automatically managed by the system'
      );
      expect(error.field).toBeUndefined();
      expect(error.suggestions).toContain(
        'Remove these fields from your update request'
      );
    });
  });

  describe('createUnknownFieldError', () => {
    it('should create an unknown field error with suggestions', () => {
        'company_description',
        'companies',
        ['description', 'notes']
      );

      expect(error.error).toContain(
        "Unknown field 'company_description' for resource type 'companies'"
      );
      expect(error.error).toContain("Did you mean: 'description', 'notes'?");
      expect(error.error_code).toBe(ValidationErrorCode.UNKNOWN_FIELD);
      expect(error.field).toBe('company_description');
      expect(error.suggestions).toContain('Try using: description');
      expect(error.context).toEqual({
        resource_type: 'companies',
        invalid_field: 'company_description',
        suggested_fields: ['description', 'notes'],
      });
    });

    it('should create an unknown field error without suggestions', () => {

      expect(error.error).not.toContain('Did you mean');
      expect(error.suggestions).toEqual([
        'Use get-attributes to see all available fields for people',
      ]);
    });
  });

  describe('createFieldTypeMismatchError', () => {
    it('should create a field type mismatch error', () => {
        'age',
        'number',
        'string',
        'people'
      );

      expect(error.error).toContain(
        "Field 'age' expects type 'number' but received 'string'"
      );
      expect(error.error_code).toBe(ValidationErrorCode.FIELD_TYPE_MISMATCH);
      expect(error.field).toBe('age');
      expect(error.suggestions).toContain('Convert the value to number format');
      expect(error.context).toEqual({
        resource_type: 'people',
        field_name: 'age',
        expected_type: 'number',
        actual_type: 'string',
      });
    });
  });

  describe('createRequiredFieldError', () => {
    it('should create a required field error for single field', () => {

      expect(error.error).toContain("Required field 'name' is missing");
      expect(error.error_code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
      expect(error.field).toBe('name');
      expect(error.suggestions).toContain(
        'Add this required field to your request'
      );
    });

    it('should create a required field error for multiple fields', () => {

      expect(error.error).toContain(
        "Required fields 'name', 'email' are missing"
      );
      expect(error.field).toBeUndefined();
      expect(error.suggestions).toContain(
        'Add these required fields to your request'
      );
    });
  });

  describe('formatEnhancedErrorResponse', () => {
    it('should format an enhanced error response with all components', () => {
        'active',
        'inactive',
      ]);


      expect(formatted.content[0].type).toBe('text');
      expect(formatted.content[0].text).toContain(
        "Invalid value 'invalid' for select field 'status'"
      );
      expect(formatted.content[0].text).toContain('💡 Suggestions:');
      expect(formatted.content[0].text).toContain(
        '• Choose one of: active, inactive'
      );
      expect(formatted.content[0].text).toContain(
        '• Use get-attributes to see all available options'
      );

      expect(formatted.isError).toBe(true);
      expect(formatted.error.code).toBe(
        ValidationErrorCode.INVALID_SELECT_OPTION
      );
      expect(formatted.error.field).toBe('status');
      expect(formatted.error.suggestions).toEqual([
        'Choose one of: active, inactive',
        'Use get-attributes to see all available options',
      ]);
      expect(formatted.error.context).toBeDefined();
    });

    it('should format an error response without suggestions', () => {
        error: 'Simple error message',
        error_code: 'SIMPLE_ERROR',
      };


      expect(formatted.content[0].text).toBe('Simple error message');
      expect(formatted.content[0].text).not.toContain('💡 Suggestions:');
    });

    it('should include help URL when provided', () => {


      expect(formatted.content[0].text).toContain(
        '📖 Documentation: https://docs.attio.com/api-reference/companies'
      );
    });
  });

  describe('createErrorResponse', () => {
    it('should create a simple error response', () => {

      expect(error.content[0].type).toBe('text');
      expect(error.content[0].text).toBe('Something went wrong');
      expect(error.isError).toBe(true);
      expect(error.error.message).toBe('Something went wrong');
    });
  });
});
