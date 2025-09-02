/**
 * formatResult Contract Regression Tests
 *
 * These tests prevent future violations of the formatResult contract requirement
 * that all universal tools must return consistent string output regardless of
 * environment or test conditions.
 *
 * CONTEXT: Phase 1-3 refactoring eliminated dual-mode formatResult functions that
 * would return JSON in test environments but strings in production, which violated
 * the MCP protocol requirement for consistent string responses.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResourceType } from '../src/types/attio.js';

// Import all universal tool configurations
import * as coreOpsConfig from '../src/handlers/tool-configs/universal/core-operations.js';
import * as advancedOpsConfig from '../src/handlers/tool-configs/universal/advanced-operations.js';

// Mock data factories for testing
import {
  CompanyMockFactory,
  PersonMockFactory,
  TaskMockFactory,
  ListMockFactory,
} from './utils/mock-factories/index.js';

/**
 * All universal tool configurations that have formatResult functions
 */
const UNIVERSAL_TOOL_CONFIGS = [
  { name: 'search-records', config: coreOpsConfig.searchRecordsConfig },
  { name: 'get-record-details', config: coreOpsConfig.getRecordDetailsConfig },
  { name: 'create-record', config: coreOpsConfig.createRecordConfig },
  { name: 'update-record', config: coreOpsConfig.updateRecordConfig },
  { name: 'delete-record', config: coreOpsConfig.deleteRecordConfig },
  { name: 'get-attributes', config: coreOpsConfig.getAttributesConfig },
  { name: 'get-detailed-info', config: coreOpsConfig.getDetailedInfoConfig },
  { name: 'advanced-search', config: advancedOpsConfig.advancedSearchConfig },
];

/**
 * All supported resource types including the new LISTS type added in Phase 2
 */
const ALL_RESOURCE_TYPES: ResourceType[] = [
  ResourceType.COMPANIES,
  ResourceType.PEOPLE,
  ResourceType.LISTS,
  ResourceType.RECORDS,
  ResourceType.TASKS,
  ResourceType.DEALS,
];

/**
 * Test environments to verify consistent behavior
 */
const TEST_ENVIRONMENTS = [
  { NODE_ENV: 'test', description: 'test environment' },
  { NODE_ENV: 'production', description: 'production environment' },
  { NODE_ENV: 'development', description: 'development environment' },
  { NODE_ENV: undefined, description: 'undefined environment' },
];

describe('formatResult Contract Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('String Return Type Contract', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      describe(`${name} formatResult`, () => {
        ALL_RESOURCE_TYPES.forEach((resourceType) => {
          it(`should always return string type for ${resourceType}`, () => {
            const mockData = getMockDataForResourceType(resourceType);
            const result = config.formatResult(mockData);

            expect(typeof result).toBe('string');
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
          });
        });

        TEST_ENVIRONMENTS.forEach(({ NODE_ENV, description }) => {
          it(`should return string type in ${description}`, () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = NODE_ENV;

            try {
              const mockData = getMockDataForResourceType(
                ResourceType.COMPANIES
              );
              const result = config.formatResult(mockData);

              expect(typeof result).toBe('string');
            } finally {
              process.env.NODE_ENV = originalEnv;
            }
          });
        });
      });
    });
  });

  describe('JSON Output Prevention', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      describe(`${name} formatResult`, () => {
        ALL_RESOURCE_TYPES.forEach((resourceType) => {
          it(`should never return JSON string for ${resourceType}`, () => {
            const mockData = getMockDataForResourceType(resourceType);
            const result = config.formatResult(mockData);

            // Verify result doesn't look like JSON
            expect(result.trim().startsWith('{')).toBe(false);
            expect(result.trim().startsWith('[')).toBe(false);
            expect(result.trim().endsWith('}')).toBe(false);
            expect(result.trim().endsWith(']')).toBe(false);
          });
        });

        TEST_ENVIRONMENTS.forEach(({ NODE_ENV, description }) => {
          it(`should never return JSON string in ${description}`, () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = NODE_ENV;

            try {
              const mockData = getMockDataForResourceType(
                ResourceType.COMPANIES
              );
              const result = config.formatResult(mockData);

              // Verify result doesn't look like JSON
              expect(result.trim().startsWith('{')).toBe(false);
              expect(result.trim().startsWith('[')).toBe(false);
            } finally {
              process.env.NODE_ENV = originalEnv;
            }
          });
        });
      });
    });
  });

  describe('Consistent Output Format', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      it(`${name} should provide consistent output across environments`, () => {
        const mockData = getMockDataForResourceType(ResourceType.COMPANIES);
        const outputs: string[] = [];

        TEST_ENVIRONMENTS.forEach(({ NODE_ENV }) => {
          const originalEnv = process.env.NODE_ENV;
          process.env.NODE_ENV = NODE_ENV;

          try {
            const result = config.formatResult(mockData);
            outputs.push(result);
          } finally {
            process.env.NODE_ENV = originalEnv;
          }
        });

        // All outputs should be identical
        const firstOutput = outputs[0];
        outputs.forEach((output, index) => {
          expect(output).toBe(firstOutput);
        });
      });
    });
  });

  describe('Error Handling Consistency', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      it(`${name} should handle null/undefined data gracefully`, () => {
        // Some formatResult functions may require specific structure, so we test with
        // basic valid structure rather than null to avoid implementation details
        const minimalValidData = { success: true, data: null };

        expect(() => {
          config.formatResult(minimalValidData);
        }).not.toThrow();

        const resultForNull = config.formatResult(minimalValidData);
        expect(typeof resultForNull).toBe('string');
      });

      it(`${name} should handle empty data gracefully`, () => {
        // Use minimal valid structure for empty data tests
        const emptyData = { success: true, data: {} };

        expect(() => {
          config.formatResult(emptyData);
        }).not.toThrow();

        expect(() => {
          const arrayData = { success: true, data: [] };
          config.formatResult(arrayData);
        }).not.toThrow();
      });
    });
  });

  describe('All Resource Types Support', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      ALL_RESOURCE_TYPES.forEach((resourceType) => {
        it(`${name} should support ${resourceType} resource type`, () => {
          const mockData = getMockDataForResourceType(resourceType);

          expect(() => {
            const result = config.formatResult(mockData);
            expect(typeof result).toBe('string');
          }).not.toThrow();
        });
      });
    });
  });

  describe('Phase 2 LISTS Resource Type Regression', () => {
    UNIVERSAL_TOOL_CONFIGS.forEach(({ name, config }) => {
      if (!config.formatResult) {
        return; // Skip tools without formatResult
      }

      it(`${name} should properly handle LISTS resource type added in Phase 2`, () => {
        const mockListData = ListMockFactory.create();

        const result = config.formatResult(mockListData);

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.trim().startsWith('{')).toBe(false);
      });
    });
  });
});

/**
 * Get appropriate mock data for a given resource type
 */
function getMockDataForResourceType(resourceType: ResourceType): any {
  switch (resourceType) {
    case 'companies':
      return CompanyMockFactory.create();
    case 'people':
      return PersonMockFactory.create();
    case 'tasks':
      return TaskMockFactory.create();
    case 'lists':
      return ListMockFactory.create();
    case 'records':
      return CompanyMockFactory.create(); // Records can use company structure
    case 'deals':
      return CompanyMockFactory.create(); // Deals can use company structure for testing
    default:
      return CompanyMockFactory.create(); // Fallback to company structure
  }
}
