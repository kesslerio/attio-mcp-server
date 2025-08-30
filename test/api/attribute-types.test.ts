/**
 * Tests for attribute type detection functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getAttioClient } from '../../src/api/attio-client';
import { ResourceType } from '../../src/types/attio';

// Mock the Attio client
vi.mock('../../src/api/attio-client');

describe('Attribute Type Detection', () => {
  beforeEach(() => {
    clearAttributeCache();
  });

  describe('getObjectAttributeMetadata', () => {
    it('should fetch and cache attribute metadata for an object', async () => {
      // Our global mock provides 6 company attributes
      expect(metadata.size).toBe(6);

      // Check that the expected attributes exist
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.api_slug).toBe('name');
      expect(nameAttr?.type).toBe('text');
      expect(nameAttr?.is_required).toBe(true);

      expect(categoriesAttr).toBeDefined();
      expect(categoriesAttr?.api_slug).toBe('categories');
      expect(categoriesAttr?.type).toBe('select');
      expect(categoriesAttr?.allow_multiple_values).toBe(true);

      // Second call should use cache - verify no duplicate data
      expect(cachedMetadata.size).toBe(metadata.size);
      expect(cachedMetadata.get('name')).toEqual(metadata.get('name'));
    });

    it('should handle API errors gracefully', async () => {
      // Clear cache and try with a non-existent object type that our mock doesn't handle

      // Our mock returns empty array for unknown object types
      expect(metadata.size).toBe(0);
    });
  });

  describe('detectFieldType', () => {
    it('should detect string type for text fields', async () => {
      expect(fieldType).toBe('string');
    });

    it('should detect array type for multi-value fields', async () => {
      expect(fieldType).toBe('array');
    });

    it('should detect number type for numeric fields', async () => {
      expect(fieldType).toBe('number');
    });

    it('should detect boolean type for checkbox fields', async () => {
      expect(fieldType).toBe('boolean');
    });

    it('should default to string for unknown attributes', async () => {
      expect(fieldType).toBe('string');
    });
  });

  describe('getAttributeTypeInfo', () => {
    it('should return comprehensive type information', async () => {
      expect(typeInfo.fieldType).toBe('string');
      expect(typeInfo.isArray).toBe(false);
      expect(typeInfo.isRequired).toBe(true);
      expect(typeInfo.isUnique).toBe(true);
      expect(typeInfo.attioType).toBe('email');
      expect(typeInfo.metadata).toBeDefined();
      expect(typeInfo.metadata?.api_slug).toBe('email');
      expect(typeInfo.metadata?.type).toBe('email');
    });

    it('should handle missing metadata gracefully', async () => {
      expect(typeInfo).toEqual({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'unknown',
        metadata: null,
      });
    });
  });

  describe('getFieldValidationRules', () => {
    it('should generate validation rules for email fields', async () => {
      expect(rules).toEqual({
        type: 'string',
        required: true,
        unique: true, // Our mock has is_unique: true for email
        allowMultiple: false,
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      });
    });

    it('should generate validation rules for URL fields', async () => {
      expect(rules).toHaveProperty('pattern', '^https?://');
    });

    it('should generate validation rules for select fields with options', async () => {
      expect(rules).toHaveProperty('enum', ['active', 'inactive', 'pending']);
    });
  });
});
