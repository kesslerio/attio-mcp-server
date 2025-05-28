/**
 * Tests for the getRecordListMemberships function
 */

import { expect, describe, it, jest, beforeEach } from '@jest/globals';
import { getRecordListMemberships, ListMembership } from '../../src/objects/lists.js';
import * as listsModule from '../../src/objects/lists.js';

describe('getRecordListMemberships Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should throw an error for invalid record ID', async () => {
    await expect(getRecordListMemberships('')).rejects.toThrow('Invalid record ID');
    await expect(getRecordListMemberships(null as unknown as string)).rejects.toThrow('Invalid record ID');
  });

  it('should return empty array when no lists are found', async () => {
    // Mock getLists to return empty array
    jest.spyOn(listsModule, 'getLists').mockResolvedValue([]);

    const result = await getRecordListMemberships('record-123');
    expect(result).toEqual([]);
  });

  it('should return memberships when record exists in lists', async () => {
    // Mock getLists to return test lists
    jest.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'List 1' },
      { id: 'list-2', name: 'List 2' },
    ]);

    // Mock getListEntries to return different results for each list
    const mockGetListEntries = jest.spyOn(listsModule, 'getListEntries');
    mockGetListEntries.mockImplementation(async (listId) => {
      if (listId === 'list-1') {
        return [
          { id: { entry_id: 'entry-1' }, record_id: 'record-123' },
          { id: { entry_id: 'entry-2' }, record_id: 'record-456' },
        ];
      } else if (listId === 'list-2') {
        return [
          { id: { entry_id: 'entry-3' }, record_id: 'record-123' },
        ];
      }
      return [];
    });

    const result = await getRecordListMemberships('record-123');
    
    expect(result).toHaveLength(2);
    expect(result[0].listId).toEqual('list-1');
    expect(result[0].listName).toEqual('List 1');
    expect(result[0].entryId).toEqual('entry-1');
    
    expect(result[1].listId).toEqual('list-2');
    expect(result[1].listName).toEqual('List 2');
    expect(result[1].entryId).toEqual('entry-3');
  });

  it('should include entry values when requested', async () => {
    // Mock getLists to return test lists
    jest.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'List 1' },
    ]);

    // Mock getListEntries to return entries with values
    jest.spyOn(listsModule, 'getListEntries').mockResolvedValue([
      { 
        id: { entry_id: 'entry-1' }, 
        record_id: 'record-123',
        values: { 
          stage: [{ value: 'Demo Scheduled' }],
          status: [{ value: 'Active' }]
        }
      },
    ]);

    const result = await getRecordListMemberships('record-123', undefined, true);
    
    expect(result).toHaveLength(1);
    expect(result[0].entryValues).toBeDefined();
    expect(result[0].entryValues?.stage).toEqual([{ value: 'Demo Scheduled' }]);
    expect(result[0].entryValues?.status).toEqual([{ value: 'Active' }]);
  });

  it('should filter lists by object type when provided', async () => {
    // Mock getLists to verify object type is passed
    const mockGetLists = jest.spyOn(listsModule, 'getLists');
    mockGetLists.mockResolvedValue([]);

    await getRecordListMemberships('record-123', 'companies');
    
    expect(mockGetLists).toHaveBeenCalledWith('companies');
  });

  it('should continue processing remaining lists if one list fails', async () => {
    // Mock getLists to return test lists
    jest.spyOn(listsModule, 'getLists').mockResolvedValue([
      { id: 'list-1', name: 'List 1' },
      { id: 'list-2', name: 'List 2' },
      { id: 'list-3', name: 'List 3' },
    ]);

    // Mock getListEntries to fail for list-2 but succeed for others
    const mockGetListEntries = jest.spyOn(listsModule, 'getListEntries');
    mockGetListEntries.mockImplementation(async (listId) => {
      if (listId === 'list-2') {
        throw new Error('API Error');
      } else if (listId === 'list-1') {
        return [{ id: { entry_id: 'entry-1' }, record_id: 'record-123' }];
      } else if (listId === 'list-3') {
        return [{ id: { entry_id: 'entry-3' }, record_id: 'record-123' }];
      }
      return [];
    });

    const result = await getRecordListMemberships('record-123');
    
    expect(result).toHaveLength(2);
    expect(result[0].listId).toEqual('list-1');
    expect(result[1].listId).toEqual('list-3');
  });
});