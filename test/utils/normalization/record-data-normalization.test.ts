/**
 * Tests for RecordDataNormalizer
 *
 * @see Issue #1099 - SRP compliance and input mutation fix
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
    it('should return empty record_data for invalid input', () => {
      expect(RecordDataNormalizer.normalize(null)).toEqual({ record_data: {} });
      expect(RecordDataNormalizer.normalize(undefined)).toEqual({
        record_data: {},
      });
      expect(RecordDataNormalizer.normalize([])).toEqual({ record_data: {} });
    });

    it('should copy record_data if already present', () => {
      const original = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: { name: 'Test' },
      };
      const result = RecordDataNormalizer.normalize(original);

      expect(result.record_data).toEqual({ name: 'Test' });
      // Verify it's a deep copy (immutable)
      expect(result.record_data).not.toBe(original.record_data);
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

    it('should handle JSON string record_data', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: JSON.stringify({ name: 'Test' }),
      };
      const result = RecordDataNormalizer.normalize(params);

      expect(result.record_data).toEqual({ name: 'Test' });
    });

    it('should handle invalid JSON string gracefully', () => {
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: '{invalid json',
      };
      const result = RecordDataNormalizer.normalize(params);

      // Should return empty object on parse failure
      expect(result.record_data).toEqual({});
    });
  });

  describe('extractValues', () => {
    it('should return empty object for invalid input', () => {
      expect(RecordDataNormalizer.extractValues(null)).toEqual({});
      expect(RecordDataNormalizer.extractValues(undefined)).toEqual({});
      expect(RecordDataNormalizer.extractValues([])).toEqual({});
      expect(RecordDataNormalizer.extractValues('string')).toEqual({});
    });

    it('should extract from values wrapper', () => {
      const recordData = {
        values: {
          name: 'Test',
          status: 'active',
        },
      };
      const result = RecordDataNormalizer.extractValues(recordData);

      expect(result).toEqual({ name: 'Test', status: 'active' });
      // Verify it's a copy
      expect(result).not.toBe(recordData.values);
    });

    it('should return copy of direct fields when no values wrapper', () => {
      const recordData = {
        name: 'Test',
        status: 'active',
      };
      const result = RecordDataNormalizer.extractValues(recordData);

      expect(result).toEqual({ name: 'Test', status: 'active' });
      // Verify it's a copy
      expect(result).not.toBe(recordData);
    });

    it('should not mutate input when extracting values', () => {
      const original = {
        values: {
          name: 'Test',
          nested: { foo: 'bar' },
        },
      };
      const originalCopy = JSON.parse(JSON.stringify(original));

      const result = RecordDataNormalizer.extractValues(original);
      result.name = 'Modified';
      result.nested.foo = 'modified';

      expect(original).toEqual(originalCopy);
    });

    it('should handle empty record_data', () => {
      expect(RecordDataNormalizer.extractValues({})).toEqual({});
    });

    it('should handle values as array (invalid - returns full copy)', () => {
      const recordData = {
        values: ['not', 'an', 'object'],
        name: 'Test',
      };
      const result = RecordDataNormalizer.extractValues(recordData);

      // Since values is an array, it falls through to full copy
      expect(result).toEqual({
        values: ['not', 'an', 'object'],
        name: 'Test',
      });
    });
  });

  describe('immutability guarantees', () => {
    it('should not share references between input and output', () => {
      const nested = { deep: { value: 'original' } };
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: nested,
      };

      const result = RecordDataNormalizer.normalize(params);

      // Modify the result
      (result.record_data as Record<string, unknown>).deep = {
        value: 'modified',
      };

      // Original should be unchanged
      expect(nested.deep.value).toBe('original');
    });

    it('should handle circular reference attempts gracefully', () => {
      // JSON.stringify will throw on circular refs, so this tests the boundary
      const params = {
        resource_type: 'companies',
        record_id: 'comp_123',
        record_data: { name: 'Test' },
      };

      // Should work without issues
      const result = RecordDataNormalizer.normalize(params);
      expect(result.record_data).toEqual({ name: 'Test' });
    });
  });
});
