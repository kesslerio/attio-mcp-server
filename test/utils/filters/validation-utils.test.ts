/**
 * Unit tests for filter validation utilities
 * Tests the centralized validation functions for filter structures
 */

import {
  FilterErrorCategory,
  FilterValidationError,
} from '../../../src/errors/api-errors.js';
import {
  FilterConditionType,
  ListEntryFilter,
} from '../../../src/utils/filters/types.js';
import {
  collectInvalidFilters,
  ERROR_MESSAGES,
  formatInvalidFiltersError,
  getFilterExample,
  getInvalidFilterReason,
  validateFilters,
  validateFiltersObject,
} from '../../../src/utils/filters/validation-utils.js';

describe('Filter Validation Utilities', () => {
  describe('validateFiltersObject', () => {
    it('should validate a valid filters object', () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test',
          },
        ],
      };

      expect(() => validateFiltersObject(filters)).not.toThrow();
      expect(validateFiltersObject(filters)).toBe(filters);
    });

    it('should throw error for undefined filters with STRUCTURE category', () => {
      try {
        validateFiltersObject(undefined);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(FilterValidationError);
        expect((error as FilterValidationError).message).toContain(
          ERROR_MESSAGES.MISSING_FILTERS
        );
        expect((error as FilterValidationError).category).toBe(
          FilterErrorCategory.STRUCTURE
        );
      }
    });

    it('should throw error for filters missing filters property', () => {
      expect(() => validateFiltersObject({} as any)).toThrow(
        FilterValidationError
      );

      expect(() => validateFiltersObject({} as any)).toThrow(
        ERROR_MESSAGES.MISSING_FILTERS_PROPERTY
      );
    });

    it('should throw error for non-array filters property', () => {
      const filters = {
        filters: { not: 'an array' },
      } as any;

      expect(() => validateFiltersObject(filters)).toThrow(
        FilterValidationError
      );

      expect(() => validateFiltersObject(filters)).toThrow(
        ERROR_MESSAGES.FILTERS_NOT_ARRAY(typeof filters.filters)
      );
    });
  });

  describe('collectInvalidFilters', () => {
    it('should return empty array for valid filters', () => {
      const filters = [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'test',
        },
      ];

      const invalidFilters = collectInvalidFilters(filters);
      expect(invalidFilters).toEqual([]);
    });

    it('should detect missing attribute', () => {
      const filters = [
        {
          condition: FilterConditionType.CONTAINS,
          value: 'test',
        } as any,
      ];

      const invalidFilters = collectInvalidFilters(filters);
      expect(invalidFilters.length).toBe(1);
      expect(invalidFilters[0].reason).toBe(ERROR_MESSAGES.MISSING_ATTRIBUTE);
    });

    it('should detect missing attribute.slug', () => {
      const filters = [
        {
          attribute: {},
          condition: FilterConditionType.CONTAINS,
          value: 'test',
        } as any,
      ];

      const invalidFilters = collectInvalidFilters(filters);
      expect(invalidFilters.length).toBe(1);
      expect(invalidFilters[0].reason).toBe(
        ERROR_MESSAGES.MISSING_ATTRIBUTE_SLUG
      );
    });

    it('should detect missing condition', () => {
      const filters = [
        {
          attribute: { slug: 'name' },
          value: 'test',
        } as any,
      ];

      const invalidFilters = collectInvalidFilters(filters);
      expect(invalidFilters.length).toBe(1);
      expect(invalidFilters[0].reason).toBe(ERROR_MESSAGES.MISSING_CONDITION);
    });

    it('should detect invalid condition when validation is enabled', () => {
      const filters = [
        {
          attribute: { slug: 'name' },
          condition: 'not_a_real_condition' as FilterConditionType,
          value: 'test',
        },
      ];

      const invalidFilters = collectInvalidFilters(filters, true);
      expect(invalidFilters.length).toBe(1);
      expect(invalidFilters[0].reason).toContain('Invalid condition');
    });

    it('should not validate condition when validation is disabled', () => {
      const filters = [
        {
          attribute: { slug: 'name' },
          condition: 'not_a_real_condition' as FilterConditionType,
          value: 'test',
        },
      ];

      const invalidFilters = collectInvalidFilters(filters, false);
      expect(invalidFilters).toEqual([]);
    });
  });

  describe('formatInvalidFiltersError', () => {
    it('should return empty string for empty array', () => {
      expect(formatInvalidFiltersError([])).toBe('');
    });

    it('should format a single error correctly', () => {
      const invalidFilters = [
        {
          index: 0,
          reason: 'missing attribute.slug',
          filter: { attribute: {}, condition: 'contains', value: 'test' },
        },
      ];

      const formatted = formatInvalidFiltersError(invalidFilters);
      expect(formatted).toBe('Filter [0]: missing attribute.slug');
    });

    it('should format multiple errors correctly', () => {
      const invalidFilters = [
        {
          index: 0,
          reason: 'missing attribute.slug',
          filter: { attribute: {}, condition: 'contains', value: 'test' },
        },
        {
          index: 2,
          reason: 'invalid condition',
          filter: {
            attribute: { slug: 'name' },
            condition: 'bad',
            value: 'test',
          },
        },
      ];

      const formatted = formatInvalidFiltersError(invalidFilters);
      expect(formatted).toBe(
        'Filter [0]: missing attribute.slug; Filter [2]: invalid condition'
      );
    });
  });

  describe('validateFilters', () => {
    it('should validate a valid filters object', () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'test',
          },
        ],
      };

      expect(() => validateFilters(filters)).not.toThrow();
      expect(validateFilters(filters)).toBe(filters);
    });

    it('should accept empty filters array', () => {
      const filters = { filters: [] };

      expect(() => validateFilters(filters)).not.toThrow();
      expect(validateFilters(filters)).toBe(filters);
    });

    it('should throw detailed error when all filters are invalid with appropriate category', () => {
      const filters = {
        filters: [
          {
            attribute: {},
            condition: FilterConditionType.CONTAINS,
            value: 'test',
          } as any,
        ],
      };

      // Attribute error should have ATTRIBUTE category
      try {
        validateFilters(filters);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(FilterValidationError);
        expect((error as FilterValidationError).message).toContain(
          ERROR_MESSAGES.ALL_FILTERS_INVALID
        );
        expect((error as FilterValidationError).message).toContain(
          'Example of valid filter structure'
        );
        expect((error as FilterValidationError).category).toBe(
          FilterErrorCategory.ATTRIBUTE
        );
      }

      // Condition error should have CONDITION category
      const conditionFilters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'invalid_condition' as FilterConditionType,
            value: 'test',
          },
        ],
      };

      try {
        validateFilters(conditionFilters);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(FilterValidationError);
        expect((error as FilterValidationError).message).toContain(
          ERROR_MESSAGES.ALL_FILTERS_INVALID
        );
        expect((error as FilterValidationError).category).toBe(
          FilterErrorCategory.CONDITION
        );
      }
    });
  });

  describe('getInvalidFilterReason', () => {
    it('should detect null filter', () => {
      expect(getInvalidFilterReason(null)).toBe('filter is null');
    });

    it('should detect non-object filter', () => {
      expect(getInvalidFilterReason('not an object')).toBe('filter is string');
    });

    it('should detect missing attribute', () => {
      const filter = {
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };

      expect(getInvalidFilterReason(filter)).toBe(
        ERROR_MESSAGES.MISSING_ATTRIBUTE
      );
    });

    it('should detect missing attribute.slug', () => {
      const filter = {
        attribute: {},
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };

      expect(getInvalidFilterReason(filter)).toBe(
        ERROR_MESSAGES.MISSING_ATTRIBUTE_SLUG
      );
    });

    it('should detect missing condition', () => {
      const filter = {
        attribute: { slug: 'name' },
        value: 'test',
      };

      expect(getInvalidFilterReason(filter)).toBe(
        ERROR_MESSAGES.MISSING_CONDITION
      );
    });

    it('should detect invalid condition', () => {
      const filter = {
        attribute: { slug: 'name' },
        condition: 'not_a_real_condition',
        value: 'test',
      };

      expect(getInvalidFilterReason(filter)).toContain('invalid condition');
    });
  });

  describe('getFilterExample', () => {
    it('should return simple example by default', () => {
      const example = getFilterExample();
      expect(example).toContain('name');
      expect(example).toContain('contains');
      expect(example).toContain('Company Inc');
    });

    it('should return OR logic example when requested', () => {
      const example = getFilterExample('or');
      expect(example).toContain('matchAny');
      expect(example).toContain('true');
    });

    it('should return multiple conditions example when requested', () => {
      const example = getFilterExample('multiple');
      expect(example).toContain('name');
      expect(example).toContain('website');
      expect(example).not.toContain('matchAny'); // Should use AND logic by default
    });
  });
});
