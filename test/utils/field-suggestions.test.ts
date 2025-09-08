/**
 * Tests for field suggestion utilities
 */

import { describe, it, expect } from 'vitest';

describe('Field Suggestions Utilities', () => {
  describe('levenshteinDistance', () => {
    it('should calculate correct distance for similar strings', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('name', 'names')).toBe(1);
      expect(levenshteinDistance('first_name', 'firstname')).toBe(1);
    });

    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('test', 'test')).toBe(0);
    });

    it('should handle case differences', () => {
      expect(levenshteinDistance('Name', 'name')).toBe(1);
    });
  });

  describe('findSimilarOptions', () => {
      'first_name',
      'last_name',
      'email',
      'phone_numbers',
      'job_title',
    ];

    it('should find similar field names', () => {
      expect(suggestions).toContain('first_name');
    });

    it('should find multiple suggestions sorted by similarity', () => {
      expect(suggestions).toContain('first_name');
      expect(suggestions).toContain('last_name');
    });

    it('should respect max suggestions limit', () => {
      expect(suggestions).toHaveLength(1);
    });

    it('should handle substring matching when no close matches', () => {
      expect(suggestions).toContain('phone_numbers');
    });

    it('should return empty array for no matches', () => {
      expect(suggestions).toEqual([]);
    });
  });

  describe('generateFieldSuggestionMessage', () => {

    it('should generate message with suggestions for similar field', () => {
      expect(message).toContain('Invalid field name: "firstname"');
      expect(message).toContain('Did you mean: "first_name"');
    });

    it('should include context when provided', () => {
        'firstname',
        validFields,
        'people'
      );
      expect(message).toContain('for people');
    });

    it('should show valid fields when no close matches', () => {
      expect(message).toContain('Valid fields include:');
      expect(message).toContain('"first_name"');
    });

    it('should handle large field lists', () => {
      expect(message).toContain('(and 15 more)');
    });
  });

  describe('generateEnumSuggestionMessage', () => {

    it('should generate message with all valid options for small sets', () => {
        'activ',
        validValues,
        'status'
      );
      expect(message).toContain('Invalid value "activ" for field "status"');
      expect(message).toContain('Did you mean: "active"');
      expect(message).toContain('Valid options are:');
      expect(message).toContain('"active", "inactive", "pending"');
    });

    it('should truncate large option lists', () => {
      expect(message).toContain('Valid options include:');
      expect(message).toContain('(and 15 more)');
    });
  });

  describe('generateReadOnlyFieldMessage', () => {
    it('should generate message for update operation', () => {
      expect(message).toContain('Field "created_at" is read-only');
      expect(message).toContain('cannot be modified');
    });

    it('should generate message for create operation', () => {
      expect(message).toContain('Field "id" is read-only');
      expect(message).toContain('cannot be set during creation');
    });
  });

  describe('generateResourceTypeSuggestionMessage', () => {
    it('should suggest similar resource types', () => {
        'person',
        VALID_RESOURCE_TYPES
      );
      expect(message).toContain('Invalid resource type: "person"');
      expect(message).toContain('Did you mean: "people"');
    });

    it('should list all valid resource types', () => {
        'xyz',
        VALID_RESOURCE_TYPES
      );
      expect(message).toContain('Valid resource types are:');
      expect(message).toContain('"people"');
      expect(message).toContain('"companies"');
    });
  });

  describe('getMappedFieldName', () => {
    it('should map common field name mistakes', () => {
      expect(getMappedFieldName('firstname')).toBe('first_name');
      expect(getMappedFieldName('lastname')).toBe('last_name');
      expect(getMappedFieldName('fullname')).toBe('name');
      expect(getMappedFieldName('phone')).toBe('phone_numbers');
      expect(getMappedFieldName('email')).toBe('email_addresses');
    });

    it('should handle different formats', () => {
      expect(getMappedFieldName('first-name')).toBe('first_name');
      expect(getMappedFieldName('first name')).toBe('first_name');
      expect(getMappedFieldName('FIRSTNAME')).toBe('first_name');
    });

    it('should return null for unknown fields', () => {
      expect(getMappedFieldName('unknown_field')).toBeNull();
    });
  });

  describe('validateFieldWithSuggestions', () => {
      'first_name',
      'last_name',
      'email',
      'created_at',
      'updated_at',
    ];

    it('should validate valid fields', () => {
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should suggest mapped field names', () => {
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Did you mean "first_name"');
    });

    it('should generate suggestions for unknown fields', () => {
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Did you mean:');
    });

    it('should detect read-only fields for update', () => {
        'created_at',
        validFields,
        readOnlyFields,
        'update'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('read-only');
      expect(result.error).toContain('cannot be modified');
    });

    it('should detect read-only fields for create', () => {
        'created_at',
        validFields,
        readOnlyFields,
        'create'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('read-only');
      expect(result.error).toContain('cannot be set during creation');
    });
  });
});
