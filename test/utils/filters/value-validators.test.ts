/**
 * Unit tests for value-validators.ts
 * Tests select/status value validation logic
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateSelectOrStatusValue } from '../../../src/utils/filters/value-validators.js';
import { FilterValidationError } from '../../../src/errors/api-errors.js';

// Mock dependencies
vi.mock('../../../src/api/attribute-types.js', () => ({
  getAttributeTypeInfo: vi.fn(),
}));

vi.mock('../../../src/api/attio-client.js', () => ({
  getStatusOptions: vi.fn(),
  getSelectOptions: vi.fn(),
}));

import { getAttributeTypeInfo } from '../../../src/api/attribute-types.js';
import {
  getStatusOptions,
  getSelectOptions,
} from '../../../src/api/attio-client.js';

describe('validateSelectOrStatusValue', () => {
  const mockCache = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.clear();
  });

  describe('Metadata-first strategy', () => {
    test('should use metadata options when available (no API call)', async () => {
      // Mock metadata with options
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                { id: '1', title: 'Demo', value: 'demo', is_archived: false },
                {
                  id: '2',
                  title: 'Negotiation',
                  value: 'negotiation',
                  is_archived: false,
                },
                {
                  id: '3',
                  title: 'Won',
                  value: 'won',
                  is_archived: false,
                },
              ],
            },
          },
        },
      });

      // Valid value should not throw
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Demo',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();

      // Should not call API functions
      expect(getStatusOptions).not.toHaveBeenCalled();
      expect(getSelectOptions).not.toHaveBeenCalled();
    });

    test('should fall back to API call when metadata lacks options', async () => {
      // Mock metadata without options
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {}, // No options in metadata
        },
      });

      // Mock API response
      vi.mocked(getStatusOptions).mockResolvedValue([
        { id: '1', title: 'Demo', value: 'demo', is_archived: false },
        {
          id: '2',
          title: 'Negotiation',
          value: 'negotiation',
          is_archived: false,
        },
      ]);

      // Valid value should not throw
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Demo',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();

      // Should call API function
      expect(getStatusOptions).toHaveBeenCalledWith('deals', 'stage');
    });
  });

  describe('Operator scoping (equals/in only)', () => {
    test('should validate for equals operator', async () => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                { id: '1', title: 'Demo', value: 'demo', is_archived: false },
              ],
            },
          },
        },
      });

      // Invalid value with equals should throw
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'InvalidStage',
          'equals',
          mockCache
        )
      ).rejects.toThrow(FilterValidationError);
    });

    test('should validate for in operator with array values', async () => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                { id: '1', title: 'Demo', value: 'demo', is_archived: false },
                {
                  id: '2',
                  title: 'Negotiation',
                  value: 'negotiation',
                  is_archived: false,
                },
              ],
            },
          },
        },
      });

      // Valid array values should not throw
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          ['Demo', 'Negotiation'],
          'in',
          mockCache
        )
      ).resolves.toBeUndefined();

      // Array with invalid value should throw
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          ['Demo', 'InvalidStage'],
          'in',
          mockCache
        )
      ).rejects.toThrow(FilterValidationError);
    });

    test('should skip validation for other operators (contains, starts_with, etc.)', async () => {
      // Should not call any functions for non-equals/in operators
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Demo',
          'contains',
          mockCache
        )
      ).resolves.toBeUndefined();

      expect(getAttributeTypeInfo).not.toHaveBeenCalled();
      expect(getStatusOptions).not.toHaveBeenCalled();
    });
  });

  describe('Case-insensitive matching', () => {
    beforeEach(() => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                {
                  id: '1',
                  title: 'Demo Scheduling',
                  value: 'demo',
                  is_archived: false,
                },
              ],
            },
          },
        },
      });
    });

    test('should match case-insensitively by title', async () => {
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'demo scheduling',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();

      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'DEMO SCHEDULING',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();
    });

    test('should match by ID exactly', async () => {
      await expect(
        validateSelectOrStatusValue('deals', 'stage', '1', 'equals', mockCache)
      ).resolves.toBeUndefined();
    });

    test('should match by value exactly', async () => {
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'demo',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('Active options filtering', () => {
    test('should exclude archived options from validation', async () => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                {
                  id: '1',
                  title: 'Active Stage',
                  value: 'active',
                  is_archived: false,
                },
                {
                  id: '2',
                  title: 'Archived Stage',
                  value: 'archived',
                  is_archived: true,
                },
              ],
            },
          },
        },
      });

      // Active stage should be valid
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Active Stage',
          'equals',
          mockCache
        )
      ).resolves.toBeUndefined();

      // Archived stage should be invalid
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Archived Stage',
          'equals',
          mockCache
        )
      ).rejects.toThrow(FilterValidationError);
    });
  });

  describe('Error messages', () => {
    beforeEach(() => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                {
                  id: '1',
                  title: 'Interested',
                  value: 'interested',
                  is_archived: false,
                },
                {
                  id: '2',
                  title: 'Demo Scheduling',
                  value: 'demo',
                  is_archived: false,
                },
                {
                  id: '3',
                  title: 'Demo Follow Up',
                  value: 'demo_followup',
                  is_archived: false,
                },
              ],
            },
          },
        },
      });
    });

    test('should provide clear error with valid options for single invalid value', async () => {
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'InvalidStage',
          'equals',
          mockCache
        )
      ).rejects.toThrow(
        'Invalid value "InvalidStage" for field "stage". Valid options are: [Interested, Demo Scheduling, Demo Follow Up]'
      );
    });

    test('should provide clear error for multiple invalid values', async () => {
      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          ['Invalid1', 'Invalid2'],
          'in',
          mockCache
        )
      ).rejects.toThrow(
        'Invalid value ["Invalid1", "Invalid2"] for field "stage". Valid options are: [Interested, Demo Scheduling, Demo Follow Up]'
      );
    });

    test('should cap suggestion list at 15 options', async () => {
      // Mock 20 options
      const manyOptions = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Option ${i + 1}`,
        value: `opt${i + 1}`,
        is_archived: false,
      }));

      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: manyOptions,
            },
          },
        },
      });

      await expect(
        validateSelectOrStatusValue(
          'deals',
          'stage',
          'Invalid',
          'equals',
          mockCache
        )
      ).rejects.toThrow(/\.\.\. and 5 more/);
    });
  });

  describe('Per-call caching', () => {
    test('should cache options within same call', async () => {
      vi.mocked(getAttributeTypeInfo).mockResolvedValue({
        fieldType: 'string',
        isArray: false,
        isRequired: false,
        isUnique: false,
        attioType: 'status',
        metadata: {
          id: {
            workspace_id: 'test',
            object_id: 'deals',
            attribute_id: 'stage',
          },
          api_slug: 'stage',
          title: 'Stage',
          type: 'status',
          config: {
            select: {
              options: [
                { id: '1', title: 'Demo', value: 'demo', is_archived: false },
              ],
            },
          },
        },
      });

      // First call populates cache
      await validateSelectOrStatusValue(
        'deals',
        'stage',
        'Demo',
        'equals',
        mockCache
      );

      // Second call should use cache (options in Map)
      expect(mockCache.size).toBe(1);
      expect(mockCache.has('deals:stage')).toBe(true);

      // Clear mock call count
      vi.mocked(getAttributeTypeInfo).mockClear();

      // Third call with same slug should not fetch metadata again
      await validateSelectOrStatusValue(
        'deals',
        'stage',
        'Demo',
        'equals',
        mockCache
      );

      // Should not call getAttributeTypeInfo again
      expect(getAttributeTypeInfo).not.toHaveBeenCalled();
    });
  });
});
