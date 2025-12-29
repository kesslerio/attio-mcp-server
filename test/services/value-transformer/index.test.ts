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

    it('should return true for deals with object stage value', () => {
      const result = mayNeedTransformation(
        { stage: { status: 'abc-123' } },
        UniversalResourceType.DEALS
      );
      expect(result).toBe(true);
    });

    it('should return false for deals with normalized stage array value', () => {
      const result = mayNeedTransformation(
        { stage: [{ status: 'abc-123' }] },
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

    // Issue #992: Tests for channel field (from user feedback)
    it('should return true for channel with single value (Issue #992)', () => {
      const result = mayNeedTransformation(
        { channel: 'Inperson' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(true);
    });

    // Issue #992: Test that unknown custom fields with string values trigger transformation
    it('should return true for unknown custom fields with string values (Issue #992)', () => {
      // Custom fields we don't know about should still trigger transformation
      // so that the actual metadata check can determine if they're multi-select
      const result = mayNeedTransformation(
        { custom_field: 'SomeValue' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(true);
    });

    it('should return false for definitely-not-multi-select fields', () => {
      // These fields are known to never be multi-select
      const result = mayNeedTransformation(
        { name: 'Test Company', description: 'A company' },
        UniversalResourceType.COMPANIES
      );
      expect(result).toBe(false);
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

    it('should transform status field to Attio status format', async () => {
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
      expect(result.data.stage).toEqual([{ status: 'status-uuid-1' }]);
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
      expect(result.data.stage).toEqual([{ status: 'status-uuid-1' }]);
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

    // Issue #992: Test transformation with is_multiselect flag from schema
    it('should transform custom multi-select with is_multiselect flag (Issue #992)', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          // Actual Attio format: type="select" with is_multiselect=true
          {
            api_slug: 'inbound_outbound',
            type: 'select',
            title: 'Inbound/Outbound',
            is_multiselect: true,
          },
          { api_slug: 'name', type: 'text', title: 'Name' },
        ],
      });

      const result = await transformRecordValues(
        { name: 'Test Company', inbound_outbound: 'Inbound' },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      expect(result.data.name).toBe('Test Company');
      expect(result.data.inbound_outbound).toEqual(['Inbound']);
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0].type).toBe('multi_select_wrap');
      expect(result.transformations[0].field).toBe('inbound_outbound');
    });

    it('should NOT transform single-select attributes (is_multiselect=false)', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          {
            api_slug: 'priority',
            type: 'select',
            title: 'Priority',
            is_multiselect: false,
          },
          { api_slug: 'name', type: 'text', title: 'Name' },
        ],
      });

      const result = await transformRecordValues(
        { name: 'Test Company', priority: 'High' },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      expect(result.data.name).toBe('Test Company');
      expect(result.data.priority).toBe('High'); // NOT wrapped in array
      expect(result.transformations).toHaveLength(0);
    });

    it('should NOT transform select attributes without is_multiselect flag', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          {
            api_slug: 'channel',
            type: 'select',
            title: 'Channel',
            // No is_multiselect field
          },
        ],
      });

      const result = await transformRecordValues(
        { channel: 'Direct' },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      expect(result.data.channel).toBe('Direct'); // NOT wrapped in array
      expect(result.transformations).toHaveLength(0);
    });

    // Issue #1019: Test select-transformer integration within orchestrator
    it('should transform select values within orchestrator without interfering with other transformers', async () => {
      const { handleUniversalDiscoverAttributes } = await import(
        '@/handlers/tool-configs/universal/shared-handlers.js'
      );
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );

      vi.mocked(handleUniversalDiscoverAttributes).mockResolvedValue({
        all: [
          { api_slug: 'name', type: 'text', title: 'Name' },
          {
            api_slug: 'industry',
            type: 'select',
            title: 'Industry',
            // Single-select: no is_multiselect flag
          },
          {
            api_slug: 'categories',
            type: 'select',
            title: 'Categories',
            is_multiselect: true,
          },
        ],
      });

      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'ind-1', title: 'Technology', is_archived: false },
          { id: 'ind-2', title: 'Healthcare', is_archived: false },
        ],
        attributeType: 'select',
      });

      const result = await transformRecordValues(
        {
          name: 'Test Company',
          industry: 'Technology', // Should use select-transformer
          categories: 'SaaS', // Should use multi-select-transformer
        },
        {
          resourceType: UniversalResourceType.COMPANIES,
          operation: 'create',
        }
      );

      // Name should pass through unchanged
      expect(result.data.name).toBe('Test Company');

      // Select-transformer should convert industry to array with TITLE (not UUID)
      // NOTE: Attio API accepts ["title"] format, silently rejects ["uuid"] (Issue #1045)
      expect(result.data.industry).toEqual(['Technology']);
      const industryTransform = result.transformations.find(
        (t) => t.field === 'industry'
      );
      expect(industryTransform?.type).toBe('select_title_to_array');

      // Multi-select-transformer should wrap categories in array (no UUID lookup)
      expect(result.data.categories).toEqual(['SaaS']);
      const categoriesTransform = result.transformations.find(
        (t) => t.field === 'categories'
      );
      expect(categoriesTransform?.type).toBe('multi_select_wrap');

      // Should have exactly 2 transformations (industry + categories)
      expect(result.transformations).toHaveLength(2);
    });
  });
});
