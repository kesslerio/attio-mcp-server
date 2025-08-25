/**
 * Integration tests for companies advanced search functionality using universal tools
 * Tests migration from advanced-search-companies to advanced-search with resource_type: "companies"
 * These tests validate the enhanced error handling and validation in the universal advanced-search tool.
 *
 * NOTE: This test file requires a valid ATTIO_API_KEY to be set
 * in the environment. If the key is not set, tests will be skipped.
 */
import { describe, it, test, expect } from 'vitest';
import { executeToolRequest } from '../../src/handlers/tools/dispatcher';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { FilterValidationError } from '../../src/errors/api-errors';
import { FilterConditionType } from '../../src/types/attio';

// Skip tests if no API key is provided
const shouldRunTests =
  process.env.ATTIO_API_KEY && !process.env.SKIP_INTEGRATION_TESTS;
const testMethod = shouldRunTests ? test : test.skip;

describe('Companies Advanced Search Integration (Universal Tools)', () => {
  // Test valid search to verify the tool works properly using universal tools
  testMethod(
    'should successfully search companies with valid filters',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {
              filters: [
                {
                  attribute: { slug: 'name' },
                  condition: FilterConditionType.CONTAINS,
                  value: 'Test',
                },
              ],
            },
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      // We don't care about the actual results, just that it doesn't throw
      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
    },
    30000
  ); // 30s timeout for API call

  // Test invalid search with missing filters property using universal tools
  testMethod(
    'should throw descriptive error for invalid filter structure',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {} as any, // Missing filters property
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      expect(result).toBeDefined();
      expect(result.isError).toBeTruthy();

      // Should contain error information about invalid filter structure
      const errorText = result.content?.[0]?.text || '';
      expect(errorText).toMatch(
        /filter.*invalid|missing.*filters|required.*filters/i
      );
    }
  );

  // Test invalid search with invalid condition using universal tools
  testMethod(
    'should throw descriptive error for invalid filter condition',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {
              filters: [
                {
                  attribute: { slug: 'name' },
                  condition: 'not_a_real_condition' as FilterConditionType,
                  value: 'test',
                },
              ],
            },
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      expect(result).toBeDefined();
      expect(result.isError).toBeTruthy();

      // Should contain error information about invalid condition
      const errorText = result.content?.[0]?.text || '';
      expect(errorText).toMatch(/invalid.*condition|condition.*invalid/i);
    }
  );

  // Test invalid search with missing attribute using universal tools
  testMethod(
    'should throw descriptive error for missing attribute',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {
              filters: [
                {
                  condition: FilterConditionType.CONTAINS,
                  value: 'test',
                } as any, // Missing attribute
              ],
            },
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      expect(result).toBeDefined();
      expect(result.isError).toBeTruthy();

      // Should contain error information about missing attribute
      const errorText = result.content?.[0]?.text || '';
      expect(errorText).toMatch(
        /missing.*attribute|attribute.*missing|attribute.*required/i
      );
    }
  );

  // Test with OR logic using universal tools
  testMethod(
    'should successfully search with OR logic',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {
              filters: [
                {
                  attribute: { slug: 'name' },
                  condition: FilterConditionType.CONTAINS,
                  value: 'Inc',
                },
                {
                  attribute: { slug: 'name' },
                  condition: FilterConditionType.CONTAINS,
                  value: 'LLC',
                },
              ],
              matchAny: true,
            },
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
    },
    30000
  ); // 30s timeout for API call

  // Test empty filters array using universal tools
  testMethod(
    'should handle empty filters array gracefully',
    async () => {
      const mockRequest: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-search',
          arguments: {
            resource_type: 'companies',
            filters: {
              filters: [],
            },
          },
        },
      };

      const result = await executeToolRequest(mockRequest);

      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
    },
    30000
  ); // 30s timeout for API call
});
