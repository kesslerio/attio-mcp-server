/**
 * Tests for the list memberships tool functionality
 */

import { expect, describe, it, beforeEach, vi } from 'vitest';
import { listsToolConfigs } from '../../src/handlers/tool-configs/lists.js';
import * as listsObject from '../../src/objects/lists.js';
import * as attioClient from '../../src/api/attio-client.js';

describe('Record List Memberships Tool Tests', () => {
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

  it('should have the get-record-list-memberships tool configuration', () => {
    expect(listsToolConfigs.getRecordListMemberships).toBeDefined();
    expect(listsToolConfigs.getRecordListMemberships.name).toEqual(
      'get-record-list-memberships'
    );
    expect(typeof listsToolConfigs.getRecordListMemberships.handler).toEqual(
      'function'
    );
    expect(
      typeof listsToolConfigs.getRecordListMemberships.formatResult
    ).toEqual('function');
  });

  it('should format empty results correctly', () => {
    const results: listsObject.ListMembership[] = [];
    const formatted =
      listsToolConfigs.getRecordListMemberships.formatResult(results);
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

    const formatted =
      listsToolConfigs.getRecordListMemberships.formatResult(results);
    expect(formatted).toContain('Found 2 list membership(s):');
    expect(formatted).toContain('List: Sales Pipeline (ID: list-123)');
    expect(formatted).toContain('Entry ID: entry-456');
    expect(formatted).toContain('List: Marketing Leads (ID: list-789)');
    expect(formatted).toContain('Entry ID: entry-101');
  });

  it('should format results with entry values correctly', () => {
    const results: listsObject.ListMembership[] = [
      {
        listId: 'list-123',
        listName: 'Sales Pipeline',
        entryId: 'entry-456',
        entryValues: {
          stage: 'Qualified',
          priority: 'High',
          expected_value: 10000,
        },
      },
    ];

    const formatted =
      listsToolConfigs.getRecordListMemberships.formatResult(results);
    expect(formatted).toContain('Found 1 list membership(s):');
    expect(formatted).toContain('List: Sales Pipeline (ID: list-123)');
    expect(formatted).toContain('Entry ID: entry-456');
    expect(formatted).toContain('stage: Qualified');
    expect(formatted).toContain('priority: High');
    expect(formatted).toContain('expected_value: 10000');
  });

  it('should call handler correctly', async () => {
    // Mock getRecordListMemberships function
    const mockGetRecordListMemberships = vi.spyOn(
      listsObject,
      'getRecordListMemberships'
    );
    mockGetRecordListMemberships.mockResolvedValue([
      {
        listId: 'list-123',
        listName: 'Test List',
        entryId: 'entry-456',
      },
    ]);

    // Call the handler directly
    const handler = listsToolConfigs.getRecordListMemberships.handler;
    await handler('company-123', 'companies', true);

    // Verify the function was called with correct parameters
    expect(mockGetRecordListMemberships).toHaveBeenCalledWith(
      'company-123',
      'companies',
      true,
      undefined
    );

    // Test with default values
    await handler('person-456');
    expect(mockGetRecordListMemberships).toHaveBeenCalledWith(
      'person-456',
      undefined,
      undefined,
      undefined
    );
  });
});
