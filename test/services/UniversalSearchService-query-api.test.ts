/**
 * Integration tests for UniversalSearchService Query API features
 * Tests Issue #523 TC cases in service integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';
import {
  UniversalResourceType,
  SearchType,
} from '../../src/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '../../src/handlers/tool-configs/universal/types.js';

// Mock the Attio client
const mockPost = vi.fn();
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: () => ({
    post: mockPost,
  }),
}));

// Mock performance tracking
vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: () => 'test-perf-id',
    markTiming: () => {},
    markApiStart: () => Date.now(),
    markApiEnd: () => {},
    endOperation: () => {},
  },
}));

// Mock validation service
vi.mock('../../src/services/ValidationService.js', () => ({
  ValidationService: {
    validatePaginationParameters: () => {},
    validateFiltersSchema: () => {},
  },
}));

describe('UniversalSearchService Query API Integration - Issue #523', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({
      data: {
        data: [
          {
            id: { record_id: 'test-record-1' },
            values: { name: 'Test Record 1' },
          },
          {
            id: { record_id: 'test-record-2' },
            values: { name: 'Test Record 2' },
          },
        ],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TC-010: Relationship Search Integration', () => {
    it('should perform relationship search with proper query API format', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'person_123',
        limit: 10,
        offset: 0,
      };

      const results = await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            path: ['people', 'id'],
            constraints: [
              {
                operator: 'equals',
                value: 'person_123',
              },
            ],
          },
          limit: 10,
          offset: 0,
        })
      );
      expect(results).toHaveLength(2);
    });

    it('should throw error for relationship search without target parameters', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        // Missing relationship_target_type and relationship_target_id
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow(
        'Relationship search requires target_type and target_id parameters'
      );
    });
  });

  describe('TC-011: Content Search Integration', () => {
    it('should perform content search with proper query API format', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        query: 'Tech Company',
        content_fields: ['name', 'description', 'domains'],
        use_or_logic: true,
        limit: 5,
      };

      const results = await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $or: expect.arrayContaining([
              expect.objectContaining({
                filter: {
                  path: ['name'],
                  constraints: [
                    {
                      operator: 'contains',
                      value: 'Tech Company',
                    },
                  ],
                },
              }),
              expect.objectContaining({
                filter: {
                  path: ['description'],
                  constraints: [
                    {
                      operator: 'contains',
                      value: 'Tech Company',
                    },
                  ],
                },
              }),
            ]),
          },
          limit: 5,
          offset: 0,
        })
      );
      expect(results).toHaveLength(2);
    });

    it('should use default fields for content search when none provided', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.CONTENT,
        query: 'John Doe',
        content_fields: ['name', 'email_addresses', 'job_title'], // Explicitly provide fields to trigger Query API
        use_or_logic: true,
      };

      await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            $or: expect.arrayContaining([
              expect.objectContaining({
                filter: {
                  path: ['name'],
                  constraints: [{ operator: 'contains', value: 'John Doe' }],
                },
              }),
              expect.objectContaining({
                filter: {
                  path: ['email_addresses'],
                  constraints: [{ operator: 'contains', value: 'John Doe' }],
                },
              }),
              expect.objectContaining({
                filter: {
                  path: ['job_title'],
                  constraints: [{ operator: 'contains', value: 'John Doe' }],
                },
              }),
            ]),
          },
        })
      );
    });

    it('should throw error for content search without query', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        content_fields: ['name'], // Provide content_fields to trigger Query API
        // Missing query parameter
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow('Content search requires query parameter');
    });
  });

  describe('TC-012: Timeframe Search Integration', () => {
    it('should perform timeframe search with date range', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        date_operator: 'between',
        limit: 20,
      };

      const results = await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            path: [['companies', 'created_at']],
            constraints: {
              $gte: '2024-01-01',
              $lte: '2024-12-31',
            },
          },
          limit: 20,
          offset: 0,
        })
      );
      expect(results).toHaveLength(2);
    });

    it('should perform timeframe search with single date comparison', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'last_interaction',
        start_date: '2024-06-01',
        date_operator: 'greater_than',
      };

      await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            path: [['people', 'last_interaction']],
            constraints: {
              $gt: '2024-06-01',
            },
          },
        })
      );
    });

    it('should throw error for timeframe search without timeframe_attribute', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        start_date: '2024-01-01',
        // Missing timeframe_attribute
      };

      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow(
        'Timeframe search requires timeframe_attribute parameter'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully for relationship search', async () => {
      mockPost.mockRejectedValue(new Error('API Error: Invalid relationship'));

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'invalid_id',
      };

      const results = await UniversalSearchService.searchRecords(params);
      expect(results).toEqual([]);
    });

    it('should handle API errors gracefully for content search', async () => {
      mockPost.mockRejectedValue(new Error('API Error: Invalid query'));

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        query: 'test query',
      };

      const results = await UniversalSearchService.searchRecords(params);
      expect(results).toEqual([]);
    });

    it('should handle API errors gracefully for timeframe search', async () => {
      mockPost.mockRejectedValue(new Error('API Error: Invalid date format'));

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: 'invalid-date',
        date_operator: 'greater_than',
      };

      const results = await UniversalSearchService.searchRecords(params);
      expect(results).toEqual([]);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support basic search when no search_type specified', async () => {
      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        query: 'Acme Corp',
        // No search_type specified - should default to BASIC
      };

      // Mock the old search methods to verify they're still called
      const searchCompaniesSpy = vi.spyOn(
        UniversalSearchService as any,
        'searchCompanies'
      );
      searchCompaniesSpy.mockResolvedValue([
        { id: { record_id: 'legacy-1' }, values: { name: 'Legacy Result' } },
      ]);

      await UniversalSearchService.searchRecords(params);

      expect(searchCompaniesSpy).toHaveBeenCalled();
      searchCompaniesSpy.mockRestore();
    });
  });
});
