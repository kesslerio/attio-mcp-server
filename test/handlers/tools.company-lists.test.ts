/**
 * Tests for the company lists tool functionality
 */

import { expect, describe, it, jest, beforeEach } from '@jest/globals';
import { listsToolConfigs } from '../../src/handlers/tool-configs/lists.js';
import * as listsObject from '../../src/objects/lists.js';

describe('Company Lists Tool Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should have the get-company-lists tool configuration', () => {
    expect(listsToolConfigs.getRecordListMemberships).toBeDefined();
    expect(listsToolConfigs.getRecordListMemberships.name).toEqual('get-company-lists');
    expect(typeof listsToolConfigs.getRecordListMemberships.handler).toEqual('function');
    expect(typeof listsToolConfigs.getRecordListMemberships.formatResult).toEqual('function');
  });

  it('should format empty results correctly', () => {
    const results: listsObject.ListMembership[] = [];
    const formatted = listsToolConfigs.getRecordListMemberships.formatResult(results);
    expect(formatted).toEqual('Record is not a member of any lists.');
  });

  it('should format non-empty results correctly', () => {
    const results: listsObject.ListMembership[] = [
      {
        listId: 'list-123',
        listName: 'Sales Pipeline',
        entryId: 'entry-456',
      },
      {
        listId: 'list-789',
        listName: 'Marketing Leads',
        entryId: 'entry-101',
      },
    ];

    const formatted = listsToolConfigs.getRecordListMemberships.formatResult(results);
    expect(formatted).toContain('Found 2 list membership(s):');
    expect(formatted).toContain('List: Sales Pipeline (ID: list-123)');
    expect(formatted).toContain('Entry ID: entry-456');
    expect(formatted).toContain('List: Marketing Leads (ID: list-789)');
    expect(formatted).toContain('Entry ID: entry-101');
  });

  it('should call getRecordListMemberships with correct parameters', async () => {
    // Mock the getRecordListMemberships function
    const mockGetRecordListMemberships = jest.spyOn(listsObject, 'getRecordListMemberships');
    mockGetRecordListMemberships.mockResolvedValue([
      {
        listId: 'list-123',
        listName: 'Test List',
        entryId: 'entry-456',
      },
    ]);

    // Call the handler
    const recordId = 'record-123';
    const objectType = 'companies';
    const includeEntryValues = true;

    await listsToolConfigs.getRecordListMemberships.handler(recordId, objectType, includeEntryValues);

    // Verify the function was called with the correct parameters
    expect(mockGetRecordListMemberships).toHaveBeenCalledWith(recordId, objectType, includeEntryValues);
  });
});