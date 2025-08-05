/**
 * Test for companies advanced search functionality
 */
import { beforeAll, describe, expect, test } from 'vitest';
import { initializeAttioClient } from '../../src/api/attio-client';
import { advancedSearchCompanies } from '../../src/objects/companies/index';
import { FilterConditionType } from '../../src/types/attio';

// Skip tests if no API key
const skipIntegrationTests = !process.env.ATTIO_API_KEY;

// Define mock filters to search with
const filters = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: FilterConditionType.CONTAINS,
      value: 'test',
    },
  ],
};

const testSuite = skipIntegrationTests ? describe.skip : describe;
testSuite('Companies Advanced Search', () => {
  beforeAll(() => {
    if (!skipIntegrationTests) {
      initializeAttioClient(process.env.ATTIO_API_KEY!);
    }
  });

  test('should return either array or paginated results', async () => {
    const results = await advancedSearchCompanies(filters, 5);

    // Since the function returns either an array or paginated results
    // we need proper checks for both cases
    if (Array.isArray(results)) {
      // If it's an array, check basic array properties
      expect(results).toBeDefined();

      // Array contents would depend on test data, so we can only
      // check for structure if there are results
      if (results.length > 0) {
        const firstResult = results[0];
        expect(firstResult).toHaveProperty('id.record_id');
      }
    } else {
      // If it's a paginated response, check pagination structure
      const paginatedResults = results as any;
      expect(paginatedResults).toBeDefined();
      expect(paginatedResults).toHaveProperty('data');
      expect(Array.isArray(paginatedResults.data)).toBe(true);

      // Check pagination info
      expect(paginatedResults).toHaveProperty('pagination');

      // If we have results, check their structure
      if (paginatedResults.data && paginatedResults.data.length > 0) {
        const firstResult = paginatedResults.data[0];
        expect(firstResult).toHaveProperty('id.record_id');
      }
    }
  });
});
