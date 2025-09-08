/**
 * Test error handling improvements for Issue #523 Query API implementation
 * Validates that critical errors bubble up while benign errors are handled gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { UniversalSearchService } from '../../src/services/UniversalSearchService.js';

// Mock the Attio client
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

describe('Error Handling Improvements - Issue #523', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Critical Errors Should Bubble Up', () => {
    it('should re-throw authentication errors instead of returning empty array', async () => {
      // Mock 401 authentication error
      mockPost.mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
        },
        message: 'Request failed with status code 401',
      });

        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'person_123',
      };

      // Should throw AuthenticationError, not return empty array
      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow(AuthenticationError);
    });

    it('should re-throw network errors instead of returning empty array', async () => {
      // Mock network connection error
      mockPost.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:443',
      });

        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        query: 'test',
        content_fields: ['name'],
      };

      // Should throw NetworkError, not return empty array
      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow(NetworkError);
    });

    it('should re-throw server errors instead of returning empty array', async () => {
      // Mock 500 server error
      mockPost.mockRejectedValue({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
        message: 'Request failed with status code 500',
      });

        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-01-01',
        date_operator: 'greater_than' as const,
      };

      // Should throw ServerError, not return empty array
      await expect(
        UniversalSearchService.searchRecords(params)
      ).rejects.toThrow(ServerError);
    });
  });

  describe('Benign Errors Should Be Handled Gracefully', () => {
    it('should return empty array for 404 errors (no results found)', async () => {
      // Mock 404 not found error
      mockPost.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'No records found' },
        },
        message: 'Request failed with status code 404',
      });

        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'person_123',
      };

      // Should return empty array gracefully, not throw
      expect(result).toEqual([]);
    });

    it('should handle content search 404 gracefully', async () => {
      // Mock 404 for content search
      mockPost.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'No matching content found' },
        },
        message: 'Request failed with status code 404',
      });

        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.CONTENT,
        query: 'nonexistent',
        content_fields: ['name', 'email_addresses'],
      };

      // Should return empty array gracefully
      expect(result).toEqual([]);
    });

    it('should handle timeframe search 404 gracefully', async () => {
      // Mock 404 for timeframe search
      mockPost.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'No records in timeframe' },
        },
        message: 'Request failed with status code 404',
      });

        resource_type: UniversalResourceType.TASKS,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        date_operator: 'between' as const,
      };

      // Should return empty array gracefully
      expect(result).toEqual([]);
    });
  });

  describe('Error Type Detection', () => {
    it('should correctly identify different error types', async () => {
        {
          mockError: {
            response: { status: 401, data: { message: 'Unauthorized' } },
          },
          expectedErrorType: AuthenticationError,
          description: '401 authentication error',
        },
        {
          mockError: { code: 'ENOTFOUND', message: 'DNS lookup failed' },
          expectedErrorType: NetworkError,
          description: 'DNS network error',
        },
        {
          mockError: {
            response: { status: 502, data: { message: 'Bad Gateway' } },
          },
          expectedErrorType: ServerError,
          description: '502 server error',
        },
      ];

      for (const testCase of testCases) {
        mockPost.mockRejectedValueOnce(testCase.mockError);

          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.RELATIONSHIP,
          relationship_target_type: UniversalResourceType.PEOPLE,
          relationship_target_id: 'person_123',
        };

        await expect(
          UniversalSearchService.searchRecords(params)
        ).rejects.toThrow(testCase.expectedErrorType);
      }
    });
  });
});
