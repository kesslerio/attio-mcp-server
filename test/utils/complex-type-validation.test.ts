import { describe, it, expect } from 'vitest';
import {
  validateLocationValue,
  validatePersonalNameValue,
  validatePhoneNumberValue,
} from '@/utils/complex-type-validation.js';
import { UniversalValidationError } from '@/handlers/tool-configs/universal/errors/validation-errors.js';

describe('complex-type-validation', () => {
  describe('validateLocationValue', () => {
    it('fills missing fields with nulls', () => {
      const result = validateLocationValue(
        { line_1: '123 Main' },
        'primary_location'
      ) as Record<string, unknown>;
      expect(result).toHaveProperty('line_2', null);
      expect(result).toHaveProperty('longitude', null);
    });

    it('allows null entries inside arrays for clears', () => {
      const result = validateLocationValue(
        [null],
        'locations'
      ) as Array<unknown>;
      expect(result).toEqual([null]);
    });

    it('rejects non-object', () => {
      expect(() => validateLocationValue('foo', 'primary_location')).toThrow(
        UniversalValidationError
      );
    });

    it('works for arrays and annotates index on error', () => {
      expect(() => validateLocationValue(['x'], 'locations')).toThrow(
        UniversalValidationError
      );
    });
  });

  describe('validatePersonalNameValue', () => {
    it('parses string name', () => {
      const result = validatePersonalNameValue('Jane Doe', 'name');
      expect(result).toMatchObject({ first_name: 'Jane', last_name: 'Doe' });
    });

    it('requires at least one name field', () => {
      expect(() => validatePersonalNameValue({}, 'name')).toThrow(
        UniversalValidationError
      );
    });

    it('rejects wrong types', () => {
      expect(() => validatePersonalNameValue(123, 'name')).toThrow(
        UniversalValidationError
      );
    });
  });

  describe('validatePhoneNumberValue', () => {
    it('accepts string phone', () => {
      const result = validatePhoneNumberValue(
        '+15551234567',
        'phone_numbers'
      ) as Record<string, unknown>;
      expect(result).toHaveProperty('phone_number', '+15551234567');
    });

    it('requires phone_number or original_phone_number in object', () => {
      expect(() => validatePhoneNumberValue({}, 'phone_numbers')).toThrow(
        UniversalValidationError
      );
    });

    it('accepts arrays of phones', () => {
      const result = validatePhoneNumberValue(
        [
          { phone_number: '+15551234567', label: 'work' },
          { original_phone_number: '+15559876543' },
        ],
        'phone_numbers'
      ) as Array<Record<string, unknown>>;

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('phone_number');
      expect(result[1]).toHaveProperty('original_phone_number');
    });

    it('allows null entries inside arrays for clears', () => {
      const result = validatePhoneNumberValue(
        [null],
        'phone_numbers'
      ) as Array<unknown>;
      expect(result).toEqual([null]);
    });
  });
});
