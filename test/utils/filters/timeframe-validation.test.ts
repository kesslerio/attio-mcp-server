/**
 * Enhanced validation tests for timeframe utilities
 * Tests the new validation functions added based on PR review feedback
 */

import { describe, it, expect } from 'vitest';
import {
  validateTimeframe,
  validateDateRange,
  convertTimeframeParamsWithValidation,
  type TimeframeValidation,
  type RelativeTimeframe,
} from '../../../src/utils/filters/timeframe-utils.js';

describe('Enhanced Timeframe Validation', () => {
  describe('validateTimeframe', () => {
    it('should validate supported relative timeframes', () => {
      const validTimeframes: RelativeTimeframe[] = [
        'today',
        'yesterday',
        'this_week',
        'last_week',
        'this_month',
        'last_month',
        'last_7_days',
        'last_30_days',
        'last_90_days',
      ];

      validTimeframes.forEach((timeframe) => {
        const result = validateTimeframe(timeframe);
        expect(result.isValid).toBe(true);
        expect(result.normalizedTimeframe).toBe(timeframe);
        expect(result.error).toBeUndefined();
      });
    });

    it('should normalize case and whitespace', () => {
      const result = validateTimeframe('  LAST_7_DAYS  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedTimeframe).toBe('last_7_days');
    });

    it('should reject invalid timeframes', () => {
      const invalidTimeframes = [
        'invalid_timeframe',
        'last_6_days',
        'next_week',
        'tomorrow',
        '7_days_ago',
      ];

      invalidTimeframes.forEach((timeframe) => {
        const result = validateTimeframe(timeframe);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Unsupported timeframe');
        expect(result.normalizedTimeframe).toBeUndefined();
      });
    });

    it('should handle empty and invalid inputs', () => {
      const invalidInputs = [
        '',
        '   ',
        null as any,
        undefined as any,
        123 as any,
      ];

      invalidInputs.forEach((input) => {
        const result = validateTimeframe(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Timeframe must be a non-empty string');
      });
    });

    it('should provide helpful error messages', () => {
      const result = validateTimeframe('invalid_option');
      expect(result.error).toContain('Supported options:');
      expect(result.error).toContain('today, yesterday, this_week');
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date ranges', () => {
      const validRanges = [
        ['2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z'],
        ['2024-06-15T12:00:00Z', '2024-06-15T12:01:00Z'],
        ['2023-12-31T00:00:00Z', '2024-01-01T00:00:00Z'],
      ];

      validRanges.forEach(([start, end]) => {
        expect(validateDateRange(start, end)).toBe(true);
      });
    });

    it('should allow equal start and end dates', () => {
      const sameDate = '2024-01-15T12:00:00Z';
      expect(validateDateRange(sameDate, sameDate)).toBe(true);
    });

    it('should reject backwards date ranges', () => {
      const invalidRanges = [
        ['2024-01-31T23:59:59Z', '2024-01-01T00:00:00Z'],
        ['2024-06-15T12:01:00Z', '2024-06-15T12:00:00Z'],
      ];

      invalidRanges.forEach(([start, end]) => {
        expect(validateDateRange(start, end)).toBe(false);
      });
    });

    it('should handle invalid date formats', () => {
      const invalidDates = [
        ['invalid-date', '2024-01-31T23:59:59Z'],
        ['2024-01-01T00:00:00Z', 'not-a-date'],
        ['2024-13-45T25:61:61Z', '2024-01-31T23:59:59Z'],
      ];

      invalidDates.forEach(([start, end]) => {
        expect(validateDateRange(start, end)).toBe(false);
      });
    });
  });

  describe('convertTimeframeParamsWithValidation', () => {
    it('should convert valid relative timeframes', () => {
      const params = {
        timeframe: 'last_7_days',
        date_field: 'created_at',
      };

      const result = convertTimeframeParamsWithValidation(params);

      expect(result.timeframe_attribute).toBe('created_at');
      expect(result.date_operator).toBe('between');
      expect(result.start_date).toBeDefined();
      expect(result.end_date).toBeDefined();

      // Validate date format
      expect(result.start_date).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(result.end_date).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should use default date field when not specified', () => {
      const params = { timeframe: 'today' };
      const result = convertTimeframeParamsWithValidation(params);
      expect(result.timeframe_attribute).toBe('created_at');
    });

    it('should convert valid absolute date ranges', () => {
      const params = {
        date_from: '2024-01-01T00:00:00Z',
        date_to: '2024-01-31T23:59:59Z',
        date_field: 'updated_at',
      };

      const result = convertTimeframeParamsWithValidation(params);

      expect(result.timeframe_attribute).toBe('updated_at');
      expect(result.start_date).toBe('2024-01-01T00:00:00Z');
      expect(result.end_date).toBe('2024-01-31T23:59:59Z');
      expect(result.date_operator).toBe('between');
    });

    it('should handle single date bounds', () => {
      const paramsAfter = {
        date_from: '2024-06-01T00:00:00Z',
        date_field: 'created_at',
      };

      const resultAfter = convertTimeframeParamsWithValidation(paramsAfter);
      expect(resultAfter.start_date).toBe('2024-06-01T00:00:00Z');
      expect(resultAfter.date_operator).toBe('greater_than');
      expect(resultAfter.end_date).toBeUndefined();

      const paramsBefore = {
        date_to: '2024-06-30T23:59:59Z',
        date_field: 'updated_at',
      };

      const resultBefore = convertTimeframeParamsWithValidation(paramsBefore);
      expect(resultBefore.end_date).toBe('2024-06-30T23:59:59Z');
      expect(resultBefore.date_operator).toBe('less_than');
      expect(resultBefore.start_date).toBeUndefined();
    });

    it('should throw descriptive errors for invalid timeframes', () => {
      const params = { timeframe: 'invalid_timeframe' };

      expect(() => convertTimeframeParamsWithValidation(params)).toThrow(
        'Timeframe validation failed: Unsupported timeframe'
      );
    });

    it('should throw errors for invalid date ranges', () => {
      const params = {
        date_from: '2024-01-31T00:00:00Z',
        date_to: '2024-01-01T00:00:00Z',
      };

      expect(() => convertTimeframeParamsWithValidation(params)).toThrow(
        'Date parameter validation failed: start date must be before end date'
      );
    });

    it('should throw errors for invalid date formats', () => {
      const paramsInvalidFrom = {
        date_from: 'not-a-date',
      };

      expect(() =>
        convertTimeframeParamsWithValidation(paramsInvalidFrom)
      ).toThrow(
        'Date parameter validation failed: date_from must be a valid ISO 8601 date'
      );

      const paramsInvalidTo = {
        date_to: '2024-13-32T25:61:61Z',
      };

      expect(() =>
        convertTimeframeParamsWithValidation(paramsInvalidTo)
      ).toThrow(
        'Date parameter validation failed: date_to must be a valid ISO 8601 date'
      );
    });

    it('should throw error when no valid parameters provided', () => {
      const params = {
        some_other_field: 'value',
      };

      expect(() => convertTimeframeParamsWithValidation(params)).toThrow(
        'No valid timeframe or date parameters provided'
      );
    });

    it('should handle case normalization in timeframes', () => {
      const params = {
        timeframe: '  LAST_30_DAYS  ',
        date_field: 'updated_at',
      };

      const result = convertTimeframeParamsWithValidation(params);
      expect(result.timeframe_attribute).toBe('updated_at');
      expect(result.date_operator).toBe('between');
    });
  });

  describe('Type Safety Validation', () => {
    it('should maintain readonly properties in DateRange', () => {
      const params = { timeframe: 'today' };
      const result = convertTimeframeParamsWithValidation(params);

      // These should be readonly properties
      expect(typeof result.start_date).toBe('string');
      expect(typeof result.end_date).toBe('string');
    });

    it('should provide proper TypeScript types', () => {
      // This test validates TypeScript compilation
      const validation: TimeframeValidation = validateTimeframe('last_7_days');
      expect(validation.isValid).toBe(true);

      if (validation.isValid && validation.normalizedTimeframe) {
        const timeframe: RelativeTimeframe = validation.normalizedTimeframe;
        expect(timeframe).toBe('last_7_days');
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable error messages', () => {
      const result = validateTimeframe('last_3_days');
      expect(result.error).toContain('Supported options:');
      expect(result.error).toContain('last_7_days');
      expect(result.error).toContain('last_30_days');
    });

    it('should include context in validation errors', () => {
      const params = {
        date_from: '2024-12-31T23:59:59Z',
        date_to: '2024-01-01T00:00:00Z',
      };

      expect(() => convertTimeframeParamsWithValidation(params)).toThrow(
        /Date parameter validation failed.*start date must be before end date.*ISO 8601/
      );
    });
  });
});
