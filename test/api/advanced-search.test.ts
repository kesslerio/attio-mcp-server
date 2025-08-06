/**
 * End-to-end tests for advanced search functionality
 * Specifically testing the fix for issue #182
 *
 * These tests use the actual Attio API and require a valid API key.
 * Tests will be skipped if SKIP_INTEGRATION_TESTS is set to true or
 * if ATTIO_API_KEY is not provided.
 */

import { initializeAttioClient } from '../../src/api/attio-client.js';
import { advancedSearchObject } from '../../src/api/operations/search.js';
import { FilterValidationError } from '../../src/errors/api-errors.js';
import { advancedSearchCompanies } from '../../src/objects/companies/index.js';
import { FilterConditionType, ResourceType } from '../../src/types/attio.js';

// Skip tests if no API key or if explicitly disabled
const SKIP_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Advanced Search API Tests', { timeout: 30_000 }, () => {
  // Initialize API client if not skipping tests
  beforeAll(() => {
    if (!SKIP_TESTS) {
      const apiKey = process.env.ATTIO_API_KEY as string;
      initializeAttioClient(apiKey);

      console.log('Running API integration tests with provided API key');
    }
  });

  describe('advancedSearchCompanies', () => {
    // Skip all tests if no API key or if explicitly disabled
    if (SKIP_TESTS) {
      test.skip('Skipped: No API key available or tests disabled', () => {
        console.log(
          'Skipping API tests because ATTIO_API_KEY is not set or SKIP_INTEGRATION_TESTS=true'
        );
      });
      return;
    }

    it('should return companies matching a simple name filter', async () => {
      // Test with common company name term like "inc" that should match something
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'inc',
          },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);

      // Verify we got results in the expected format
      expect(Array.isArray(results)).toBe(true);

      // We can't guarantee results since this depends on actual data
      // but we can check the structure if results exist
      if (results.length > 0) {
        const company = results[0];
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('values');
        expect(company.values).toHaveProperty('name');
      }
    });

    it('should handle OR logic with multiple conditions', async () => {
      // Test with multiple terms that should match something
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'inc',
          },
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'tech',
          },
        ],
        matchAny: true,
      };

      const results = await advancedSearchCompanies(filters, 5);

      // Verify we got results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle company-specific attributes', async () => {
      // Test with a company-specific attribute like website
      const filters = {
        filters: [
          {
            attribute: { slug: 'website' },
            condition: FilterConditionType.CONTAINS,
            value: '.com',
          },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);

      // Verify we got results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should throw appropriate error for invalid filter structure', async () => {
      // Test with invalid filter
      const filters = {
        filters: [
          {
            // Missing attribute
            condition: FilterConditionType.CONTAINS,
            value: 'test',
          },
        ],
      } as any;

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /invalid/i
      );
    });

    it('should throw appropriate error for invalid condition', async () => {
      // Test with invalid condition
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'not_a_real_condition' as FilterConditionType,
            value: 'test',
          },
        ],
      };

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /invalid condition/i
      );
    });
  });

  describe('advancedSearchObject', () => {
    // Skip all tests if no API key or if explicitly disabled
    if (SKIP_TESTS) {
      test.skip('Skipped: No API key available or tests disabled', () => {});
      return;
    }

    it('should search companies with the lower-level API function', async () => {
      // Test using the more generic advancedSearchObject function
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: FilterConditionType.CONTAINS,
            value: 'inc',
          },
        ],
      };

      const results = await advancedSearchObject(
        ResourceType.COMPANIES,
        filters,
        5
      );

      // Verify we got results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle errors at the generic API level', async () => {
      // Test with invalid filter
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'not_a_real_condition' as FilterConditionType,
            value: 'test',
          },
        ],
      };

      await expect(
        advancedSearchObject(ResourceType.COMPANIES, filters)
      ).rejects.toThrow(FilterValidationError);
    });

    it('should handle non-array filters with clear error', async () => {
      const filters = {
        filters: { not: 'an array' },
      } as any;

      await expect(
        advancedSearchObject(ResourceType.COMPANIES, filters)
      ).rejects.toThrow(/must be an array/i);
    });
  });
});
