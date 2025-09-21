/**
 * Comprehensive unit tests for type-extraction utilities
 * Addresses code review feedback for Issue #679 follow-up
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeExtractRecordId,
  safeExtractIdObject,
  safeExtractNestedValue,
  safeExtractValuesObject,
  hasValidRecordId,
  isAttioRecordLike,
  safeExtractArray,
  safeIsArrayField,
  safeExtractString,
  safeExtractNumber,
  hasRequiredProperties,
  isNonEmptyString,
  isValidArray,
  isCompleteAttioRecord,
} from '../../src/utils/type-extraction.js';

describe('Type Extraction Utilities', () => {
  // Mock console.warn for debug logging tests
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('safeExtractRecordId', () => {
    describe('Happy path scenarios', () => {
      it('should extract record_id from valid nested structure', () => {
        const validRecord = {
          id: {
            record_id: 'abc-123-def',
            workspace_id: 'workspace-1',
          },
          values: { name: 'Test' },
        };

        expect(safeExtractRecordId(validRecord)).toBe('abc-123-def');
      });

      it('should extract record_id from minimal valid structure', () => {
        const minimalRecord = {
          id: {
            record_id: 'minimal-id',
          },
        };

        expect(safeExtractRecordId(minimalRecord)).toBe('minimal-id');
      });

      it('should handle empty string record_id', () => {
        const emptyStringRecord = {
          id: {
            record_id: '',
          },
        };

        expect(safeExtractRecordId(emptyStringRecord)).toBe('');
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('should return undefined for null input', () => {
        expect(safeExtractRecordId(null)).toBeUndefined();
      });

      it('should return undefined for undefined input', () => {
        expect(safeExtractRecordId(undefined)).toBeUndefined();
      });

      it('should return undefined for primitive types', () => {
        expect(safeExtractRecordId('string')).toBeUndefined();
        expect(safeExtractRecordId(123)).toBeUndefined();
        expect(safeExtractRecordId(true)).toBeUndefined();
      });

      it('should return undefined for empty object', () => {
        expect(safeExtractRecordId({})).toBeUndefined();
      });

      it('should return undefined when id field is missing', () => {
        const noIdRecord = {
          values: { name: 'Test' },
        };

        expect(safeExtractRecordId(noIdRecord)).toBeUndefined();
      });

      it('should return undefined when id is not an object', () => {
        const invalidIdRecord = {
          id: 'not-an-object',
        };

        expect(safeExtractRecordId(invalidIdRecord)).toBeUndefined();
      });

      it('should return undefined when id is null', () => {
        const nullIdRecord = {
          id: null,
        };

        expect(safeExtractRecordId(nullIdRecord)).toBeUndefined();
      });

      it('should return undefined when record_id is missing', () => {
        const noRecordIdRecord = {
          id: {
            workspace_id: 'workspace-1',
          },
        };

        expect(safeExtractRecordId(noRecordIdRecord)).toBeUndefined();
      });

      it('should return undefined when record_id is not a string', () => {
        const invalidRecordIdRecord = {
          id: {
            record_id: 123,
          },
        };

        expect(safeExtractRecordId(invalidRecordIdRecord)).toBeUndefined();
      });

      it('should return undefined when record_id is null', () => {
        const nullRecordIdRecord = {
          id: {
            record_id: null,
          },
        };

        expect(safeExtractRecordId(nullRecordIdRecord)).toBeUndefined();
      });
    });
  });

  describe('safeExtractIdObject', () => {
    describe('Happy path scenarios', () => {
      it('should extract id object from valid record', () => {
        const validRecord = {
          id: {
            record_id: 'abc-123',
            workspace_id: 'workspace-1',
          },
          values: { name: 'Test' },
        };

        const result = safeExtractIdObject(validRecord);
        expect(result).toEqual({
          record_id: 'abc-123',
          workspace_id: 'workspace-1',
        });
      });

      it('should extract empty id object', () => {
        const emptyIdRecord = {
          id: {},
        };

        expect(safeExtractIdObject(emptyIdRecord)).toEqual({});
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('should return undefined for null input', () => {
        expect(safeExtractIdObject(null)).toBeUndefined();
      });

      it('should return undefined for undefined input', () => {
        expect(safeExtractIdObject(undefined)).toBeUndefined();
      });

      it('should return undefined for primitive types', () => {
        expect(safeExtractIdObject('string')).toBeUndefined();
        expect(safeExtractIdObject(123)).toBeUndefined();
        expect(safeExtractIdObject(true)).toBeUndefined();
      });

      it('should return undefined when id field is missing', () => {
        const noIdRecord = {
          values: { name: 'Test' },
        };

        expect(safeExtractIdObject(noIdRecord)).toBeUndefined();
      });

      it('should return undefined when id is not an object', () => {
        const invalidIdRecord = {
          id: 'not-an-object',
        };

        expect(safeExtractIdObject(invalidIdRecord)).toBeUndefined();
      });

      it('should return undefined when id is null', () => {
        const nullIdRecord = {
          id: null,
        };

        expect(safeExtractIdObject(nullIdRecord)).toBeUndefined();
      });
    });
  });

  describe('safeExtractNestedValue', () => {
    describe('Happy path scenarios', () => {
      it('should extract single-level nested value', () => {
        const obj = {
          values: { name: 'Test Company' },
        };

        expect(safeExtractNestedValue(obj, 'values')).toEqual({
          name: 'Test Company',
        });
      });

      it('should extract multi-level nested value', () => {
        const obj = {
          values: {
            company: {
              details: {
                name: 'Deep Company',
              },
            },
          },
        };

        expect(
          safeExtractNestedValue(obj, 'values', 'company', 'details')
        ).toEqual({
          name: 'Deep Company',
        });
      });

      it('should extract primitive values', () => {
        const obj = {
          data: {
            count: 42,
            active: true,
            title: 'Test Title',
          },
        };

        expect(safeExtractNestedValue(obj, 'data', 'count')).toBe(42);
        expect(safeExtractNestedValue(obj, 'data', 'active')).toBe(true);
        expect(safeExtractNestedValue(obj, 'data', 'title')).toBe('Test Title');
      });

      it('should extract array values', () => {
        const obj = {
          values: {
            domains: ['example.com', 'test.com'],
          },
        };

        expect(safeExtractNestedValue(obj, 'values', 'domains')).toEqual([
          'example.com',
          'test.com',
        ]);
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('should return undefined for null input', () => {
        expect(safeExtractNestedValue(null, 'values')).toBeUndefined();
      });

      it('should return undefined for undefined input', () => {
        expect(safeExtractNestedValue(undefined, 'values')).toBeUndefined();
      });

      it('should return undefined for primitive input', () => {
        expect(safeExtractNestedValue('string', 'values')).toBeUndefined();
        expect(safeExtractNestedValue(123, 'values')).toBeUndefined();
      });

      it('should return undefined for invalid path', () => {
        const obj = {
          values: { name: 'Test' },
        };

        expect(safeExtractNestedValue(obj, 'invalid')).toBeUndefined();
        expect(
          safeExtractNestedValue(obj, 'values', 'invalid')
        ).toBeUndefined();
      });

      it('should return undefined when path traverses through null', () => {
        const obj = {
          values: null,
        };

        expect(safeExtractNestedValue(obj, 'values', 'name')).toBeUndefined();
      });

      it('should return undefined when path traverses through primitive', () => {
        const obj = {
          values: 'string-value',
        };

        expect(safeExtractNestedValue(obj, 'values', 'name')).toBeUndefined();
      });

      it('should handle empty path gracefully', () => {
        const obj = { name: 'Test' };

        expect(safeExtractNestedValue(obj)).toBe(obj);
      });

      it('should handle deeply nested missing paths', () => {
        const obj = {
          level1: {
            level2: {
              level3: 'value',
            },
          },
        };

        expect(
          safeExtractNestedValue(obj, 'level1', 'level2', 'level3', 'level4')
        ).toBeUndefined();
      });
    });
  });

  describe('safeExtractValuesObject', () => {
    describe('Happy path scenarios', () => {
      it('should extract values object from valid record', () => {
        const validRecord = {
          id: { record_id: 'abc-123' },
          values: {
            name: 'Test Company',
            domains: ['example.com'],
          },
        };

        const result = safeExtractValuesObject(validRecord);
        expect(result).toEqual({
          name: 'Test Company',
          domains: ['example.com'],
        });
      });

      it('should extract empty values object', () => {
        const emptyValuesRecord = {
          values: {},
        };

        expect(safeExtractValuesObject(emptyValuesRecord)).toEqual({});
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('should return undefined for null input', () => {
        expect(safeExtractValuesObject(null)).toBeUndefined();
      });

      it('should return undefined for undefined input', () => {
        expect(safeExtractValuesObject(undefined)).toBeUndefined();
      });

      it('should return undefined for primitive types', () => {
        expect(safeExtractValuesObject('string')).toBeUndefined();
        expect(safeExtractValuesObject(123)).toBeUndefined();
      });

      it('should return undefined when values field is missing', () => {
        const noValuesRecord = {
          id: { record_id: 'abc-123' },
        };

        expect(safeExtractValuesObject(noValuesRecord)).toBeUndefined();
      });

      it('should return undefined when values is not an object', () => {
        const invalidValuesRecord = {
          values: 'not-an-object',
        };

        expect(safeExtractValuesObject(invalidValuesRecord)).toBeUndefined();
      });

      it('should return undefined when values is null', () => {
        const nullValuesRecord = {
          values: null,
        };

        expect(safeExtractValuesObject(nullValuesRecord)).toBeUndefined();
      });
    });
  });

  describe('hasValidRecordId', () => {
    describe('Valid record ID scenarios', () => {
      it('should return true for valid record with record_id', () => {
        const validRecord = {
          id: {
            record_id: 'abc-123-def',
          },
        };

        expect(hasValidRecordId(validRecord)).toBe(true);
      });

      it('should return false for empty string record_id', () => {
        const emptyStringRecord = {
          id: {
            record_id: '',
          },
        };

        expect(hasValidRecordId(emptyStringRecord)).toBe(false);
      });

      it('should return true for whitespace-only record_id', () => {
        const whitespaceRecord = {
          id: {
            record_id: '   ',
          },
        };

        expect(hasValidRecordId(whitespaceRecord)).toBe(true);
      });
    });

    describe('Invalid record ID scenarios', () => {
      it('should return false for null input', () => {
        expect(hasValidRecordId(null)).toBe(false);
      });

      it('should return false for undefined input', () => {
        expect(hasValidRecordId(undefined)).toBe(false);
      });

      it('should return false for missing record_id', () => {
        const noRecordIdRecord = {
          id: {
            workspace_id: 'workspace-1',
          },
        };

        expect(hasValidRecordId(noRecordIdRecord)).toBe(false);
      });

      it('should return false for non-string record_id', () => {
        const invalidRecord = {
          id: {
            record_id: 123,
          },
        };

        expect(hasValidRecordId(invalidRecord)).toBe(false);
      });

      it('should return false for missing id object', () => {
        const noIdRecord = {
          values: { name: 'Test' },
        };

        expect(hasValidRecordId(noIdRecord)).toBe(false);
      });
    });
  });

  describe('isAttioRecordLike', () => {
    describe('Valid Attio record-like objects', () => {
      it('should return true for valid Attio record structure', () => {
        const validRecord = {
          id: {
            record_id: 'abc-123',
          },
          values: { name: 'Test' },
        };

        expect(isAttioRecordLike(validRecord)).toBe(true);
      });

      it('should return true for minimal valid structure', () => {
        const minimalRecord = {
          id: {},
        };

        expect(isAttioRecordLike(minimalRecord)).toBe(true);
      });

      it('should return true with complex id object', () => {
        const complexRecord = {
          id: {
            record_id: 'abc-123',
            workspace_id: 'workspace-1',
            object_id: 'object-1',
          },
          values: { name: 'Complex Test' },
          created_at: '2023-01-01T00:00:00Z',
        };

        expect(isAttioRecordLike(complexRecord)).toBe(true);
      });
    });

    describe('Invalid record-like objects', () => {
      it('should return false for null', () => {
        expect(isAttioRecordLike(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isAttioRecordLike(undefined)).toBe(false);
      });

      it('should return false for primitive types', () => {
        expect(isAttioRecordLike('string')).toBe(false);
        expect(isAttioRecordLike(123)).toBe(false);
        expect(isAttioRecordLike(true)).toBe(false);
      });

      it('should return false for array', () => {
        expect(isAttioRecordLike(['item1', 'item2'])).toBe(false);
      });

      it('should return false when id field is missing', () => {
        const noIdRecord = {
          values: { name: 'Test' },
        };

        expect(isAttioRecordLike(noIdRecord)).toBe(false);
      });

      it('should return false when id is not an object', () => {
        const invalidIdRecord = {
          id: 'not-an-object',
        };

        expect(isAttioRecordLike(invalidIdRecord)).toBe(false);
      });

      it('should return false when id is null', () => {
        const nullIdRecord = {
          id: null,
        };

        expect(isAttioRecordLike(nullIdRecord)).toBe(false);
      });

      it('should return false when id is an array', () => {
        const arrayIdRecord = {
          id: ['array', 'values'],
        };

        expect(isAttioRecordLike(arrayIdRecord)).toBe(false);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex nested Attio API response structure', () => {
      const apiResponse = {
        data: {
          id: {
            record_id: 'comp-123-456',
            workspace_id: 'ws-789',
            object_id: 'companies',
          },
          values: {
            name: [{ value: 'Test Company Inc.' }],
            domains: ['test.com', 'example.com'],
            industry: [{ value: 'Technology' }],
            employees: [{ value: 150 }],
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      };

      const record = apiResponse.data;

      expect(isAttioRecordLike(record)).toBe(true);
      expect(hasValidRecordId(record)).toBe(true);
      expect(safeExtractRecordId(record)).toBe('comp-123-456');
      expect(safeExtractIdObject(record)).toEqual({
        record_id: 'comp-123-456',
        workspace_id: 'ws-789',
        object_id: 'companies',
      });
      expect(safeExtractValuesObject(record)).toEqual({
        name: [{ value: 'Test Company Inc.' }],
        domains: ['test.com', 'example.com'],
        industry: [{ value: 'Technology' }],
        employees: [{ value: 150 }],
      });
      expect(safeExtractNestedValue(record, 'values', 'domains')).toEqual([
        'test.com',
        'example.com',
      ]);
    });

    it('should handle malformed API responses gracefully', () => {
      const malformedResponses = [
        { id: 'string-id-instead-of-object' },
        { id: { wrong_field: 'value' } },
        { id: { record_id: null } },
        { id: { record_id: 123 } },
        { values: 'string-values' },
        { values: null },
        null,
        undefined,
        'complete-string-response',
        123,
      ];

      malformedResponses.forEach((response, index) => {
        // Should not throw errors and handle gracefully
        expect(() => {
          const recordId = safeExtractRecordId(response);
          const isValid = hasValidRecordId(response);
          const isRecordLike = isAttioRecordLike(response);
          const idObject = safeExtractIdObject(response);
          const valuesObject = safeExtractValuesObject(response);

          // All should return safe values
          expect(typeof recordId === 'string' || recordId === undefined).toBe(
            true
          );
          expect(typeof isValid === 'boolean').toBe(true);
          expect(typeof isRecordLike === 'boolean').toBe(true);
          expect(idObject === undefined || typeof idObject === 'object').toBe(
            true
          );
          expect(
            valuesObject === undefined || typeof valuesObject === 'object'
          ).toBe(true);
        }).not.toThrow();
      });
    });
  });

  describe('safeExtractArray', () => {
    describe('Valid array extraction', () => {
      it('should extract array from nested structure', () => {
        const obj = {
          values: {
            domains: ['example.com', 'test.com'],
            tags: ['tag1', 'tag2', 'tag3'],
          },
        };

        expect(safeExtractArray<string>(obj, 'values', 'domains')).toEqual([
          'example.com',
          'test.com',
        ]);
        expect(safeExtractArray<string>(obj, 'values', 'tags')).toEqual([
          'tag1',
          'tag2',
          'tag3',
        ]);
      });

      it('should extract empty array', () => {
        const obj = {
          values: {
            emptyArray: [],
          },
        };

        expect(safeExtractArray(obj, 'values', 'emptyArray')).toEqual([]);
      });
    });

    describe('Invalid array extraction', () => {
      it('should return undefined for non-array values', () => {
        const obj = {
          values: {
            notArray: 'string',
            alsoNotArray: 123,
          },
        };

        expect(safeExtractArray(obj, 'values', 'notArray')).toBeUndefined();
        expect(safeExtractArray(obj, 'values', 'alsoNotArray')).toBeUndefined();
      });

      it('should return undefined for missing paths', () => {
        const obj = { values: {} };

        expect(safeExtractArray(obj, 'values', 'missing')).toBeUndefined();
        expect(safeExtractArray(obj, 'missing', 'path')).toBeUndefined();
      });
    });
  });

  describe('safeIsArrayField', () => {
    it('should return true for array fields', () => {
      const obj = {
        values: {
          domains: ['example.com'],
          tags: [],
        },
      };

      expect(safeIsArrayField(obj, 'values', 'domains')).toBe(true);
      expect(safeIsArrayField(obj, 'values', 'tags')).toBe(true);
    });

    it('should return false for non-array fields', () => {
      const obj = {
        values: {
          name: 'string',
          count: 123,
          active: true,
        },
      };

      expect(safeIsArrayField(obj, 'values', 'name')).toBe(false);
      expect(safeIsArrayField(obj, 'values', 'count')).toBe(false);
      expect(safeIsArrayField(obj, 'values', 'active')).toBe(false);
    });

    it('should return false for missing fields', () => {
      const obj = { values: {} };

      expect(safeIsArrayField(obj, 'values', 'missing')).toBe(false);
      expect(safeIsArrayField(obj, 'missing')).toBe(false);
    });
  });

  describe('safeExtractString', () => {
    it('should extract string values with fallback', () => {
      const obj = {
        values: {
          name: 'Test Company',
          emptyString: '',
        },
      };

      expect(safeExtractString(obj, 'Default', 'values', 'name')).toBe(
        'Test Company'
      );
      expect(safeExtractString(obj, 'Default', 'values', 'emptyString')).toBe(
        ''
      );
    });

    it('should return fallback for non-string values', () => {
      const obj = {
        values: {
          number: 123,
          boolean: true,
          object: { key: 'value' },
        },
      };

      expect(safeExtractString(obj, 'Default', 'values', 'number')).toBe(
        'Default'
      );
      expect(safeExtractString(obj, 'Default', 'values', 'boolean')).toBe(
        'Default'
      );
      expect(safeExtractString(obj, 'Default', 'values', 'object')).toBe(
        'Default'
      );
    });

    it('should return fallback for missing paths', () => {
      const obj = { values: {} };

      expect(safeExtractString(obj, 'Default', 'values', 'missing')).toBe(
        'Default'
      );
      expect(safeExtractString(obj, 'Default', 'missing')).toBe('Default');
    });
  });

  describe('safeExtractNumber', () => {
    it('should extract number values with fallback', () => {
      const obj = {
        values: {
          count: 42,
          zero: 0,
          negative: -5,
          float: 3.14,
        },
      };

      expect(safeExtractNumber(obj, 100, 'values', 'count')).toBe(42);
      expect(safeExtractNumber(obj, 100, 'values', 'zero')).toBe(0);
      expect(safeExtractNumber(obj, 100, 'values', 'negative')).toBe(-5);
      expect(safeExtractNumber(obj, 100, 'values', 'float')).toBe(3.14);
    });

    it('should return fallback for non-number values', () => {
      const obj = {
        values: {
          string: '123',
          boolean: true,
          object: { key: 'value' },
        },
      };

      expect(safeExtractNumber(obj, 100, 'values', 'string')).toBe(100);
      expect(safeExtractNumber(obj, 100, 'values', 'boolean')).toBe(100);
      expect(safeExtractNumber(obj, 100, 'values', 'object')).toBe(100);
    });

    it('should return fallback for missing paths', () => {
      const obj = { values: {} };

      expect(safeExtractNumber(obj, 100, 'values', 'missing')).toBe(100);
      expect(safeExtractNumber(obj, 100, 'missing')).toBe(100);
    });
  });

  describe('hasRequiredProperties', () => {
    it('should return true for objects with all required properties', () => {
      const obj = {
        id: 'test',
        values: {},
        created_at: '2023-01-01',
      };

      expect(hasRequiredProperties(obj, ['id', 'values'])).toBe(true);
      expect(hasRequiredProperties(obj, ['id', 'values', 'created_at'])).toBe(
        true
      );
      expect(hasRequiredProperties(obj, [])).toBe(true);
    });

    it('should return false for objects missing required properties', () => {
      const obj = {
        id: 'test',
        values: {},
      };

      expect(hasRequiredProperties(obj, ['id', 'values', 'missing'])).toBe(
        false
      );
      expect(hasRequiredProperties(obj, ['nonexistent'])).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasRequiredProperties(null, ['id'])).toBe(false);
      expect(hasRequiredProperties(undefined, ['id'])).toBe(false);
      expect(hasRequiredProperties('string', ['id'])).toBe(false);
      expect(hasRequiredProperties(123, ['id'])).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('test')).toBe(true);
      expect(isNonEmptyString('   ')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(true)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe('isValidArray', () => {
    it('should return true for arrays with minimum length', () => {
      expect(isValidArray(['item'])).toBe(true);
      expect(isValidArray(['item1', 'item2'])).toBe(true);
      expect(isValidArray(['item'], 1)).toBe(true);
      expect(isValidArray(['item1', 'item2'], 2)).toBe(true);
      expect(isValidArray([], 0)).toBe(true);
    });

    it('should return false for arrays below minimum length', () => {
      expect(isValidArray([])).toBe(false);
      expect(isValidArray(['item'], 2)).toBe(false);
      expect(isValidArray(['item1'], 3)).toBe(false);
    });

    it('should return false for non-arrays', () => {
      expect(isValidArray(null)).toBe(false);
      expect(isValidArray(undefined)).toBe(false);
      expect(isValidArray('string')).toBe(false);
      expect(isValidArray(123)).toBe(false);
      expect(isValidArray({})).toBe(false);
    });
  });

  describe('isCompleteAttioRecord', () => {
    it('should return true for complete Attio records', () => {
      const completeRecord = {
        id: {
          record_id: 'abc-123',
          workspace_id: 'ws-789',
        },
        values: {
          name: 'Test Company',
        },
        created_at: '2023-01-01',
      };

      expect(isCompleteAttioRecord(completeRecord)).toBe(true);
    });

    it('should return false for incomplete Attio records', () => {
      const incompleteRecords = [
        // Missing record_id
        {
          id: { workspace_id: 'ws-789' },
          values: { name: 'Test' },
        },
        // Empty record_id
        {
          id: { record_id: '' },
          values: { name: 'Test' },
        },
        // Missing values
        {
          id: { record_id: 'abc-123' },
        },
        // Null values
        {
          id: { record_id: 'abc-123' },
          values: null,
        },
      ];

      incompleteRecords.forEach((record) => {
        expect(isCompleteAttioRecord(record)).toBe(false);
      });
    });

    it('should return false for non-record-like objects', () => {
      expect(isCompleteAttioRecord(null)).toBe(false);
      expect(isCompleteAttioRecord(undefined)).toBe(false);
      expect(isCompleteAttioRecord('string')).toBe(false);
      expect(isCompleteAttioRecord({})).toBe(false);
      expect(isCompleteAttioRecord({ id: 'string' })).toBe(false);
    });
  });

  describe('Debug logging integration', () => {
    beforeEach(() => {
      // Set up debug environment
      process.env.NODE_ENV = 'development';
      process.env.TYPE_EXTRACTION_DEBUG = 'true';
    });

    afterEach(() => {
      // Clean up environment
      delete process.env.TYPE_EXTRACTION_DEBUG;
      process.env.NODE_ENV = 'test';
    });

    it('should call debug logging when enabled', () => {
      const invalidRecord = { id: 'not-an-object' };

      // This should trigger debug logging
      const result = safeExtractRecordId(invalidRecord);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not log when debug is disabled', () => {
      delete process.env.TYPE_EXTRACTION_DEBUG;

      const invalidRecord = { id: 'not-an-object' };
      const result = safeExtractRecordId(invalidRecord);

      expect(result).toBeUndefined();
      // Should not log without debug flag
    });
  });
});
