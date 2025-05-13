/**
 * Tests for numeric range filtering
 */
import { describe, expect, test } from '@jest/globals';
import { createNumericRangeFilter } from '../../src/utils/record-utils.js';
import { FilterConditionType } from '../../src/types/attio.js';

describe('numeric-filters', () => {
  // Test creating numeric range filters
  test('createNumericRangeFilter creates correct filter structure', () => {
    // Test with both min and max values
    const fullRangeFilter = createNumericRangeFilter('employee_count', 10, 50);
    
    expect(fullRangeFilter.filters).toHaveLength(2);
    expect(fullRangeFilter.filters[0]).toEqual({
      attribute: { slug: 'employee_count' },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: 10
    });
    expect(fullRangeFilter.filters[1]).toEqual({
      attribute: { slug: 'employee_count' },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: 50
    });
    expect(fullRangeFilter.matchAny).toBe(false);
    
    // Test with only min value
    const minOnlyFilter = createNumericRangeFilter('revenue', 1000000);
    
    expect(minOnlyFilter.filters).toHaveLength(1);
    expect(minOnlyFilter.filters[0]).toEqual({
      attribute: { slug: 'revenue' },
      condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
      value: 1000000
    });
    
    // Test with only max value
    const maxOnlyFilter = createNumericRangeFilter('age', undefined, 65);
    
    expect(maxOnlyFilter.filters).toHaveLength(1);
    expect(maxOnlyFilter.filters[0]).toEqual({
      attribute: { slug: 'age' },
      condition: FilterConditionType.LESS_THAN_OR_EQUALS,
      value: 65
    });
  });
  
  // Test with invalid values
  test('createNumericRangeFilter handles invalid values gracefully', () => {
    // Test with both undefined values
    const emptyFilter = createNumericRangeFilter('employee_count');
    
    expect(emptyFilter.filters).toHaveLength(0);
    
    // Test with zero values (should be valid)
    const zeroFilter = createNumericRangeFilter('count', 0, 0);
    
    expect(zeroFilter.filters).toHaveLength(2);
    expect(zeroFilter.filters[0].value).toBe(0);
    expect(zeroFilter.filters[1].value).toBe(0);
  });
});