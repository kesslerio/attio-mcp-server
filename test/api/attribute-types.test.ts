/**
 * Tests for attribute type detection functionality
 */
import {
  getObjectAttributeMetadata,
  detectFieldType,
  getAttributeTypeInfo,
  clearAttributeCache,
  getFieldValidationRules,
} from '../../src/api/attribute-types.js';
import { getAttioClient } from '../../src/api/attio-client.js';
import { ResourceType } from '../../src/types/attio.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Attio client
vi.mock('../../src/api/attio-client.js');

describe('Attribute Type Detection', () => {
  beforeEach(() => {
    clearAttributeCache();
  });

  describe('getObjectAttributeMetadata', () => {
    it('should fetch and cache attribute metadata for an object', async () => {
      const metadata = await getObjectAttributeMetadata('companies');

      // Our global mock provides 6 company attributes
      expect(metadata.size).toBe(6);

      // Check that the expected attributes exist
      const nameAttr = metadata.get('name');
      expect(nameAttr).toBeDefined();
      expect(nameAttr?.api_slug).toBe('name');
      expect(nameAttr?.type).toBe('text');
      expect(nameAttr?.is_required).toBe(true);

      const categoriesAttr = metadata.get('categories');
      expect(categoriesAttr).toBeDefined();
      expect(categoriesAttr?.api_slug).toBe('categories');
      expect(categoriesAttr?.type).toBe('select');
      // Multiselect categories should be allowed
      expect(categoriesAttr?.is_multiselect).toBe(true);

      // Second call should use cache - verify no duplicate data
      const cachedMetadata = await getObjectAttributeMetadata('companies');
      expect(cachedMetadata.size).toBe(metadata.size);
      expect(cachedMetadata.get('name')).toEqual(metadata.get('name'));
    });

    it('should handle API errors gracefully', async () => {
      // Clear cache and try with a non-existent object type that our mock doesn't handle
      const metadata = await getObjectAttributeMetadata('nonexistent');

      // Our mock returns empty array for unknown object types
      expect(metadata.size).toBe(0);
    });
  });

  describe('detectFieldType', () => {
    it('should detect string type for text fields', async () => {
      const fieldType = await detectFieldType('companies', 'name');
      expect(fieldType).toBe('string');
    });

    it('should detect array type for multi-value fields', async () => {
      const fieldType = await detectFieldType('companies', 'categories');
      expect(fieldType).toBe('array');
    });

    it('should detect array type for single-select fields (Issue #1045)', async () => {
      // Single-select fields should return 'array' because Attio expects
      // select values as arrays even for single-select: ["uuid"]
      const fieldType = await detectFieldType('companies', 'status');
      expect(fieldType).toBe('array');
    });

    it('should detect number type for numeric fields', async () => {
      const fieldType = await detectFieldType('companies', 'revenue');
      expect(fieldType).toBe('number');
    });

    it('should detect boolean type for checkbox fields', async () => {
      const fieldType = await detectFieldType('companies', 'active');
      expect(fieldType).toBe('boolean');
    });

    it('should default to string for unknown attributes', async () => {
      const fieldType = await detectFieldType('companies', 'unknown_field');
      expect(fieldType).toBe('string');
    });
  });

  describe('getAttributeTypeInfo', () => {
    it('should return comprehensive type information', async () => {
      const typeInfo = await getAttributeTypeInfo('people', 'email');

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
      const typeInfo = await getAttributeTypeInfo('companies', 'unknown');

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
      const rules = await getFieldValidationRules('people', 'email');

      expect(rules).toEqual({
        type: 'string',
        required: true,
        unique: true, // Our mock has is_unique: true for email
        allowMultiple: false,
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      });
    });

    it('should generate validation rules for URL fields', async () => {
      const rules = await getFieldValidationRules('companies', 'website');

      expect(rules).toHaveProperty('pattern', '^https?://');
    });

    it('should generate validation rules for select fields with options', async () => {
      const rules = await getFieldValidationRules('companies', 'status');

      expect(rules).toHaveProperty('enum', ['active', 'inactive', 'pending']);
    });
  });
});
