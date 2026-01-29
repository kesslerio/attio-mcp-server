/**
 * Unit tests for status-transformer.ts
 *
 * Tests the transformation of status titles to Attio status object format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transformStatusValue,
  clearStatusCache,
} from '@/services/value-transformer/status-transformer';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types';
import type {
  TransformContext,
  AttributeMetadata,
} from '@/services/value-transformer/types';

// Mock the AttributeOptionsService
vi.mock('@/services/metadata/index.js', () => ({
  AttributeOptionsService: {
    getOptions: vi.fn(),
  },
}));

describe('status-transformer', () => {
  const mockContext: TransformContext = {
    resourceType: UniversalResourceType.DEALS,
    operation: 'create',
  };

  const statusAttributeMeta: AttributeMetadata = {
    slug: 'stage',
    type: 'status',
    title: 'Deal stage',
  };

  const nonStatusAttributeMeta: AttributeMetadata = {
    slug: 'name',
    type: 'text',
    title: 'Name',
  };

  beforeEach(() => {
    clearStatusCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformStatusValue', () => {
    it('should skip transformation for non-status attributes', async () => {
      const result = await transformStatusValue(
        'Demo Scheduling',
        'name',
        mockContext,
        nonStatusAttributeMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Demo Scheduling');
    });

    it('should skip transformation for values already in Attio status array format', async () => {
      const statusFormat = [{ status: '7fc992e0-d89b-40bd-b158-8ab25ea86904' }];
      const result = await transformStatusValue(
        statusFormat,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toEqual(statusFormat);
    });

    it('should normalize object status_id to Attio status array format', async () => {
      const statusFormat = { status_id: 'abc-123' };
      const result = await transformStatusValue(
        statusFormat,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'abc-123' }]);
    });

    it('should transform object status title via lookup', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        { status: 'Demo Scheduling' },
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-1' }]);
    });

    it('should transform object title via lookup', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Completed', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        { title: 'Demo Completed' },
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-1' }]);
    });

    it('should normalize array status_id to Attio status array format without lookup', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'status-uuid-1', title: 'Demo', is_archived: false }],
        attributeType: 'status',
      });

      const statusFormat = [{ status_id: 'abc-123' }];
      const result = await transformStatusValue(
        statusFormat,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'abc-123' }]);
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should skip transformation for non-string values', async () => {
      const result = await transformStatusValue(
        123,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(123);
    });

    it('should convert UUID strings directly to status without lookup', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'status-uuid-1', title: 'MQL', is_archived: false }],
        attributeType: 'status',
      });

      const uuid = '7fc992e0-d89b-40bd-b158-8ab25ea86904';

      const result = await transformStatusValue(
        uuid,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: uuid }]);
      expect(result.description).toContain('UUID string');
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should transform status title to status format', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'MQL', is_archived: false },
          { id: 'status-uuid-2', title: 'Demo Scheduling', is_archived: false },
          { id: 'status-uuid-3', title: 'Won', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        'Demo Scheduling',
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-2' }]);
      expect(result.description).toContain('Demo Scheduling');
    });

    it('should transform array-of-string status titles via lookup', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'MQL', is_archived: false },
          { id: 'status-uuid-2', title: 'Demo Scheduling', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        ['Demo Scheduling'],
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-2' }]);
    });

    it('should match status titles case-insensitively', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        'demo scheduling',
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-1' }]);
    });

    it('should match unambiguous partial status titles', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
          { id: 'status-uuid-2', title: 'Proposal Sent', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformStatusValue(
        'Scheduling',
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([{ status: 'status-uuid-1' }]);
    });

    it('should throw on ambiguous partial status titles', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
          { id: 'status-uuid-2', title: 'Demo Completed', is_archived: false },
          { id: 'status-uuid-3', title: 'Qualification', is_archived: false },
        ],
        attributeType: 'status',
      });

      await expect(
        transformStatusValue('Demo', 'stage', mockContext, statusAttributeMeta)
      ).rejects.toThrow(/Ambiguous status value/);
    });

    it('should throw error for invalid status value with valid options', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'MQL', is_archived: false },
          { id: 'status-uuid-2', title: 'Demo Scheduling', is_archived: false },
          { id: 'status-uuid-3', title: 'Won', is_archived: false },
        ],
        attributeType: 'status',
      });

      await expect(
        transformStatusValue(
          'Invalid Status',
          'stage',
          mockContext,
          statusAttributeMeta
        )
      ).rejects.toThrow(/Invalid status value.*Invalid Status/);
    });

    it('should include valid options in error message', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'MQL', is_archived: false },
          { id: 'status-uuid-2', title: 'Won', is_archived: false },
          { id: 'status-uuid-3', title: 'Lost', is_archived: true }, // archived - should not appear in error
        ],
        attributeType: 'status',
      });

      try {
        await transformStatusValue(
          'Bad Status',
          'stage',
          mockContext,
          statusAttributeMeta
        );
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as Error;
        expect(error.message).toContain('MQL');
        expect(error.message).toContain('Won');
        expect(error.message).not.toContain('Lost'); // archived option excluded
      }
    });

    it('should cache status options to avoid repeated API calls', async () => {
      const { AttributeOptionsService } =
        await import('@/services/metadata/index.js');
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'status-uuid-1', title: 'Demo', is_archived: false }],
        attributeType: 'status',
      });

      // First call
      await transformStatusValue(
        'Demo',
        'stage',
        mockContext,
        statusAttributeMeta
      );

      // Second call - should use cache
      await transformStatusValue(
        'Demo',
        'stage',
        mockContext,
        statusAttributeMeta
      );

      // Only one API call should have been made
      expect(mockGetOptions).toHaveBeenCalledTimes(1);
    });
  });
});
