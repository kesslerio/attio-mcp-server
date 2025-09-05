/**
 * API integration tests for timeframe search functionality (Issue #475)
 * Tests that date parameters are properly passed to the Attio API calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UniversalSearchService } from '../../../../src/services/UniversalSearchService.js';
import { UniversalResourceType } from '../../../../src/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '../../../../src/handlers/tool-configs/universal/types.js';

// Mock external dependencies
vi.mock('../../../../src/api/attio-client.js');

// Mock the search functions with vi.fn()
vi.mock('../../../../src/objects/companies/index.js', () => ({
  advancedSearchCompanies: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../src/objects/people/index.js', () => ({
  advancedSearchPeople: vi.fn().mockResolvedValue({ results: [] }),
}));

// Import the mocked functions to access them in tests
import { advancedSearchCompanies } from '../../../../src/objects/companies/index.js';
import { advancedSearchPeople } from '../../../../src/objects/people/index.js';

// Type interfaces for test data
interface FilterItem {
  attribute?: { slug?: string };
  condition?: string;
  value?: unknown;
}

interface FiltersStructure {
  filters: FilterItem[];
}

interface MockCall {
  mock: { calls: unknown[][] };
}

describe.skip('Timeframe API Integration Tests - DEPRECATED', () => {
  // These tests are now deprecated because we force all timeframe searches 
  // to use Query API instead of Advanced Search API for better compatibility
  const mockDate = new Date('2023-08-15T12:00:00.000Z');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Companies API Parameter Passing', () => {
    it('should pass date filters to advancedSearchCompanies', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'created_at',
      };

      await UniversalSearchService.searchRecords(params);

      // Verify that advancedSearchCompanies was called with enhanced filters
      expect(advancedSearchCompanies).toHaveBeenCalledTimes(1);
      const [filters, limit, offset] = (advancedSearchCompanies as unknown as MockCall).mock.calls[0];
      
      // Verify that the filters include the date parameters
      const filtersData = filters as FiltersStructure;
      expect(filtersData).toBeDefined();
      expect(filtersData.filters).toBeDefined();
      expect(Array.isArray(filtersData.filters)).toBe(true);
      
      // Should contain date range filters
      const dateFilters = filtersData.filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );
      expect(dateFilters.length).toBe(2); // Start and end date filters
    });

    it('should pass relative timeframe filters to advancedSearchCompanies', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        timeframe: 'last_7_days',
        date_field: 'updated_at',
      };

      await UniversalSearchService.searchRecords(params);

      expect(advancedSearchCompanies).toHaveBeenCalledTimes(1);
      const [filters] = (advancedSearchCompanies as unknown as MockCall).mock.calls[0];
      
      // Should contain timeframe filters
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'updated_at'
      );
      expect(dateFilters.length).toBe(2); // Start and end date filters
    });

    it('should merge date filters with existing filters for companies', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        filters: {
          filters: [
            {
              attribute: { slug: 'name' },
              condition: 'contains',
              value: 'test company',
            },
          ],
        },
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'created_at',
      };

      await UniversalSearchService.searchRecords(params);

      expect(advancedSearchCompanies).toHaveBeenCalledTimes(1);
      const [filters] = (advancedSearchCompanies as unknown as MockCall).mock.calls[0];
      
      // Should contain both original and date filters
      expect((filters as FiltersStructure).filters.length).toBe(3); // 1 original + 2 date filters
      
      // Verify original filter is preserved
      const nameFilter = (filters as FiltersStructure).filters.find((f) => 
        f.attribute?.slug === 'name'
      );
      expect(nameFilter).toBeDefined();
      expect(nameFilter.value).toBe('test company');
      
      // Verify date filters are added
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );
      expect(dateFilters.length).toBe(2);
    });
  });

  describe('People API Parameter Passing', () => {
    it('should pass date filters to advancedSearchPeople', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        created_after: '2023-08-01T00:00:00Z',
        created_before: '2023-08-15T23:59:59Z',
      };

      await UniversalSearchService.searchRecords(params);

      // Verify that advancedSearchPeople was called with enhanced filters
      expect(advancedSearchPeople).toHaveBeenCalledTimes(1);
      const [filters, paginationOptions] = (advancedSearchPeople as unknown as MockCall).mock.calls[0];
      
      // Verify that the filters include the date parameters
      expect(filters).toBeDefined();
      expect((filters as FiltersStructure).filters).toBeDefined();
      expect(Array.isArray((filters as FiltersStructure).filters)).toBe(true);
      
      // Should contain date range filters for created_at
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );
      expect(dateFilters.length).toBe(2); // Start and end date filters
    });

    it('should handle single date bounds for people', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        updated_after: '2023-08-01T00:00:00Z',
      };

      await UniversalSearchService.searchRecords(params);

      expect(advancedSearchPeople).toHaveBeenCalledTimes(1);
      const [filters] = (advancedSearchPeople as unknown as MockCall).mock.calls[0];
      
      // Should contain single date filter
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'updated_at'
      );
      expect(dateFilters.length).toBe(1); // Only start date filter
      expect(dateFilters[0].condition).toBe('greater_than_or_equal_to');
    });

    it('should merge date filters with existing filters for people', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        filters: {
          filters: [
            {
              attribute: { slug: 'email_addresses' },
              condition: 'contains',
              value: '@example.com',
            },
          ],
        },
        timeframe: 'this_month',
        date_field: 'created_at',
      };

      await UniversalSearchService.searchRecords(params);

      expect(advancedSearchPeople).toHaveBeenCalledTimes(1);
      const [filters] = (advancedSearchPeople as unknown as MockCall).mock.calls[0];
      
      // Should contain both original and date filters
      expect((filters as FiltersStructure).filters.length).toBe(3); // 1 original + 2 date filters
      
      // Verify original filter is preserved
      const emailFilter = (filters as FiltersStructure).filters.find((f) => 
        f.attribute?.slug === 'email_addresses'
      );
      expect(emailFilter).toBeDefined();
      expect(emailFilter.value).toBe('@example.com');
      
      // Verify date filters are added
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );
      expect(dateFilters.length).toBe(2);
    });
  });

  describe('Date Filter Condition Mapping', () => {
    it('should use correct filter conditions for date ranges', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_from: '2023-08-01T00:00:00Z',
        date_to: '2023-08-15T23:59:59Z',
        date_field: 'created_at',
      };

      await UniversalSearchService.searchRecords(params);

      const [filters] = (advancedSearchCompanies as unknown as MockCall).mock.calls[0];
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );

      // Verify correct conditions are used
      const startFilter = dateFilters.find((f) => 
        f.condition === 'greater_than_or_equal_to'
      );
      const endFilter = dateFilters.find((f) => 
        f.condition === 'less_than_or_equal_to'
      );

      expect(startFilter).toBeDefined();
      expect(startFilter.value).toBe('2023-08-01T00:00:00Z');
      expect(endFilter).toBeDefined();
      expect(endFilter.value).toBe('2023-08-15T23:59:59Z');
    });

    it('should handle exact date matching', async () => {
      // This tests the equals operator, though it's rarely used in practice
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        timeframe_attribute: 'created_at',
        start_date: '2023-08-15T00:00:00Z',
        date_operator: 'equals',
      };

      await UniversalSearchService.searchRecords(params);

      const [filters] = (advancedSearchPeople as unknown as MockCall).mock.calls[0];
      const dateFilters = (filters as FiltersStructure).filters.filter((f) => 
        f.attribute?.slug === 'created_at'
      );

      expect(dateFilters.length).toBe(1);
      expect(dateFilters[0].condition).toBe('equals');
      expect(dateFilters[0].value).toBe('2023-08-15T00:00:00Z');
    });
  });

  describe('Error Handling in API Integration', () => {
    it('should handle date validation errors gracefully', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        date_from: 'invalid-date-format',
        date_to: '2023-08-15T23:59:59Z',
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow('Date parameter validation failed');

      // Should not call the API function with invalid data
      expect(advancedSearchCompanies).not.toHaveBeenCalled();
    });

    it('should handle missing timeframe attribute gracefully', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        start_date: '2023-08-01T00:00:00Z',
        end_date: '2023-08-15T23:59:59Z',
        // No timeframe_attribute provided
      };

      // Should not throw error, but should not apply date filtering
      const results = await UniversalSearchService.searchRecords(params);
      expect(Array.isArray(results)).toBe(true);

      // Should call the API without enhanced filters
      expect(advancedSearchCompanies).toHaveBeenCalledTimes(1);
      const [filters] = (advancedSearchCompanies as unknown as MockCall).mock.calls[0];
      expect((filters as FiltersStructure).filters).toEqual([]); // No filters should be added
    });
  });
});