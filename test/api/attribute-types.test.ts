/**
 * Tests for attribute type detection functionality
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttioClient } from '../../src/api/attio-client.js';
import {
  clearAttributeCache,
  detectFieldType,
  getAttributeTypeInfo,
  getFieldValidationRules,
  getObjectAttributeMetadata,
} from '../../src/api/attribute-types.js';

// Mock the Attio client
vi.mock('../../src/api/attio-client.js');

describe('Attribute Type Detection', () => {
  const mockApi = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAttioClient as any).mockReturnValue(mockApi);
    clearAttributeCache();
  });

  describe('getObjectAttributeMetadata', () => {
    it('should fetch and cache attribute metadata for an object', async () => {
      const mockAttributes = [
        {
          id: 'attr_1',
          api_slug: 'name',
          title: 'Name',
          type: 'text',
          allow_multiple_values: false,
        },
        {
          id: 'attr_2',
          api_slug: 'products',
          title: 'Products',
          type: 'object',
          allow_multiple_values: true,
        },
      ];

      mockApi.get.mockResolvedValueOnce({
        data: { data: mockAttributes },
      });

      const metadata = await getObjectAttributeMetadata('companies');

      expect(mockApi.get).toHaveBeenCalledWith('/objects/companies/attributes');
      expect(metadata.size).toBe(2);
      expect(metadata.get('name')).toEqual(mockAttributes[0]);
      expect(metadata.get('products')).toEqual(mockAttributes[1]);

      // Second call should use cache
      const cachedMetadata = await getObjectAttributeMetadata('companies');
      expect(mockApi.get).toHaveBeenCalledTimes(1); // Not called again
      expect(cachedMetadata).toEqual(metadata);
    });

    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('API Error'));

      const metadata = await getObjectAttributeMetadata('companies');

      expect(metadata.size).toBe(0);
    });
  });

  describe('detectFieldType', () => {
    it('should detect string type for text fields', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'name',
              type: 'text',
              allow_multiple_values: false,
            },
          ],
        },
      });

      const fieldType = await detectFieldType('companies', 'name');
      expect(fieldType).toBe('string');
    });

    it('should detect array type for multi-value fields', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'categories',
              type: 'text',
              allow_multiple_values: true,
            },
          ],
        },
      });

      const fieldType = await detectFieldType('companies', 'categories');
      expect(fieldType).toBe('array');
    });

    it('should detect number type for numeric fields', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'revenue',
              type: 'number',
              allow_multiple_values: false,
            },
          ],
        },
      });

      const fieldType = await detectFieldType('companies', 'revenue');
      expect(fieldType).toBe('number');
    });

    it('should detect boolean type for checkbox fields', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'active',
              type: 'checkbox',
              allow_multiple_values: false,
            },
          ],
        },
      });

      const fieldType = await detectFieldType('companies', 'active');
      expect(fieldType).toBe('boolean');
    });

    it('should default to string for unknown attributes', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const fieldType = await detectFieldType('companies', 'unknown_field');
      expect(fieldType).toBe('string');
    });
  });

  describe('getAttributeTypeInfo', () => {
    it('should return comprehensive type information', async () => {
      const mockAttribute = {
        api_slug: 'email',
        type: 'email',
        allow_multiple_values: false,
        is_required: true,
        is_unique: true,
      };

      mockApi.get.mockResolvedValueOnce({
        data: { data: [mockAttribute] },
      });

      const typeInfo = await getAttributeTypeInfo('people', 'email');

      expect(typeInfo).toEqual({
        fieldType: 'string',
        isArray: false,
        isRequired: true,
        isUnique: true,
        attioType: 'email',
        metadata: mockAttribute,
      });
    });

    it('should handle missing metadata gracefully', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { data: [] },
      });

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
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'email',
              type: 'email',
              allow_multiple_values: false,
              is_required: true,
            },
          ],
        },
      });

      const rules = await getFieldValidationRules('people', 'email');

      expect(rules).toEqual({
        type: 'string',
        required: true,
        unique: false,
        allowMultiple: false,
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      });
    });

    it('should generate validation rules for URL fields', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'website',
              type: 'url',
              allow_multiple_values: false,
            },
          ],
        },
      });

      const rules = await getFieldValidationRules('companies', 'website');

      expect(rules).toHaveProperty('pattern', '^https?://');
    });

    it('should generate validation rules for select fields with options', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              api_slug: 'status',
              type: 'select',
              allow_multiple_values: false,
              config: {
                options: [
                  { value: 'active' },
                  { value: 'inactive' },
                  { value: 'pending' },
                ],
              },
            },
          ],
        },
      });

      const rules = await getFieldValidationRules('companies', 'status');

      expect(rules).toHaveProperty('enum', ['active', 'inactive', 'pending']);
    });
  });
});
