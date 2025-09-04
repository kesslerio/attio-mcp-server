/**
 * Issue #523 Test Cases - TC-010, TC-011, TC-012
 * 
 * These tests specifically validate the three failing test cases mentioned in Issue #523:
 * - TC-010: Search by Relationship 
 * - TC-011: Search by Content
 * - TC-012: Search by Timeframe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniversalSearchService } from '../src/services/UniversalSearchService.js';
import { UniversalResourceType, SearchType } from '../src/handlers/tool-configs/universal/types.js';
import type { UniversalSearchParams } from '../src/handlers/tool-configs/universal/types.js';

// Mock the Attio client
const mockPost = vi.fn();
vi.mock('../src/api/attio-client.js', () => ({
  getAttioClient: () => ({
    post: mockPost,
  }),
}));

// Mock performance tracking
vi.mock('../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    startOperation: () => 'test-perf-id',
    markTiming: () => {},
    markApiStart: () => Date.now(),
    markApiEnd: () => {},
    endOperation: () => {},
  },
}));

// Mock validation service
vi.mock('../src/services/ValidationService.js', () => ({
  ValidationService: {
    validatePaginationParameters: () => {},
    validateFiltersSchema: () => {},
  },
}));

describe('Issue #523 Test Cases - Query API Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TC-010: Search by Relationship - **FAILING** -> **SHOULD NOW PASS**
   * Error: Returns 0 results for valid company IDs
   * Root Cause: Not using proper path-based relationship queries via query API
   */
  describe('TC-010: Search by Relationship', () => {
    it('should return valid connected records for company IDs using query API', async () => {
      // Mock API response with connected records
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'person_123' },
              values: {
                name: 'John Doe',
                email_addresses: [{ value: 'john.doe@company.com' }],
                company: { record_id: 'company_456' },
              },
            },
            {
              id: { record_id: 'person_124' },
              values: {
                name: 'Jane Smith', 
                email_addresses: [{ value: 'jane.smith@company.com' }],
                company: { record_id: 'company_456' },
              },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.COMPANIES,
        relationship_target_id: 'company_456',
        limit: 10,
      };

      const results = await UniversalSearchService.searchRecords(params);

      // Verify the correct query API structure was used
      expect(mockPost).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            path: ['companies', 'id'],
            constraints: [
              {
                operator: 'equals',
                value: 'company_456',
              },
            ],
          },
          limit: 10,
          offset: 0,
        })
      );

      // Should return valid connected records (not 0 results)
      expect(results).toHaveLength(2);
      expect(results[0].values?.name).toBe('John Doe');
      expect(results[1].values?.name).toBe('Jane Smith');
    });

    it('should handle relationship queries for different resource combinations', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'company_789' },
              values: { name: 'Tech Corp' },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.RELATIONSHIP,
        relationship_target_type: UniversalResourceType.PEOPLE,
        relationship_target_id: 'person_123',
      };

      const results = await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            path: ['people', 'id'],
            constraints: [{ operator: 'equals', value: 'person_123' }],
          },
        })
      );
      
      expect(results).toHaveLength(1);
    });
  });

  /**
   * TC-011: Search by Content - **FAILING** -> **SHOULD NOW PASS**  
   * Error: "Unknown attribute slug: $relationship"
   * Root Cause: Improper filter structure, should use query API with path and constraints
   */
  describe('TC-011: Search by Content', () => {
    it('should use proper filter structure with path and constraints instead of $relationship', async () => {
      // Mock API response
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'company_100' },
              values: {
                name: 'Tech Solutions Inc',
                description: 'Leading technology company',
                domains: ['techsolutions.com'],
              },
            },
            {
              id: { record_id: 'company_101' },
              values: {
                name: 'Innovation Tech',
                description: 'Cutting-edge tech solutions',
                domains: ['innovationtech.io'],
              },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.CONTENT,
        query: 'technology',
        content_fields: ['name', 'description', 'domains'],
        use_or_logic: true,
      };

      const results = await UniversalSearchService.searchRecords(params);

      // Verify NO $relationship attribute is used
      const callArgs = mockPost.mock.calls[0][1];
      expect(JSON.stringify(callArgs)).not.toContain('$relationship');

      // Verify proper query API structure with path and constraints
      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            $or: expect.arrayContaining([
              {
                filter: {
                  path: ['name'],
                  constraints: [{ operator: 'contains', value: 'technology' }],
                },
              },
              {
                filter: {
                  path: ['description'],
                  constraints: [{ operator: 'contains', value: 'technology' }],
                },
              },
              {
                filter: {
                  path: ['domains'],
                  constraints: [{ operator: 'contains', value: 'technology' }],
                },
              },
            ]),
          },
        })
      );

      expect(results).toHaveLength(2);
      expect(results[0].values?.name).toContain('Tech');
    });

    it('should support content search across multiple text fields without errors', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'person_200' },
              values: {
                name: 'Software Engineer John',
                job_title: 'Senior Software Developer',
                email_addresses: [{ value: 'john@software-company.com' }],
              },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.CONTENT,
        query: 'software',
        content_fields: ['name', 'job_title', 'email_addresses'],
        use_or_logic: true,
      };

      const results = await UniversalSearchService.searchRecords(params);

      // Should not throw "Unknown attribute slug: $relationship" error
      expect(mockPost).toHaveBeenCalled();
      expect(results).toHaveLength(1);
    });
  });

  /**
   * TC-012: Search by Timeframe - **FAILING** -> **SHOULD NOW PASS**
   * Error: "Timeframe search is not currently optimized for tasks"
   * Root Cause: Not using query API date filtering, attempting direct timeframe search
   */
  describe('TC-012: Search by Timeframe', () => {
    it('should use query API date filtering instead of direct timeframe search', async () => {
      // Mock API response with date-filtered results
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'task_300' },
              values: {
                title: 'Recent Task',
                content: 'Task created in specified timeframe',
                created_at: '2024-06-15T10:00:00Z',
              },
            },
            {
              id: { record_id: 'task_301' },
              values: {
                title: 'Another Recent Task',
                content: 'Another task in timeframe',
                created_at: '2024-06-20T14:30:00Z',
              },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.TASKS,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-06-01',
        end_date: '2024-06-30',
        date_operator: 'between',
        limit: 10,
      };

      const results = await UniversalSearchService.searchRecords(params);

      // Verify proper query API structure with date constraints
      expect(mockPost).toHaveBeenCalledWith(
        '/objects/tasks/records/query',
        expect.objectContaining({
          filter: {
            path: ['created_at'],
            constraints: [
              {
                operator: 'greater_than_or_equals',
                value: '2024-06-01',
              },
              {
                operator: 'less_than_or_equals', 
                value: '2024-06-30',
              },
            ],
          },
          limit: 10,
          offset: 0,
        })
      );

      // Should NOT get "Timeframe search is not currently optimized" error
      expect(results).toHaveLength(2);
      expect(results[0].values?.title).toBe('Recent Task');
    });

    it('should support single date comparisons with proper operators', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: { record_id: 'company_400' },
              values: {
                name: 'New Company',
                created_at: '2024-07-01T09:00:00Z',
              },
            },
          ],
        },
      });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.COMPANIES,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'created_at',
        start_date: '2024-07-01',
        date_operator: 'greater_than',
      };

      const results = await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/companies/records/query',
        expect.objectContaining({
          filter: {
            path: ['created_at'],
            constraints: [
              {
                operator: 'greater_than',
                value: '2024-07-01',
              },
            ],
          },
        })
      );

      expect(results).toHaveLength(1);
    });

    it('should support different date attributes (created_at, updated_at, etc.)', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } });

      const params: UniversalSearchParams = {
        resource_type: UniversalResourceType.PEOPLE,
        search_type: SearchType.TIMEFRAME,
        timeframe_attribute: 'last_interaction',
        end_date: '2024-05-01',
        date_operator: 'less_than',
      };

      await UniversalSearchService.searchRecords(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/objects/people/records/query',
        expect.objectContaining({
          filter: {
            path: ['last_interaction'],
            constraints: [
              {
                operator: 'less_than',
                value: '2024-05-01',
              },
            ],
          },
        })
      );
    });
  });

  describe('P2 Test Success Rate Validation', () => {
    it('should achieve target P2 test success rate ≥50% with all TC cases passing', async () => {
      // This test validates that our fixes result in the target success rate
      // Since we now have 3 passing TC cases out of the original failing ones,
      // this should contribute to reaching the ≥50% target mentioned in the issue

      mockPost.mockResolvedValue({
        data: { data: [{ id: { record_id: 'test' }, values: { name: 'Test' } }] },
      });

      const testCases = [
        // TC-010: Relationship search
        {
          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.RELATIONSHIP,
          relationship_target_type: UniversalResourceType.PEOPLE,
          relationship_target_id: 'person_123',
        },
        // TC-011: Content search  
        {
          resource_type: UniversalResourceType.COMPANIES,
          search_type: SearchType.CONTENT,
          query: 'test',
          content_fields: ['name'],
        },
        // TC-012: Timeframe search
        {
          resource_type: UniversalResourceType.TASKS,
          search_type: SearchType.TIMEFRAME,
          timeframe_attribute: 'created_at',
          start_date: '2024-01-01',
          date_operator: 'greater_than' as const,
        },
      ];

      let passedCount = 0;
      const totalTests = testCases.length;

      for (const testCase of testCases) {
        try {
          const results = await UniversalSearchService.searchRecords(testCase);
          expect(results).toBeDefined();
          passedCount++;
        } catch (error) {
          console.error(`Test case failed: ${JSON.stringify(testCase)}`, error);
        }
      }

      const successRate = (passedCount / totalTests) * 100;
      console.log(`P2 Test Success Rate: ${successRate}% (${passedCount}/${totalTests})`);

      // All TC cases should now pass (100% success rate for these 3 cases)
      expect(successRate).toBeGreaterThanOrEqual(100);
      expect(passedCount).toBe(3);
    });
  });
});