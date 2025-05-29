/**
 * Tests for the getRecordListMemberships function
 */

import { expect, describe, it, beforeEach, vi } from 'vitest';
import {
  getRecordListMemberships,
  ListMembership,
  getListEntries,
} from '../../src/objects/lists.js';
import * as listsModule from '../../src/objects/lists.js';
import * as attioClient from '../../src/api/attio-client.js';
import { ResourceType } from '../../src/types/attio.js';

describe('getRecordListMemberships Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock API client
    vi.spyOn(attioClient, 'getAttioClient').mockReturnValue({
      get: vi.fn().mockResolvedValue({ data: { data: [] } }),
      post: vi.fn().mockResolvedValue({ data: { data: {} } }),
      patch: vi.fn().mockResolvedValue({ data: { data: {} } }),
      delete: vi.fn().mockResolvedValue({ data: { data: {} } }),
    });
  });

  it('should throw an error for invalid record ID', async () => {
    await expect(getRecordListMemberships('')).rejects.toThrow(
      'Invalid record ID'
    );
    await expect(
      getRecordListMemberships(null as unknown as string)
    ).rejects.toThrow('Invalid record ID');
  });

  it('should throw an error for invalid object type', async () => {
    await expect(
      getRecordListMemberships('record-123', 'invalid-type')
    ).rejects.toThrow('Invalid object type');
    await expect(
      getRecordListMemberships('record-123', 'customers')
    ).rejects.toThrow('Invalid object type');
  });

  it('should throw an error for invalid batch size', async () => {
    await expect(
      getRecordListMemberships('record-123', 'companies', false, 0)
    ).rejects.toThrow('Invalid batch size');
    await expect(
      getRecordListMemberships('record-123', 'companies', false, 21)
    ).rejects.toThrow('Invalid batch size');
    await expect(
      getRecordListMemberships('record-123', 'companies', false, -1)
    ).rejects.toThrow('Invalid batch size');
  });

  it('should return empty array when no lists are found', async () => {
    // Mock getLists to return empty array
    vi.spyOn(listsModule, 'getLists').mockResolvedValue([]);

    const result = await getRecordListMemberships('record-123');
    expect(result).toEqual([]);
  });

  it('should return memberships when record exists in lists', async () => {
    // Mock getLists to return some lists
    vi.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'Sales Pipeline' },
      { id: 'list-2', name: 'Marketing Leads' },
    ]);

    // Mock getListEntries to return entries with matching record ID
    const mockEntries1 = [
      { id: { entry_id: 'entry-1' }, record_id: 'record-123', values: {} },
      { id: { entry_id: 'entry-2' }, record_id: 'record-456', values: {} },
    ];
    const mockEntries2 = [
      { id: { entry_id: 'entry-3' }, record_id: 'record-123', values: {} },
    ];

    const getListEntriesMock = vi.spyOn(listsModule, 'getListEntries');
    getListEntriesMock.mockImplementation(async (listId) => {
      if (listId === 'list-1') return mockEntries1;
      if (listId === 'list-2') return mockEntries2;
      return [];
    });

    const result = await getRecordListMemberships('record-123');

    // Verify the correct functions were called
    expect(listsModule.getLists).toHaveBeenCalledTimes(1);
    expect(listsModule.getListEntries).toHaveBeenCalledTimes(2);
    expect(getListEntriesMock).toHaveBeenCalledWith('list-1', 100);
    expect(getListEntriesMock).toHaveBeenCalledWith('list-2', 100);

    // Verify the returned memberships
    expect(result.length).toBe(2);
    expect(result).toEqual([
      { listId: 'list-1', listName: 'Sales Pipeline', entryId: 'entry-1' },
      { listId: 'list-2', listName: 'Marketing Leads', entryId: 'entry-3' },
    ]);
  });

  it('should include entry values when requested', async () => {
    // Mock getLists to return some lists
    vi.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'Sales Pipeline' },
    ]);

    // Mock getListEntries to return entries with values
    const mockEntries = [
      {
        id: { entry_id: 'entry-1' },
        record_id: 'record-123',
        values: {
          stage: 'Qualified',
          priority: 'High',
          expected_value: 10000,
        },
      },
    ];

    vi.spyOn(listsModule, 'getListEntries').mockResolvedValue(mockEntries);

    // Call with includeEntryValues = true
    const result = await getRecordListMemberships(
      'record-123',
      undefined,
      true
    );

    // Verify entry values are included
    expect(result.length).toBe(1);
    expect(result[0].entryValues).toBeDefined();
    expect(result[0].entryValues).toEqual({
      stage: 'Qualified',
      priority: 'High',
      expected_value: 10000,
    });
  });

  it('should filter lists by object type when provided', async () => {
    // Mock getLists with object type filter
    const getListsMock = vi.spyOn(listsModule, 'getLists');
    getListsMock.mockResolvedValue([
      { id: 'list-1', name: 'Companies Pipeline' },
    ]);

    vi.spyOn(listsModule, 'getListEntries').mockResolvedValue([
      { id: { entry_id: 'entry-1' }, record_id: 'record-123', values: {} },
    ]);

    // Call with object type = 'companies'
    await getRecordListMemberships('record-123', 'companies');

    // Verify getLists was called with the object type
    expect(getListsMock).toHaveBeenCalledWith('companies');
  });

  it('should continue processing remaining lists if one list fails', async () => {
    // Mock getLists to return some lists
    vi.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'Sales Pipeline' },
      { id: 'list-2', name: 'Failed List' },
      { id: 'list-3', name: 'Marketing Leads' },
    ]);

    // Mock getListEntries to succeed for lists 1 and 3, but fail for list 2
    const getListEntriesMock = vi.spyOn(listsModule, 'getListEntries');
    getListEntriesMock.mockImplementation(async (listId) => {
      if (listId === 'list-1') {
        return [
          { id: { entry_id: 'entry-1' }, record_id: 'record-123', values: {} },
        ];
      }
      if (listId === 'list-2') {
        throw new Error('API error');
      }
      if (listId === 'list-3') {
        return [
          { id: { entry_id: 'entry-3' }, record_id: 'record-123', values: {} },
        ];
      }
      return [];
    });

    const result = await getRecordListMemberships('record-123');

    // Verify all lists were attempted
    expect(getListEntriesMock).toHaveBeenCalledTimes(3);

    // Verify we got results from the successful lists
    expect(result.length).toBe(2);
    expect(result[0].listId).toBe('list-1');
    expect(result[1].listId).toBe('list-3');
  });

  it('should process lists in batches based on batchSize parameter', async () => {
    // Mock getLists to return many lists
    const mockLists = Array.from({ length: 10 }, (_, i) => ({
      id: `list-${i + 1}`,
      name: `List ${i + 1}`,
    }));

    vi.spyOn(listsModule, 'getLists').mockResolvedValue(mockLists);

    // Mock successful getListEntries calls
    const getListEntriesMock = vi.spyOn(listsModule, 'getListEntries');
    getListEntriesMock.mockImplementation(async (listId) => {
      // Only return entries for even-numbered lists
      const listNum = parseInt(listId.replace('list-', ''));
      if (listNum % 2 === 0) {
        return [
          {
            id: { entry_id: `entry-${listNum}` },
            record_id: 'record-123',
            values: {},
          },
        ];
      }
      return [];
    });

    // Call with batchSize = 3
    await getRecordListMemberships('record-123', undefined, false, 3);

    // Verify we made multiple batch requests
    // Since we have 10 lists and batch size is 3, we should have made 4 Promise.all calls
    // But we can't directly test that with the current implementation

    // We can verify all lists were processed
    expect(getListEntriesMock).toHaveBeenCalledTimes(10);
    for (let i = 1; i <= 10; i++) {
      expect(getListEntriesMock).toHaveBeenCalledWith(`list-${i}`, 100);
    }
  });

  it('should handle errors at the top level', async () => {
    // Mock getLists to throw an error
    vi.spyOn(listsModule, 'getLists').mockRejectedValue(
      new Error('API failure')
    );

    // Verify error is propagated
    await expect(getRecordListMemberships('record-123')).rejects.toThrow(
      'API failure'
    );
  });
});
