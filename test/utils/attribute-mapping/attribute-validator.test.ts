/**
 * Unit tests for attribute validator
 */
import {
  type AttributeType,
  ValidationResult,
  validateAttributeValue,
} from '../../../src/validators/attribute-validator.js';

describe('Attribute Validator', () => {
  describe('validateAttributeValue', () => {
    // Boolean validation tests
    describe('Boolean validation', () => {
      it('should validate native boolean values', () => {
        expect(validateAttributeValue('is_active', true, 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('is_active', false, 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });
      });

      it('should convert string representations to boolean values', () => {
        // Truthy strings
        const truthyValues = [
          'true',
          'yes',
          '1',
          'on',
          'True',
          'YES',
          ' true ',
        ];

        truthyValues.forEach((value) => {
          expect(validateAttributeValue('is_active', value, 'boolean')).toEqual(
            {
              valid: true,
              convertedValue: true,
            }
          );
        });

        // Falsy strings
        const falsyValues = [
          'false',
          'no',
          '0',
          'off',
          'False',
          'NO',
          ' false ',
        ];

        falsyValues.forEach((value) => {
          expect(validateAttributeValue('is_active', value, 'boolean')).toEqual(
            {
              valid: true,
              convertedValue: false,
            }
          );
        });
      });

      it('should convert numeric values to boolean values', () => {
        expect(validateAttributeValue('is_active', 1, 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('is_active', 0, 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });
      });

      it('should reject unconvertible values with appropriate error messages', () => {
        const invalidValues = ['maybe', 'invalid', 2, {}, []];

        invalidValues.forEach((value) => {
          const result = validateAttributeValue('is_active', value, 'boolean');
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid boolean value');
          expect(result.error).toContain('is_active');
        });
      });
    });

    // Number validation tests
    describe('Number validation', () => {
      it('should validate native number values', () => {
        expect(validateAttributeValue('revenue', 10_000, 'number')).toEqual({
          valid: true,
          convertedValue: 10_000,
        });

        expect(validateAttributeValue('revenue', 0, 'number')).toEqual({
          valid: true,
          convertedValue: 0,
        });

        expect(validateAttributeValue('revenue', -50.75, 'number')).toEqual({
          valid: true,
          convertedValue: -50.75,
        });
      });

      it('should convert numeric strings to numbers', () => {
        expect(validateAttributeValue('revenue', '10000', 'number')).toEqual({
          valid: true,
          convertedValue: 10_000,
        });

        expect(validateAttributeValue('revenue', '0', 'number')).toEqual({
          valid: true,
          convertedValue: 0,
        });

        expect(validateAttributeValue('revenue', '-50.75', 'number')).toEqual({
          valid: true,
          convertedValue: -50.75,
        });

        expect(validateAttributeValue('revenue', ' 12345 ', 'number')).toEqual({
          valid: true,
          convertedValue: 12_345,
        });
      });

      it('should convert boolean values to numbers', () => {
        expect(validateAttributeValue('binary_value', true, 'number')).toEqual({
          valid: true,
          convertedValue: 1,
        });

        expect(validateAttributeValue('binary_value', false, 'number')).toEqual(
          {
            valid: true,
            convertedValue: 0,
          }
        );
      });

      it('should reject unconvertible values with appropriate error messages', () => {
        const invalidValues = ['not-a-number', 'abc123', {}, [], 'NaN'];

        invalidValues.forEach((value) => {
          const result = validateAttributeValue('revenue', value, 'number');
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid number value');
          expect(result.error).toContain('revenue');
        });
      });
    });

    // String validation tests
    describe('String validation', () => {
      it('should validate native string values', () => {
        expect(validateAttributeValue('name', 'Acme Corp', 'string')).toEqual({
          valid: true,
          convertedValue: 'Acme Corp',
        });

        expect(validateAttributeValue('name', '', 'string')).toEqual({
          valid: true,
          convertedValue: '',
        });
      });

      it('should convert number values to strings', () => {
        expect(validateAttributeValue('name', 12_345, 'string')).toEqual({
          valid: true,
          convertedValue: '12345',
        });

        expect(validateAttributeValue('name', 0, 'string')).toEqual({
          valid: true,
          convertedValue: '0',
        });

        expect(validateAttributeValue('name', -50.75, 'string')).toEqual({
          valid: true,
          convertedValue: '-50.75',
        });
      });

      it('should convert boolean values to strings', () => {
        expect(validateAttributeValue('name', true, 'string')).toEqual({
          valid: true,
          convertedValue: 'true',
        });

        expect(validateAttributeValue('name', false, 'string')).toEqual({
          valid: true,
          convertedValue: 'false',
        });
      });

      it('should convert date objects to ISO strings', () => {
        const testDate = new Date('2023-05-15T14:30:00Z');
        expect(
          validateAttributeValue('date_string', testDate, 'string')
        ).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });

      it('should try to convert objects to JSON strings', () => {
        const testObj = { id: 123, name: 'Test' };
        expect(
          validateAttributeValue('json_string', testObj, 'string')
        ).toEqual({
          valid: true,
          convertedValue: JSON.stringify(testObj),
        });
      });
    });

    // Date validation tests
    describe('Date validation', () => {
      it('should validate date objects', () => {
        const testDate = new Date('2023-05-15T14:30:00Z');
        expect(validateAttributeValue('created_at', testDate, 'date')).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });

      it('should reject invalid date objects', () => {
        const invalidDate = new Date('invalid date');
        const result = validateAttributeValue(
          'created_at',
          invalidDate,
          'date'
        );
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid date value');
      });

      it('should convert ISO date strings to dates', () => {
        const dateStr = '2023-05-15T14:30:00Z';
        const expectedDate = new Date(dateStr).toISOString();
        const result = validateAttributeValue('created_at', dateStr, 'date');

        expect(result.valid).toBe(true);
        expect(result.convertedValue).toBe(expectedDate);
      });

      it('should convert various date string formats', () => {
        const dateFormats = ['2023-05-15', '05/15/2023', 'May 15, 2023'];

        dateFormats.forEach((dateStr) => {
          const result = validateAttributeValue('created_at', dateStr, 'date');
          expect(result.valid).toBe(true);
          expect(typeof result.convertedValue).toBe('string');
          // The format should be an ISO string
          expect(result.convertedValue).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
          );
        });
      });

      it('should convert Unix timestamps (milliseconds) to date strings', () => {
        const timestamp = 1_684_162_200_000; // 2023-05-15T14:30:00Z
        const expectedDate = new Date(timestamp).toISOString();

        expect(validateAttributeValue('created_at', timestamp, 'date')).toEqual(
          {
            valid: true,
            convertedValue: expectedDate,
          }
        );
      });

      it('should convert Unix timestamps (seconds) to date strings', () => {
        const timestamp = 1_684_162_200; // 2023-05-15T14:30:00Z in seconds
        const expectedDate = new Date(timestamp * 1000).toISOString();

        expect(validateAttributeValue('created_at', timestamp, 'date')).toEqual(
          {
            valid: true,
            convertedValue: expectedDate,
          }
        );
      });

      it('should reject unconvertible values with appropriate error messages', () => {
        const invalidValues = ['not-a-date', 'tomorrow', true, {}, []];

        invalidValues.forEach((value) => {
          const result = validateAttributeValue('created_at', value, 'date');
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid date value');
          expect(result.error).toContain('created_at');
        });
      });
    });

    // Array validation tests
    describe('Array validation', () => {
      it('should validate native array values', () => {
        expect(
          validateAttributeValue('tags', ['tag1', 'tag2'], 'array')
        ).toEqual({
          valid: true,
          convertedValue: ['tag1', 'tag2'],
        });

        expect(validateAttributeValue('tags', [], 'array')).toEqual({
          valid: true,
          convertedValue: [],
        });
      });

      it('should convert non-array values to single-item arrays', () => {
        expect(validateAttributeValue('tags', 'single-tag', 'array')).toEqual({
          valid: true,
          convertedValue: ['single-tag'],
        });

        expect(validateAttributeValue('values', 123, 'array')).toEqual({
          valid: true,
          convertedValue: [123],
        });

        expect(validateAttributeValue('flags', true, 'array')).toEqual({
          valid: true,
          convertedValue: [true],
        });
      });
    });

    // Object validation tests
    describe('Object validation', () => {
      it('should validate plain object values', () => {
        const testObj = { id: 123, name: 'Test' };
        expect(validateAttributeValue('metadata', testObj, 'object')).toEqual({
          valid: true,
          convertedValue: testObj,
        });

        expect(validateAttributeValue('metadata', {}, 'object')).toEqual({
          valid: true,
          convertedValue: {},
        });
      });

      it('should reject non-object values', () => {
        const invalidValues = ['string', 123, true, [1, 2, 3]];

        invalidValues.forEach((value) => {
          const result = validateAttributeValue('metadata', value, 'object');
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid object value');
          expect(result.error).toContain('metadata');
        });
      });
    });

    // Select validation tests
    describe('Select validation', () => {
      it('should validate string option values', () => {
        expect(validateAttributeValue('status', 'active', 'select')).toEqual({
          valid: true,
          convertedValue: 'active',
        });
      });

      it('should validate array of option values', () => {
        expect(
          validateAttributeValue('categories', ['software', 'tech'], 'select')
        ).toEqual({
          valid: true,
          convertedValue: ['software', 'tech'],
        });
      });

      it('should convert non-string values to strings in arrays', () => {
        expect(
          validateAttributeValue('categories', [1, true], 'select')
        ).toEqual({
          valid: true,
          convertedValue: ['1', 'true'],
        });
      });
    });

    // Record reference validation tests
    describe('Record reference validation', () => {
      it('should validate string ID values', () => {
        expect(
          validateAttributeValue(
            'parent_company',
            'rec_123456',
            'record-reference'
          )
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123456',
        });
      });

      it('should extract record_id from objects', () => {
        expect(
          validateAttributeValue(
            'parent_company',
            { record_id: 'rec_123456' },
            'record-reference'
          )
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123456',
        });
      });

      it('should extract id from objects as fallback', () => {
        expect(
          validateAttributeValue(
            'parent_company',
            { id: 'rec_123456' },
            'record-reference'
          )
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123456',
        });
      });

      it('should handle arrays of record references', () => {
        const input = ['rec_123', { record_id: 'rec_456' }, { id: 'rec_789' }];

        expect(
          validateAttributeValue('related_companies', input, 'record-reference')
        ).toEqual({
          valid: true,
          convertedValue: ['rec_123', 'rec_456', 'rec_789'],
        });
      });

      it('should reject invalid record references', () => {
        const invalidValues = [{ name: 'Not a record' }, true, 123];

        invalidValues.forEach((value) => {
          const result = validateAttributeValue(
            'parent_company',
            value,
            'record-reference'
          );
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid record reference value');
          expect(result.error).toContain('parent_company');
        });
      });
    });

    // Null/undefined handling tests
    describe('Null and undefined value handling', () => {
      it('should treat null values as valid for any type', () => {
        const types: AttributeType[] = [
          'string',
          'number',
          'boolean',
          'date',
          'array',
          'object',
          'select',
          'record-reference',
        ];

        types.forEach((type) => {
          expect(validateAttributeValue('any_field', null, type)).toEqual({
            valid: true,
            convertedValue: null,
          });
        });
      });

      it('should treat undefined values as valid and convert to null', () => {
        const types: AttributeType[] = [
          'string',
          'number',
          'boolean',
          'date',
          'array',
          'object',
          'select',
          'record-reference',
        ];

        types.forEach((type) => {
          expect(validateAttributeValue('any_field', undefined, type)).toEqual({
            valid: true,
            convertedValue: null,
          });
        });
      });
    });

    // Edge case handling
    describe('Edge case handling', () => {
      it('should handle empty strings appropriately by type', () => {
        // For strings, empty string is valid
        expect(validateAttributeValue('name', '', 'string')).toEqual({
          valid: true,
          convertedValue: '',
        });

        // For numbers, empty string should be NaN (invalid)
        const numberResult = validateAttributeValue('count', '', 'number');
        expect(numberResult.valid).toBe(false);

        // For booleans, empty string should be invalid
        const boolResult = validateAttributeValue('is_active', '', 'boolean');
        expect(boolResult.valid).toBe(false);
      });

      it('should handle whitespace strings appropriately', () => {
        // For strings, whitespace is valid
        expect(validateAttributeValue('name', '   ', 'string')).toEqual({
          valid: true,
          convertedValue: '   ',
        });

        // For numbers, whitespace should be invalid
        const numberResult = validateAttributeValue('count', '   ', 'number');
        expect(numberResult.valid).toBe(false);

        // For booleans, whitespace should be invalid
        const boolResult = validateAttributeValue(
          'is_active',
          '   ',
          'boolean'
        );
        expect(boolResult.valid).toBe(false);
      });
    });
  });
});
