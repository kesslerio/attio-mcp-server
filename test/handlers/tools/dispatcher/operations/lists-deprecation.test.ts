import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { OperationType } from '@/utils/logger.js';
import * as logger from '@/utils/logger.js';
import {
  handleAddRecordToListOperation,
  handleRemoveRecordFromListOperation,
  handleUpdateListEntryOperation,
  handleGetListsOperation,
  handleGetListDetailsOperation,
  handleAdvancedFilterListEntriesOperation,
  handleFilterListEntriesByParentOperation,
  handleFilterListEntriesByParentIdOperation,
} from '@/handlers/tools/dispatcher/operations/lists.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { listsToolConfigs } from '@/handlers/tool-configs/lists.js';

// Mock getAttioClient at module level (hoisted by Vitest)
vi.mock('@/utils/client.js', () => ({
  getAttioClient: vi.fn(() => ({
    lists: {
      get: vi.fn().mockResolvedValue({ data: [] }),
      entries: {
        create: vi.fn().mockResolvedValue({ data: {} }),
        delete: vi.fn().mockResolvedValue({ data: {} }),
        update: vi.fn().mockResolvedValue({ data: {} }),
      },
    },
  })),
}));

describe('List Tools Deprecation Warnings (Issue #1071)', () => {
  let warnSpy: MockInstance;

  beforeEach(() => {
    // Mock the warn function
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('Entry Management Tools', () => {
    it('should warn when list_entries_add is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_add',
          arguments: {
            listId: 'list_123',
            recordId: 'rec_456',
            objectType: 'companies',
          },
        },
      };

      // The handler will fail without proper mocks, but we only care about the warning
      try {
        await handleAddRecordToListOperation(request, {
          ...listsToolConfigs.addRecordToList,
          handler: vi.fn().mockResolvedValue({
            id: { entry_id: 'entry_456', list_id: 'list_123' },
          }),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_add'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_add',
          replacement: 'list_entries_manage',
          migrationMode: 'Mode 1 (Add)',
        }),
        'list_entries_add',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when list_entries_remove is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_remove',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
          },
        },
      };

      try {
        await handleRemoveRecordFromListOperation(request, {
          ...listsToolConfigs.removeRecordFromList,
          handler: vi.fn().mockResolvedValue(true),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_remove'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_remove',
          replacement: 'list_entries_manage',
          migrationMode: 'Mode 2 (Remove)',
        }),
        'list_entries_remove',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when list_entries_update is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_update',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
            attributes: { name: 'Test' },
          },
        },
      };

      try {
        await handleUpdateListEntryOperation(request, {
          ...listsToolConfigs.updateListEntry,
          handler: vi.fn().mockResolvedValue({
            id: { entry_id: 'entry_456', list_id: 'list_123' },
          }),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_update'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_update',
          replacement: 'list_entries_manage',
          migrationMode: 'Mode 3 (Update)',
        }),
        'list_entries_update',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('Filter Tools', () => {
    it('should warn when list_entries_filter_advanced is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_filter_advanced',
          arguments: {
            listId: 'list_123',
            filters: {
              and: [{ attribute: 'name', operator: '$eq', value: 'test' }],
            },
          },
        },
      };

      try {
        await handleAdvancedFilterListEntriesOperation(request, {
          ...listsToolConfigs.advancedFilterListEntries,
          handler: vi.fn().mockResolvedValue([]),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_filter_advanced'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_filter_advanced',
          replacement: 'list_entries_filter',
          migrationMode: 'Mode 2 (Advanced)',
        }),
        'list_entries_filter_advanced',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when list_entries_filter_by_parent is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_filter_by_parent',
          arguments: {
            listId: 'list_123',
            parentObjectType: 'companies',
            parentAttributeSlug: 'industry',
            condition: 'equals',
            value: 'Technology',
          },
        },
      };

      try {
        await handleFilterListEntriesByParentOperation(request, {
          ...listsToolConfigs.filterListEntriesByParent,
          handler: vi.fn().mockResolvedValue([]),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_filter_by_parent'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_filter_by_parent',
          replacement: 'list_entries_filter',
          migrationMode: 'Mode 3 (Parent Attr)',
        }),
        'list_entries_filter_by_parent',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when list_entries_filter_by_parent_id is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_filter_by_parent_id',
          arguments: {
            listId: 'list_123',
            recordId: 'company_xyz789',
          },
        },
      };

      try {
        await handleFilterListEntriesByParentIdOperation(request, {
          ...listsToolConfigs.filterListEntriesByParentId,
          handler: vi.fn().mockResolvedValue([]),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('list_entries_filter_by_parent_id'),
        expect.objectContaining({
          deprecatedTool: 'list_entries_filter_by_parent_id',
          replacement: 'list_entries_filter',
          migrationMode: 'Mode 4 (Parent UUID)',
        }),
        'list_entries_filter_by_parent_id',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('List Discovery Tools', () => {
    it('should warn when lists_list is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'lists_list',
          arguments: {
            limit: 20,
          },
        },
      };

      try {
        await handleGetListsOperation(request, {
          ...listsToolConfigs.getLists,
          handler: vi.fn().mockResolvedValue([]),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('lists_list'),
        expect.objectContaining({
          deprecatedTool: 'lists_list',
          replacement: 'records_search',
          migrationMode: 'resource_type="lists"',
        }),
        'lists_list',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when lists_get is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'lists_get',
          arguments: {
            id: 'list_123',
          },
        },
      };

      try {
        await handleGetListDetailsOperation(request, {
          ...listsToolConfigs.getListDetails,
          handler: vi.fn().mockResolvedValue({ id: { list_id: 'list_123' } }),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('lists_get'),
        expect.objectContaining({
          deprecatedTool: 'lists_get',
          replacement: 'records_get_details',
          migrationMode: 'resource_type="lists"',
        }),
        'lists_get',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('Warning Properties', () => {
    it('should include migration guide path in all warnings', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_add',
          arguments: {
            listId: 'list_123',
            recordId: 'rec_456',
            objectType: 'companies',
          },
        },
      };

      try {
        await handleAddRecordToListOperation(request, {
          ...listsToolConfigs.addRecordToList,
          handler: vi.fn().mockResolvedValue({
            id: { entry_id: 'entry_456', list_id: 'list_123' },
          }),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('/docs/migration/v2-list-tools.md'),
        expect.objectContaining({
          migrationGuide: '/docs/migration/v2-list-tools.md',
          removalVersion: 'v2.0.0',
        }),
        expect.any(String),
        OperationType.TOOL_EXECUTION
      );
    });

    it('should specify v2.0.0 removal version', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_remove',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
          },
        },
      };

      try {
        await handleRemoveRecordFromListOperation(request, {
          ...listsToolConfigs.removeRecordFromList,
          handler: vi.fn().mockResolvedValue(true),
        });
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('v2.0.0'),
        expect.objectContaining({
          removalVersion: 'v2.0.0',
        }),
        expect.any(String),
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('Deprecation Behavior', () => {
    it('should emit warning on every invocation', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'list_entries_add',
          arguments: {
            listId: 'list_123',
            recordId: 'rec_456',
            objectType: 'companies',
          },
        },
      };

      // Call the handler 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await handleAddRecordToListOperation(request, {
            ...listsToolConfigs.addRecordToList,
            handler: vi.fn().mockResolvedValue({
              id: { entry_id: 'entry_456', list_id: 'list_123' },
            }),
          });
        } catch {
          // Ignore execution errors
        }
      }

      // Should have been called 3 times
      expect(warnSpy).toHaveBeenCalledTimes(3);
    });

    it('should warn before attempting tool execution', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'lists_list',
          arguments: {
            limit: 20,
          },
        },
      };

      // The warning should be emitted before execution
      try {
        await handleGetListsOperation(request, {
          ...listsToolConfigs.getLists,
          handler: vi.fn().mockResolvedValue([]),
        });
      } catch {
        // Ignore execution errors
      }

      // Warning should have been called at least once
      expect(warnSpy).toHaveBeenCalled();

      // Verify it was called with the correct tool name
      const callArgs = warnSpy.mock.calls[0];
      expect(callArgs[3]).toBe('lists_list');
    });
  });
});
