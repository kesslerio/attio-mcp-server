/**
 * Tests for advanced search functionality for people
 */
import { describe, it, expect, vi } from 'vitest';
import { advancedSearchPeople } from '../../src/objects/people';
import {
  ListEntryFilters,
  ListEntryFilter,
} from '../../src/api/operations/index';
import { FilterConditionType } from '../../src/types/attio';

// Mock the Attio client
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(() => ({
    post: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: { record_id: '123' },
            values: {
              name: [{ value: 'Test Person' }],
              email: [{ value: 'test@example.com' }],
            },
          },
        ],
      },
    }),
  })),
}));

describe('Advanced People Search', () => {
  it('should perform an advanced search with filters', async () => {
    // Create a test filter
    const filters: ListEntryFilters = {
      filters: [
        {
          attribute: { slug: 'name' },
          condition: FilterConditionType.CONTAINS,
          value: 'Test',
        },
      ],
      matchAny: false,
    };

    // Call the advanced search function
    const results = await advancedSearchPeople(filters);

    // Check that results are returned as a PaginatedResponse
    expect(results).toBeDefined();
    expect(results.results).toBeDefined();
    expect(Array.isArray(results.results)).toBe(true);
    expect(results.pagination).toBeDefined();

    // Check pagination metadata
    expect(results.pagination.totalCount).toBeGreaterThanOrEqual(0);
    expect(results.pagination.currentPage).toBeGreaterThan(0);
    expect(results.pagination.pageSize).toBeGreaterThan(0);

    // Check first result structure if we have results
    if (results.results.length > 0) {
      const firstResult = results.results[0];
      expect(firstResult).toHaveProperty('id.record_id');
      expect(firstResult).toHaveProperty('values.name');
    }
  });
});
