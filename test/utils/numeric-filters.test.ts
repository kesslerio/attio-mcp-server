/**
 * Tests for numeric filtering functionality
 */

import { FilterConditionType, type NumericRange } from '../../src/types/attio';
import { createNumericFilter } from '../../src/utils/record-utils';

describe('Numeric Filtering', () => {
  describe('createNumericFilter', () => {
    it('should create a filter with min value only', () => {
      const range: NumericRange = { min: 1000 };
      const filter = createNumericFilter('revenue', range);

      expect(filter.filters).toBeDefined();
      expect(filter.filters?.length).toBe(1);
      expect(filter.filters?.[0].attribute.slug).toBe('revenue');
      expect(filter.filters?.[0].condition).toBe(
        FilterConditionType.GREATER_THAN_OR_EQUALS
      );
      expect(filter.filters?.[0].value).toBe(1000);
    });

    it('should create a filter with max value only', () => {
      const range: NumericRange = { max: 5000 };
      const filter = createNumericFilter('revenue', range);

      expect(filter.filters).toBeDefined();
      expect(filter.filters?.length).toBe(1);
      expect(filter.filters?.[0].attribute.slug).toBe('revenue');
      expect(filter.filters?.[0].condition).toBe(
        FilterConditionType.LESS_THAN_OR_EQUALS
      );
      expect(filter.filters?.[0].value).toBe(5000);
    });

    it('should create a filter with both min and max values', () => {
      const range: NumericRange = { min: 1000, max: 5000 };
      const filter = createNumericFilter('revenue', range);

      expect(filter.filters).toBeDefined();
      expect(filter.filters?.length).toBe(2);
      expect(filter.filters?.[0].attribute.slug).toBe('revenue');
      expect(filter.filters?.[0].condition).toBe(
        FilterConditionType.GREATER_THAN_OR_EQUALS
      );
      expect(filter.filters?.[0].value).toBe(1000);
      expect(filter.filters?.[1].attribute.slug).toBe('revenue');
      expect(filter.filters?.[1].condition).toBe(
        FilterConditionType.LESS_THAN_OR_EQUALS
      );
      expect(filter.filters?.[1].value).toBe(5000);
      expect(filter.matchAny).toBe(false);
    });

    it('should create a filter with equals value', () => {
      const range: NumericRange = { equals: 3000 };
      const filter = createNumericFilter('revenue', range);

      expect(filter.filters).toBeDefined();
      expect(filter.filters?.length).toBe(1);
      expect(filter.filters?.[0].attribute.slug).toBe('revenue');
      expect(filter.filters?.[0].condition).toBe(FilterConditionType.EQUALS);
      expect(filter.filters?.[0].value).toBe(3000);
    });

    it('should throw error when an invalid numeric range is provided', () => {
      // Min > Max (invalid)
      const invalidRange: NumericRange = { min: 5000, max: 1000 };

      expect(() => {
        createNumericFilter('revenue', invalidRange);
      }).toThrow(/min.*cannot be greater than max/);
    });

    it('should throw error when an empty range is provided', () => {
      // Empty range (invalid)
      const emptyRange: NumericRange = {};

      expect(() => {
        createNumericFilter('revenue', emptyRange);
      }).toThrow(/must specify at least one/);
    });

    it('should throw error when min/max are provided with equals', () => {
      // Both equals and min/max (invalid)
      const conflictRange: NumericRange = { equals: 2000, min: 1000 };

      expect(() => {
        createNumericFilter('revenue', conflictRange);
      }).toThrow(/Cannot specify both equals and min\/max/);
    });
  });
});
