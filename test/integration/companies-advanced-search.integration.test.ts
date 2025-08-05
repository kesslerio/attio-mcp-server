/**
 * Integration tests for companies advanced search functionality
 * These tests validate the enhanced error handling and validation
 * in the advanced-search-companies tool.
 *
 * NOTE: This test file requires a valid ATTIO_API_KEY to be set
 * in the environment. If the key is not set, tests will be skipped.
 */
import { describe, expect, it, test } from 'vitest';
import { FilterValidationError } from '../../src/errors/api-errors';
import {
  advancedSearchCompanies,
  createNameFilter,
} from '../../src/objects/companies/search';
import { FilterConditionType } from '../../src/types/attio';

// Skip tests if no API key is provided
const shouldRunTests =
  process.env.ATTIO_API_KEY && !process.env.SKIP_INTEGRATION_TESTS;
const testMethod = shouldRunTests ? test : test.skip;

describe('Companies Advanced Search Integration', () => {
  // Test valid search to verify the tool works properly
  testMethod(
    'should successfully search companies with valid filters',
    async () => {
      const filters = createNameFilter('Test', FilterConditionType.CONTAINS);
      const results = await advancedSearchCompanies(filters);

      // We don't care about the actual results, just that it doesn't throw
      expect(Array.isArray(results)).toBeTruthy();
      // Results might be empty depending on the test data, which is fine
    },
    30_000
  ); // 30s timeout for API call

  // Test invalid search with missing filters property
  testMethod(
    'should throw descriptive error for invalid filter structure',
    async () => {
      const invalidFilters = {} as any; // Missing filters property

      await expect(advancedSearchCompanies(invalidFilters)).rejects.toThrow(
        FilterValidationError
      );

      try {
        await advancedSearchCompanies(invalidFilters);
      } catch (error) {
        expect(error instanceof FilterValidationError).toBeTruthy();
        // Should contain the specific error message and company context
        expect((error as FilterValidationError).message).toContain(
          'Advanced company search filter invalid'
        );
        expect((error as FilterValidationError).message).toContain(
          'MISSING_FILTERS_PROPERTY'
        );
      }
    }
  );

  // Test invalid search with invalid condition
  testMethod(
    'should throw descriptive error for invalid filter condition',
    async () => {
      const invalidFilters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'not_a_real_condition' as FilterConditionType,
            value: 'test',
          },
        ],
      };

      await expect(advancedSearchCompanies(invalidFilters)).rejects.toThrow(
        FilterValidationError
      );

      try {
        await advancedSearchCompanies(invalidFilters);
      } catch (error) {
        expect(error instanceof FilterValidationError).toBeTruthy();
        // Should contain the specific error message, example, and company context
        expect((error as FilterValidationError).message).toContain(
          'Advanced company search filter invalid'
        );
        expect((error as FilterValidationError).message).toContain(
          'Invalid condition'
        );
        expect((error as FilterValidationError).message).toContain(
          'Example of valid filter structure'
        );
      }
    }
  );

  // Test invalid search with missing attribute
  testMethod(
    'should throw descriptive error for missing attribute',
    async () => {
      const invalidFilters = {
        filters: [
          {
            condition: FilterConditionType.CONTAINS,
            value: 'test',
          } as any,
        ],
      };

      await expect(advancedSearchCompanies(invalidFilters)).rejects.toThrow(
        FilterValidationError
      );

      try {
        await advancedSearchCompanies(invalidFilters);
      } catch (error) {
        expect(error instanceof FilterValidationError).toBeTruthy();
        expect((error as FilterValidationError).message).toContain(
          'missing attribute'
        );
      }
    }
  );

  // Test with OR logic
  testMethod(
    'should successfully search with OR logic',
    async () => {
      const filters = {
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
      };

      const results = await advancedSearchCompanies(filters);
      expect(Array.isArray(results)).toBeTruthy();
    },
    30_000
  ); // 30s timeout for API call

  // Test empty filters array
  testMethod(
    'should handle empty filters array gracefully',
    async () => {
      const emptyFilters = {
        filters: [],
      };

      const results = await advancedSearchCompanies(emptyFilters);
      expect(Array.isArray(results)).toBeTruthy();
    },
    30_000
  ); // 30s timeout for API call
});
