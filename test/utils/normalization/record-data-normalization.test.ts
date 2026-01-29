/**
 * Tests for RecordDataNormalizer
 *
 * @see Issue #1099 - SRP compliance and input normalization
 */
import { describe, it, expect } from 'vitest';
import { RecordDataNormalizer } from '../../../src/utils/normalization/record-data-normalization.js';

describe('RecordDataNormalizer', () => {
  describe('needsNormalization', () => {
    it('should return false for null or undefined', () => {
      expect(RecordDataNormalizer.needsNormalization(null)).toBe(false);
      expect(RecordDataNormalizer.needsNormalization(undefined)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(RecordDataNormalizer.needsNormalization([])).toBe(false);
      expect(RecordDataNormalizer.needsNormalization([1, 2, 3])).toBe(false);
    });

    it('should return false when record_data is already present', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: { name: 'Test' },
      };
      expect(RecordDataNormalizer.needsNormalization(params)).toBe(false);
    });

    it('should return true when data field is present but not record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        data: { name: 'Test' },
      };
      expect(RecordDataNormalizer.needsNormalization(params)).toBe(true);
    });

    it('should return true when extra fields are present', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test Company',
        status: 'active',
      };
      expect(RecordDataNormalizer.needsNormalization(params)).toBe(true);
    });

    it('should return false for params with only standard fields', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        return_details: true,
      };
      expect(RecordDataNormalizer.needsNormalization(params)).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should return empty object for invalid input', () => {
      expect(RecordDataNormalizer.normalize(null)).toEqual({});
      expect(RecordDataNormalizer.normalize(undefined)).toEqual({});
      expect(RecordDataNormalizer.normalize([])).toEqual({});
    });

    it('should map data field to record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        data: { name: 'Test', status: 'active' },
      };
      const result = RecordDataNormalizer.normalize(params);

      expect(result.resource_type).toBe('companies');
      expect(result.record_id).toBe('comp_123');
      expect(result.record_data).toEqual({ name: 'Test', status: 'active' });
      // Should NOT have data field in result
      expect(result).not.toHaveProperty('data');
    });

    it('should throw clear error when data is not an object', () => {
      expect(() =>
        RecordDataNormalizer.normalize({
          resource_type: 'companies',
          record_id: 'comp_123',
          data: 'not an object',
        })
      ).toThrow('`data` must be an object');

      expect(() =>
        RecordDataNormalizer.normalize({
          resource_type: 'companies',
          record_id: 'comp_123',
          data: 123,
        })
      ).toThrow('`data` must be an object');

      expect(() =>
        RecordDataNormalizer.normalize({
          resource_type: 'companies',
          record_id: 'comp_123',
          data: ['array'],
        })
      ).toThrow('`data` must be an object');
    });

    it('should collect extra fields into record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test Company',
        website: 'https://example.com',
        return_details: true,
      };
      const result = RecordDataNormalizer.normalize(params);

      expect(result.resource_type).toBe('companies');
      expect(result.record_id).toBe('comp_123');
      expect(result.return_details).toBe(true);
      expect(result.record_data).toEqual({
        name: 'Test Company',
        website: 'https://example.com',
      });
      // Should NOT have flat fields in result
      expect(result).not.toHaveProperty('name');
      expect(result).not.toHaveProperty('website');
    });

    it('should not mutate the original params', () => {
      const original = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test Company',
      };
      const originalCopy = JSON.parse(JSON.stringify(original));

      RecordDataNormalizer.normalize(original);

      expect(original).toEqual(originalCopy);
    });

    it('should preserve return_details when present', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        data: { name: 'Test' },
        return_details: true,
      };
      const result = RecordDataNormalizer.normalize(params);

      expect(result.return_details).toBe(true);
    });

    it('should handle nested objects in data field', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        data: {
          name: 'Test',
          metadata: { key: 'value' },
        },
      };
      const result = RecordDataNormalizer.normalize(params);

      expect(result.record_data).toEqual({
        name: 'Test',
        metadata: { key: 'value' },
      });
    });

    it('should return clean object without leftover fields', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        name: 'Test',
        website: 'https://example.com',
        extra_field: 'should be in record_data',
      };
      const result = RecordDataNormalizer.normalize(params);

      // Result should only have standard fields
      const keys = Object.keys(result);
      expect(keys).toEqual(
        expect.arrayContaining(['resource_type', 'record_id', 'record_data'])
      );
      expect(keys).not.toContain('name');
      expect(keys).not.toContain('website');
      expect(keys).not.toContain('extra_field');
    });
  });
});
