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
import type { ToolConfig } from '@/tool-types.js';

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
    const mockToolConfig: ToolConfig = {
      name: 'test-tool',
      description: 'test',
      inputSchema: { type: 'object' as const, properties: {} },
      handler: vi.fn().mockResolvedValue({ data: {} }),
      formatResult: vi.fn().mockReturnValue('formatted'),
    };

    it('should warn when add-record-to-list is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add-record-to-list',
          arguments: {
            listId: 'list_123',
            recordId: 'rec_456',
            objectType: 'companies',
          },
        },
      };

      // The handler will fail without proper mocks, but we only care about the warning
      try {
        await handleAddRecordToListOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('add-record-to-list'),
        expect.objectContaining({
          deprecatedTool: 'add-record-to-list',
          replacement: 'manage-list-entry',
          migrationMode: 'Mode 1 (Add)',
        }),
        'add-record-to-list',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when remove-record-from-list is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'remove-record-from-list',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
          },
        },
      };

      try {
        await handleRemoveRecordFromListOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('remove-record-from-list'),
        expect.objectContaining({
          deprecatedTool: 'remove-record-from-list',
          replacement: 'manage-list-entry',
          migrationMode: 'Mode 2 (Remove)',
        }),
        'remove-record-from-list',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when update-list-entry is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'update-list-entry',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
            attributes: { name: 'Test' },
          },
        },
      };

      try {
        await handleUpdateListEntryOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('update-list-entry'),
        expect.objectContaining({
          deprecatedTool: 'update-list-entry',
          replacement: 'manage-list-entry',
          migrationMode: 'Mode 3 (Update)',
        }),
        'update-list-entry',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('Filter Tools', () => {
    const mockToolConfig: ToolConfig = {
      name: 'test-tool',
      description: 'test',
      inputSchema: { type: 'object' as const, properties: {} },
      handler: vi.fn().mockResolvedValue({ data: [] }),
      formatResult: vi.fn().mockReturnValue('formatted'),
    };

    it('should warn when advanced-filter-list-entries is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'advanced-filter-list-entries',
          arguments: {
            listId: 'list_123',
            filters: {
              and: [{ attribute: 'name', operator: '$eq', value: 'test' }],
            },
          },
        },
      };

      try {
        await handleAdvancedFilterListEntriesOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('advanced-filter-list-entries'),
        expect.objectContaining({
          deprecatedTool: 'advanced-filter-list-entries',
          replacement: 'filter-list-entries',
          migrationMode: 'Mode 2 (Advanced)',
        }),
        'advanced-filter-list-entries',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when filter-list-entries-by-parent is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries-by-parent',
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
        await handleFilterListEntriesByParentOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('filter-list-entries-by-parent'),
        expect.objectContaining({
          deprecatedTool: 'filter-list-entries-by-parent',
          replacement: 'filter-list-entries',
          migrationMode: 'Mode 3 (Parent Attr)',
        }),
        'filter-list-entries-by-parent',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when filter-list-entries-by-parent-id is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries-by-parent-id',
          arguments: {
            listId: 'list_123',
            recordId: 'company_xyz789',
          },
        },
      };

      try {
        await handleFilterListEntriesByParentIdOperation(
          request,
          mockToolConfig
        );
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('filter-list-entries-by-parent-id'),
        expect.objectContaining({
          deprecatedTool: 'filter-list-entries-by-parent-id',
          replacement: 'filter-list-entries',
          migrationMode: 'Mode 4 (Parent UUID)',
        }),
        'filter-list-entries-by-parent-id',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('List Discovery Tools', () => {
    const mockToolConfig: ToolConfig = {
      name: 'test-tool',
      description: 'test',
      inputSchema: { type: 'object' as const, properties: {} },
      handler: vi.fn().mockResolvedValue([]),
      formatResult: vi.fn().mockReturnValue('formatted'),
    };

    it('should warn when get-lists is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get-lists',
          arguments: {
            limit: 20,
          },
        },
      };

      try {
        await handleGetListsOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('get-lists'),
        expect.objectContaining({
          deprecatedTool: 'get-lists',
          replacement: 'search_records',
          migrationMode: 'resource_type="lists"',
        }),
        'get-lists',
        OperationType.TOOL_EXECUTION
      );
    });

    it('should warn when get-list-details is invoked', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get-list-details',
          arguments: {
            id: 'list_123',
          },
        },
      };

      try {
        await handleGetListDetailsOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'handlers/tools/dispatcher/operations/lists',
        expect.stringContaining('get-list-details'),
        expect.objectContaining({
          deprecatedTool: 'get-list-details',
          replacement: 'get_record_details',
          migrationMode: 'resource_type="lists"',
        }),
        'get-list-details',
        OperationType.TOOL_EXECUTION
      );
    });
  });

  describe('Warning Properties', () => {
    const mockToolConfig: ToolConfig = {
      name: 'test-tool',
      description: 'test',
      inputSchema: { type: 'object' as const, properties: {} },
      handler: vi.fn().mockResolvedValue({ data: {} }),
      formatResult: vi.fn().mockReturnValue('formatted'),
    };

    it('should include migration guide path in all warnings', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add-record-to-list',
          arguments: {
            listId: 'list_123',
            recordId: 'rec_456',
            objectType: 'companies',
          },
        },
      };

      try {
        await handleAddRecordToListOperation(request, mockToolConfig);
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
          name: 'remove-record-from-list',
          arguments: {
            listId: 'list_123',
            entryId: 'entry_456',
          },
        },
      };

      try {
        await handleRemoveRecordFromListOperation(request, mockToolConfig);
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
      const mockToolConfig: ToolConfig = {
        name: 'test-tool',
        description: 'test',
        inputSchema: { type: 'object' as const, properties: {} },
        handler: vi.fn().mockResolvedValue({ data: {} }),
        formatResult: vi.fn().mockReturnValue('formatted'),
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'add-record-to-list',
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
          await handleAddRecordToListOperation(request, mockToolConfig);
        } catch {
          // Ignore execution errors
        }
      }

      // Should have been called 3 times
      expect(warnSpy).toHaveBeenCalledTimes(3);
    });

    it('should warn before attempting tool execution', async () => {
      const mockToolConfig: ToolConfig = {
        name: 'test-tool',
        description: 'test',
        inputSchema: { type: 'object' as const, properties: {} },
        handler: vi.fn().mockResolvedValue([]),
        formatResult: vi.fn().mockReturnValue('formatted'),
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get-lists',
          arguments: {
            limit: 20,
          },
        },
      };

      // The warning should be emitted before execution
      try {
        await handleGetListsOperation(request, mockToolConfig);
      } catch {
        // Ignore execution errors
      }

      // Warning should have been called at least once
      expect(warnSpy).toHaveBeenCalled();

      // Verify it was called with the correct tool name
      const callArgs = warnSpy.mock.calls[0];
      expect(callArgs[3]).toBe('get-lists');
    });
  });
});
