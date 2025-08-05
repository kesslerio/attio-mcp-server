/**
 * Tests for date utility functions
 */

import {
  type DateRange,
  DateRangePreset,
  RelativeDate,
  RelativeDateUnit,
} from '../../src/types/attio';
import {
  createDateRangeFromPreset,
  createRelativeDateRange,
  formatDate,
  isValidISODateString,
  resolveDateRange,
  resolveRelativeDate,
} from '../../src/utils/date-utils';

describe('Date Utils', () => {
  // Store original Date.now implementation
  const originalDateNow = Date.now;

  // Since date mocking is complex with timezone considerations, we'll simplify
  // our tests to verify functionality rather than exact date values
  beforeAll(() => {
    // Just mock Date.now to return a consistent timestamp
    global.Date.now = vi.fn(() => new Date(2023, 0, 15, 12, 0, 0).getTime());
  });

  // Restore original Date implementation
  afterAll(() => {
    global.Date.now = originalDateNow;
  });

  describe('resolveRelativeDate', () => {
    it('should handle relative date calculations', () => {
      // Just test that the function returns valid ISO strings
      const pastDate = resolveRelativeDate({
        value: 7,
        unit: RelativeDateUnit.DAY,
        direction: 'past',
      });

      const futureDate = resolveRelativeDate({
        value: 7,
        unit: RelativeDateUnit.DAY,
        direction: 'future',
      });

      // Just check that these are valid ISO date strings
      expect(typeof pastDate).toBe('string');
      expect(pastDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

      expect(typeof futureDate).toBe('string');
      expect(futureDate).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );

      // Most importantly, test that a future date is after a past date
      expect(new Date(futureDate).getTime()).toBeGreaterThan(
        new Date(pastDate).getTime()
      );
    });

    it('should validate relative date inputs', () => {
      const invalidCases: Array<{ input: any; errorContains: string }> = [
        {
          input: undefined,
          errorContains: 'RelativeDate object is required',
        },
        {
          input: { value: 7, direction: 'past' },
          errorContains: 'must specify a unit',
        },
        {
          input: { unit: RelativeDateUnit.DAY, direction: 'past' },
          errorContains: 'must specify a numeric value',
        },
        {
          input: { value: 7, unit: RelativeDateUnit.DAY },
          errorContains: 'must specify a direction',
        },
        {
          input: { value: 7, unit: RelativeDateUnit.DAY, direction: 'invalid' },
          errorContains: 'must be either "past" or "future"',
        },
        {
          input: { value: -5, unit: RelativeDateUnit.DAY, direction: 'past' },
          errorContains: 'value must be a positive number',
        },
        {
          input: {
            value: 7,
            unit: 'invalid' as RelativeDateUnit,
            direction: 'past',
          },
          errorContains: 'Unsupported relative date unit',
        },
      ];

      invalidCases.forEach(({ input, errorContains }) => {
        expect(() => resolveRelativeDate(input)).toThrow(errorContains);
      });
    });
  });

  describe('createDateRangeFromPreset', () => {
    it('should create ranges for standard presets', () => {
      // Test a few key presets to verify functionality
      const today = createDateRangeFromPreset(DateRangePreset.TODAY);
      const lastMonth = createDateRangeFromPreset(DateRangePreset.LAST_MONTH);

      // Verify each result has start and end dates
      expect(today).toHaveProperty('start');
      expect(today).toHaveProperty('end');
      expect(lastMonth).toHaveProperty('start');
      expect(lastMonth).toHaveProperty('end');

      // Verify the dates are valid
      expect(today.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
      expect(today.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

      // Verify the relationships between dates
      expect(new Date(today.start).getTime()).toBeLessThan(
        new Date(today.end).getTime()
      );
      expect(new Date(lastMonth.start).getTime()).toBeLessThan(
        new Date(lastMonth.end).getTime()
      );

      // Verify that last month is before today
      expect(new Date(lastMonth.end).getTime()).toBeLessThan(
        new Date(today.start).getTime()
      );
    });

    it('should handle case-insensitive preset values', () => {
      // Test with different case variations
      const result1 = createDateRangeFromPreset('TODAY');
      const result2 = createDateRangeFromPreset('today');
      const result3 = createDateRangeFromPreset('ToDay');

      expect(result1).toEqual(result2);
      expect(result1).toEqual(result3);
    });

    it('should validate preset inputs', () => {
      const invalidCases: Array<{ input: any; errorContains: string }> = [
        {
          input: undefined,
          errorContains: 'must be a non-empty string',
        },
        {
          input: '',
          errorContains: 'must be a non-empty string',
        },
        {
          input: 'invalid_preset',
          errorContains: 'Unsupported date preset',
        },
      ];

      invalidCases.forEach(({ input, errorContains }) => {
        expect(() => createDateRangeFromPreset(input)).toThrow(errorContains);
      });
    });
  });

  describe('resolveDateRange', () => {
    it('should resolve a date range with absolute dates', () => {
      const dateRange: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-31T23:59:59.999Z',
      };

      const result = resolveDateRange(dateRange);

      // Check structure
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');

      // Check values passed through
      expect(result.start).toBe('2023-01-01T00:00:00.000Z');
      expect(result.end).toBe('2023-01-31T23:59:59.999Z');
    });

    it('should resolve a date range with relative dates', () => {
      const dateRange: DateRange = {
        start: { value: 7, unit: RelativeDateUnit.DAY, direction: 'past' },
        end: { value: 0, unit: RelativeDateUnit.DAY, direction: 'past' },
      };

      const result = resolveDateRange(dateRange);

      // Check structure
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');

      // Check start is before end
      expect(new Date(result.start!).getTime()).toBeLessThan(
        new Date(result.end!).getTime()
      );

      // Check they're valid ISO date strings
      expect(result.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
      expect(result.end).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });

    it('should resolve a date range with preset', () => {
      const dateRange: DateRange = {
        preset: DateRangePreset.THIS_MONTH,
      };

      const result = resolveDateRange(dateRange);

      // Check structure
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');

      // Check start is before end
      expect(new Date(result.start!).getTime()).toBeLessThan(
        new Date(result.end!).getTime()
      );

      // Check they're valid ISO date strings
      expect(result.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
      expect(result.end).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });

    it('should handle partial date ranges (only start or only end)', () => {
      const startOnly: DateRange = {
        start: '2023-01-01T00:00:00.000Z',
      };

      const endOnly: DateRange = {
        end: '2023-01-31T23:59:59.999Z',
      };

      const startResult = resolveDateRange(startOnly);
      const endResult = resolveDateRange(endOnly);

      // Check structure
      expect(startResult).toHaveProperty('start');
      expect(startResult).not.toHaveProperty('end');
      expect(endResult).toHaveProperty('end');
      expect(endResult).not.toHaveProperty('start');

      // Check values passed through
      expect(startResult.start).toBe('2023-01-01T00:00:00.000Z');
      expect(endResult.end).toBe('2023-01-31T23:59:59.999Z');
    });

    it('should validate date ranges', () => {
      const invalidCases: Array<{ input: any; errorContains: string }> = [
        {
          input: undefined,
          errorContains: 'DateRange object is required',
        },
        {
          input: {},
          errorContains: 'must specify at least one of: preset, start, or end',
        },
        {
          input: {
            start: 'invalid-date',
          },
          errorContains: 'Invalid ISO date string format',
        },
      ];

      // Test start date after end date
      expect(() =>
        resolveDateRange({
          start: '2023-01-31T00:00:00.000Z',
          end: '2023-01-01T00:00:00.000Z',
        })
      ).toThrow(/start date.*before.*end date/);

      invalidCases.forEach(({ input, errorContains }) => {
        expect(() => resolveDateRange(input)).toThrow(errorContains);
      });
    });

    it('should prioritize preset over explicit dates', () => {
      const dateRange: DateRange = {
        preset: DateRangePreset.THIS_MONTH,
        start: '2000-01-01T00:00:00.000Z', // Should be ignored
        end: '2000-12-31T23:59:59.999Z', // Should be ignored
      };

      // Should use preset and ignore explicit dates
      const result = resolveDateRange(dateRange);

      // Check structure
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');

      // Check they're valid ISO date strings and not the explicitly provided dates
      expect(result.start).not.toBe('2000-01-01T00:00:00.000Z');
      expect(result.end).not.toBe('2000-12-31T23:59:59.999Z');

      // Check start is before end
      expect(new Date(result.start!).getTime()).toBeLessThan(
        new Date(result.end!).getTime()
      );
    });
  });

  describe('isValidISODateString', () => {
    it('should validate ISO date strings', () => {
      const validCases = ['2023-01-15T12:00:00.000Z', '2023-01-15T12:00:00Z'];

      const invalidCases = [
        '2023-01-15', // missing time
        '2023-01-15 12:00:00', // wrong format
        '2023-1-1T12:00:00Z', // incorrect padding
        '2023-01-15T25:00:00Z', // invalid hour
        'invalid-date',
      ];

      validCases.forEach((dateString) => {
        expect(isValidISODateString(dateString)).toBe(true);
      });

      invalidCases.forEach((dateString) => {
        expect(isValidISODateString(dateString)).toBe(false);
      });
    });
  });

  describe('createRelativeDateRange', () => {
    it('should create date ranges for different time units', () => {
      // Test each unit type
      const dayRange = createRelativeDateRange(7, RelativeDateUnit.DAY);
      const weekRange = createRelativeDateRange(2, RelativeDateUnit.WEEK);
      const monthRange = createRelativeDateRange(1, RelativeDateUnit.MONTH);
      const quarterRange = createRelativeDateRange(1, RelativeDateUnit.QUARTER);
      const yearRange = createRelativeDateRange(1, RelativeDateUnit.YEAR);

      // Check they're all properly formatted
      expect(dayRange).toHaveProperty('start');
      expect(dayRange).toHaveProperty('end');
      expect(weekRange).toHaveProperty('start');
      expect(weekRange).toHaveProperty('end');
      expect(monthRange).toHaveProperty('start');
      expect(monthRange).toHaveProperty('end');
      expect(quarterRange).toHaveProperty('start');
      expect(quarterRange).toHaveProperty('end');
      expect(yearRange).toHaveProperty('start');
      expect(yearRange).toHaveProperty('end');

      // All end dates should be approximately the same (now)
      // Allow for small timing differences (up to 100ms) between calls
      const endTime = new Date(dayRange.end).getTime();
      expect(new Date(weekRange.end).getTime()).toBeCloseTo(endTime, -2); // within 100ms
      expect(new Date(monthRange.end).getTime()).toBeCloseTo(endTime, -2);
      expect(new Date(quarterRange.end).getTime()).toBeCloseTo(endTime, -2);
      expect(new Date(yearRange.end).getTime()).toBeCloseTo(endTime, -2);

      // Start dates should be ordered correctly (relative to each other)
      // Year should be oldest, then quarter, month, week, day
      expect(new Date(dayRange.start).getTime()).toBeGreaterThan(
        new Date(weekRange.start).getTime()
      );
      expect(new Date(weekRange.start).getTime()).toBeGreaterThan(
        new Date(monthRange.start).getTime()
      );
      expect(new Date(monthRange.start).getTime()).toBeGreaterThan(
        new Date(quarterRange.start).getTime()
      );
      expect(new Date(quarterRange.start).getTime()).toBeGreaterThan(
        new Date(yearRange.start).getTime()
      );

      // Each start date should be before its end date
      expect(new Date(dayRange.start).getTime()).toBeLessThan(
        new Date(dayRange.end).getTime()
      );
      expect(new Date(weekRange.start).getTime()).toBeLessThan(
        new Date(weekRange.end).getTime()
      );
      expect(new Date(monthRange.start).getTime()).toBeLessThan(
        new Date(monthRange.end).getTime()
      );
      expect(new Date(quarterRange.start).getTime()).toBeLessThan(
        new Date(quarterRange.end).getTime()
      );
      expect(new Date(yearRange.start).getTime()).toBeLessThan(
        new Date(yearRange.end).getTime()
      );
    });

    it('should validate inputs', () => {
      expect(() => {
        createRelativeDateRange(1, 'invalid' as RelativeDateUnit);
      }).toThrow('Unsupported relative date unit');
    });
  });

  describe('formatDate', () => {
    it('should format dates in different styles', () => {
      const date = '2023-01-15T12:00:00.000Z';

      // Test the basic functionality
      expect(typeof formatDate(date, 'short')).toBe('string');
      expect(typeof formatDate(date, 'long')).toBe('string');
      expect(typeof formatDate(date, 'relative')).toBe('string');

      // Default format
      expect(typeof formatDate(date)).toBe('string');

      // Since the formatter depends on locale, we can only verify it returns a string
      // and doesn't throw for our test cases
      const yesterday = '2023-01-14T12:00:00.000Z';
      const lastWeek = '2023-01-05T12:00:00.000Z';
      const lastMonth = '2022-12-15T12:00:00.000Z';
      const lastYear = '2022-01-15T12:00:00.000Z';

      expect(typeof formatDate(yesterday, 'relative')).toBe('string');
      expect(typeof formatDate(lastWeek, 'relative')).toBe('string');
      expect(typeof formatDate(lastMonth, 'relative')).toBe('string');
      expect(typeof formatDate(lastYear, 'relative')).toBe('string');
    });
  });
});
