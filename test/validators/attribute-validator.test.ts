/**
 * Tests for the attribute validator
 */
import {
  AttributeType,
  ValidationResult,
  validateAttributeValue,
} from '../../src/validators/attribute-validator.js';

describe('Attribute Validator', () => {
  describe('validateAttributeValue', () => {
    describe('Boolean validation', () => {
      it('should accept boolean values', () => {
        expect(validateAttributeValue('test', true, 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('test', false, 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });
      });

      it('should convert string values to booleans', () => {
        expect(validateAttributeValue('test', 'true', 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('test', 'false', 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });

        expect(validateAttributeValue('test', 'yes', 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('test', 'no', 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });
      });

      it('should convert numeric values to booleans', () => {
        expect(validateAttributeValue('test', 1, 'boolean')).toEqual({
          valid: true,
          convertedValue: true,
        });

        expect(validateAttributeValue('test', 0, 'boolean')).toEqual({
          valid: true,
          convertedValue: false,
        });
      });

      it('should reject invalid boolean values', () => {
        const result = validateAttributeValue('test', 'invalid', 'boolean');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Number validation', () => {
      it('should accept number values', () => {
        expect(validateAttributeValue('test', 123, 'number')).toEqual({
          valid: true,
          convertedValue: 123,
        });

        expect(validateAttributeValue('test', 0, 'number')).toEqual({
          valid: true,
          convertedValue: 0,
        });

        expect(validateAttributeValue('test', -45.67, 'number')).toEqual({
          valid: true,
          convertedValue: -45.67,
        });
      });

      it('should convert string values to numbers', () => {
        expect(validateAttributeValue('test', '123', 'number')).toEqual({
          valid: true,
          convertedValue: 123,
        });

        expect(validateAttributeValue('test', '0', 'number')).toEqual({
          valid: true,
          convertedValue: 0,
        });

        expect(validateAttributeValue('test', '-45.67', 'number')).toEqual({
          valid: true,
          convertedValue: -45.67,
        });
      });

      it('should convert boolean values to numbers', () => {
        expect(validateAttributeValue('test', true, 'number')).toEqual({
          valid: true,
          convertedValue: 1,
        });

        expect(validateAttributeValue('test', false, 'number')).toEqual({
          valid: true,
          convertedValue: 0,
        });
      });

      it('should reject invalid number values', () => {
        const result = validateAttributeValue('test', 'not a number', 'number');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('String validation', () => {
      it('should accept string values', () => {
        expect(validateAttributeValue('test', 'hello', 'string')).toEqual({
          valid: true,
          convertedValue: 'hello',
        });

        expect(validateAttributeValue('test', '', 'string')).toEqual({
          valid: true,
          convertedValue: '',
        });
      });

      it('should convert number values to strings', () => {
        expect(validateAttributeValue('test', 123, 'string')).toEqual({
          valid: true,
          convertedValue: '123',
        });

        expect(validateAttributeValue('test', 0, 'string')).toEqual({
          valid: true,
          convertedValue: '0',
        });
      });

      it('should convert boolean values to strings', () => {
        expect(validateAttributeValue('test', true, 'string')).toEqual({
          valid: true,
          convertedValue: 'true',
        });

        expect(validateAttributeValue('test', false, 'string')).toEqual({
          valid: true,
          convertedValue: 'false',
        });
      });

      it('should convert Date objects to ISO strings', () => {
        const testDate = new Date('2023-01-01T12:00:00Z');
        expect(validateAttributeValue('test', testDate, 'string')).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });
    });

    describe('Date validation', () => {
      it('should accept Date objects', () => {
        const testDate = new Date('2023-01-01T12:00:00Z');
        expect(validateAttributeValue('test', testDate, 'date')).toEqual({
          valid: true,
          convertedValue: testDate.toISOString(),
        });
      });

      it('should convert ISO string dates', () => {
        const dateString = '2023-01-01T12:00:00Z';
        const result = validateAttributeValue('test', dateString, 'date');
        expect(result.valid).toBe(true);
        expect(result.convertedValue).toBeDefined();
      });

      it('should convert timestamp numbers', () => {
        const timestamp = 1_672_574_400_000; // 2023-01-01T12:00:00Z
        const result = validateAttributeValue('test', timestamp, 'date');
        expect(result.valid).toBe(true);
        expect(result.convertedValue).toBeDefined();
      });

      it('should reject invalid date values', () => {
        const result = validateAttributeValue('test', 'not a date', 'date');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Array validation', () => {
      it('should accept array values', () => {
        expect(validateAttributeValue('test', [1, 2, 3], 'array')).toEqual({
          valid: true,
          convertedValue: [1, 2, 3],
        });

        expect(validateAttributeValue('test', [], 'array')).toEqual({
          valid: true,
          convertedValue: [],
        });
      });

      it('should convert non-array values to arrays', () => {
        expect(validateAttributeValue('test', 'single', 'array')).toEqual({
          valid: true,
          convertedValue: ['single'],
        });

        expect(validateAttributeValue('test', 123, 'array')).toEqual({
          valid: true,
          convertedValue: [123],
        });
      });
    });

    describe('Object validation', () => {
      it('should accept object values', () => {
        const testObj = { key: 'value' };
        expect(validateAttributeValue('test', testObj, 'object')).toEqual({
          valid: true,
          convertedValue: testObj,
        });
      });

      it('should reject non-object values', () => {
        const result = validateAttributeValue(
          'test',
          'not an object',
          'object'
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Select validation', () => {
      it('should accept string values', () => {
        expect(validateAttributeValue('test', 'option1', 'select')).toEqual({
          valid: true,
          convertedValue: 'option1',
        });
      });

      it('should accept array of strings', () => {
        expect(
          validateAttributeValue('test', ['option1', 'option2'], 'select')
        ).toEqual({
          valid: true,
          convertedValue: ['option1', 'option2'],
        });
      });

      it('should convert array of non-strings to array of strings', () => {
        expect(validateAttributeValue('test', [1, true], 'select')).toEqual({
          valid: true,
          convertedValue: ['1', 'true'],
        });
      });
    });

    describe('Record reference validation', () => {
      it('should accept string IDs', () => {
        expect(
          validateAttributeValue('test', 'rec_123', 'record-reference')
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123',
        });
      });

      it('should extract record_id from objects', () => {
        expect(
          validateAttributeValue(
            'test',
            { record_id: 'rec_123' },
            'record-reference'
          )
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123',
        });
      });

      it('should extract id from objects as fallback', () => {
        expect(
          validateAttributeValue('test', { id: 'rec_123' }, 'record-reference')
        ).toEqual({
          valid: true,
          convertedValue: 'rec_123',
        });
      });

      it('should process arrays of records', () => {
        const input = ['rec_123', { record_id: 'rec_456' }, { id: 'rec_789' }];

        expect(
          validateAttributeValue('test', input, 'record-reference')
        ).toEqual({
          valid: true,
          convertedValue: ['rec_123', 'rec_456', 'rec_789'],
        });
      });

      it('should reject invalid record references', () => {
        const result = validateAttributeValue(
          'test',
          { foo: 'bar' },
          'record-reference'
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('Null/undefined handling', () => {
      it('should always accept null values', () => {
        expect(validateAttributeValue('test', null, 'string')).toEqual({
          valid: true,
          convertedValue: null,
        });

        expect(validateAttributeValue('test', null, 'number')).toEqual({
          valid: true,
          convertedValue: null,
        });

        expect(validateAttributeValue('test', null, 'boolean')).toEqual({
          valid: true,
          convertedValue: null,
        });
      });

      it('should always accept undefined values', () => {
        expect(validateAttributeValue('test', undefined, 'string')).toEqual({
          valid: true,
          convertedValue: null,
        });
      });
    });
  });
});
