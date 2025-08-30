/**
 * Unit tests for filter translator functions
 * Specifically testing the fix for issue #182
 */
import { FilterValidationError } from '../../../src/errors/api-errors';


        expect(result).toHaveProperty('filter');
        expect(result.filter).toHaveProperty('name');
        expect(result.filter?.name).toHaveProperty('$contains', 'test');
      });

      it('should transform multiple filters with AND logic', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'test',
            },
            {
              attribute: { slug: 'website' },
              condition: FilterConditionType.CONTAINS,
              value: '.com',
            },
          ],
        };


        expect(result).toHaveProperty('filter');
        expect(result.filter).toHaveProperty('name');
        expect(result.filter).toHaveProperty('website');
        expect(result.filter?.name).toHaveProperty('$contains', 'test');
        expect(result.filter?.website).toHaveProperty('$contains', '.com');
      });

      it('should transform multiple filters with OR logic', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'test',
            },
            {
              attribute: { slug: 'website' },
              condition: FilterConditionType.CONTAINS,
              value: '.com',
            },
          ],
          matchAny: true,
        };


        expect(result).toHaveProperty('filter');
        expect(result.filter).toHaveProperty('$or');
        expect(Array.isArray(result.filter?.$or)).toBe(true);
        expect(result.filter?.$or?.length).toBe(2);

        // Check first OR condition
        expect(firstCondition).toHaveProperty('name');
        expect(firstCondition?.name).toHaveProperty('$contains', 'test');

        // Check second OR condition
        expect(secondCondition).toHaveProperty('website');
        expect(secondCondition?.website).toHaveProperty('$contains', '.com');
      });

      it('should handle empty filters array', () => {
        const filters: ListEntryFilters = {
          filters: [],
        };


        expect(result).toEqual({});
      });
    });

    // Invalid filter cases
    describe('Invalid filter structures', () => {
      it('should return empty object for undefined filters', () => {
        expect(result).toEqual({});
      });

      it('should return empty object for non-array filters property', () => {
          filters: { notAnArray: true },
        } as any;

        expect(result).toEqual({});
      });

      it('should return empty object when all filters in OR condition are invalid', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              // Missing attribute property
              condition: FilterConditionType.CONTAINS,
              value: 'test',
            } as any,
          ],
          matchAny: true,
        };

        expect(result).toEqual({});
      });

      it('should return empty object when all filters in AND condition are invalid', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              // Missing attribute.slug property
              attribute: {},
              condition: FilterConditionType.CONTAINS,
              value: 'test',
            } as any,
          ],
        };

        expect(result).toEqual({});
      });

      it('should throw error for invalid condition type', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'not_a_real_condition' as FilterConditionType,
              value: 'test',
            },
          ],
        };

        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(FilterValidationError);

        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(/condition/i);
      });
    });
  });

  describe('transformSingleFilterToApi', () => {
    it('should transform a single filter correctly', () => {
      const filter: ListEntryFilter = {
        attribute: { slug: 'name' },
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      };


      expect(result).toHaveProperty('name');
      expect(result.name).toHaveProperty('$contains', 'test');
    });

    it('should throw error for invalid filter structure', () => {
        // Missing attribute
        condition: FilterConditionType.CONTAINS,
        value: 'test',
      } as any;

      expect(() => {
        transformSingleFilterToApi(filter);
      }).toThrow(FilterValidationError);

      expect(() => {
        transformSingleFilterToApi(filter);
      }).toThrow(/invalid/i);
    });
  });
});
