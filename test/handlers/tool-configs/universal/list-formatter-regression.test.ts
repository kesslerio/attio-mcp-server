/**
 * Regression test for list formatter issue
 * Issue #1068 - Ensure list names are properly extracted in formatters
 *
 * After shifting lists to expose fields at the top level (no values wrapper),
 * formatters must handle both wrapped (companies, people) and unwrapped (lists) formats.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttioList } from '@/types/attio.js';
import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';
import { createRecordConfig } from '@/handlers/tool-configs/universal/core/crud-operations.js';
import { searchRecordsConfig } from '@/handlers/tool-configs/universal/core/search-operations.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

// Mock getListDetails for tool handler tests
vi.mock('@/objects/lists.js', () => ({
  getListDetails: vi.fn(),
}));

describe('List Formatter Regression - Issue #1068', () => {
  describe('get_record_details formatter', () => {
    it('should extract list name from top-level fields (not values wrapper)', () => {
      // List record with top-level fields (new format after #1068)
      const listRecord = {
        id: {
          list_id: 'list-123',
        },
        name: 'Sales Pipeline',
        title: 'Sales Pipeline',
        api_slug: 'sales-pipeline',
        object_slug: 'deals',
        workspace_id: 'ws-456',
      } as AttioList;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      // Should show list name, NOT "Unnamed"
      expect(formatted).toContain('Sales Pipeline');
      expect(formatted).not.toContain('Unnamed');
      expect(formatted).toContain('List: Sales Pipeline');
    });

    it('should extract list title when name is not present', () => {
      const listRecord = {
        id: {
          list_id: 'list-456',
        },
        title: 'Prospecting List',
        api_slug: 'prospecting-list',
        object_slug: 'companies',
        workspace_id: 'ws-789',
      } as AttioList;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      expect(formatted).toContain('Prospecting List');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should handle lists without values wrapper', () => {
      // List record without values property at all
      const listRecord = {
        id: {
          list_id: 'list-789',
        },
        name: 'Customer Success',
        api_slug: 'customer-success',
        object_slug: 'companies',
        workspace_id: 'ws-111',
      } as AttioList;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      expect(formatted).toContain('Customer Success');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should still work for regular records with values wrapper', () => {
      // Company record with values wrapper (existing format)
      const companyRecord = {
        id: {
          record_id: 'comp-123',
        },
        values: {
          name: [{ value: 'Acme Corp' }],
          domain: [{ value: 'acme.com' }],
        },
      };

      const formatted = getRecordDetailsConfig.formatResult(
        companyRecord,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('Acme Corp');
      expect(formatted).not.toContain('Unnamed');
    });
  });

  describe('create_record formatter', () => {
    it('should extract list name from top-level fields in create response', () => {
      const createdList = {
        id: {
          list_id: 'list-new-123',
        },
        name: 'New Sales List',
        title: 'New Sales List',
        api_slug: 'new-sales-list',
        object_slug: 'deals',
        workspace_id: 'ws-456',
      } as AttioList;

      const formatted = createRecordConfig.formatResult(
        createdList,
        UniversalResourceType.LISTS
      );

      expect(formatted).toContain('New Sales List');
      expect(formatted).not.toContain('Unnamed');
      expect(formatted).not.toContain('New list'); // Shouldn't use fallback
      expect(formatted).toContain('✅');
      // Issue #1068: Should show list_id, not "unknown"
      expect(formatted).toContain('list-new-123');
      expect(formatted).not.toContain('unknown');
    });

    it('should work for company creation with values wrapper', () => {
      const createdCompany = {
        id: {
          record_id: 'comp-new-456',
        },
        values: {
          name: [{ value: 'TechCorp' }],
        },
      };

      const formatted = createRecordConfig.formatResult(
        createdCompany,
        UniversalResourceType.COMPANIES
      );

      expect(formatted).toContain('TechCorp');
      expect(formatted).not.toContain('Unnamed');
    });
  });

  describe('Edge cases', () => {
    it('should handle list with empty string name gracefully', () => {
      const listRecord = {
        id: {
          list_id: 'list-empty',
        },
        name: '', // Empty string
        title: 'Fallback Title',
        api_slug: 'empty-list',
        object_slug: 'companies',
        workspace_id: 'ws-123',
      } as AttioList;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      // Should fall back to title
      expect(formatted).toContain('Fallback Title');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should return "Unnamed" only when no name/title fields exist', () => {
      const listRecord = {
        id: {
          list_id: 'list-no-name',
        },
        api_slug: 'no-name-list',
        object_slug: 'companies',
        workspace_id: 'ws-123',
      } as AttioList;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      // Should show Unnamed when genuinely no name
      expect(formatted).toContain('Unnamed');
    });
  });

  describe('Tool handler path - get_record_details (Issue #1068)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return list-native format from tool handler (no values wrapper, no record_id)', async () => {
      // Import getListDetails mock
      const { getListDetails } = await import('@/objects/lists.js');

      // Mock list response (list-native format from API)
      // Use list_ prefix to pass validation in UniversalRetrievalService
      const mockList = {
        id: {
          list_id: 'list_abc123def456',
        },
        name: 'Sales Pipeline',
        title: 'Sales Pipeline',
        api_slug: 'sales-pipeline',
        object_slug: 'deals',
        workspace_id: 'ws-test-456',
        description: 'Main sales pipeline',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      vi.mocked(getListDetails).mockResolvedValue(mockList as any);

      // Call the tool handler (goes through UniversalRetrievalService)
      const result = await getRecordDetailsConfig.handler({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_abc123def456',
      });

      // Verify list-native format returned
      expect(result.id).toHaveProperty('list_id', 'list_abc123def456');
      expect(result.id).not.toHaveProperty('record_id');
      expect(result).toHaveProperty('name', 'Sales Pipeline');
      expect(result).toHaveProperty('api_slug', 'sales-pipeline');
      expect(result).not.toHaveProperty('values');
    });

    it('should format list correctly (show list_id, not "unknown")', async () => {
      const { getListDetails } = await import('@/objects/lists.js');

      // Use list_ prefix to pass validation
      const mockList = {
        id: {
          list_id: 'list_xyz789formatted',
        },
        name: 'Customer Success',
        api_slug: 'customer-success',
        object_slug: 'companies',
        workspace_id: 'ws-formatted-123',
      };

      vi.mocked(getListDetails).mockResolvedValue(mockList as any);

      const result = await getRecordDetailsConfig.handler({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_xyz789formatted',
      });

      const formatted = getRecordDetailsConfig.formatResult(
        result,
        UniversalResourceType.LISTS
      );

      // Should show actual list ID, not "unknown"
      expect(formatted).toContain('list_xyz789formatted');
      expect(formatted).not.toContain('unknown');

      // Should show list name
      expect(formatted).toContain('Customer Success');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should always include id even when fields parameter excludes it (Issue #1 fix)', async () => {
      const { getListDetails } = await import('@/objects/lists.js');

      // Mock list response with all fields
      const mockList = {
        id: {
          list_id: 'list_fields_test',
        },
        name: 'Test List',
        title: 'Test List',
        api_slug: 'test-list',
        object_slug: 'companies',
        workspace_id: 'ws-fields-test',
        description: 'This is a test list',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      vi.mocked(getListDetails).mockResolvedValue(mockList as any);

      // Request only specific fields (excludes 'id')
      const result = await getRecordDetailsConfig.handler({
        resource_type: UniversalResourceType.LISTS,
        record_id: 'list_fields_test',
        fields: ['name', 'description'], // Explicitly excludes 'id'
      });

      // Verify id is still present despite being excluded from fields
      expect(result.id).toBeDefined();
      expect(result.id).toHaveProperty('list_id', 'list_fields_test');
      expect(result).toHaveProperty('name', 'Test List');
      expect(result).toHaveProperty('description', 'This is a test list');

      // Should not have fields that weren't requested
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('updated_at');
    });
  });

  describe('search_records formatter (Issue #1068)', () => {
    it('should extract list name from top-level fields in search results', () => {
      const listRecords = [
        {
          id: {
            list_id: 'list-search-1',
          },
          name: 'Marketing Campaigns',
          title: 'Marketing Campaigns',
          api_slug: 'marketing-campaigns',
          object_slug: 'companies',
          workspace_id: 'ws-456',
        },
        {
          id: {
            list_id: 'list-search-2',
          },
          name: 'Sales Pipeline',
          api_slug: 'sales-pipeline',
          object_slug: 'deals',
          workspace_id: 'ws-456',
        },
      ] as AttioList[];

      const formatted = searchRecordsConfig.formatResult(
        listRecords,
        UniversalResourceType.LISTS
      );

      // Should show list names from top-level fields
      expect(formatted).toContain('Marketing Campaigns');
      expect(formatted).toContain('Sales Pipeline');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should show list IDs correctly (not "unknown")', () => {
      const listRecords = [
        {
          id: {
            list_id: 'abc-123-def-456',
          },
          name: 'Test List',
          api_slug: 'test-list',
          object_slug: 'companies',
          workspace_id: 'ws-789',
        },
      ] as AttioList[];

      const formatted = searchRecordsConfig.formatResult(
        listRecords,
        UniversalResourceType.LISTS
      );

      // Should show actual list ID, not "unknown"
      expect(formatted).toContain('abc-123-def-456');
      expect(formatted).not.toContain('unknown');
    });

    it('should handle lists without values wrapper', () => {
      const listRecord = {
        id: {
          list_id: 'list-no-values',
        },
        name: 'Prospecting List',
        api_slug: 'prospecting-list',
        object_slug: 'companies',
        workspace_id: 'ws-111',
        // NO values property at all (list-native format)
      } as AttioList;

      const formatted = searchRecordsConfig.formatResult(
        [listRecord],
        UniversalResourceType.LISTS
      );

      // Should show list name
      expect(formatted).toContain('Prospecting List');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should include object_slug in formatter output', () => {
      const listRecord = {
        id: {
          list_id: 'list-with-slug',
        },
        name: 'Customer Success',
        api_slug: 'customer-success',
        object_slug: 'companies',
        workspace_id: 'ws-222',
      } as AttioList;

      const formatted = searchRecordsConfig.formatResult(
        [listRecord],
        UniversalResourceType.LISTS
      );

      // Should include object_slug for context
      expect(formatted).toContain('Customer Success');
      expect(formatted).toContain('[companies]');
    });

    it('should fall back to title when name is missing', () => {
      const listRecord = {
        id: {
          list_id: 'list-title-fallback',
        },
        title: 'Title Only List',
        api_slug: 'title-only',
        object_slug: 'people',
        workspace_id: 'ws-333',
      } as AttioList;

      const formatted = searchRecordsConfig.formatResult(
        [listRecord],
        UniversalResourceType.LISTS
      );

      // Should use title as fallback
      expect(formatted).toContain('Title Only List');
      expect(formatted).not.toContain('Unnamed');
    });

    it('should handle empty list array', () => {
      const formatted = searchRecordsConfig.formatResult(
        [],
        UniversalResourceType.LISTS
      );

      // Should show "Found 0 lists"
      expect(formatted).toContain('Found 0');
      expect(formatted).toContain('lists');
    });
  });
});
