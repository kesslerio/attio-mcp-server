/**
 * Tests for field suggestion utilities
 */

import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  findSimilarOptions,
  generateFieldSuggestionMessage,
  generateEnumSuggestionMessage,
  generateReadOnlyFieldMessage,
  generateResourceTypeSuggestionMessage,
  getMappedFieldName,
  validateFieldWithSuggestions,
  VALID_RESOURCE_TYPES,
} from '../../src/utils/field-suggestions.js';

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
    const validFields = [
      'first_name',
      'last_name',
      'email',
      'phone_numbers',
      'job_title',
    ];

    it('should find similar field names', () => {
      const suggestions = findSimilarOptions('firstname', validFields);
      expect(suggestions).toContain('first_name');
    });

    it('should find multiple suggestions sorted by similarity', () => {
      const suggestions = findSimilarOptions('name', validFields);
      expect(suggestions).toContain('first_name');
      expect(suggestions).toContain('last_name');
    });

    it('should respect max suggestions limit', () => {
      const suggestions = findSimilarOptions('name', validFields, 1);
      expect(suggestions).toHaveLength(1);
    });

    it('should handle substring matching when no close matches', () => {
      const suggestions = findSimilarOptions('phone', validFields);
      expect(suggestions).toContain('phone_numbers');
    });

    it('should return empty array for no matches', () => {
      const suggestions = findSimilarOptions('xyz123', validFields);
      expect(suggestions).toEqual([]);
    });
  });

  describe('generateFieldSuggestionMessage', () => {
    const validFields = ['first_name', 'last_name', 'email'];

    it('should generate message with suggestions for similar field', () => {
      const message = generateFieldSuggestionMessage('firstname', validFields);
      expect(message).toContain('Invalid field name: "firstname"');
      expect(message).toContain('Did you mean: "first_name"');
    });

    it('should include context when provided', () => {
      const message = generateFieldSuggestionMessage(
        'firstname',
        validFields,
        'people'
      );
      expect(message).toContain('for people');
    });

    it('should show valid fields when no close matches', () => {
      const message = generateFieldSuggestionMessage('xyz', validFields);
      expect(message).toContain('Valid fields include:');
      expect(message).toContain('"first_name"');
    });

    it('should handle large field lists', () => {
      const manyFields = Array.from({ length: 20 }, (_, i) => `field_${i}`);
      const message = generateFieldSuggestionMessage('xyz', manyFields);
      expect(message).toContain('(and 15 more)');
    });
  });

  describe('generateEnumSuggestionMessage', () => {
    const validValues = ['active', 'inactive', 'pending'];

    it('should generate message with all valid options for small sets', () => {
      const message = generateEnumSuggestionMessage(
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
      const manyValues = Array.from({ length: 20 }, (_, i) => `option_${i}`);
      const message = generateEnumSuggestionMessage('opt', manyValues, 'field');
      expect(message).toContain('Valid options include:');
      expect(message).toContain('(and 15 more)');
    });
  });

  describe('generateReadOnlyFieldMessage', () => {
    it('should generate message for update operation', () => {
      const message = generateReadOnlyFieldMessage('created_at', 'update');
      expect(message).toContain('Field "created_at" is read-only');
      expect(message).toContain('cannot be modified');
    });

    it('should generate message for create operation', () => {
      const message = generateReadOnlyFieldMessage('id', 'create');
      expect(message).toContain('Field "id" is read-only');
      expect(message).toContain('cannot be set during creation');
    });
  });

  describe('generateResourceTypeSuggestionMessage', () => {
    it('should suggest similar resource types', () => {
      const message = generateResourceTypeSuggestionMessage(
        'person',
        VALID_RESOURCE_TYPES
      );
      expect(message).toContain('Invalid resource type: "person"');
      expect(message).toContain('Did you mean: "people"');
    });

    it('should list all valid resource types', () => {
      const message = generateResourceTypeSuggestionMessage(
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
    const validFields = [
      'first_name',
      'last_name',
      'email',
      'created_at',
      'updated_at',
    ];
    const readOnlyFields = ['created_at', 'updated_at'];

    it('should validate valid fields', () => {
      const result = validateFieldWithSuggestions('first_name', validFields);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should suggest mapped field names', () => {
      const result = validateFieldWithSuggestions('firstname', validFields);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Did you mean "first_name"');
    });

    it('should generate suggestions for unknown fields', () => {
      const result = validateFieldWithSuggestions('name', validFields);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Did you mean:');
    });

    it('should detect read-only fields for update', () => {
      const result = validateFieldWithSuggestions(
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
      const result = validateFieldWithSuggestions(
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
