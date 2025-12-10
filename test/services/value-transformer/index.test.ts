/**
 * Unit tests for value-transformer index (orchestrator)
 *
 * Tests the main transformRecordValues function and mayNeedTransformation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transformRecordValues,
  mayNeedTransformation,
  clearAllCaches,
} from '@/services/value-transformer/index';
import { UniversalResourceType } from '@/handlers/tool-configs/universal/types';

// Mock the shared handlers for attribute discovery
vi.mock('@/handlers/tool-configs/universal/shared-handlers.js', () => ({
  handleUniversalDiscoverAttributes: vi.fn(),
}));

// Mock the AttributeOptionsService
vi.mock('@/services/metadata/index.js', () => ({
  AttributeOptionsService: {
    getOptions: vi.fn(),
  },
}));

describe('value-transformer orchestrator', () => {
  beforeEach(() => {
    clearAllCaches();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('mayNeedTransformation', () => {
    it('should return true for deals with string stage value', () => {
      const result = mayNeedTransformation(
        { stage: 'Demo Scheduling' },
        UniversalResourceType.DEALS
      );
      expect(result).toBe(true);
    });

    it('should return false for deals with object stage value', () => {
      const result = mayNeedTransformation(
        { stage: { status_id: 'abc-123' } },
        UniversalResourceType.DEALS
      );
      expect(result).toBe(false);
    });

    it('should return true for tasks with string status value', () => {
      const result = mayNeedTransformation(
        { status: 'completed' },
        UniversalResourceType.TASKS
      );
      expect(result).toBe(true);
    });

    it('should return true for potential multi-select fields with non-array values', () => {
      const result = mayNeedTransformation(
        { categories: 'Technology' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(true);
    });

    it('should return false for multi-select fields with array values', () => {
      const result = mayNeedTransformation(
        { categories: ['Technology'] },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(false);
    });

    it('should return false for simple text fields', () => {
      const result = mayNeedTransformation(
        { name: 'Test Company' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(false);
    });

    it('should return true for lead_type with single value', () => {
      const result = mayNeedTransformation(
        { lead_type: 'Inbound' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(true);
    });
  });

  describe('transformRecordValues', () => {
    it('should pass through fields with no metadata', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [], // No attributes discovered
      });

      const result = await transformRecordValues(
        { name: 'Test Company', unknownField: 'value' },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      expect(result.data).toEqual({
        name: 'Test Company',
        unknownField: 'value',
      });
      expect(result.transformations).toHaveLength(0);
    });

    it('should transform status field to status_id format', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          { api_slug: 'stage', type: 'status', title: 'Deal stage' },
          { api_slug: 'name', type: 'text', title: 'Name' },
        ],
      });

      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
          { id: 'status-uuid-2', title: 'Won', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformRecordValues(
        { name: 'Test Deal', stage: 'Demo Scheduling' },
        {
          resourceType: UniversalResourceType.DEALS,
          operation: 'create',
        }
      );

      expect(result.data.name).toBe('Test Deal');
      expect(result.data.stage).toEqual({ status_id: 'status-uuid-1' });
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0].type).toBe('status_title_to_id');
    });

    it('should transform multi-select field to array format', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          { api_slug: 'categories', type: 'multi_select', title: 'Categories' },
          { api_slug: 'name', type: 'text', title: 'Name' },
        ],
      });

      const result = await transformRecordValues(
        { name: 'Test Company', categories: 'Technology' },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      expect(result.data.name).toBe('Test Company');
      expect(result.data.categories).toEqual(['Technology']);
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0].type).toBe('multi_select_wrap');
    });

    it('should apply multiple transformations in one call', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          { api_slug: 'stage', type: 'status', title: 'Deal stage' },
          { api_slug: 'categories', type: 'multi_select', title: 'Categories' },
          { api_slug: 'name', type: 'text', title: 'Name' },
        ],
      });

      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Demo Scheduling', is_archived: false },
        ],
        attributeType: 'status',
      });

      const result = await transformRecordValues(
        {
          name: 'Test Deal',
          stage: 'Demo Scheduling',
          categories: 'Technology',
        },
        {
          resourceType: UniversalResourceType.DEALS,
          operation: 'create',
        }
      );

      expect(result.data.name).toBe('Test Deal');
      expect(result.data.stage).toEqual({ status_id: 'status-uuid-1' });
      expect(result.data.categories).toEqual(['Technology']);
      expect(result.transformations).toHaveLength(2);
    });

    it('should throw error for invalid status value', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [{ api_slug: 'stage', type: 'status', title: 'Deal stage' }],
      });

      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'status-uuid-1', title: 'Won', is_archived: false },
          { id: 'status-uuid-2', title: 'Lost', is_archived: false },
        ],
        attributeType: 'status',
      });

      await expect(
        transformRecordValues(
          { stage: 'Invalid Stage Name' },
          {
            resourceType: UniversalResourceType.DEALS,
            operation: 'create',
          }
        )
      ).rejects.toThrow(/Invalid status value.*Invalid Stage Name/);
    });

    it('should include valid options in error message for invalid status', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [{ api_slug: 'stage', type: 'status', title: 'Deal stage' }],
      });

      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'uuid-1', title: 'MQL', is_archived: false },
          { id: 'uuid-2', title: 'Demo', is_archived: false },
        ],
        attributeType: 'status',
      });

      try {
        await transformRecordValues(
          { stage: 'Bad' },
          {
            resourceType: UniversalResourceType.DEALS,
            operation: 'create',
          }
        );
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as Error;
        expect(error.message).toContain('MQL');
        expect(error.message).toContain('Demo');
      }
    });
  });
});
