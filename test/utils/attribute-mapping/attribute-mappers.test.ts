/**
 * Unit tests for attribute mapping utilities
 */
import {
  convertToBoolean,
  getAttributeSlug,
  getListSlug,
  getObjectSlug,
  invalidateConfigCache,
} from '../../../src/utils/attribute-mapping/attribute-mappers.js';

describe('Attribute Mappers', () => {
  describe('convertToBoolean', () => {
    test('correctly converts string truthy values to boolean true', () => {
      const truthyValues = [
        'true',
        'TRUE',
        'True',
        'yes',
        'YES',
        'Yes',
        'y',
        'Y',
        '1',
      ];

      truthyValues.forEach((value) => {
        expect(convertToBoolean(value)).toBe(true);
      });
    });

    test('correctly converts string falsy values to boolean false', () => {
      const falsyValues = [
        'false',
        'FALSE',
        'False',
        'no',
        'NO',
        'No',
        'n',
        'N',
        '0',
      ];

      falsyValues.forEach((value) => {
        expect(convertToBoolean(value)).toBe(false);
      });
    });

    test('handles actual boolean values correctly', () => {
      expect(convertToBoolean(true)).toBe(true);
      expect(convertToBoolean(false)).toBe(false);
    });

    test('converts numeric values correctly', () => {
      expect(convertToBoolean(1)).toBe(true);
      expect(convertToBoolean(42)).toBe(true);
      expect(convertToBoolean(-1)).toBe(true);
      expect(convertToBoolean(0)).toBe(false);
    });

    test('handles edge cases by using JavaScript truthy/falsy rules', () => {
      // These should be truthy
      expect(convertToBoolean({})).toBe(true);
      expect(convertToBoolean([])).toBe(true);
      expect(convertToBoolean('any string')).toBe(true);

      // These should be falsy
      expect(convertToBoolean(null)).toBe(false);
      expect(convertToBoolean(undefined)).toBe(false);
      expect(convertToBoolean('')).toBe(false);
      expect(convertToBoolean(Number.NaN)).toBe(false);
    });

    test('handles mixed case strings', () => {
      expect(convertToBoolean('True')).toBe(true);
      expect(convertToBoolean('FALSE')).toBe(false);
      expect(convertToBoolean('yEs')).toBe(true);
      expect(convertToBoolean('No')).toBe(false);
    });
  });
});
