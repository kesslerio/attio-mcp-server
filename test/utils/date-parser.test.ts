import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Date Parser Utilities', () => {
  // Mock the current date for consistent testing
  beforeEach(() => {
    // Set mock date to 2024-03-15 (Friday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseRelativeDate', () => {
    it('should parse "today"', () => {
      expect(result).toEqual({
        start: '2024-03-15',
        end: '2024-03-15',
      });
    });

    it('should parse "yesterday"', () => {
      expect(result).toEqual({
        start: '2024-03-14',
        end: '2024-03-14',
      });
    });

    it('should parse "this week" (Monday to Sunday)', () => {
      expect(result).toEqual({
        start: '2024-03-11', // Monday
        end: '2024-03-17', // Sunday
      });
    });

    it('should parse "last week"', () => {
      expect(result).toEqual({
        start: '2024-03-04', // Previous Monday
        end: '2024-03-10', // Previous Sunday
      });
    });

    it('should parse "this month"', () => {
      expect(result).toEqual({
        start: '2024-03-01',
        end: '2024-03-31',
      });
    });

    it('should parse "last month"', () => {
      expect(result).toEqual({
        start: '2024-02-01',
        end: '2024-02-29', // 2024 is a leap year
      });
    });

    it('should parse "this year"', () => {
      expect(result).toEqual({
        start: '2024-01-01',
        end: '2024-12-31',
      });
    });

    it('should parse "last year"', () => {
      expect(result).toEqual({
        start: '2023-01-01',
        end: '2023-12-31',
      });
    });

    it('should parse "last 7 days"', () => {
      expect(result).toEqual({
        start: '2024-03-08',
        end: '2024-03-15',
      });
    });

    it('should parse "last 1 day"', () => {
      expect(result).toEqual({
        start: '2024-03-14',
        end: '2024-03-15',
      });
    });

    it('should parse "last 2 weeks"', () => {
      expect(result).toEqual({
        start: '2024-03-01',
        end: '2024-03-15',
      });
    });

    it('should parse "last 3 months"', () => {
      expect(result).toEqual({
        start: '2023-12-15',
        end: '2024-03-15',
      });
    });

    it('should be case-insensitive', () => {
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should handle extra whitespace', () => {
      expect(result).toEqual({
        start: '2024-03-08',
        end: '2024-03-15',
      });
    });

    it('should throw error for unsupported expressions', () => {
      expect(() => parseRelativeDate('next week')).toThrow(
        'Unable to parse relative date expression'
      );
      expect(() => parseRelativeDate('invalid')).toThrow();
      expect(() => parseRelativeDate('')).toThrow();
    });
  });

  describe('isRelativeDate', () => {
    it('should return true for valid relative dates', () => {
      expect(isRelativeDate('today')).toBe(true);
      expect(isRelativeDate('yesterday')).toBe(true);
      expect(isRelativeDate('this week')).toBe(true);
      expect(isRelativeDate('last week')).toBe(true);
      expect(isRelativeDate('this month')).toBe(true);
      expect(isRelativeDate('last month')).toBe(true);
      expect(isRelativeDate('this year')).toBe(true);
      expect(isRelativeDate('last year')).toBe(true);
      expect(isRelativeDate('last 7 days')).toBe(true);
      expect(isRelativeDate('last 2 weeks')).toBe(true);
      expect(isRelativeDate('last 3 months')).toBe(true);
    });

    it('should return false for invalid expressions', () => {
      expect(isRelativeDate('next week')).toBe(false);
      expect(isRelativeDate('invalid')).toBe(false);
      expect(isRelativeDate('2024-03-15')).toBe(false);
      expect(isRelativeDate('')).toBe(false);
    });
  });

  describe('normalizeDate', () => {
    it('should return ISO dates unchanged', () => {
      expect(normalizeDate('2024-03-15')).toBe('2024-03-15');
      expect(normalizeDate('2024-01-01')).toBe('2024-01-01');
    });

    it('should convert relative dates to ISO format', () => {
      expect(normalizeDate('today')).toBe('2024-03-15');
      expect(normalizeDate('yesterday')).toBe('2024-03-14');
      expect(normalizeDate('this week')).toBe('2024-03-11'); // Start of week
      expect(normalizeDate('last month')).toBe('2024-02-01'); // Start of last month
    });

    it('should parse various date formats', () => {
      expect(normalizeDate('March 15, 2024')).toBe('2024-03-15');
      expect(normalizeDate('2024/03/15')).toBe('2024-03-15');
      expect(normalizeDate('15-Mar-2024')).toBe('2024-03-15');
    });

    it('should return null for invalid dates', () => {
      expect(normalizeDate('invalid')).toBe(null);
      expect(normalizeDate('not a date')).toBe(null);
      expect(normalizeDate('')).toBe(null);
    });
  });

  describe('describeDateRange', () => {
    it('should describe single day ranges', () => {
      const range: DateRange = {
        start: '2024-03-15',
        end: '2024-03-15',
      };
      expect(describeDateRange(range)).toBe('Mar 15, 2024');
    });

    it('should describe multi-day ranges', () => {
      const range: DateRange = {
        start: '2024-03-01',
        end: '2024-03-31',
      };
      expect(describeDateRange(range)).toBe('Mar 1, 2024 to Mar 31, 2024');
    });

    it('should describe cross-month ranges', () => {
      const range: DateRange = {
        start: '2024-02-15',
        end: '2024-03-15',
      };
      expect(describeDateRange(range)).toBe('Feb 15, 2024 to Mar 15, 2024');
    });

    it('should describe cross-year ranges', () => {
      const range: DateRange = {
        start: '2023-12-01',
        end: '2024-01-31',
      };
      expect(describeDateRange(range)).toBe('Dec 1, 2023 to Jan 31, 2024');
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year correctly', () => {
      // Set date to February 2024 (leap year)
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));

      expect(result).toEqual({
        start: '2024-02-01',
        end: '2024-02-29', // Leap year has 29 days
      });
    });

    it('should handle non-leap year correctly', () => {
      // Set date to February 2023 (non-leap year)
      vi.setSystemTime(new Date('2023-02-15T12:00:00Z'));

      expect(result).toEqual({
        start: '2023-02-01',
        end: '2023-02-28', // Non-leap year has 28 days
      });
    });

    it('should handle year boundaries', () => {
      // Set date to January 2024
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      expect(lastMonth).toEqual({
        start: '2023-12-01',
        end: '2023-12-31',
      });
    });

    it('should handle week boundaries correctly', () => {
      // Set date to Sunday
      vi.setSystemTime(new Date('2024-03-17T12:00:00Z'));

      expect(thisWeek).toEqual({
        start: '2024-03-11', // Monday
        end: '2024-03-17', // Sunday (today)
      });
    });
  });
});
