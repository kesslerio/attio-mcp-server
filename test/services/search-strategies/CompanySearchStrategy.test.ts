/**
 * Unit tests for CompanySearchStrategy
 * Issue #598: Add strategy-specific unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock searchObject before importing CompanySearchStrategy
vi.mock('../../../src/api/operations/search.js', () => ({
  searchObject: vi.fn(),
}));

import { CompanySearchStrategy } from '../../../src/services/search-strategies/CompanySearchStrategy.js';
import {
  SearchType,
  MatchType,
  SortType,
  UniversalResourceType,
} from '../../../src/handlers/tool-configs/universal/types.js';
import { AttioRecord } from '../../../src/types/attio.js';
import { StrategyDependencies } from '../../../src/services/search-strategies/interfaces.js';
import { FilterValidationError } from '../../../src/errors/api-errors.js';
import { searchObject } from '../../../src/api/operations/search.js';

describe('CompanySearchStrategy', () => {
  let strategy: CompanySearchStrategy;
  let mockDependencies: StrategyDependencies;
  let mockAdvancedSearchFunction: ReturnType<typeof vi.fn>;
  let mockMergeFilters: ReturnType<typeof vi.fn>;
  let mockCreateDateFilter: ReturnType<typeof vi.fn>;
  let mockCompanyRecord: AttioRecord;

  beforeEach(() => {
    mockAdvancedSearchFunction = vi.fn();
    mockMergeFilters = vi.fn();
    mockCreateDateFilter = vi.fn();

    mockDependencies = {
      advancedSearchFunction: mockAdvancedSearchFunction,
      mergeFilters: mockMergeFilters,
      createDateFilter: mockCreateDateFilter,
    };

    mockCompanyRecord = {
      id: { value: 'company-123' },
      name: 'Test Company',
      domain: 'test.com',
      industry: 'Technology',
    } as AttioRecord;

    strategy = new CompanySearchStrategy(mockDependencies);

    // Default mock implementations
    mockMergeFilters.mockImplementation((existing, dateFilter) => ({
      ...existing,
      ...dateFilter,
    }));
    mockCreateDateFilter.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('interface compliance', () => {
    it('should return correct resource type', () => {
      expect(strategy.getResourceType()).toBe(UniversalResourceType.COMPANIES);
    });

    it('should support advanced filtering', () => {
      expect(strategy.supportsAdvancedFiltering()).toBe(true);
    });

    it('should support query search', () => {
      expect(strategy.supportsQuerySearch()).toBe(true);
    });
  });

  describe('basic search', () => {
    it('should perform basic search without filters', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [] }),
        10,
        0
      );
    });

    it('should handle search with query', async () => {
      // Basic queries (no search_type) now route through searchObject()
      vi.mocked(searchObject).mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        query: 'test company',
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(searchObject).toHaveBeenCalled();
    });

    it('should handle missing advanced search function', async () => {
      const strategyWithoutFunction = new CompanySearchStrategy({});

      await expect(strategyWithoutFunction.search({})).rejects.toThrow(
        'Companies search function not available'
      );
    });
  });

  describe('advanced filtering', () => {
    it('should pass through filters when no timeframe params', async () => {
      const filters = { name: 'Test' };
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        filters,
        search_type: SearchType.ADVANCED,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        filters,
        undefined,
        undefined
      );
    });

    it('should merge date filters with existing filters', async () => {
      const filters = { name: 'Test' };
      const dateFilter = { created_at: { gte: '2023-01-01' } };
      const timeframeParams = {
        timeframe_attribute: 'created_at',
        start_date: '2023-01-01',
      };

      mockCreateDateFilter.mockReturnValue(dateFilter);
      mockMergeFilters.mockReturnValue({ ...filters, ...dateFilter });
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        filters,
        timeframeParams,
        search_type: SearchType.ADVANCED,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockCreateDateFilter).toHaveBeenCalledWith(timeframeParams);
      expect(mockMergeFilters).toHaveBeenCalledWith(filters, dateFilter);
    });

    it('should validate filters and throw FilterValidationError', async () => {
      const invalidFilters = { invalid_field: 'value' };
      const validationError = new FilterValidationError('Invalid filter field');
      mockAdvancedSearchFunction.mockRejectedValue(validationError);

      await expect(
        strategy.search({
          filters: invalidFilters,
          search_type: SearchType.ADVANCED,
        })
      ).rejects.toThrow(FilterValidationError);
    });

    it('should handle missing filter utility functions', async () => {
      const strategyWithoutUtils = new CompanySearchStrategy({
        advancedSearchFunction: mockAdvancedSearchFunction,
      });

      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategyWithoutUtils.search({
        filters: { name: 'Test' },
        timeframeParams: { start_date: '2023-01-01' },
        search_type: SearchType.ADVANCED,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        { name: 'Test' },
        undefined,
        undefined
      );
    });
  });

  describe('content search', () => {
    it('should delegate content search to advanced search function', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        query: 'technology',
        search_type: SearchType.CONTENT,
        fields: ['name', 'industry'],
        match_type: MatchType.PARTIAL,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalled();
    });

    it('should handle exact match type', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        query: 'Test Company',
        search_type: SearchType.CONTENT,
        match_type: MatchType.EXACT,
      });

      expect(results).toEqual([mockCompanyRecord]);
    });
  });

  describe('pagination', () => {
    it('should handle pagination parameters', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        limit: 5,
        offset: 10,
      });

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [] }),
        5,
        10
      );
    });

    it('should use default pagination when not specified', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({});

      expect(results).toEqual([mockCompanyRecord]);
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [] }),
        undefined,
        undefined
      );
    });
  });

  describe('error handling', () => {
    it('should gracefully handle API errors when listing without filters', async () => {
      const apiError = new Error('API Connection Failed');
      mockAdvancedSearchFunction.mockRejectedValue(apiError);

      const results = await strategy.search({});
      expect(results).toEqual([]);
    });

    it('should handle null return from advanced search function', async () => {
      const strategyWithNullFunction = new CompanySearchStrategy({
        advancedSearchFunction: null,
      });

      await expect(strategyWithNullFunction.search({})).rejects.toThrow(
        'Companies search function not available'
      );
    });
  });

  describe('search type combinations', () => {
    it('should handle BASIC search type', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        search_type: SearchType.BASIC,
      });

      expect(results).toEqual([mockCompanyRecord]);
    });

    it('should handle ADVANCED search type with complex filters', async () => {
      const complexFilters = {
        name: { contains: 'Test' },
        industry: { in: ['Technology', 'Software'] },
        employee_count: { gte: 100 },
      };

      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        filters: complexFilters,
        search_type: SearchType.ADVANCED,
      });

      expect(results).toEqual([mockCompanyRecord]);
      // mergeFilters is not invoked without timeframe; ensure advancedSearchFunction received filters
      expect(mockAdvancedSearchFunction).toHaveBeenCalledWith(
        complexFilters,
        undefined,
        undefined
      );
    });

    it('should handle CONTENT search type with field specification', async () => {
      mockAdvancedSearchFunction.mockResolvedValue([mockCompanyRecord]);

      const results = await strategy.search({
        query: 'technology company',
        fields: ['name', 'description', 'industry'],
        search_type: SearchType.CONTENT,
        match_type: MatchType.PARTIAL,
        sort: SortType.RELEVANCE,
      });

      expect(results).toEqual([mockCompanyRecord]);
    });
  });
});
