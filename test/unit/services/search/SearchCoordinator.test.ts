/**
 * Unit tests for SearchCoordinator
 * Issue #935: Tests for extracted search coordinator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchCoordinator } from '@/services/search/SearchCoordinator.js';
import {
  UniversalResourceType,
  SearchType,
  MatchType,
  SortType,
} from '@/handlers/tool-configs/universal/types.js';

// Mock QueryApiService
vi.mock('@/services/search/QueryApiService.js', () => ({
  QueryApiService: {
    searchByRelationship: vi.fn().mockResolvedValue([]),
    searchByTimeframe: vi.fn().mockResolvedValue([]),
    searchByContent: vi.fn().mockResolvedValue([]),
  },
}));

// Mock RecordsSearchService
vi.mock('@/services/search/RecordsSearchService.js', () => ({
  RecordsSearchService: {
    searchRecordsObjectType: vi.fn().mockResolvedValue([]),
    searchCustomObject: vi.fn().mockResolvedValue([]),
  },
}));

// Mock StrategyFactory
vi.mock('@/services/search/StrategyFactory.js', () => ({
  StrategyFactory: {
    getStrategy: vi.fn().mockResolvedValue(null),
  },
}));

import { QueryApiService } from '@/services/search/QueryApiService.js';
import { RecordsSearchService } from '@/services/search/RecordsSearchService.js';
import { StrategyFactory } from '@/services/search/StrategyFactory.js';

describe('SearchCoordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeSearch - search type routing', () => {
    it('should route RELATIONSHIP search to QueryApiService', async () => {
      const mockResults = [{ id: { record_id: 'rec1' } }];
      vi.mocked(QueryApiService.searchByRelationship).mockResolvedValue(
        mockResults as any
      );

      const results = await SearchCoordinator.executeSearch({
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'target-uuid',
        limit: 10,
        offset: 0,
      });

      expect(results).toEqual(mockResults);
      expect(QueryApiService.searchByRelationship).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES,
        UniversalResourceType.PEOPLE,
        'target-uuid',
        10,
        0
      );
    });

    it('should throw error for RELATIONSHIP without required params', async () => {
      await expect(
        SearchCoordinator.executeSearch({
          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.RELATIONSHIP,
        })
      ).rejects.toThrow(
        'Relationship search requires target_type and target_id parameters'
      );
    });

    it('should route TIMEFRAME search to QueryApiService', async () => {
      const mockResults = [{ id: { record_id: 'rec1' } }];
      vi.mocked(QueryApiService.searchByTimeframe).mockResolvedValue(
        mockResults as any
      );

      const results = await SearchCoordinator.executeSearch({
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        date_operator: 'between',
      });

      expect(results).toEqual(mockResults);
      expect(QueryApiService.searchByTimeframe).toHaveBeenCalled();
    });

    it('should throw error for TIMEFRAME without timeframe_attribute', async () => {
      await expect(
        SearchCoordinator.executeSearch({
          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.TIMEFRAME,
        })
      ).rejects.toThrow(
        'Timeframe search requires timeframe_attribute parameter'
      );
    });

    it('should route CONTENT search with fields to QueryApiService', async () => {
      const mockResults = [{ id: { record_id: 'rec1' } }];
      vi.mocked(QueryApiService.searchByContent).mockResolvedValue(
        mockResults as any
      );

      const results = await SearchCoordinator.executeSearch({
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        query: 'test',
        content_fields: ['name', 'description'],
      });

      expect(results).toEqual(mockResults);
      expect(QueryApiService.searchByContent).toHaveBeenCalled();
    });

    it('should throw error for CONTENT search without query', async () => {
      await expect(
        SearchCoordinator.executeSearch({
          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.CONTENT,
          content_fields: ['name'],
        })
      ).rejects.toThrow('Content search requires query parameter');
    });
  });

  describe('executeSearch - strategy routing', () => {
    it('should use strategy when available', async () => {
      const mockStrategy = {
        search: vi
          .fn()
          .mockResolvedValue([{ id: { record_id: 'strategy-rec' } }]),
      };
      vi.mocked(StrategyFactory.getStrategy).mockResolvedValue(
        mockStrategy as any
      );

      const results = await SearchCoordinator.executeSearch({
        resource_type: UniversalResourceType.COMPANIES,
        query: 'test',
        search_type: SearchType.BASIC,
      });

      expect(StrategyFactory.getStrategy).toHaveBeenCalledWith(
        UniversalResourceType.COMPANIES
      );
      expect(mockStrategy.search).toHaveBeenCalled();
      expect(results).toEqual([{ id: { record_id: 'strategy-rec' } }]);
    });
  });

  describe('executeSearch - fallback routing', () => {
    it('should route RECORDS type to RecordsSearchService', async () => {
      const mockResults = [{ id: { record_id: 'rec1' } }];
      vi.mocked(RecordsSearchService.searchRecordsObjectType).mockResolvedValue(
        mockResults as any
      );
      vi.mocked(StrategyFactory.getStrategy).mockResolvedValue(null);

      const results = await SearchCoordinator.executeSearch({
        resource_type: UniversalResourceType.RECORDS,
        limit: 20,
        offset: 0,
      });

      expect(results).toEqual(mockResults);
      expect(RecordsSearchService.searchRecordsObjectType).toHaveBeenCalledWith(
        20,
        0,
        undefined
      );
    });

    it('should route custom objects to RecordsSearchService.searchCustomObject', async () => {
      const mockResults = [{ id: { record_id: 'custom1' } }];
      vi.mocked(RecordsSearchService.searchCustomObject).mockResolvedValue(
        mockResults as any
      );
      vi.mocked(StrategyFactory.getStrategy).mockResolvedValue(null);

      // Using a custom object type (not in UniversalResourceType enum)
      const results = await SearchCoordinator.executeSearch({
        resource_type: 'funds' as UniversalResourceType,
        limit: 20,
        offset: 0,
      });

      expect(results).toEqual(mockResults);
      expect(RecordsSearchService.searchCustomObject).toHaveBeenCalledWith(
        'funds',
        20,
        0,
        undefined
      );
    });
  });
});
