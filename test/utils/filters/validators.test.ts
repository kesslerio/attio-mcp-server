/**
 * Unit tests for filter validation functions
 * Specifically testing the fix for issue #182
 */

import { FilterValidationError } from '../../../src/errors/api-errors';
import {
  FilterConditionType,
  type ListEntryFilter,
} from '../../../src/utils/filters/types';
import {
  validateFilterCondition,
  validateFilterStructure,
  validateFilterWithConditions,
} from '../../../src/utils/filters/validators';

describe('Filter Validators', () => {
  describe('validateFilterStructure', () => {
    it('should return true for valid filter structure', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };

      expect(validateFilterStructure(filter)).toBe(true);
    });

    it('should return false for null or undefined filter', () => {
      expect(validateFilterStructure(null as any)).toBe(false);
      expect(validateFilterStructure(undefined as any)).toBe(false);
    });

    it('should return false when attribute is missing', () => {
      const filter = {
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      } as any;

      expect(validateFilterStructure(filter)).toBe(false);
    });

    it('should return false when attribute.slug is missing', () => {
      const filter: ListEntryFilter = {
        attribute: {} as any,
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };

      expect(validateFilterStructure(filter)).toBe(false);
    });

    it('should return false when condition is missing', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: '' as any,
        value: 'test',
      };

      expect(validateFilterStructure(filter)).toBe(false);
    });

    it("should return true even if value is missing (some conditions don't need values)", () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: FilterConditionType.IS_EMPTY,
        value: undefined,
      };

      expect(validateFilterStructure(filter)).toBe(true);
    });
  });

  describe('validateFilterCondition', () => {
    it('should return the condition for valid condition types', () => {
      const validConditions = Object.values(FilterConditionType);

      validConditions.forEach((condition) => {
        expect(validateFilterCondition(condition)).toBe(condition);
      });
    });

    it('should throw error for empty condition', () => {
      expect(() => {
        validateFilterCondition('');
      }).toThrow(FilterValidationError);

      expect(() => {
        validateFilterCondition('');
      }).toThrow(/required/i);
    });

    it('should throw error for invalid condition', () => {
      expect(() => {
        validateFilterCondition('not_a_real_condition');
      }).toThrow(FilterValidationError);

      expect(() => {
        validateFilterCondition('not_a_real_condition');
      }).toThrow(/invalid filter condition/i);
    });
  });

  describe('validateFilterWithConditions', () => {
    it('should not throw for valid filter and valid condition', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };

      expect(() => {
        validateFilterWithConditions(filter);
      }).not.toThrow();
    });

    it('should throw for invalid filter structure', () => {
      const filter = {
        // Missing attribute
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      } as any;

      expect(() => {
        validateFilterWithConditions(filter);
      }).toThrow(FilterValidationError);

      expect(() => {
        validateFilterWithConditions(filter);
      }).toThrow(/invalid filter/i);
    });

    it('should throw for invalid condition when validation is enabled', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: 'not_a_real_condition' as FilterConditionType,
        value: 'test',
      };

      expect(() => {
        validateFilterWithConditions(filter, true);
      }).toThrow(FilterValidationError);

      expect(() => {
        validateFilterWithConditions(filter, true);
      }).toThrow(/invalid filter condition/i);
    });

    it('should not throw for invalid condition when validation is disabled', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: 'not_a_real_condition' as FilterConditionType,
        value: 'test',
      };

      expect(() => {
        validateFilterWithConditions(filter, false);
      }).not.toThrow();
    });
  });
});
