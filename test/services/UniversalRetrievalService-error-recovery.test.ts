/**
 * Tests for UniversalRetrievalService error recovery scenarios
 * Addresses PR feedback about missing edge case coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { CachingService } from '../../src/services/CachingService.js';
import { EnhancedApiError } from '../../src/errors/enhanced-api-errors.js';
import * as companies from '../../src/objects/companies/index.js';
import * as lists from '../../src/objects/lists.js';
import * as tasks from '../../src/objects/tasks.js';
import * as notes from '../../src/objects/notes.js';

// Mock external dependencies
vi.mock('../../src/services/CachingService.js');
vi.mock('../../src/objects/companies/index.js');
vi.mock('../../src/objects/lists.js');
vi.mock('../../src/objects/tasks.js');
vi.mock('../../src/objects/notes.js');

describe('UniversalRetrievalService - Error Recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Error Handling', () => {
    it('should re-throw authentication errors without caching', async () => {
      // Mock an authentication error
      vi.mocked(companies.getCompanyDetails).mockRejectedValue(
        new EnhancedApiError(
          'Invalid API key',
          401,
          '/objects/companies/records/12345678-1234-4000-a000-123456789012',
          'GET',
          {
            httpStatus: 401,
            resourceType: 'companies',
          }
        )
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: '12345678-1234-4000-a000-123456789012',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 401,
        message: expect.stringMatching(/unauthorized|invalid api key/i),
      });

      // Verify 404 was not cached for auth errors
      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });

    it('should re-throw network errors without caching', async () => {
      // Mock a network error
      vi.mocked(lists.getListDetails).mockRejectedValue(
        new EnhancedApiError(
          'Service unavailable',
          503,
          '/lists/87654321-4321-4000-b000-987654321098',
          'GET',
          {
            httpStatus: 503,
            resourceType: 'lists',
          }
        )
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '87654321-4321-4000-b000-987654321098',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 503,
        message: expect.stringMatching(/service.{0,10}unavailable/i),
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Error Handling', () => {
    it('should re-throw rate limit errors without caching', async () => {
      vi.mocked(tasks.getTask).mockRejectedValue(
        new EnhancedApiError(
          'Too many requests',
          429,
          '/tasks/11111111-1111-4000-a000-111111111111',
          'GET',
          {
            httpStatus: 429,
            resourceType: 'tasks',
          }
        )
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: '11111111-1111-4000-a000-111111111111',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 429,
        message: expect.stringMatching(/rate.{0,10}limit|too many requests/i),
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Legitimate 404 Error Handling', () => {
    it('should cache legitimate 404 errors and convert to structured response', async () => {
      vi.mocked(notes.getNote).mockRejectedValue(
        new EnhancedApiError(
          'Note not found',
          404,
          '/notes/22222222-2222-4000-a000-222222222222',
          'GET',
          {
            httpStatus: 404,
            resourceType: 'notes',
          }
        )
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.NOTES,
          record_id: '22222222-2222-4000-a000-222222222222',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/note.*not found/i),
      });

      expect(CachingService.cache404Response).toHaveBeenCalledWith(
        'notes',
        '22222222-2222-4000-a000-222222222222'
      );
    });
  });

  describe('Non-HTTP Error Handling', () => {
    it('should handle TypeError exceptions without masking as 404', async () => {
      vi.mocked(companies.getCompanyDetails).mockRejectedValue(
        new TypeError('Cannot read properties of null')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: '33333333-3333-4000-a000-333333333333',
        })
      ).rejects.toThrow('Cannot read properties of null');

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });

    it('should handle network timeout errors without masking as 404', async () => {
      vi.mocked(lists.getListDetails).mockRejectedValue(
        new Error('ETIMEDOUT: Connection timeout')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '44444444-4444-4000-a000-444444444444',
        })
      ).rejects.toThrow('ETIMEDOUT: Connection timeout');

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });

    it('should treat clear not-found error messages as 404s', async () => {
      vi.mocked(tasks.getTask).mockRejectedValue(
        new EnhancedApiError(
          'Task with ID "55555555-5555-4000-a000-555555555555" not found',
          404,
          '/tasks/55555555-5555-4000-a000-555555555555',
          'GET',
          {
            httpStatus: 404,
            resourceType: 'tasks',
          }
        )
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: '55555555-5555-4000-a000-555555555555',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/task.*not found/i),
      });

      expect(CachingService.cache404Response).toHaveBeenCalledWith(
        'tasks',
        '55555555-5555-4000-a000-555555555555'
      );
    });
  });

  describe('List-Specific Edge Cases', () => {
    it('should handle null list response without masking other errors', async () => {
      // Mock getListDetails returning null
      vi.mocked(lists.getListDetails).mockResolvedValue(null as any);

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '66666666-6666-4000-a000-666666666666',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/list.*not found/i),
      });
    });

    it('should handle malformed list response without masking other errors', async () => {
      // Mock getListDetails returning malformed data
      vi.mocked(lists.getListDetails).mockResolvedValue({
        // Missing required 'id' field
        name: 'Test List',
        description: 'A test list',
      } as any);

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '77777777-7777-4000-a000-777777777777',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/list.*not found/i),
      });
    });

    it('should handle list with missing list_id without masking other errors', async () => {
      // Mock getListDetails returning data with invalid ID structure
      vi.mocked(lists.getListDetails).mockResolvedValue({
        id: { workspace_id: 'ws-123', list_id: '' }, // Missing list_id value
        title: 'Test List',
        name: 'Test List',
        description: 'A test list',
        object_slug: 'test-list',
        workspace_id: 'ws-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: '88888888-8888-4000-a000-888888888888',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/list.*not found/i),
      });
    });
  });

  describe('Error Recovery with Caching', () => {
    it('should respect cached 404 responses', async () => {
      // Mock that the record is already cached as 404
      vi.mocked(CachingService.isCached404).mockReturnValue(true);

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: '99999999-9999-4000-a000-999999999999',
        })
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 404,
        message: expect.stringMatching(/record.*not found/i),
      });

      // Should not call the underlying API if cached
      expect(companies.getCompanyDetails).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Record Retrieval Error Recovery', () => {
    it('should handle mixed success and failure scenarios', async () => {
      // Mock different outcomes for different records
      vi.mocked(companies.getCompanyDetails)
        .mockResolvedValueOnce({
          id: { record_id: 'cccccccc-cccc-4000-a000-cccccccccccc' },
          values: { name: [{ value: 'Company 1' }] },
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        })
        .mockRejectedValueOnce(
          new EnhancedApiError(
            'Company not found',
            404,
            '/companies/dddddddd-dddd-4000-a000-dddddddddddd',
            'GET',
            {
              httpStatus: 404,
              resourceType: 'companies',
            }
          )
        )
        .mockRejectedValueOnce(
          new EnhancedApiError(
            'Invalid API key',
            401,
            '/companies/eeeeeeee-eeee-4000-a000-eeeeeeeeeeee',
            'GET',
            {
              httpStatus: 401,
              resourceType: 'companies',
            }
          )
        );

      const results = await UniversalRetrievalService.getMultipleRecords(
        UniversalResourceType.COMPANIES,
        [
          'cccccccc-cccc-4000-a000-cccccccccccc',
          'dddddddd-dddd-4000-a000-dddddddddddd',
          'eeeeeeee-eeee-4000-a000-eeeeeeeeeeee',
        ]
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toBeTruthy(); // Success
      expect(results[1]).toBeNull(); // 404 error
      expect(results[2]).toBeNull(); // Auth error
    });
  });

  describe('Record Existence Check Error Recovery', () => {
    it('should return false for cached 404s without API call', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(true);

      const exists = await UniversalRetrievalService.recordExists(
        UniversalResourceType.TASKS,
        'aaaaaaaa-aaaa-4000-a000-aaaaaaaaaaaa'
      );

      expect(exists).toBe(false);
      expect(tasks.getTask).not.toHaveBeenCalled();
    });

    it('should re-throw non-404 errors in existence check', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(tasks.getTask).mockRejectedValue(
        new EnhancedApiError(
          'Service down',
          503,
          '/tasks/bbbbbbbb-bbbb-4000-a000-bbbbbbbbbbbb',
          'GET',
          {
            httpStatus: 503,
            resourceType: 'tasks',
          }
        )
      );

      await expect(
        UniversalRetrievalService.recordExists(
          UniversalResourceType.TASKS,
          'bbbbbbbb-bbbb-4000-a000-bbbbbbbbbbbb'
        )
      ).rejects.toMatchObject({
        name: 'EnhancedApiError',
        statusCode: 503,
        message: expect.stringMatching(
          /service.{0,10}unavailable|service.{0,10}down/i
        ),
      });
    });
  });
});
