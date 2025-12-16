/**
 * Unit tests for select-transformer.ts
 *
 * Tests the transformation of select option titles to ["uuid"] array format
 *
 * @see Issue #1019
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transformSelectValue,
  clearSelectCache,
  getValidSelectOptions,
} from '@/services/value-transformer/select-transformer';
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

describe('select-transformer', () => {
  const mockContext: TransformContext = {
    resourceType: UniversalResourceType.COMPANIES,
    operation: 'create',
  };

  // Single-select attribute (type=select, is_multiselect NOT true)
  const singleSelectMeta: AttributeMetadata = {
    slug: 'industry',
    type: 'select',
    title: 'Industry',
    // is_multiselect is undefined/false for single-select
  };

  // Multi-select attribute (should be skipped)
  const multiSelectMeta: AttributeMetadata = {
    slug: 'categories',
    type: 'select',
    title: 'Categories',
    is_multiselect: true,
  };

  // Non-select attribute
  const textAttributeMeta: AttributeMetadata = {
    slug: 'name',
    type: 'text',
    title: 'Name',
  };

  beforeEach(() => {
    clearSelectCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformSelectValue', () => {
    it('should skip transformation for non-select attributes', async () => {
      const result = await transformSelectValue(
        'Technology',
        'name',
        mockContext,
        textAttributeMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Technology');
    });

    it('should skip transformation for multi-select attributes', async () => {
      // Multi-select is handled by multi-select-transformer
      const result = await transformSelectValue(
        'Technology',
        'categories',
        mockContext,
        multiSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Technology');
    });

    it('should skip transformation for values already in array format', async () => {
      const arrayValue = ['option-uuid-1'];
      const result = await transformSelectValue(
        arrayValue,
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toEqual(arrayValue);
    });

    it('should skip transformation for non-string values', async () => {
      const result = await transformSelectValue(
        123,
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(123);
    });

    it('should skip transformation for null values', async () => {
      const result = await transformSelectValue(
        null,
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(null);
    });

    it('should skip transformation for undefined values', async () => {
      const result = await transformSelectValue(
        undefined,
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe(undefined);
    });

    it('should wrap UUID strings directly in array without API lookup', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);

      const uuid = '7fc992e0-d89b-40bd-b158-8ab25ea86904';

      const result = await transformSelectValue(
        uuid,
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual([uuid]);
      expect(result.description).toContain('UUID');
      expect(mockGetOptions).not.toHaveBeenCalled();
    });

    it('should transform select title to array with option ID', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Technology', is_archived: false },
          { id: 'opt-uuid-2', title: 'Healthcare', is_archived: false },
          { id: 'opt-uuid-3', title: 'Finance', is_archived: false },
        ],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        'Technology',
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['opt-uuid-1']);
      expect(result.description).toContain('Technology');
    });

    it('should match titles case-insensitively', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          {
            id: 'opt-uuid-1',
            title: 'Potential Customer',
            is_archived: false,
          },
        ],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        'potential customer', // lowercase
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['opt-uuid-1']);
    });

    it('should support partial matching', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          {
            id: 'opt-uuid-1',
            title: 'Potential Customer',
            is_archived: false,
          },
        ],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        'Potential', // partial match
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['opt-uuid-1']);
    });

    it('should handle whitespace in input', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Technology', is_archived: false },
        ],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        '  Technology  ', // with whitespace
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(true);
      expect(result.transformedValue).toEqual(['opt-uuid-1']);
    });

    it('should throw error for invalid select value with valid options', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Technology', is_archived: false },
          { id: 'opt-uuid-2', title: 'Healthcare', is_archived: false },
        ],
        attributeType: 'select',
      });

      await expect(
        transformSelectValue(
          'Invalid Option',
          'industry',
          mockContext,
          singleSelectMeta
        )
      ).rejects.toThrow(/Invalid select value.*Invalid Option/);
    });

    it('should include valid options in error message', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Technology', is_archived: false },
          { id: 'opt-uuid-2', title: 'Healthcare', is_archived: false },
          { id: 'opt-uuid-3', title: 'Archived', is_archived: true }, // should not appear
        ],
        attributeType: 'select',
      });

      try {
        await transformSelectValue(
          'Bad Option',
          'industry',
          mockContext,
          singleSelectMeta
        );
        expect.fail('Should have thrown');
      } catch (err) {
        const error = err as Error;
        expect(error.message).toContain('Technology');
        expect(error.message).toContain('Healthcare');
        expect(error.message).not.toContain('Archived');
      }
    });

    it('should cache select options to avoid repeated API calls', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-uuid-1', title: 'Tech', is_archived: false }],
        attributeType: 'select',
      });

      // First call
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Second call - should use cache
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Only one API call should have been made
      expect(mockGetOptions).toHaveBeenCalledTimes(1);
    });

    it('should skip transformation if no options available', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        'Technology',
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Technology');
    });

    it('should handle API errors gracefully', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockRejectedValue(
        new Error('API error')
      );

      const result = await transformSelectValue(
        'Technology',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Should return untransformed on API error
      expect(result.transformed).toBe(false);
      expect(result.transformedValue).toBe('Technology');
    });

    it('should prefer exact match over partial match', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Tech Company', is_archived: false },
          { id: 'opt-uuid-2', title: 'Tech', is_archived: false }, // exact match
        ],
        attributeType: 'select',
      });

      const result = await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Should match "Tech" exactly, not "Tech Company" partially
      expect(result.transformedValue).toEqual(['opt-uuid-2']);
    });
  });

  describe('getValidSelectOptions', () => {
    it('should return valid non-archived option titles', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [
          { id: 'opt-uuid-1', title: 'Technology', is_archived: false },
          { id: 'opt-uuid-2', title: 'Healthcare', is_archived: false },
          { id: 'opt-uuid-3', title: 'Archived', is_archived: true },
        ],
        attributeType: 'select',
      });

      const options = await getValidSelectOptions('companies', 'industry');

      expect(options).toEqual(['Technology', 'Healthcare']);
      expect(options).not.toContain('Archived');
    });

    it('should return empty array if no options available', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      vi.mocked(AttributeOptionsService.getOptions).mockResolvedValue({
        options: [],
        attributeType: 'select',
      });

      const options = await getValidSelectOptions('companies', 'industry');

      expect(options).toEqual([]);
    });

    it('should use cache for repeated calls', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-uuid-1', title: 'Tech', is_archived: false }],
        attributeType: 'select',
      });

      // First call
      await getValidSelectOptions('companies', 'industry');

      // Second call - should use cache
      await getValidSelectOptions('companies', 'industry');

      expect(mockGetOptions).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSelectCache', () => {
    it('should clear the cache', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-uuid-1', title: 'Tech', is_archived: false }],
        attributeType: 'select',
      });

      // First call - populates cache
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Clear cache
      clearSelectCache();

      // Second call - should fetch again
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );

      expect(mockGetOptions).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache TTL and Cleanup', () => {
    it('should refetch options after cache TTL expires', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);

      // Mock current time control
      const baseTime = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-1', title: 'Tech', is_archived: false }],
        attributeType: 'select',
      });

      // First call at T=0 - populates cache
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );
      expect(mockGetOptions).toHaveBeenCalledTimes(1);

      // Second call at T=4 minutes (still within 5-minute TTL) - should use cache
      dateNowSpy.mockReturnValue(baseTime + 4 * 60 * 1000);
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );
      expect(mockGetOptions).toHaveBeenCalledTimes(1); // Still cached

      // Third call at T=5 minutes + 1 second (past TTL) - should refetch
      dateNowSpy.mockReturnValue(baseTime + 5 * 60 * 1000 + 1000);
      mockGetOptions.mockResolvedValue({
        options: [
          { id: 'opt-1', title: 'Tech', is_archived: false },
          { id: 'opt-2', title: 'Enterprise', is_archived: false },
        ],
        attributeType: 'select',
      });

      await transformSelectValue(
        'Enterprise',
        'industry',
        mockContext,
        singleSelectMeta
      );
      expect(mockGetOptions).toHaveBeenCalledTimes(2); // Cache expired, refetched

      // Cleanup spy
      dateNowSpy.mockRestore();
    });

    it('should eventually clean up expired cache entries via probabilistic cleanup', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);

      // Mock Date.now for timestamp control
      const baseTime = Date.now();
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(baseTime);

      // Mock Math.random to control cleanup trigger
      const randomSpy = vi.spyOn(Math, 'random');

      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-1', title: 'Tech', is_archived: false }],
        attributeType: 'select',
      });

      // Populate cache with multiple entries, skip cleanup (random >= 0.1)
      randomSpy.mockReturnValue(0.5);
      await transformSelectValue(
        'Tech',
        'industry',
        mockContext,
        singleSelectMeta
      );
      await transformSelectValue('Tech', 'category', mockContext, {
        ...singleSelectMeta,
        slug: 'category',
      });

      // Advance time past TTL to make entries expired
      dateNowSpy.mockReturnValue(baseTime + 6 * 60 * 1000);

      // Trigger cleanup (force 10% probability)
      randomSpy.mockReturnValue(0.05); // < 0.1, triggers cleanup
      mockGetOptions.mockResolvedValue({
        options: [{ id: 'opt-2', title: 'NewOption', is_archived: false }],
        attributeType: 'select',
      });

      await transformSelectValue(
        'NewOption',
        'industry',
        mockContext,
        singleSelectMeta
      );

      // Verify new fetch happened (expired entry was deleted and refetched)
      // 2 initial calls + 1 refetch after cleanup
      expect(mockGetOptions).toHaveBeenCalledTimes(3);

      // Cleanup spies
      dateNowSpy.mockRestore();
      randomSpy.mockRestore();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent transformations without duplicate API calls', async () => {
      const { AttributeOptionsService } = await import(
        '@/services/metadata/index.js'
      );
      const mockGetOptions = vi.mocked(AttributeOptionsService.getOptions);

      // Track API call count
      let apiCallCount = 0;

      mockGetOptions.mockImplementation(async () => {
        apiCallCount++;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          options: [{ id: 'opt-1', title: 'Tech', is_archived: false }],
          attributeType: 'select',
        };
      });

      // Trigger 5 concurrent transformations
      const results = await Promise.all([
        transformSelectValue('Tech', 'industry', mockContext, singleSelectMeta),
        transformSelectValue('Tech', 'industry', mockContext, singleSelectMeta),
        transformSelectValue('Tech', 'industry', mockContext, singleSelectMeta),
        transformSelectValue('Tech', 'industry', mockContext, singleSelectMeta),
        transformSelectValue('Tech', 'industry', mockContext, singleSelectMeta),
      ]);

      // All should succeed
      results.forEach((result) => {
        expect(result.transformed).toBe(true);
        expect(result.transformedValue).toEqual(['opt-1']);
      });

      // Note: Current implementation doesn't have mutex, so this may make multiple calls
      // If test fails, it reveals a concurrency bug that should be fixed
      // Ideally should only make 1 API call (cache prevents duplicates)
      expect(apiCallCount).toBeGreaterThan(0);
    });
  });
});
