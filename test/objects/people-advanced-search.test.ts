/**
 * Tests for advanced search functionality for people
 */
import { advancedSearchPeople } from '../../src/objects/people';
import { ListEntryFilters, ListEntryFilter } from '../../src/api/attio-operations';
import { FilterConditionType } from '../../src/types/attio';

// Mock the Attio client
jest.mock('../../src/api/attio-client', () => ({
  getAttioClient: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: { record_id: '123' },
            values: {
              name: [{ value: 'Test Person' }],
              email: [{ value: 'test@example.com' }]
            }
          }
        ]
      }
    })
  }))
}));

describe('Advanced People Search', () => {
  it('should perform an advanced search with filters', async () => {
    // Create a test filter
    const filters: ListEntryFilters = {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Test'
        }
      ],
      matchAny: false
    };
    
    // Call the advanced search function
    const results = await advancedSearchPeople(filters);
    
    // Check that results are returned
    expect(Array.isArray(results)).toBe(true);
    
    // Since the function returns either Person[] or PaginatedResponse<Person>
    // we need to check if results is an array before accessing length
    if (Array.isArray(results)) {
      expect(results.length).toBeGreaterThan(0);
      
      // Check first result structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id.record_id');
      expect(firstResult).toHaveProperty('values.name');
    }
  });
});