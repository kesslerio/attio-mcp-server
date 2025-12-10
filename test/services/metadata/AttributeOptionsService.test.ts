/**
 * Unit tests for AttributeOptionsService
 *
 * Tests the fallback logic for fetching attribute options:
 * - Select endpoint succeeds with results → return as select
 * - Select empty, status succeeds → return as status (Issue #987 fix)
 * - Select fails, status succeeds → return as status
 * - Both empty → return as status (status endpoint succeeded)
 * - Both fail → throw with detailed error
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttributeOptionsService } from '@/services/metadata/AttributeOptionsService.js';

// Mock the attio-client module
vi.mock('@/api/attio-client.js', () => ({
  getSelectOptions: vi.fn(),
  getStatusOptions: vi.fn(),
  getListSelectOptions: vi.fn(),
}));

// Mock the logger to avoid noise in tests
vi.mock('@/utils/logger.js', () => ({
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

import { getSelectOptions, getStatusOptions } from '@/api/attio-client.js';

const mockGetSelectOptions = vi.mocked(getSelectOptions);
const mockGetStatusOptions = vi.mocked(getStatusOptions);

describe('AttributeOptionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOptions', () => {
    describe('Issue #987 regression test: select empty, status has options', () => {
      it('should return status options when select returns empty array', async () => {
        // This is the core bug fix: /options returns [] but /statuses has data
        const statusOptions = [
          { id: { status_id: 'uuid-1' }, title: 'MQL', is_archived: false },
          {
            id: { status_id: 'uuid-2' },
            title: 'Demo Booked',
            is_archived: false,
          },
        ];

        mockGetSelectOptions.mockResolvedValue([]);
        mockGetStatusOptions.mockResolvedValue(statusOptions);

        const result = await AttributeOptionsService.getOptions(
          'deals',
          'stage'
        );

        expect(result.attributeType).toBe('status');
        expect(result.options).toHaveLength(2);
        expect(result.options[0].title).toBe('MQL');
        expect(mockGetSelectOptions).toHaveBeenCalledWith(
          'deals',
          'stage',
          undefined
        );
        expect(mockGetStatusOptions).toHaveBeenCalledWith(
          'deals',
          'stage',
          undefined
        );
      });
    });

    describe('select endpoint succeeds with options', () => {
      it('should return select options and NOT call status endpoint', async () => {
        const selectOptions = [
          { id: { option_id: 'opt-1' }, title: 'Option A', is_archived: false },
          { id: { option_id: 'opt-2' }, title: 'Option B', is_archived: false },
        ];

        mockGetSelectOptions.mockResolvedValue(selectOptions);

        const result = await AttributeOptionsService.getOptions(
          'companies',
          'channel'
        );

        expect(result.attributeType).toBe('select');
        expect(result.options).toHaveLength(2);
        expect(result.options[0].title).toBe('Option A');
        expect(mockGetSelectOptions).toHaveBeenCalledTimes(1);
        expect(mockGetStatusOptions).not.toHaveBeenCalled();
      });

      it('should pass showArchived parameter correctly', async () => {
        const selectOptions = [
          { id: { option_id: 'opt-1' }, title: 'Active', is_archived: false },
          { id: { option_id: 'opt-2' }, title: 'Archived', is_archived: true },
        ];

        mockGetSelectOptions.mockResolvedValue(selectOptions);

        await AttributeOptionsService.getOptions('companies', 'channel', true);

        expect(mockGetSelectOptions).toHaveBeenCalledWith(
          'companies',
          'channel',
          true
        );
      });
    });

    describe('select empty, status empty', () => {
      it('should return status type with empty options when both return empty', async () => {
        // Both endpoints succeed but return empty - status endpoint succeeded
        // so we treat it as status type
        mockGetSelectOptions.mockResolvedValue([]);
        mockGetStatusOptions.mockResolvedValue([]);

        const result = await AttributeOptionsService.getOptions(
          'deals',
          'custom_status'
        );

        expect(result.attributeType).toBe('status');
        expect(result.options).toHaveLength(0);
      });
    });

    describe('select throws, status succeeds', () => {
      it('should return status options when select endpoint throws 404', async () => {
        const statusOptions = [
          { id: { status_id: 'uuid-1' }, title: 'Stage 1', is_archived: false },
        ];

        mockGetSelectOptions.mockRejectedValue(
          new Error('Request failed with status code 404')
        );
        mockGetStatusOptions.mockResolvedValue(statusOptions);

        const result = await AttributeOptionsService.getOptions(
          'deals',
          'stage'
        );

        expect(result.attributeType).toBe('status');
        expect(result.options).toHaveLength(1);
        expect(result.options[0].title).toBe('Stage 1');
      });

      it('should return empty status when select throws and status returns empty', async () => {
        mockGetSelectOptions.mockRejectedValue(
          new Error('Request failed with status code 404')
        );
        mockGetStatusOptions.mockResolvedValue([]);

        const result = await AttributeOptionsService.getOptions(
          'deals',
          'empty_status'
        );

        expect(result.attributeType).toBe('status');
        expect(result.options).toHaveLength(0);
      });
    });

    describe('select empty, status throws', () => {
      it('should return empty select when select succeeds empty but status throws', async () => {
        // Select succeeded (with empty), status failed
        // Return empty select as legitimate unconfigured select attribute
        mockGetSelectOptions.mockResolvedValue([]);
        mockGetStatusOptions.mockRejectedValue(
          new Error('Request failed with status code 404')
        );

        const result = await AttributeOptionsService.getOptions(
          'companies',
          'unconfigured'
        );

        expect(result.attributeType).toBe('select');
        expect(result.options).toHaveLength(0);
      });
    });

    describe('both endpoints throw', () => {
      it('should throw error with both error messages when both endpoints fail', async () => {
        mockGetSelectOptions.mockRejectedValue(
          new Error('Select: 404 Not Found')
        );
        mockGetStatusOptions.mockRejectedValue(
          new Error('Status: 404 Not Found')
        );

        await expect(
          AttributeOptionsService.getOptions('invalid', 'attribute')
        ).rejects.toThrow('does not support options');

        // Verify both error messages are included
        try {
          await AttributeOptionsService.getOptions('invalid', 'attribute');
        } catch (error) {
          expect((error as Error).message).toContain('Select error:');
          expect((error as Error).message).toContain('Status error:');
          expect((error as Error).message).toContain('Select: 404 Not Found');
          expect((error as Error).message).toContain('Status: 404 Not Found');
        }
      });

      it('should include attribute and object info in error message', async () => {
        mockGetSelectOptions.mockRejectedValue(new Error('Failed'));
        mockGetStatusOptions.mockRejectedValue(new Error('Failed'));

        try {
          await AttributeOptionsService.getOptions('myobject', 'myattr');
        } catch (error) {
          expect((error as Error).message).toContain('"myattr"');
          expect((error as Error).message).toContain('"myobject"');
        }
      });
    });
  });

  describe('getListOptions', () => {
    it('should call getListSelectOptions and return select type', async () => {
      const { getListSelectOptions } = await import('@/api/attio-client.js');
      const mockGetListSelectOptions = vi.mocked(getListSelectOptions);

      const listOptions = [
        {
          id: { option_id: 'list-opt-1' },
          title: 'List Option',
          is_archived: false,
        },
      ];

      mockGetListSelectOptions.mockResolvedValue(listOptions);

      const result = await AttributeOptionsService.getListOptions(
        'list-123',
        'status'
      );

      expect(result.attributeType).toBe('select');
      expect(result.options).toHaveLength(1);
      expect(mockGetListSelectOptions).toHaveBeenCalledWith(
        'list-123',
        'status',
        undefined
      );
    });
  });
});
