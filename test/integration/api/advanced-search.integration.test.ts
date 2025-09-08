/**
 * End-to-end tests for advanced search functionality
 * Specifically testing the fix for issue #182
 *
 * These tests use the actual Attio API and require a valid API key.
 * Tests will be skipped if SKIP_INTEGRATION_TESTS is set to true or
 * if ATTIO_API_KEY is not provided.
 */
import { describe, beforeAll, it, expect, test, vi } from 'vitest';
import { advancedSearchObject } from '../../../src/api/operations/search.js';
import { FilterConditionType, ResourceType } from '../../../src/types/attio.js';
import { initializeAttioClient } from '../../../src/api/attio-client.js';
import { FilterValidationError } from '../../../src/errors/api-errors.js';

// Import the actual implementation directly to bypass mocks
import { advancedSearchCompanies } from '../../../src/objects/companies/search.js';

// Skip tests if no API key or if explicitly disabled
const SKIP_TESTS =
  !process.env.ATTIO_API_KEY || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe('Advanced Search API Tests', { timeout: 30000 }, () => {
  // Initialize API client if not skipping tests
  beforeAll(async () => {
    if (!SKIP_TESTS) {
      // Unmock the companies module for integration tests
      vi.doUnmock('../../../src/objects/companies/search');
      vi.doUnmock('../../../src/objects/companies/index');

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
      const filters = {
        filters: [
          { attribute: { slug: 'name' }, condition: FilterConditionType.CONTAINS, value: 'inc' },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const company = results[0];
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('values');
        expect(company.values).toHaveProperty('name');
      }
    });

    it('should handle OR logic with multiple conditions', async () => {
      const filters = {
        filters: [
          { attribute: { slug: 'name' }, condition: FilterConditionType.CONTAINS, value: 'inc' },
          { attribute: { slug: 'name' }, condition: FilterConditionType.CONTAINS, value: 'tech' },
        ],
        matchAny: true,
      };

      const results = await advancedSearchCompanies(filters, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle company-specific attributes', async () => {
      const filters = {
        filters: [
          { attribute: { slug: 'website' }, condition: FilterConditionType.CONTAINS, value: '.com' },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should throw appropriate error for invalid filter structure', async () => {
      const filters = {
        filters: [
          { condition: FilterConditionType.CONTAINS, value: 'test' },
        ],
      } as any;
      await expect(advancedSearchCompanies(filters)).rejects.toThrow(/invalid/i);
    });

    it('should throw appropriate error for invalid condition', async () => {
      const filters = {
        filters: [
          { attribute: { slug: 'name' }, condition: 'not_a_real_condition' as FilterConditionType, value: 'test' },
        ],
      };
      await expect(advancedSearchCompanies(filters)).rejects.toThrow(/invalid condition/i);
    });
  });

  describe('advancedSearchObject', () => {
    if (SKIP_TESTS) { test.skip('Skipped: No API key available or tests disabled', () => {}); return; }

    it('should search companies with the lower-level API function', async () => {
      const filters = {
        filters: [
          { attribute: { slug: 'name' }, condition: FilterConditionType.CONTAINS, value: 'inc' },
        ],
      };
      const results = await advancedSearchObject(ResourceType.COMPANIES, filters, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle errors at the generic API level', async () => {
      const filters = {
        filters: [
          { attribute: { slug: 'name' }, condition: 'not_a_real_condition' as FilterConditionType, value: 'test' },
        ],
      };
      await expect(
        advancedSearchObject(ResourceType.COMPANIES, filters)
      ).rejects.toThrow(FilterValidationError);
    });

    it('should handle non-array filters with clear error', async () => {
      const filters = { filters: { not: 'an array' } } as any;
      await expect(
        advancedSearchObject(ResourceType.COMPANIES, filters)
      ).rejects.toThrow(/must be an array/i);
    });
  });
});

