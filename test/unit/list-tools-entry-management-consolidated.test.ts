/**
 * Unit tests for consolidated manage-list-entry tool
 *
 * Tests the unified entry management tool with 3 parameter modes:
 * - Mode 1 (Add): Add record to list
 * - Mode 2 (Remove): Remove entry from list
 * - Mode 3 (Update): Update entry attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleManageListEntryOperation } from '../../src/handlers/tools/dispatcher/operations/lists.js';
import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ToolConfig } from '../../src/handlers/tool-types.js';
import { AttioListEntry } from '../../src/types/attio.js';

// Mock the entry management functions
vi.mock('../../src/objects/lists/entries.js', () => ({
  addRecordToList: vi.fn(),
  removeRecordFromList: vi.fn(),
  updateListEntry: vi.fn(),
}));

import {
  addRecordToList,
  removeRecordFromList,
  updateListEntry,
} from '../../src/objects/lists/entries.js';

describe('Consolidated manage-list-entry Tool', () => {
  const mockListId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRecordId = '660e8400-e29b-41d4-a716-446655440001';
  const mockEntryId = '770e8400-e29b-41d4-a716-446655440002';

  const mockToolConfig: ToolConfig = {
    name: 'manage-list-entry',
    handler: vi.fn(),
    formatResult: vi.fn((result) => JSON.stringify(result)),
  };

  const mockListEntry: AttioListEntry = {
    id: { entry_id: mockEntryId },
    parent_record: mockRecordId,
    parent_object: 'companies',
    attribute_values: { stage: 'Qualified' },
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    vi.mocked(addRecordToList).mockResolvedValue(mockListEntry);
    vi.mocked(removeRecordFromList).mockResolvedValue(true);
    vi.mocked(updateListEntry).mockResolvedValue(mockListEntry);
  });

  describe('Mode Detection', () => {
    it('should detect Mode 1 (Add) when recordId + objectType provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'companies',
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(addRecordToList).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        'companies',
        undefined
      );
      expect(addRecordToList).toHaveBeenCalledTimes(1);
      expect(removeRecordFromList).not.toHaveBeenCalled();
      expect(updateListEntry).not.toHaveBeenCalled();
    });

    it('should detect Mode 2 (Remove) when entryId only provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(removeRecordFromList).toHaveBeenCalledWith(
        mockListId,
        mockEntryId
      );
      expect(removeRecordFromList).toHaveBeenCalledTimes(1);
      expect(addRecordToList).not.toHaveBeenCalled();
      expect(updateListEntry).not.toHaveBeenCalled();
    });

    it('should detect Mode 3 (Update) when entryId + attributes provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes: { stage: 'Qualified' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(updateListEntry).toHaveBeenCalledWith(mockListId, mockEntryId, {
        stage: 'Qualified',
      });
      expect(updateListEntry).toHaveBeenCalledTimes(1);
      expect(addRecordToList).not.toHaveBeenCalled();
      expect(removeRecordFromList).not.toHaveBeenCalled();
    });

    it('should reject when no mode parameters provided', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No management mode detected');
      expect(result.content[0].text).toContain(
        'Mode 1 (Add): recordId, objectType'
      );
      expect(result.content[0].text).toContain('Mode 2 (Remove): entryId');
      expect(result.content[0].text).toContain(
        'Mode 3 (Update): entryId, attributes'
      );
    });

    it('should reject when multiple modes detected (recordId + attributes)', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'companies',
            entryId: mockEntryId,
            attributes: { stage: 'Qualified' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Multiple management modes detected'
      );
    });
  });

  describe('Mode 1 (Add) - Validation', () => {
    it('should require recordId for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            objectType: 'companies',
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      // Without recordId, mode detection fails before parameter validation
      expect(result.content[0].text).toContain('No management mode detected');
    });

    it('should require objectType for Mode 1', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      // Without objectType, mode detection fails before parameter validation
      expect(result.content[0].text).toContain('No management mode detected');
    });

    it('should accept optional initialValues for Mode 1', async () => {
      const initialValues = { stage: 'Prospect', priority: 'High' };
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'companies',
            initialValues,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(addRecordToList).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        'companies',
        initialValues
      );
    });

    it('should call addRecordToList with correct parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'people',
            initialValues: { role: 'CEO' },
          },
        },
      };

      await handleManageListEntryOperation(request, mockToolConfig);

      expect(addRecordToList).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        'people',
        { role: 'CEO' }
      );
    });
  });

  describe('Mode 2 (Remove) - Validation', () => {
    it('should require entryId for Mode 2', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            // Missing entryId, and no other mode params
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No management mode detected');
    });

    it('should call removeRecordFromList with correct parameters', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      await handleManageListEntryOperation(request, mockToolConfig);

      expect(removeRecordFromList).toHaveBeenCalledWith(
        mockListId,
        mockEntryId
      );
    });

    it('should format boolean result as success message', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      // The formatResult function should be called for remove mode
      expect(mockToolConfig.formatResult).toHaveBeenCalled();
    });
  });

  describe('Mode 3 (Update) - Validation', () => {
    it('should require entryId for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            attributes: { stage: 'Qualified' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('No management mode detected');
    });

    it('should require attributes for Mode 3', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      // Without attributes, this should be detected as Mode 2 (Remove)
      expect(result.isError).toBeFalsy();
      expect(removeRecordFromList).toHaveBeenCalled();
    });

    it('should reject non-object attributes', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes: 'invalid',
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Mode 3 (Update): attributes parameter is required and must be an object'
      );
    });

    it('should reject array attributes', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes: ['invalid'],
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain(
        'Mode 3 (Update): attributes parameter is required and must be an object'
      );
    });

    it('should call updateListEntry with correct parameters', async () => {
      const attributes = { stage: 'Won', value: 50000 };
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes,
          },
        },
      };

      await handleManageListEntryOperation(request, mockToolConfig);

      expect(updateListEntry).toHaveBeenCalledWith(
        mockListId,
        mockEntryId,
        attributes
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain 100% compatibility with add-record-to-list calls', async () => {
      // Exact same structure as original add-record-to-list tool
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'companies',
            initialValues: { stage: 'Prospect' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(addRecordToList).toHaveBeenCalledWith(
        mockListId,
        mockRecordId,
        'companies',
        { stage: 'Prospect' }
      );
    });

    it('should maintain 100% compatibility with remove-record-from-list calls', async () => {
      // Exact same structure as original remove-record-from-list tool
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(removeRecordFromList).toHaveBeenCalledWith(
        mockListId,
        mockEntryId
      );
    });

    it('should maintain 100% compatibility with update-list-entry calls', async () => {
      // Exact same structure as original update-list-entry tool
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes: { stage: 'Qualified' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeFalsy();
      expect(updateListEntry).toHaveBeenCalledWith(mockListId, mockEntryId, {
        stage: 'Qualified',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from addRecordToList', async () => {
      vi.mocked(addRecordToList).mockRejectedValue(
        new Error('Record not found')
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            recordId: mockRecordId,
            objectType: 'companies',
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Record not found');
    });

    it('should handle errors from removeRecordFromList', async () => {
      vi.mocked(removeRecordFromList).mockRejectedValue(
        new Error('Entry not found')
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Entry not found');
    });

    it('should handle errors from updateListEntry', async () => {
      vi.mocked(updateListEntry).mockRejectedValue(
        new Error('Invalid attributes')
      );

      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            listId: mockListId,
            entryId: mockEntryId,
            attributes: { invalid: 'value' },
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('Invalid attributes');
    });

    it('should require listId parameter for all modes', async () => {
      const request: CallToolRequest = {
        method: 'tools/call',
        params: {
          name: 'manage-list-entry',
          arguments: {
            recordId: mockRecordId,
            objectType: 'companies',
          },
        },
      };

      const result = await handleManageListEntryOperation(
        request,
        mockToolConfig
      );

      expect(result.isError).toBeTruthy();
      expect(result.content[0].text).toContain('listId parameter is required');
    });
  });
});
