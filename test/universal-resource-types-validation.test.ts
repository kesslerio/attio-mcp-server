/**
 * Universal Resource Types Validation Test
 * 
 * Validates that all 6 universal resource types work correctly with our refactored
 * formatResult functions and that Phase 2 LISTS support is working properly.
 */

import { describe, it, expect } from 'vitest';
import { UniversalResourceType } from '../src/handlers/tool-configs/universal/types.js';
import type { ResourceType } from '../src/core/types.js';

// Import configurations to test
import * as coreOps from '../src/handlers/tool-configs/universal/core-operations.js';
import * as advancedOps from '../src/handlers/tool-configs/universal/advanced-operations.js';

// Mock data factories
import {
  CompanyMockFactory,
  PersonMockFactory,
  TaskMockFactory,
  ListMockFactory
} from './utils/mock-factories/index.js';

describe('Universal Resource Types Validation', () => {
  
  describe('All 6 Resource Types Enum Validation', () => {
    it('should have exactly 6 resource types defined', () => {
      const resourceTypes = Object.values(UniversalResourceType);
      expect(resourceTypes).toHaveLength(6);
      
      // Verify all expected types are present
      expect(resourceTypes).toContain('companies');
      expect(resourceTypes).toContain('people'); 
      expect(resourceTypes).toContain('lists');
      expect(resourceTypes).toContain('records');
      expect(resourceTypes).toContain('tasks');
      expect(resourceTypes).toContain('deals');
    });

    it('should map correctly to ResourceType', () => {
      // Verify the enum values match expected string values
      expect(UniversalResourceType.COMPANIES).toBe('companies');
      expect(UniversalResourceType.PEOPLE).toBe('people');
      expect(UniversalResourceType.LISTS).toBe('lists');
      expect(UniversalResourceType.RECORDS).toBe('records');
      expect(UniversalResourceType.TASKS).toBe('tasks');
      expect(UniversalResourceType.DEALS).toBe('deals');
    });
  });

  describe('formatResult Functions Support All Resource Types', () => {
    const mockDataByType = {
      companies: CompanyMockFactory.create(),
      people: PersonMockFactory.create(),
      lists: ListMockFactory.create(),
      records: CompanyMockFactory.create(), // Records use company structure
      tasks: TaskMockFactory.create(),
      deals: CompanyMockFactory.create(), // Deals use company-like structure
    };

    const formatResultFunctions = [
      { name: 'search-records', fn: coreOps.searchRecordsConfig.formatResult },
      { name: 'get-record-details', fn: coreOps.getRecordDetailsConfig.formatResult },
      { name: 'create-record', fn: coreOps.createRecordConfig.formatResult },
      { name: 'update-record', fn: coreOps.updateRecordConfig.formatResult },
      { name: 'delete-record', fn: coreOps.deleteRecordConfig.formatResult },
      { name: 'get-attributes', fn: coreOps.getAttributesConfig.formatResult },
      { name: 'get-detailed-info', fn: coreOps.getDetailedInfoConfig.formatResult },
      { name: 'advanced-search', fn: advancedOps.advancedSearchConfig.formatResult },
    ];

    formatResultFunctions.forEach(({ name, fn }) => {
      if (!fn) return; // Skip if no formatResult function

      describe(`${name} formatResult`, () => {
        Object.values(UniversalResourceType).forEach((resourceType) => {
          it(`should handle ${resourceType} resource type`, () => {
            const mockData = mockDataByType[resourceType as keyof typeof mockDataByType];
            
            expect(() => {
              const result = fn(mockData, resourceType as ResourceType);
              expect(typeof result).toBe('string');
              expect(result.length).toBeGreaterThan(0);
            }).not.toThrow();
          });
        });
      });
    });
  });

  describe('Phase 2 LISTS Resource Type Validation', () => {
    it('should properly support LISTS type in all formatResult functions', () => {
      const listMockData = ListMockFactory.create();
      
      const formatResultFunctions = [
        coreOps.searchRecordsConfig.formatResult,
        coreOps.getRecordDetailsConfig.formatResult,
        coreOps.createRecordConfig.formatResult,
        coreOps.updateRecordConfig.formatResult,
        coreOps.deleteRecordConfig.formatResult,
        coreOps.getAttributesConfig.formatResult,
        coreOps.getDetailedInfoConfig.formatResult,
        advancedOps.advancedSearchConfig.formatResult,
      ].filter(Boolean); // Remove any undefined functions

      formatResultFunctions.forEach((formatFn, index) => {
        expect(() => {
          const result = formatFn(listMockData, 'lists');
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
          // Ensure it's not JSON output
          expect(result.trim().startsWith('{')).toBe(false);
        }).not.toThrow();
      });
    });
  });

  describe('Resource Type Mappings and Validation', () => {
    it('should handle plural and special forms correctly', () => {
      const resourceTypes = Object.values(UniversalResourceType);
      
      // Most resource types should be plural forms, with "people" being the exception
      const expectedTypes = ['companies', 'people', 'lists', 'records', 'tasks', 'deals'];
      expect(resourceTypes.sort()).toEqual(expectedTypes.sort());
    });

    it('should have corresponding mock factories for all types', () => {
      // Verify we can create mock data for all resource types
      expect(() => CompanyMockFactory.create()).not.toThrow();
      expect(() => PersonMockFactory.create()).not.toThrow();
      expect(() => TaskMockFactory.create()).not.toThrow();
      expect(() => ListMockFactory.create()).not.toThrow();
      
      // Verify mock data has expected structure
      const companyMock = CompanyMockFactory.create();
      expect(companyMock).toBeDefined();
      expect(typeof companyMock).toBe('object');
      
      const personMock = PersonMockFactory.create();
      expect(personMock).toBeDefined();
      expect(typeof personMock).toBe('object');
    });
  });

  describe('Contract Consistency Across All Types', () => {
    it('should return consistent string format across all resource types for search', () => {
      const searchResults = Object.values(UniversalResourceType).map(resourceType => {
        const mockData = getMockDataForType(resourceType);
        return {
          resourceType,
          result: coreOps.searchRecordsConfig.formatResult(mockData, resourceType as ResourceType)
        };
      });

      // All results should be strings
      searchResults.forEach(({ resourceType, result }) => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.trim().startsWith('{')).toBe(false);
      });
    });

    it('should return consistent string format across all resource types for details', () => {
      const detailResults = Object.values(UniversalResourceType).map(resourceType => {
        const mockData = getMockDataForType(resourceType);
        return {
          resourceType,
          result: coreOps.getRecordDetailsConfig.formatResult(mockData, resourceType as ResourceType)
        };
      });

      // All results should be strings
      detailResults.forEach(({ resourceType, result }) => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.trim().startsWith('{')).toBe(false);
      });
    });
  });
});

/**
 * Helper function to get appropriate mock data for a resource type
 */
function getMockDataForType(resourceType: string) {
  switch (resourceType) {
    case 'companies':
      return CompanyMockFactory.create();
    case 'people':
      return PersonMockFactory.create();
    case 'lists':
      return ListMockFactory.create();
    case 'tasks':
      return TaskMockFactory.create();
    case 'records':
    case 'deals':
      return CompanyMockFactory.create(); // Use company structure
    default:
      return CompanyMockFactory.create();
  }
}