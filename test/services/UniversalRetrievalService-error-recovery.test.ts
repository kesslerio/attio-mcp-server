/**
 * Tests for UniversalRetrievalService error recovery scenarios
 * Addresses PR feedback about missing edge case coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UniversalRetrievalService } from '../../src/services/UniversalRetrievalService.js';
import { UniversalResourceType } from '../../src/handlers/tool-configs/universal/types.js';
import { CachingService } from '../../src/services/CachingService.js';
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
      vi.mocked(companies.getCompanyDetails).mockRejectedValue({
        status: 401,
        body: { code: 'unauthorized', message: 'Invalid API key' }
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.COMPANIES,
          record_id: 'test-id'
        })
      ).rejects.toMatchObject({
        status: 401,
        body: { code: 'unauthorized' }
      });

      // Verify 404 was not cached for auth errors
      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });

    it('should re-throw network errors without caching', async () => {
      // Mock a network error
      vi.mocked(lists.getListDetails).mockRejectedValue({
        status: 503,
        body: { code: 'service_unavailable', message: 'Service temporarily unavailable' }
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: 'test-list-id'
        })
      ).rejects.toMatchObject({
        status: 503,
        body: { code: 'service_unavailable' }
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Error Handling', () => {
    it('should re-throw rate limit errors without caching', async () => {
      vi.mocked(tasks.getTask).mockRejectedValue({
        status: 429,
        body: { code: 'rate_limited', message: 'Too many requests' }
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'test-task-id'
        })
      ).rejects.toMatchObject({
        status: 429,
        body: { code: 'rate_limited' }
      });

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });
  });

  describe('Legitimate 404 Error Handling', () => {
    it('should cache legitimate 404 errors and convert to structured response', async () => {
      vi.mocked(notes.getNote).mockRejectedValue({
        status: 404,
        body: { code: 'not_found', message: 'Note not found' }
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.NOTES,
          record_id: 'non-existent-note'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Note with ID "non-existent-note" not found.'
        }
      });

      expect(CachingService.cache404Response).toHaveBeenCalledWith('notes', 'non-existent-note');
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
          record_id: 'test-company-id'
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
          record_id: 'test-list-id'
        })
      ).rejects.toThrow('ETIMEDOUT: Connection timeout');

      expect(CachingService.cache404Response).not.toHaveBeenCalled();
    });

    it('should treat clear not-found error messages as 404s', async () => {
      vi.mocked(tasks.getTask).mockRejectedValue(
        new Error('Task with ID "missing-task" not found')
      );

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.TASKS,
          record_id: 'missing-task'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Task with ID "missing-task" not found.'
        }
      });

      expect(CachingService.cache404Response).toHaveBeenCalledWith('tasks', 'missing-task');
    });
  });

  describe('List-Specific Edge Cases', () => {
    it('should handle null list response without masking other errors', async () => {
      // Mock getListDetails returning null
      vi.mocked(lists.getListDetails).mockResolvedValue(null);

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: 'null-list-id'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'List record with ID "null-list-id" not found.'
        }
      });
    });

    it('should handle malformed list response without masking other errors', async () => {
      // Mock getListDetails returning malformed data
      vi.mocked(lists.getListDetails).mockResolvedValue({
        // Missing required 'id' field
        name: 'Test List',
        description: 'A test list'
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: 'malformed-list-id'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'List record with ID "malformed-list-id" not found.'
        }
      });
    });

    it('should handle list with missing list_id without masking other errors', async () => {
      // Mock getListDetails returning data with invalid ID structure
      vi.mocked(lists.getListDetails).mockResolvedValue({
        id: { workspace_id: 'ws-123' }, // Missing list_id
        name: 'Test List',
        description: 'A test list'
      });

      await expect(
        UniversalRetrievalService.getRecordDetails({
          resource_type: UniversalResourceType.LISTS,
          record_id: 'invalid-structure-id'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'List record with ID "invalid-structure-id" not found.'
        }
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
          record_id: 'cached-404-id'
        })
      ).rejects.toMatchObject({
        status: 404,
        body: {
          code: 'not_found',
          message: 'Record with ID "cached-404-id" not found.'
        }
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
          id: { record_id: 'company-1' },
          values: { name: [{ value: 'Company 1' }] },
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        })
        .mockRejectedValueOnce({
          status: 404,
          body: { code: 'not_found', message: 'Company not found' }
        })
        .mockRejectedValueOnce({
          status: 401,
          body: { code: 'unauthorized', message: 'Invalid API key' }
        });

      const results = await UniversalRetrievalService.getMultipleRecords(
        UniversalResourceType.COMPANIES,
        ['company-1', 'company-404', 'company-auth-error']
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
        'cached-missing-task'
      );

      expect(exists).toBe(false);
      expect(tasks.getTask).not.toHaveBeenCalled();
    });

    it('should re-throw non-404 errors in existence check', async () => {
      vi.mocked(CachingService.isCached404).mockReturnValue(false);
      vi.mocked(tasks.getTask).mockRejectedValue({
        status: 503,
        body: { code: 'service_unavailable', message: 'Service down' }
      });

      await expect(
        UniversalRetrievalService.recordExists(
          UniversalResourceType.TASKS,
          'service-down-task'
        )
      ).rejects.toMatchObject({
        status: 503,
        body: { code: 'service_unavailable' }
      });
    });
  });
});