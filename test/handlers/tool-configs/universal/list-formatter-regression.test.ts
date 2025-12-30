/**
 * Regression test for list formatter issue
 * Issue #1068 - Ensure list names are properly extracted in formatters
 *
 * After shifting lists to expose fields at the top level (no values wrapper),
 * formatters must handle both wrapped (companies, people) and unwrapped (lists) formats.
 */

import { describe, it, expect } from 'vitest';
import { AttioListRecord } from '@/types/attio.js';
import { getRecordDetailsConfig } from '@/handlers/tool-configs/universal/core/record-details-operations.js';
import { createRecordConfig } from '@/handlers/tool-configs/universal/core/crud-operations.js';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types.js';

describe('List Formatter Regression - Issue #1068', () => {
  describe('get_record_details formatter', () => {
    it('should extract list name from top-level fields (not values wrapper)', () => {
      // List record with top-level fields (new format after #1068)
      const listRecord: AttioListRecord = {
        id: {
          record_id: 'list-123',
          list_id: 'list-123',
        },
        name: 'Sales Pipeline',
        title: 'Sales Pipeline',
        api_slug: 'sales-pipeline',
        object_slug: 'deals',
        workspace_id: 'ws-456',
        values: {}, // Empty values object (not used for lists)
      };

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
      const listRecord: AttioListRecord = {
        id: {
          record_id: 'list-456',
          list_id: 'list-456',
        },
        title: 'Prospecting List',
        api_slug: 'prospecting-list',
        object_slug: 'companies',
        workspace_id: 'ws-789',
        values: {},
      };

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
          record_id: 'list-789',
          list_id: 'list-789',
        },
        name: 'Customer Success',
        api_slug: 'customer-success',
        object_slug: 'companies',
        workspace_id: 'ws-111',
      } as AttioListRecord;

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
      const createdList: AttioListRecord = {
        id: {
          record_id: 'list-new-123',
          list_id: 'list-new-123',
        },
        name: 'New Sales List',
        title: 'New Sales List',
        api_slug: 'new-sales-list',
        object_slug: 'deals',
        workspace_id: 'ws-456',
        values: {},
      };

      const formatted = createRecordConfig.formatResult(
        createdList,
        UniversalResourceType.LISTS
      );

      expect(formatted).toContain('New Sales List');
      expect(formatted).not.toContain('Unnamed');
      expect(formatted).not.toContain('New list'); // Shouldn't use fallback
      expect(formatted).toContain('✅');
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
      const listRecord: AttioListRecord = {
        id: {
          record_id: 'list-empty',
          list_id: 'list-empty',
        },
        name: '', // Empty string
        title: 'Fallback Title',
        api_slug: 'empty-list',
        object_slug: 'companies',
        workspace_id: 'ws-123',
        values: {},
      };

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
          record_id: 'list-no-name',
          list_id: 'list-no-name',
        },
        api_slug: 'no-name-list',
        object_slug: 'companies',
        workspace_id: 'ws-123',
        values: {},
      } as AttioListRecord;

      const formatted = getRecordDetailsConfig.formatResult(
        listRecord,
        UniversalResourceType.LISTS
      );

      // Should show Unnamed when genuinely no name
      expect(formatted).toContain('Unnamed');
    });
  });
});
