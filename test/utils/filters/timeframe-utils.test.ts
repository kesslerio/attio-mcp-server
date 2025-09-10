/**
 * Tests for timeframe utility functions (Issue #475)
 * Comprehensive testing of date range conversion and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getRelativeTimeframeRange,
  isValidISODate,
  isValidDateRange,
  convertDateParamsToTimeframeQuery,
  type RelativeTimeframe,
} from '../../../src/utils/filters/timeframe-utils.js';

describe('TimeframeUtils', () => {
  // Mock current date for consistent testing
  const mockDate = new Date('2023-08-15T12:00:00.000Z'); // Tuesday

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getRelativeTimeframeRange', () => {
    it('should return correct range for "today"', () => {
      const result = getRelativeTimeframeRange('today');
      expect(result.startDate).toBe('2023-08-15T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z');
    });

    it('should return correct range for "yesterday"', () => {
      const result = getRelativeTimeframeRange('yesterday');
      expect(result.startDate).toBe('2023-08-14T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-14T23:59:59.999Z');
    });

    it('should return correct range for "this_week"', () => {
      const result = getRelativeTimeframeRange('this_week');
      expect(result.startDate).toBe('2023-08-14T00:00:00.000Z'); // Monday
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z'); // Current day
    });

    it('should return correct range for "last_week"', () => {
      const result = getRelativeTimeframeRange('last_week');
      expect(result.startDate).toBe('2023-08-07T00:00:00.000Z'); // Previous Monday
      expect(result.endDate).toBe('2023-08-13T23:59:59.999Z'); // Previous Sunday
    });

    it('should return correct range for "this_month"', () => {
      const result = getRelativeTimeframeRange('this_month');
      expect(result.startDate).toBe('2023-08-01T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z');
    });

    it('should return correct range for "last_month"', () => {
      const result = getRelativeTimeframeRange('last_month');
      expect(result.startDate).toBe('2023-07-01T00:00:00.000Z');
      expect(result.endDate).toBe('2023-07-31T23:59:59.999Z');
    });

    it('should return correct range for "last_7_days"', () => {
      const result = getRelativeTimeframeRange('last_7_days');
      expect(result.startDate).toBe('2023-08-08T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z');
    });

    it('should return correct range for "last_30_days"', () => {
      const result = getRelativeTimeframeRange('last_30_days');
      expect(result.startDate).toBe('2023-07-16T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z');
    });

    it('should return correct range for "last_90_days"', () => {
      const result = getRelativeTimeframeRange('last_90_days');
      expect(result.startDate).toBe('2023-05-17T00:00:00.000Z');
      expect(result.endDate).toBe('2023-08-15T23:59:59.999Z');
    });

    it('should throw error for unsupported timeframe', () => {
      expect(() =>
        getRelativeTimeframeRange('invalid' as RelativeTimeframe)
      ).toThrow('Unsupported timeframe: invalid');
    });
  });

  describe('isValidISODate', () => {
    it('should validate correct ISO dates', () => {
      expect(isValidISODate('2023-08-15T12:00:00.000Z')).toBe(true);
      expect(isValidISODate('2023-08-15T12:00:00Z')).toBe(true);
      expect(isValidISODate('2023-08-15T12:00:00+05:00')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidISODate('2023-08-15')).toBe(false); // Missing time
      expect(isValidISODate('invalid-date')).toBe(false);
      expect(isValidISODate('')).toBe(false);
      expect(isValidISODate(null as any)).toBe(false);
      expect(isValidISODate(undefined as any)).toBe(false);
      expect(isValidISODate('2023-13-01T12:00:00Z')).toBe(false); // Invalid month
    });
  });

  describe('isValidDateRange', () => {
    it('should validate correct date ranges', () => {
      expect(
        isValidDateRange('2023-08-01T00:00:00Z', '2023-08-15T23:59:59Z')
      ).toBe(true);

      // Same date should be valid
      expect(
        isValidDateRange('2023-08-15T00:00:00Z', '2023-08-15T23:59:59Z')
      ).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      // End before start
      expect(
        isValidDateRange('2023-08-15T12:00:00Z', '2023-08-14T12:00:00Z')
      ).toBe(false);

      // Invalid dates
      expect(isValidDateRange('invalid-date', '2023-08-15T12:00:00Z')).toBe(
        false
      );
    });
  });

  describe('convertDateParamsToTimeframeQuery', () => {
    it('should convert relative timeframe to API format', () => {
      const result = convertDateParamsToTimeframeQuery({
        timeframe: 'last_7_days',
        date_field: 'created_at',
      });

      expect(result).toEqual({
        timeframe_attribute: 'created_at',
        start_date: '2023-08-08T00:00:00.000Z',
        end_date: '2023-08-15T23:59:59.999Z',
        date_operator: 'between',
      });
    });

    it('should convert date range to API format', () => {
      const result = convertDateParamsToTimeframeQuery({
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'updated_at',
      });

      expect(result).toEqual({
        timeframe_attribute: 'updated_at',
        start_date: '2023-08-01T00:00:00Z',
        end_date: '2023-08-15T23:59:59Z',
        date_operator: 'between',
      });
    });

    it('should handle single date bounds', () => {
      const startOnly = convertDateParamsToTimeframeQuery({
        date_from: '2023-08-01T00:00:00Z',
        date_field: 'created_at',
      });

      expect(startOnly).toEqual({
        timeframe_attribute: 'created_at',
        start_date: '2023-08-01T00:00:00Z',
        date_operator: 'greater_than',
      });

      const endOnly = convertDateParamsToTimeframeQuery({
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'created_at',
      });

      expect(endOnly).toEqual({
        timeframe_attribute: 'created_at',
        end_date: '2023-08-15T23:59:59Z',
        date_operator: 'less_than',
      });
    });

    it('should handle created_at specific filters', () => {
      const result = convertDateParamsToTimeframeQuery({
        created_after: '2023-08-01T00:00:00Z',
        created_before: '2023-08-15T23:59:59Z',
      });

      expect(result).toEqual({
        timeframe_attribute: 'created_at',
        start_date: '2023-08-01T00:00:00Z',
        end_date: '2023-08-15T23:59:59Z',
        date_operator: 'between',
      });
    });

    it('should handle updated_at specific filters', () => {
      const result = convertDateParamsToTimeframeQuery({
        updated_after: '2023-08-01T00:00:00Z',
      });

      expect(result).toEqual({
        timeframe_attribute: 'updated_at',
        start_date: '2023-08-01T00:00:00Z',
        date_operator: 'greater_than',
      });
    });

    it('should prioritize timeframe over absolute dates', () => {
      const result = convertDateParamsToTimeframeQuery({
        timeframe: 'today',
        date_from: '2023-08-01T00:00:00Z', // Should be ignored
        date_to: '2023-08-10T00:00:00Z', // Should be ignored
        date_field: 'created_at',
      });

      expect(result).toEqual({
        timeframe_attribute: 'created_at',
        start_date: '2023-08-15T00:00:00.000Z',
        end_date: '2023-08-15T23:59:59.999Z',
        date_operator: 'between',
      });
    });

    it('should return null when no date parameters provided', () => {
      const result = convertDateParamsToTimeframeQuery({});
      expect(result).toBeNull();
    });

    it('should throw error for invalid date formats', () => {
      expect(() =>
        convertDateParamsToTimeframeQuery({
          date_from: 'invalid-date',
        })
      ).toThrow('Invalid date_from format: must be ISO 8601');

      expect(() =>
        convertDateParamsToTimeframeQuery({
          created_after: 'not-a-date',
        })
      ).toThrow('Invalid created_after format: must be ISO 8601');
    });

    it('should throw error for invalid date ranges', () => {
      expect(() =>
        convertDateParamsToTimeframeQuery({
          date_from: '2023-08-15T12:00:00Z',
          date_to: '2023-08-14T12:00:00Z', // End before start
        })
      ).toThrow('Invalid date range: start date must be before end date');

      expect(() =>
        convertDateParamsToTimeframeQuery({
          created_after: '2023-08-15T12:00:00Z',
          created_before: '2023-08-14T12:00:00Z', // End before start
        })
      ).toThrow(
        'Invalid created date range: created_after must be before created_before'
      );
    });

    it('should default to created_at when date_field not specified', () => {
      const result = convertDateParamsToTimeframeQuery({
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        // date_field not specified
      });

      expect(result?.timeframe_attribute).toBe('created_at');
    });
  });
});
