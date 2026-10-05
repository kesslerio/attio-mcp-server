/**
 * Unit tests for consolidated filter-list-entries tool
 *
 * Tests the unified filter tool with 4 parameter modes:
 * - Mode 1 (Simple): Single attribute filtering
 * - Mode 2 (Advanced): Multi-condition AND/OR filtering
 * - Mode 3 (Parent Attribute): Filter by parent record attributes
 * - Mode 4 (Parent UUID): Filter by exact parent record UUID
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFilterListEntriesOperation } from '@/handlers/tools/dispatcher/operations/lists.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ToolConfig } from '@/handlers/tool-types.js';
import { AttioListEntry } from '@/types/attio.js';

// Mock the filtering functions
vi.mock('@/objects/lists/filtering.js', () => ({
  filterListEntries: vi.fn(),
  advancedFilterListEntries: vi.fn(),
  filterListEntriesByParent: vi.fn(),
  filterListEntriesByParentId: vi.fn(),
}));

import {
  filterListEntries,
  advancedFilterListEntries,
  filterListEntriesByParent,
  filterListEntriesByParentId,
} from '@/objects/lists/filtering.js';
import { listsToolConfigs } from '@/handlers/tool-configs/lists.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Structured error envelope assertions for the shared result boundary: the
 * machine channel carries a stable code plus the actionable detail.
 */
function expectValidationRejection(result: unknown, detail: string) {
  const response = result as CallToolResult & {
    structuredContent?: { error?: { code: string; retryable: boolean } };
  };
  expect(response.isError).toBe(true);
  expect(response.structuredContent?.error).toMatchObject({
    code: 'VALIDATION_ERROR',
    retryable: false,
  });
  expect(JSON.parse(response.content[0].text as string)).toEqual(
    response.structuredContent
  );
  expect(response.structuredContent?.error?.code).toBe('VALIDATION_ERROR');
  expect(
    (response.structuredContent as { error: { message: string } }).error.message
  ).toContain(detail);
}

