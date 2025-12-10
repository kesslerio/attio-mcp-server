/**
 * Unit tests for status-transformer.ts
 *
 * Tests the transformation of status titles to {status_id: "uuid"} format
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

    it('should skip transformation for values already in status format', async () => {
      const statusFormat = { status_id: 'abc-123' };
      const result = await transformStatusValue(
        statusFormat,
        'stage',
        mockContext,
        statusAttributeMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toEqual(statusFormat);
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

    it('should transform status title to status_id format', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
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
      expect(result.transformedValue).toEqual({ status_id: 'status-uuid-2' });
      expect(result.description).toContain('Demo Scheduling');
    });

    it('should match status titles case-insensitively', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
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
      expect(result.transformedValue).toEqual({ status_id: 'status-uuid-1' });
    });

    it('should throw error for invalid status value with valid options', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
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
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
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
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
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
