/**
 * Unit tests for filter translator functions
 * Specifically testing the fix for issue #182
 */
import { 
  transformFiltersToApiFormat, 
  transformSingleFilterToApi
} from '../../../src/utils/filters/translators';
import { FilterValidationError } from '../../../src/errors/api-errors';
import { 
  FilterConditionType,
  ListEntryFilters, 
  ListEntryFilter 
} from '../../../src/utils/filters/types';

describe('Filter Translators', () => {
  describe('transformFiltersToApiFormat', () => {
    // Valid filter cases
    describe('Valid filter structures', () => {
      it('should transform a single filter with AND logic', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: FilterConditionType.CONTAINS,
              value: 'test'
            }
          ]
        };
        
        const result = transformFiltersToApiFormat(filters);
        
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
              value: 'test'
            },
            {
              attribute: { slug: 'website' },
              condition: FilterConditionType.CONTAINS,
              value: '.com'
            }
          ]
        };
        
        const result = transformFiltersToApiFormat(filters);
        
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
              value: 'test'
            },
            {
              attribute: { slug: 'website' },
              condition: FilterConditionType.CONTAINS,
              value: '.com'
            }
          ],
          matchAny: true
        };
        
        const result = transformFiltersToApiFormat(filters);
        
        expect(result).toHaveProperty('filter');
        expect(result.filter).toHaveProperty('$or');
        expect(Array.isArray(result.filter?.$or)).toBe(true);
        expect(result.filter?.$or?.length).toBe(2);
        
        // Check first OR condition
        const firstCondition = result.filter?.$or?.[0];
        expect(firstCondition).toHaveProperty('name');
        expect(firstCondition?.name).toHaveProperty('$contains', 'test');
        
        // Check second OR condition
        const secondCondition = result.filter?.$or?.[1];
        expect(secondCondition).toHaveProperty('website');
        expect(secondCondition?.website).toHaveProperty('$contains', '.com');
      });
      
      it('should handle empty filters array', () => {
        const filters: ListEntryFilters = {
          filters: []
        };
        
        const result = transformFiltersToApiFormat(filters);
        
        expect(result).toEqual({});
      });
    });
    
    // Invalid filter cases
    describe('Invalid filter structures', () => {
      it('should throw error for undefined filters', () => {
        expect(() => {
          transformFiltersToApiFormat(undefined);
        }).toThrow(FilterValidationError);
        
        expect(() => {
          transformFiltersToApiFormat(undefined);
        }).toThrow(/required/i);
      });
      
      it('should throw error for non-array filters property', () => {
        const filters = {
          filters: { notAnArray: true }
        } as any;
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(FilterValidationError);
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(/must be an array/i);
      });
      
      it('should throw error when all filters in OR condition are invalid', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              // Missing attribute property
              condition: FilterConditionType.CONTAINS,
              value: 'test'
            } as any
          ],
          matchAny: true
        };
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(FilterValidationError);
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(/invalid/i);
      });
      
      it('should throw error when all filters in AND condition are invalid', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              // Missing attribute.slug property
              attribute: {},
              condition: FilterConditionType.CONTAINS,
              value: 'test'
            } as any
          ]
        };
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(FilterValidationError);
        
        expect(() => {
          transformFiltersToApiFormat(filters);
        }).toThrow(/invalid/i);
      });
      
      it('should throw error for invalid condition type', () => {
        const filters: ListEntryFilters = {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'not_a_real_condition' as FilterConditionType,
              value: 'test'
            }
          ]
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
        value: 'test'
      };
      
      const result = transformSingleFilterToApi(filter);
      
      expect(result).toHaveProperty('name');
      expect(result.name).toHaveProperty('$contains', 'test');
    });
    
    it('should throw error for invalid filter structure', () => {
      const filter = {
        // Missing attribute
        condition: FilterConditionType.CONTAINS,
        value: 'test'
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