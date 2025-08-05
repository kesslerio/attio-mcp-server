/**
 * Test for the fix to advanced-search-companies tool (Issue #182)
 *
 * This test verifies that the advanced search functionality handles both
 * valid and invalid filter structures properly, with clear error messages.
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { FilterValidationError } from '../../src/errors/api-errors';
import { advancedSearchCompanies } from '../../src/objects/companies/index';

// Skip tests if no API key is provided
const SKIP_TESTS = !process.env.ATTIO_API_KEY;

// Tests have 30s timeout by default with Vitest config

describe('Advanced Search Companies Fix', () => {
  // Skip all tests if no API key
  if (SKIP_TESTS) {
    test.skip('Skipped: No API key available', () => {
      console.log('Skipping tests because ATTIO_API_KEY is not set');
    });
    return;
  }

  describe('Valid filter formats', () => {
    test('should handle a simple name filter', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);

      // Verify basic structure
      expect(Array.isArray(results)).toBe(true);

      // Results depend on data, but we can check structure
      if (results.length > 0) {
        const company = results[0];
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('values');
      }
    });

    test('should handle OR logic with matchAny: true', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'inc',
          },
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'tech',
          },
        ],
        matchAny: true, // Use OR logic
      };

      const results = await advancedSearchCompanies(filters, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle AND logic by default', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      const results = await advancedSearchCompanies(filters, 5);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Invalid filter formats', () => {
    test('should handle missing filters object with clear error', async () => {
      const filters = null;

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        'Filters object is required'
      );
    });

    test('should handle empty filters object with clear error', async () => {
      const filters = {};

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        'must include a "filters" array'
      );
    });

    test('should handle non-array filters with clear error', async () => {
      const filters = {
        filters: {
          attribute: { slug: 'name' },
          condition: 'contains',
          value: 'test',
        },
      };

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        'must be an array'
      );
    });

    test('should handle invalid filter structure with clear error', async () => {
      const filters = {
        filters: [
          {
            // Missing attribute
            condition: 'contains',
            value: 'test',
          },
        ],
      };

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /invalid/i
      );
    });

    test('should handle invalid condition with clear error', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'name' },
            condition: 'not_a_real_condition',
            value: 'test',
          },
        ],
      };

      await expect(advancedSearchCompanies(filters)).rejects.toThrow(
        /condition/i
      );
    });
  });
});
