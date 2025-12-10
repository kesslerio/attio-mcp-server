/**
 * Unit tests for AttributeOptionsService
 *
 * Tests the unified attribute options service that handles select, multi-select,
 * and status attributes across different resource types.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AttributeOptionsService } from '@/services/metadata/AttributeOptionsService.js';

// Mock the attio-client functions
vi.mock('@/api/attio-client.js', () => ({
  getSelectOptions: vi.fn(),
  getStatusOptions: vi.fn(),
  getListSelectOptions: vi.fn(),
}));

import {
  getSelectOptions,
  getStatusOptions,
  getListSelectOptions,
} from '@/api/attio-client.js';

const mockGetSelectOptions = vi.mocked(getSelectOptions);
const mockGetStatusOptions = vi.mocked(getStatusOptions);
const mockGetListSelectOptions = vi.mocked(getListSelectOptions);

describe('AttributeOptionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOptions', () => {
    it('returns select options when attribute is a select type', async () => {
      const mockOptions = [
        { id: { option_id: '1' }, title: 'Trade Shows', is_archived: false },
        { id: { option_id: '2' }, title: 'Referral', is_archived: false },
      ];
      mockGetSelectOptions.mockResolvedValue(mockOptions);

      const result = await AttributeOptionsService.getOptions(
        'companies',
        'channel'
      );

      expect(result.attributeType).toBe('select');
      expect(result.options).toEqual(mockOptions);
      expect(mockGetSelectOptions).toHaveBeenCalledWith(
        'companies',
        'channel',
        undefined
      );
    });

    it('falls back to status options when select fails', async () => {
      mockGetSelectOptions.mockRejectedValue(new Error('Not a select type'));
      const mockStatuses = [
        { id: { status_id: '1' }, title: 'New Lead', is_archived: false },
        { id: { status_id: '2' }, title: 'Qualified', is_archived: false },
      ];
      mockGetStatusOptions.mockResolvedValue(mockStatuses);

      const result = await AttributeOptionsService.getOptions('deals', 'stage');

      expect(result.attributeType).toBe('status');
      expect(result.options).toEqual(mockStatuses);
      expect(mockGetSelectOptions).toHaveBeenCalled();
      expect(mockGetStatusOptions).toHaveBeenCalledWith(
        'deals',
        'stage',
        undefined
      );
    });

    it('passes showArchived parameter to API', async () => {
      const mockOptions = [
        { id: { option_id: '1' }, title: 'Active', is_archived: false },
        { id: { option_id: '2' }, title: 'Archived', is_archived: true },
      ];
      mockGetSelectOptions.mockResolvedValue(mockOptions);

      await AttributeOptionsService.getOptions('companies', 'channel', true);

      expect(mockGetSelectOptions).toHaveBeenCalledWith(
        'companies',
        'channel',
        true
      );
    });

    it('throws when both select and status endpoints fail', async () => {
      mockGetSelectOptions.mockRejectedValue(new Error('Select failed'));
      mockGetStatusOptions.mockRejectedValue(new Error('Status failed'));

      await expect(
        AttributeOptionsService.getOptions('companies', 'invalid_attr')
      ).rejects.toThrow();
    });
  });

  describe('getListOptions', () => {
    it('returns options for list attributes', async () => {
      const mockOptions = [
        { id: { option_id: '1' }, title: 'Option A', is_archived: false },
      ];
      mockGetListSelectOptions.mockResolvedValue(mockOptions);

      const result = await AttributeOptionsService.getListOptions(
        'list-123',
        'custom_status'
      );

      expect(result.attributeType).toBe('select');
      expect(result.options).toEqual(mockOptions);
      expect(mockGetListSelectOptions).toHaveBeenCalledWith(
        'list-123',
        'custom_status',
        undefined
      );
    });

    it('passes showArchived to list options API', async () => {
      mockGetListSelectOptions.mockResolvedValue([]);

      await AttributeOptionsService.getListOptions('list-123', 'status', true);

      expect(mockGetListSelectOptions).toHaveBeenCalledWith(
        'list-123',
        'status',
        true
      );
    });
  });

  describe('result formatting', () => {
    it('includes attributeType in response', async () => {
      // Mock both to ensure consistent behavior
      mockGetSelectOptions.mockResolvedValue([]);
      mockGetStatusOptions.mockResolvedValue([]);

      const result = await AttributeOptionsService.getOptions(
        'companies',
        'channel'
      );

      expect(result).toHaveProperty('attributeType');
      expect(result).toHaveProperty('options');
    });

    it('returns empty array when no options exist (select type)', async () => {
      // Select returns empty, status throws (not a status attribute)
      // Should return empty select result
      mockGetSelectOptions.mockResolvedValue([]);
      mockGetStatusOptions.mockRejectedValue(new Error('Not a status type'));

      const result = await AttributeOptionsService.getOptions(
        'companies',
        'channel'
      );

      expect(result.options).toEqual([]);
      expect(result.attributeType).toBe('select');
    });

    it('returns empty array when no options exist (status type)', async () => {
      // Select returns empty, status also returns empty
      // Should return empty status result (status endpoint succeeded)
      mockGetSelectOptions.mockResolvedValue([]);
      mockGetStatusOptions.mockResolvedValue([]);

      const result = await AttributeOptionsService.getOptions(
        'deals',
        'empty_stage'
      );

      expect(result.options).toEqual([]);
      expect(result.attributeType).toBe('status');
    });
  });
});
