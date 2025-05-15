/**
 * Test for companies advanced search functionality
 */
import { advancedSearchCompanies } from '../../src/objects/companies';
import { FilterConditionType } from '../../src/types/attio';

// Define mock filters to search with
const filters = {
  filters: [
    {
      attribute: { slug: 'name' },
      condition: FilterConditionType.CONTAINS,
      value: 'test'
    }
  ]
};

describe('Companies Advanced Search', () => {
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
      expect(results).toBeDefined();
      expect(results).toHaveProperty('data');
      expect(Array.isArray(results.data)).toBe(true);
      
      // Check pagination info
      expect(results).toHaveProperty('pagination');
      
      // If we have results, check their structure
      if (results.data && results.data.length > 0) {
        const firstResult = results.data[0];
        expect(firstResult).toHaveProperty('id.record_id');
      }
    }
  });
});