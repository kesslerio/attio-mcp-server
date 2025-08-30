/**
 * Universal Resource Types Validation Test
 *
 * Validates that all 7 universal resource types work correctly with our refactored
 * formatResult functions and that Phase 2 LISTS and NOTES support is working properly.
 */

import { describe, it, expect } from 'vitest';

import { UniversalResourceType } from '../src/handlers/tool-configs/universal/types.js';
import * as advancedOps from '../src/handlers/tool-configs/universal/advanced-operations.js';
import * as advancedOps from '../src/handlers/tool-configs/universal/advanced-operations.js';
import * as coreOps from '../src/handlers/tool-configs/universal/core-operations.js';
import * as coreOps from '../src/handlers/tool-configs/universal/core-operations.js';
import type { ResourceType } from '../src/core/types.js';

// Import configurations to test
import * as coreOps from '../src/handlers/tool-configs/universal/core-operations.js';
import * as advancedOps from '../src/handlers/tool-configs/universal/advanced-operations.js';

// Mock data factories
import {
  CompanyMockFactory,
  PersonMockFactory,
  TaskMockFactory,
  ListMockFactory,
} from './utils/mock-factories/index.js';

describe('Universal Resource Types Validation', () => {
  describe('All 7 Resource Types Enum Validation', () => {
    it('should have exactly 7 resource types defined', () => {
      expect(resourceTypes).toHaveLength(7);

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
      companies: CompanyMockFactory.create(),
      people: PersonMockFactory.create(),
      lists: ListMockFactory.create(),
      records: CompanyMockFactory.create(), // Records use company structure
      tasks: TaskMockFactory.create(),
      deals: CompanyMockFactory.create(), // Deals use company-like structure
      notes: {
        id: { record_id: 'note_123' },
        values: { title: [{ value: 'Test Note' }] },
      }, // Simple mock for notes
    };

      { name: 'search-records', fn: coreOps.searchRecordsConfig.formatResult },
      {
        name: 'get-record-details',
        fn: coreOps.getRecordDetailsConfig.formatResult,
      },
      { name: 'create-record', fn: coreOps.createRecordConfig.formatResult },
      { name: 'update-record', fn: coreOps.updateRecordConfig.formatResult },
      { name: 'delete-record', fn: coreOps.deleteRecordConfig.formatResult },
      { name: 'get-attributes', fn: coreOps.getAttributesConfig.formatResult },
      {
        name: 'get-detailed-info',
        fn: coreOps.getDetailedInfoConfig.formatResult,
      },
      {
        name: 'advanced-search',
        fn: advancedOps.advancedSearchConfig.formatResult,
      },
    ];

    formatResultFunctions.forEach(({ name, fn }) => {
      if (!fn) return; // Skip if no formatResult function

      describe(`${name} formatResult`, () => {
        Object.values(UniversalResourceType).forEach((resourceType) => {
          it(`should handle ${resourceType} resource type`, () => {
            // Choose appropriate mock data based on the function
            let mockData;
            if (name === 'delete-record') {
              // Delete functions expect { success: boolean; record_id: string }
              mockData = { success: true, record_id: 'test_123' };
            } else if (
              name === 'search-records' ||
              name === 'advanced-search'
            ) {
              // Search functions expect arrays
              mockData = [
                mockDataByType[resourceType as keyof typeof mockDataByType],
              ].filter(Boolean);
            } else {
              // Other functions expect single records
              mockData =
                mockDataByType[resourceType as keyof typeof mockDataByType];
            }

            expect(() => {
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

      // Most resource types should be plural forms, with "people" being the exception
        'companies',
        'people',
        'lists',
        'records',
        'tasks',
        'deals',
        'notes',
      ];
      expect(resourceTypes.sort()).toEqual(expectedTypes.sort());
    });

    it('should have corresponding mock factories for all types', () => {
      // Verify we can create mock data for all resource types
      expect(() => CompanyMockFactory.create()).not.toThrow();
      expect(() => PersonMockFactory.create()).not.toThrow();
      expect(() => TaskMockFactory.create()).not.toThrow();
      expect(() => ListMockFactory.create()).not.toThrow();

      // Verify mock data has expected structure
      expect(companyMock).toBeDefined();
      expect(typeof companyMock).toBe('object');

      expect(personMock).toBeDefined();
      expect(typeof personMock).toBe('object');
    });
  });

  describe('Contract Consistency Across All Types', () => {
    it('should return consistent string format across all resource types for search', () => {
        (resourceType) => {
          return {
            resourceType,
            result: coreOps.searchRecordsConfig.formatResult(
              mockData,
              resourceType as ResourceType
            ),
          };
        }
      );

      // All results should be strings
      searchResults.forEach(({ resourceType, result }) => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.trim().startsWith('{')).toBe(false);
      });
    });

    it('should return consistent string format across all resource types for details', () => {
        (resourceType) => {
          return {
            resourceType,
            result: coreOps.getRecordDetailsConfig.formatResult(
              mockData,
              resourceType as ResourceType
            ),
          };
        }
      );

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
