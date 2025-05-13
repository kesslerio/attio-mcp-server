/**
 * Tests for date utilities
 */
import { describe, expect, test } from '@jest/globals';
import { 
  resolveRelativeDate, 
  normalizeDate, 
  createRelativeDatePreset,
  createDateRangeFromPreset 
} from '../../src/utils/date-utils.js';
import { 
  RelativeDateUnit, 
  RelativeDate 
} from '../../src/types/attio.js';

describe('date-utils', () => {
  // Test resolving relative dates
  test('resolveRelativeDate converts relative dates correctly', () => {
    // Mock the current date
    const realDateNow = Date.now;
    const mockDate = new Date('2023-10-15T12:00:00Z');
    global.Date.now = jest.fn(() => mockDate.getTime());
    
    // Create a few different relative dates to test
    const pastDay: RelativeDate = {
      unit: RelativeDateUnit.DAY,
      value: 1,
      direction: 'past'
    };
    
    const futureWeek: RelativeDate = {
      unit: RelativeDateUnit.WEEK,
      value: 2,
      direction: 'future'
    };
    
    const pastMonth: RelativeDate = {
      unit: RelativeDateUnit.MONTH,
      value: 3,
      direction: 'past'
    };
    
    // Test past day (should be 2023-10-14)
    const pastDayResult = resolveRelativeDate(pastDay);
    expect(pastDayResult).toMatch(/^2023-10-14T/);
    
    // Test future week (should be 2023-10-29)
    const futureWeekResult = resolveRelativeDate(futureWeek);
    expect(futureWeekResult).toMatch(/^2023-10-29T/);
    
    // Test past month (should be 2023-07-15)
    const pastMonthResult = resolveRelativeDate(pastMonth);
    expect(pastMonthResult).toMatch(/^2023-07-15T/);
    
    // Restore the original Date.now
    global.Date.now = realDateNow;
  });
  
  // Test normalizing date inputs
  test('normalizeDate handles both string and relative dates', () => {
    // Mock the current date
    const realDateNow = Date.now;
    const mockDate = new Date('2023-10-15T12:00:00Z');
    global.Date.now = jest.fn(() => mockDate.getTime());
    
    // Test with a string date
    const stringDate = '2023-09-01';
    const normalizedString = normalizeDate(stringDate);
    expect(normalizedString).toMatch(/^2023-09-01T/);
    
    // Test with a relative date
    const relativeDate: RelativeDate = {
      unit: RelativeDateUnit.DAY,
      value: 7,
      direction: 'past'
    };
    
    const normalizedRelative = normalizeDate(relativeDate);
    expect(normalizedRelative).toMatch(/^2023-10-08T/);
    
    // Restore the original Date.now
    global.Date.now = realDateNow;
  });
  
  // Test date presets
  test('createRelativeDatePreset returns correct presets', () => {
    // Test a few common presets
    const yesterday = createRelativeDatePreset('yesterday');
    expect(yesterday).toEqual({
      unit: RelativeDateUnit.DAY,
      value: 1,
      direction: 'past'
    });
    
    const last7Days = createRelativeDatePreset('last_7_days');
    expect(last7Days).toEqual({
      unit: RelativeDateUnit.DAY,
      value: 7,
      direction: 'past'
    });
    
    const nextMonth = createRelativeDatePreset('next_month');
    expect(nextMonth).toEqual({
      unit: RelativeDateUnit.MONTH,
      value: 1,
      direction: 'future'
    });
    
    // Test error case
    expect(() => createRelativeDatePreset('invalid_preset')).toThrow();
  });
  
  // Test date range presets
  test('createDateRangeFromPreset returns correct date ranges', () => {
    // Mock the current date to a specific value for consistent test results
    const realDateNow = Date.now;
    const mockDate = new Date('2023-10-15T12:00:00Z');
    global.Date.now = jest.fn(() => mockDate.getTime());
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return new Date(mockDate);
      }
      return new (Function.prototype.bind.apply(
        Date, 
        [null].concat(Array.prototype.slice.call(args))
      ))();
    });
    
    // Test today range
    const todayRange = createDateRangeFromPreset('today');
    expect(todayRange.start).toMatch(/^2023-10-15T/);
    expect(todayRange.end).toMatch(/^2023-10-15T23:59:59/);
    
    // Test this week range
    const thisWeekRange = createDateRangeFromPreset('this_week');
    expect(thisWeekRange.start).toMatch(/^2023-10-15T/); // Sunday
    expect(thisWeekRange.end).toMatch(/^2023-10-21T23:59:59/); // Saturday
    
    // Test last month range
    const lastMonthRange = createDateRangeFromPreset('last_month');
    expect(lastMonthRange.start).toMatch(/^2023-09-01T/);
    expect(lastMonthRange.end).toMatch(/^2023-09-30T23:59:59/);
    
    // Restore the original Date functionality
    jest.restoreAllMocks();
    global.Date.now = realDateNow;
  });
});