/**
 * Unit tests for attribute validator
 */
import {
  validateAttributeValue,
  ValidationResult,
  AttributeType,
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

        invalidValues.forEach((value) => {
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid boolean value');
          expect(result.error).toContain('is_active');
        });
      });
    });

    // Number validation tests
    describe('Number validation', () => {
      it('should validate native number values', () => {
        expect(validateAttributeValue('revenue', 10000, 'number')).toEqual({
          valid: true,
          convertedValue: 10000,
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
          convertedValue: 10000,
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
          convertedValue: 12345,
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

        invalidValues.forEach((value) => {
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
        expect(validateAttributeValue('name', 12345, 'string')).toEqual({
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
        expect(
          validateAttributeValue('date_string', testDate, 'string')
        ).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });

      it('should try to convert objects to JSON strings', () => {
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
        expect(validateAttributeValue('created_at', testDate, 'date')).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });

      it('should reject invalid date objects', () => {
          'created_at',
          invalidDate,
          'date'
        );
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid date value');
      });

      it('should convert ISO date strings to dates', () => {

        expect(result.valid).toBe(true);
        expect(result.convertedValue).toBe(expectedDate);
      });

      it('should convert various date string formats', () => {

        dateFormats.forEach((dateStr) => {
          expect(result.valid).toBe(true);
          expect(typeof result.convertedValue).toBe('string');
          // The format should be an ISO string
          expect(result.convertedValue).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
          );
        });
      });

      it('should convert Unix timestamps (milliseconds) to date strings', () => {

        expect(validateAttributeValue('created_at', timestamp, 'date')).toEqual(
          {
            valid: true,
            convertedValue: expectedDate,
          }
        );
      });

      it('should convert Unix timestamps (seconds) to date strings', () => {

        expect(validateAttributeValue('created_at', timestamp, 'date')).toEqual(
          {
            valid: true,
            convertedValue: expectedDate,
          }
        );
      });

      it('should reject unconvertible values with appropriate error messages', () => {

        invalidValues.forEach((value) => {
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

        invalidValues.forEach((value) => {
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

        expect(
          validateAttributeValue('related_companies', input, 'record-reference')
        ).toEqual({
          valid: true,
          convertedValue: ['rec_123', 'rec_456', 'rec_789'],
        });
      });

      it('should reject invalid record references', () => {

        invalidValues.forEach((value) => {
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
        expect(numberResult.valid).toBe(false);

        // For booleans, empty string should be invalid
        expect(boolResult.valid).toBe(false);
      });

      it('should handle whitespace strings appropriately', () => {
        // For strings, whitespace is valid
        expect(validateAttributeValue('name', '   ', 'string')).toEqual({
          valid: true,
          convertedValue: '   ',
        });

        // For numbers, whitespace should be invalid
        expect(numberResult.valid).toBe(false);

        // For booleans, whitespace should be invalid
          'is_active',
          '   ',
          'boolean'
        );
        expect(boolResult.valid).toBe(false);
      });
    });
  });
});
