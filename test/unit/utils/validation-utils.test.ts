/**
 * Unit tests for enhanced validation utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateSelectField,
  validateMultiSelectField,
  validateReadOnlyFields,
  suggestFieldName,
  validateFieldExistence,
  validateRecordFields,
  getResourceAttributes,
  clearAttributeCache,
} from '../../../src/utils/validation-utils.js';

// Mock the Attio client
const mockGet = vi.fn();
vi.mock('../../../src/api/attio-client.js', () => ({
  getAttioClient: () => ({
    get: mockGet,
  }),
}));

describe('validation-utils', () => {
  beforeEach(() => {
    clearAttributeCache();
    mockGet.mockClear();
  });

  afterEach(() => {
    clearAttributeCache();
  });

  describe('getResourceAttributes', () => {
    it('should fetch and cache resource attributes', async () => {
      const mockAttributes = [
        { api_slug: 'name', type: 'text', title: 'Name' },
        {
          api_slug: 'company_type',
          type: 'select',
          title: 'Type',
          options: [
            { title: 'Startup', value: 'startup' },
            { title: 'Enterprise', value: 'enterprise' },
          ],
        },
      ];

      mockGet.mockResolvedValueOnce({
        data: { data: mockAttributes },
      });

      const result = await getResourceAttributes('companies');

      expect(mockGet).toHaveBeenCalledWith('/objects/companies/attributes');
      expect(result).toEqual(mockAttributes);

      // Second call should use cache
      await getResourceAttributes('companies');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('API Error'));

      const result = await getResourceAttributes('companies');

      expect(result).toEqual([]);
    });
  });

  describe('validateSelectField', () => {
    beforeEach(() => {
      const mockAttributes = [
        {
          api_slug: 'company_type',
          type: 'select',
          options: [
            { title: 'Startup', value: 'startup' },
            { title: 'Enterprise', value: 'enterprise' },
            { title: 'Small Business', value: 'small_business' },
            { title: 'Non Profit', value: 'non_profit' },
          ],
        },
        { api_slug: 'name', type: 'text' },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should validate valid select option', async () => {
      const result = await validateSelectField(
        'companies',
        'company_type',
        'startup'
      );

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid select option with helpful message', async () => {
      const result = await validateSelectField(
        'companies',
        'company_type',
        'invalid_option'
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Invalid value 'invalid_option' for field 'company_type'"
      );
      expect(result.error).toContain(
        "Valid options are: ['Startup', 'Enterprise', 'Small Business', 'Non Profit']"
      );
      expect(result.error).toContain('Please choose one of the valid values');
    });

    it('should pass validation for non-select fields', async () => {
      const result = await validateSelectField(
        'companies',
        'name',
        'any_value'
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle missing field gracefully', async () => {
      const result = await validateSelectField(
        'companies',
        'non_existent_field',
        'value'
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMultiSelectField', () => {
    beforeEach(() => {
      const mockAttributes = [
        {
          api_slug: 'tags',
          type: 'multi_select',
          options: [
            { title: 'Important', value: 'important' },
            { title: 'Urgent', value: 'urgent' },
            { title: 'Follow Up', value: 'follow_up' },
          ],
        },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should validate valid multi-select options', async () => {
      const result = await validateMultiSelectField('companies', 'tags', [
        'important',
        'urgent',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid multi-select options', async () => {
      const result = await validateMultiSelectField('companies', 'tags', [
        'important',
        'invalid_tag',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Invalid values ['invalid_tag'] for multi-select field 'tags'"
      );
      expect(result.error).toContain(
        "Valid options are: ['Important', 'Urgent', 'Follow Up']"
      );
    });
  });

  describe('validateReadOnlyFields', () => {
    beforeEach(() => {
      const mockAttributes = [
        { api_slug: 'created_at', type: 'datetime', read_only: true },
        { api_slug: 'updated_at', type: 'datetime', read_only: true },
        { api_slug: 'name', type: 'text', read_only: false },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should pass validation when no read-only fields are updated', async () => {
      const result = await validateReadOnlyFields('companies', {
        name: 'Test Company',
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject updates to single read-only field', async () => {
      const result = await validateReadOnlyFields('companies', {
        name: 'Test Company',
        created_at: '2024-01-01T00:00:00Z',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Cannot update read-only field 'created_at'"
      );
      expect(result.error).toContain('automatically managed by the system');
      expect(result.error).toContain(
        'Remove this field from your update request'
      );
    });

    it('should reject updates to multiple read-only fields', async () => {
      const result = await validateReadOnlyFields('companies', {
        name: 'Test Company',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Cannot update read-only fields 'created_at', 'updated_at'"
      );
      expect(result.error).toContain(
        'Remove these fields from your update request'
      );
    });
  });

  describe('suggestFieldName', () => {
    beforeEach(() => {
      const mockAttributes = [
        { api_slug: 'name', type: 'text' },
        { api_slug: 'company_name', type: 'text' },
        { api_slug: 'description', type: 'text' },
        { api_slug: 'notes', type: 'text' },
        { api_slug: 'website', type: 'text' },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should suggest similar field names for typos', async () => {
      const suggestions = await suggestFieldName('companies', 'companyname');

      expect(suggestions).toContain('company_name');
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should suggest field names based on similarity', async () => {
      const suggestions = await suggestFieldName('companies', 'descriptin');

      expect(suggestions).toContain('description');
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for very dissimilar names', async () => {
      const suggestions = await suggestFieldName('companies', 'xyz123456');

      expect(suggestions).toEqual([]);
    });

    it('should handle exact matches', async () => {
      const suggestions = await suggestFieldName('companies', 'name');

      expect(suggestions).toContain('name');
    });
  });

  describe('validateFieldExistence', () => {
    beforeEach(() => {
      const mockAttributes = [
        { api_slug: 'name', type: 'text' },
        { api_slug: 'description', type: 'text' },
        { api_slug: 'notes', type: 'text' },
        { api_slug: 'website', type: 'text' },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should validate existing fields', async () => {
      const result = await validateFieldExistence('companies', [
        'name',
        'website',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject unknown fields with suggestions', async () => {
      const result = await validateFieldExistence('companies', ['descriptin']);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "Unknown field 'descriptin' for resource type 'companies'"
      );
      expect(result.error).toContain('Did you mean: ');
      expect(result.error).toContain(
        'Use get-attributes to see all available fields'
      );
    });

    it('should handle multiple field validation', async () => {
      const result = await validateFieldExistence('companies', [
        'name',
        'invalid_field',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unknown field 'invalid_field'");
    });
  });

  describe('validateRecordFields', () => {
    beforeEach(() => {
      const mockAttributes = [
        { api_slug: 'name', type: 'text', read_only: false },
        { api_slug: 'created_at', type: 'datetime', read_only: true },
        {
          api_slug: 'company_type',
          type: 'select',
          read_only: false,
          options: [
            { title: 'Startup', value: 'startup' },
            { title: 'Enterprise', value: 'enterprise' },
          ],
        },
      ];

      mockGet.mockResolvedValue({
        data: { data: mockAttributes },
      });
    });

    it('should validate valid record fields for creation', async () => {
      const result = await validateRecordFields(
        'companies',
        {
          name: 'Test Company',
          company_type: 'startup',
        },
        false
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate valid record fields for update', async () => {
      const result = await validateRecordFields(
        'companies',
        {
          name: 'Updated Company',
          company_type: 'enterprise',
        },
        true
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject read-only fields in updates', async () => {
      const result = await validateRecordFields(
        'companies',
        {
          name: 'Test Company',
          created_at: '2024-01-01T00:00:00Z',
        },
        true
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot update read-only field');
    });

    it('should reject invalid select options', async () => {
      const result = await validateRecordFields(
        'companies',
        {
          name: 'Test Company',
          company_type: 'invalid_type',
        },
        false
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid value');
      expect(result.error).toContain('company_type');
    });

    it('should reject unknown fields', async () => {
      const result = await validateRecordFields(
        'companies',
        {
          invalid_field: 'value',
        },
        false
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown field');
    });
  });
});
