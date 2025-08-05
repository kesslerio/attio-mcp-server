import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttioClient } from '../../src/api/attio-client';
import * as attioOperations from '../../src/api/operations/index';
import * as listsModule from '../../src/objects/lists';
import {
  batchGetListsDetails,
  batchGetListsEntries,
} from '../../src/objects/lists';
import type { AttioList, AttioListEntry } from '../../src/types/attio';

// Mock the attio-operations module
vi.mock('../../src/api/operations/index');
vi.mock('../../src/api/attio-client', () => ({
  getAttioClient: vi.fn(),
}));

describe('Lists Batch Operations', () => {
  // Sample mock data
  const mockList1: AttioList = {
    id: {
      list_id: 'list123',
    },
    title: 'Important Clients',
    object_slug: 'companies',
    workspace_id: 'workspace1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    entry_count: 5,
  };

  const mockList2: AttioList = {
    id: {
      list_id: 'list456',
    },
    title: 'Prospects',
    object_slug: 'people',
    workspace_id: 'workspace1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    entry_count: 10,
  };

  const mockListEntry1: AttioListEntry = {
    id: {
      entry_id: 'entry123',
    },
    list_id: 'list123',
    record_id: 'company123',
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockListEntry2: AttioListEntry = {
    id: {
      entry_id: 'entry456',
    },
    list_id: 'list123',
    record_id: 'company456',
    created_at: '2023-01-01T00:00:00Z',
  };

  // Mock API client
  const mockApiClient = {
    post: vi.fn(),
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getAttioClient as vi.Mock).mockReturnValue(mockApiClient);
  });

  describe('batchGetListsDetails', () => {
    it('should use executeBatchOperations to get multiple lists details', async () => {
      // Setup executeBatchOperations mock to simulate success
      (attioOperations.executeBatchOperations as vi.Mock).mockImplementation(
        async (operations, apiCall) => {
          // Simulate calling the apiCall function for each operation
          const results = await Promise.all(
            operations.map(async (op: any) => {
              let data: AttioList | undefined;
              if (op.params === 'list123') {
                data = mockList1;
              } else if (op.params === 'list456') {
                data = mockList2;
              }

              return {
                id: op.id,
                success: !!data,
                data,
                error: data ? undefined : new Error('List not found'),
              };
            })
          );

          // Return a properly structured BatchResponse
          return {
            results,
            summary: {
              total: operations.length,
              succeeded: results.filter((r) => r.success).length,
              failed: results.filter((r) => !r.success).length,
            },
          };
        }
      );

      // Mock getListDetails to use in the test
      vi.spyOn(listsModule, 'getListDetails').mockImplementation(
        async (listId) => {
          if (listId === 'list123') return mockList1;
          if (listId === 'list456') return mockList2;
          throw new Error('List not found');
        }
      );

      // Call the function
      const result = await batchGetListsDetails(['list123', 'list456']);

      // Assertions
      expect(attioOperations.executeBatchOperations).toHaveBeenCalled();
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results.length).toBe(2);

      expect(result.results[0].data).toEqual(mockList1);
      expect(result.results[1].data).toEqual(mockList2);
    });

    it('should handle errors in list details retrieval', async () => {
      // Setup executeBatchOperations mock to simulate mixed success/failure
      (attioOperations.executeBatchOperations as vi.Mock).mockReturnValue({
        results: [
          { id: 'get_list_list123', success: true, data: mockList1 },
          {
            id: 'get_list_nonexistent',
            success: false,
            error: new Error('List not found'),
          },
        ],
        summary: {
          total: 2,
          succeeded: 1,
          failed: 1,
        },
      });

      // Call the function
      const result = await batchGetListsDetails(['list123', 'nonexistent']);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual(mockList1);

      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe('List not found');
    });
  });

  describe('batchGetListsEntries', () => {
    it('should use executeBatchOperations to get entries for multiple lists', async () => {
      // Setup executeBatchOperations mock
      (attioOperations.executeBatchOperations as vi.Mock).mockImplementation(
        async (operations, apiCall) => {
          // Simulate calling the apiCall function for each operation
          const results = await Promise.all(
            operations.map(async (op: any) => {
              let data: AttioListEntry[] = [];
              if (op.params.listId === 'list123') {
                data = [mockListEntry1, mockListEntry2];
              } else {
                data = [];
              }

              return {
                id: op.id,
                success: true,
                data,
              };
            })
          );

          // Return a properly structured BatchResponse
          return {
            results,
            summary: {
              total: operations.length,
              succeeded: results.filter((r) => r.success).length,
              failed: results.filter((r) => !r.success).length,
            },
          };
        }
      );

      // Mock getListEntries to use in the test
      vi.spyOn(listsModule, 'getListEntries').mockImplementation(
        async (listId) => {
          if (listId === 'list123') return [mockListEntry1, mockListEntry2];
          return [];
        }
      );

      // Call the function
      const result = await batchGetListsEntries([
        { listId: 'list123', limit: 10 },
        { listId: 'list456', limit: 5, offset: 10 },
      ]);

      // Assertions
      expect(attioOperations.executeBatchOperations).toHaveBeenCalled();
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);

      expect(result.results[0].data).toEqual([mockListEntry1, mockListEntry2]);
      expect(result.results[1].data).toEqual([]);
    });

    it('should handle errors in list entries retrieval', async () => {
      // Setup executeBatchOperations mock to simulate error
      (attioOperations.executeBatchOperations as vi.Mock).mockReturnValue({
        results: [
          {
            id: 'get_list_entries_list123_0',
            success: true,
            data: [mockListEntry1, mockListEntry2],
          },
          {
            id: 'get_list_entries_invalid_1',
            success: false,
            error: new Error('Failed to retrieve list entries'),
          },
        ],
        summary: {
          total: 2,
          succeeded: 1,
          failed: 1,
        },
      });

      // Call the function
      const result = await batchGetListsEntries([
        { listId: 'list123' },
        { listId: 'invalid' },
      ]);

      // Assertions
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].data).toEqual([mockListEntry1, mockListEntry2]);

      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeInstanceOf(Error);
      expect(result.results[1].error.message).toBe(
        'Failed to retrieve list entries'
      );
    });
  });
});