describe('Consolidated filter-list-entries Tool', () => {
  const mockListId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRecordId = '660e8400-e29b-41d4-a716-446655440001';

  const mockToolConfig = listsToolConfigs.filterListEntries;

  const mockListEntries: AttioListEntry[] = [
    {
      id: { entry_id: 'entry-1' },
      parent_record: 'companies',
      parent_object: 'companies',
      attribute_values: {},
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    vi.mocked(filterListEntries).mockResolvedValue(mockListEntries);
    vi.mocked(advancedFilterListEntries).mockResolvedValue(mockListEntries);
    vi.mocked(filterListEntriesByParent).mockResolvedValue(mockListEntries);
    vi.mocked(filterListEntriesByParentId).mockResolvedValue(mockListEntries);
  });

  describe('Mode Detection', () => {
    it('should detect Mode 1 (Simple) when attributeSlug is provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntries).toHaveBeenCalledWith(
        mockListId,
        'status',
        'equals',
        'active',
        undefined,
        undefined
      );
      expect(filterListEntries).toHaveBeenCalledTimes(1);
      expect(advancedFilterListEntries).not.toHaveBeenCalled();
      expect(filterListEntriesByParent).not.toHaveBeenCalled();
      expect(filterListEntriesByParentId).not.toHaveBeenCalled();
    });

    it('should detect Mode 2 (Advanced) when filters object is provided', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'status' },
            condition: 'equals',
            value: 'active',
          },
          {
            attribute: { slug: 'priority' },
            condition: 'greater_than',
            value: 5,
          },
        ],
        matchAny: false,
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            filters,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(advancedFilterListEntries).toHaveBeenCalledWith(
        mockListId,
        filters,
        undefined,
        undefined
      );
      expect(advancedFilterListEntries).toHaveBeenCalledTimes(1);
      expect(filterListEntries).not.toHaveBeenCalled();
      expect(filterListEntriesByParent).not.toHaveBeenCalled();
      expect(filterListEntriesByParentId).not.toHaveBeenCalled();
    });

    it('should detect Mode 3 (Parent Attribute) when parentObjectType and parentAttributeSlug are provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            parentAttributeSlug: 'categories',
            condition: 'contains',
            value: 'Technology',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntriesByParent).toHaveBeenCalledWith(
        mockListId,
        'companies',
        'categories',
        'contains',
        'Technology',
        undefined,
        undefined
      );
      expect(filterListEntriesByParent).toHaveBeenCalledTimes(1);
      expect(filterListEntries).not.toHaveBeenCalled();
      expect(advancedFilterListEntries).not.toHaveBeenCalled();
      expect(filterListEntriesByParentId).not.toHaveBeenCalled();
    });

    it('should detect Mode 4 (Parent UUID) when parentRecordId is provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentRecordId: mockRecordId,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntriesByParentId).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        undefined,
        undefined
      );
      expect(filterListEntriesByParentId).toHaveBeenCalledTimes(1);
      expect(filterListEntries).not.toHaveBeenCalled();
      expect(advancedFilterListEntries).not.toHaveBeenCalled();
      expect(filterListEntriesByParent).not.toHaveBeenCalled();
    });

    it('should reject when no mode parameters are provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            // No mode-specific parameters
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      // The sanitized dev-info detail is length-bounded, so the machine channel
      // keeps the stable code while only the leading guidance survives intact.
      expectValidationRejection(result, 'No filter mode detected');
      expect(result.content[0].text).toContain('Mode 1 (Simple)');
      expect(result.content[0].text).toContain('Mode 2 (Advanced)');
    });

    it('should reject when multiple modes are detected (attributeSlug + parentRecordId)', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
            parentRecordId: mockRecordId,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Multiple filter modes detected'
      );
      expect(result.content[0].text).toContain('exactly ONE mode');
    });

    it('should reject when multiple modes are detected (filters + parentObjectType)', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            filters: {
              filters: [
                {
                  attribute: { slug: 'status' },
                  condition: 'equals',
                  value: 'active',
                },
              ],
              matchAny: false,
            },
            parentObjectType: 'companies',
            parentAttributeSlug: 'categories',
            condition: 'contains',
            value: 'Technology',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Multiple filter modes detected'
      );
    });
  });

  describe('Mode 1 (Simple) - Validation', () => {
    it('should require attributeSlug for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            // Missing attributeSlug
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No filter mode detected');
    });

    it('should require condition for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            // Missing condition
            value: 'active',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expectValidationRejection(result, 'Mode 1 requires');
    });

    it('should require value for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            // Missing value
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expectValidationRejection(result, 'Mode 1 requires');
    });

    it('should support pagination for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
            limit: 50,
            offset: 10,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntries).toHaveBeenCalledWith(
        mockListId,
        'status',
        'equals',
        'active',
        50,
        10
      );
    });
  });

  describe('Mode 2 (Advanced) - Validation', () => {
    it('should require valid filters object with filters array for Mode 2', async () => {
      // When filters is an empty object, it will trigger Mode 2 but then
      // advancedFilterListEntries will validate and throw an error
      const mockError = new Error(
        'Invalid filters: Must contain a filters array'
      );
      vi.mocked(advancedFilterListEntries).mockRejectedValueOnce(mockError);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            filters: {}, // Empty object (invalid - missing filters array)
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Invalid filters: Must contain a filters array'
      );
    });

    it('should support pagination for Mode 2', async () => {
      const filters = {
        filters: [
          {
            attribute: { slug: 'status' },
            condition: 'equals',
            value: 'active',
          },
        ],
        matchAny: false,
      };

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            filters,
            limit: 100,
            offset: 20,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(advancedFilterListEntries).toHaveBeenCalledWith(
        mockListId,
        filters,
        100,
        20
      );
    });
  });

  describe('Mode 3 (Parent Attribute) - Validation', () => {
    it('should require parentObjectType for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            // Missing parentObjectType
            parentAttributeSlug: 'categories',
            condition: 'contains',
            value: 'Technology',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No filter mode detected');
    });

    it('should require parentAttributeSlug for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            // Missing parentAttributeSlug
            condition: 'contains',
            value: 'Technology',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No filter mode detected');
    });

    it('should require condition for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            parentAttributeSlug: 'categories',
            // Missing condition
            value: 'Technology',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expectValidationRejection(result, 'Mode 3 requires');
    });

    it('should require value for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            parentAttributeSlug: 'categories',
            condition: 'contains',
            // Missing value
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expectValidationRejection(result, 'Mode 3 requires');
    });

    it('should support pagination for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            parentAttributeSlug: 'categories',
            condition: 'contains',
            value: 'Technology',
            limit: 25,
            offset: 5,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntriesByParent).toHaveBeenCalledWith(
        mockListId,
        'companies',
        'categories',
        'contains',
        'Technology',
        25,
        5
      );
    });
  });

  describe('Mode 4 (Parent UUID) - Validation', () => {
    it('should require parentRecordId for Mode 4', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            // Missing parentRecordId (which is the only mode-specific param)
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No filter mode detected');
    });

    it('should support pagination for Mode 4', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentRecordId: mockRecordId,
            limit: 75,
            offset: 15,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntriesByParentId).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        75,
        15
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain 100% compatibility with original filter-list-entries calls', async () => {
      // This is the exact same call structure as the original filter-list-entries tool
      const originalCallStructure: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'stage',
            condition: 'equals',
            value: 'Qualified',
            limit: 50,
            offset: 0,
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        originalCallStructure,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(filterListEntries).toHaveBeenCalledWith(
        mockListId,
        'stage',
        'equals',
        'Qualified',
        50,
        0
      );
      expect(result.structuredContent).toEqual({ data: mockListEntries, count: 1, next_cursor: null });
    });

    it('should return the shared envelope and JSON companion', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse(result.content[0].text as string)).toEqual(result.structuredContent);
      expect(result.content[1].text).toBe(JSON.stringify(mockListEntries));
    });
  });

  describe('Common Validation', () => {
    it('should require listId for all modes', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            // Missing listId
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expectValidationRejection(result, 'Missing required parameter: listId');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from filterListEntries', async () => {
      const error = new Error('Invalid attribute slug');
      vi.mocked(filterListEntries).mockRejectedValue(error);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'invalid_slug',
            condition: 'equals',
            value: 'test',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Invalid attribute slug');
    });

    it('should handle errors from advancedFilterListEntries', async () => {
      const error = new Error('Invalid filters array');
      vi.mocked(advancedFilterListEntries).mockRejectedValue(error);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            filters: {
              filters: [], // Empty array
              matchAny: false,
            },
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Invalid filters array');
    });

    it('should handle errors from filterListEntriesByParent', async () => {
      const error = new Error('Invalid parent attribute');
      vi.mocked(filterListEntriesByParent).mockRejectedValue(error);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentObjectType: 'companies',
            parentAttributeSlug: 'invalid_attribute',
            condition: 'equals',
            value: 'test',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Invalid parent attribute');
    });

    it('should handle errors from filterListEntriesByParentId', async () => {
      const error = new Error('Invalid record ID');
      vi.mocked(filterListEntriesByParentId).mockRejectedValue(error);

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            parentRecordId: 'invalid-uuid',
          },
        },
      };

      const result = await handleFilterListEntriesOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Invalid record ID');
    });
  });

  describe('structured collection through the registered config (U4)', () => {
    const realConfig = listsToolConfigs.filterListEntries as ToolConfig;

    it('publishes an entry collection envelope that retains entry_id', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = (await handleFilterListEntriesOperation(
        request,
        realConfig
      )) as CallToolResult & {
        structuredContent: { data: unknown[]; count: number };
      };

      expect(result.isError).toBe(false);
      expect(result.structuredContent.count).toBe(1);
      expect(result.structuredContent.data).toMatchObject([
        { id: { entry_id: 'entry-1' } },
      ]);
      // content[0] is the serialized envelope, so prose can never change it.
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent
      );
    });

    it('keeps an empty page an array with count 0', async () => {
      vi.mocked(filterListEntries).mockResolvedValue([]);
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'filter-list-entries',
          arguments: {
            listId: mockListId,
            attributeSlug: 'status',
            condition: 'equals',
            value: 'active',
          },
        },
      };

      const result = (await handleFilterListEntriesOperation(
        request,
        realConfig
      )) as CallToolResult & {
        structuredContent: {
          data: unknown[];
          count: number;
          next_cursor: null;
        };
      };

      expect(result.isError).toBe(false);
      expect(result.structuredContent).toEqual({
        data: [],
        count: 0,
        next_cursor: null,
      });
    });
  });
});
