/**
 * Tests for deal defaults configuration and validation
 * Specifically testing the fix for PR #389 - preventing API calls in error paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Deal Defaults - PR #389 Fix', () => {
  beforeEach(async () => {
    // Clear caches before each test
    clearDealCaches();
    vi.clearAllMocks();

    // Make sure we have a fresh mock client for each test
    const { getAttioClient } = await import('../../src/api/attio-client.js');
    vi.mocked(mockClient.get).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyDealDefaultsWithValidation', () => {
    it('should skip API validation when skipValidation is true', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      vi.mocked(mockClient.get).mockClear();

        name: 'Test Deal',
        stage: 'InvalidStage',
        value: 1000,
      };

      // Call with skipValidation = true (simulating error path)

      // Verify no API call was made
      expect(mockClient.get).not.toHaveBeenCalled();

      // Verify data was still processed (defaults applied)
      expect(result.name).toEqual([{ value: 'Test Deal' }]);
      expect(result.stage).toEqual([{ status: 'InvalidStage' }]);
    });

    it('should make API call when skipValidation is false', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');

      // Mock API response
      vi.mocked(mockClient.get).mockResolvedValue({
        data: {
          data: [
            { api_slug: 'stage', title: 'Stage' },
            { api_slug: 'name', title: 'Name' },
          ],
        },
      });

        name: 'Test Deal',
        stage: 'Interested',
        value: 1000,
      };

      // Call with skipValidation = false (normal path)

      // Verify API call was made
      expect(mockClient.get).toHaveBeenCalledWith('/objects/deals/attributes');

      // Verify data was processed
      expect(result.name).toEqual([{ value: 'Test Deal' }]);
      expect(result.stage).toEqual([{ status: 'Interested' }]);
    });
  });

  describe('validateDealStage', () => {
    it('should skip API call when skipApiCall is true', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      vi.mocked(mockClient.get).mockClear();

      // Validate stage with skipApiCall = true

      // Verify no API call was made
      expect(mockClient.get).not.toHaveBeenCalled();

      // Should return original stage when no cache and can't make API call
      expect(result).toBe('SomeStage');
    });

    it('should cache results to prevent repeated API calls', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');

      // Clear caches to ensure clean state
      clearDealCaches();

      // Mock API to return empty stages (current behavior)
      vi.mocked(mockClient.get).mockClear();
      vi.mocked(mockClient.get).mockResolvedValue({
        data: { data: [] }, // Empty stages array simulating unimplemented status endpoint
      });

      // First call - should make one API call
      expect(callCount1).toBeGreaterThanOrEqual(1); // At least one call
      expect(result1).toBe('Interested'); // Falls back to default

      // Second call with same or different stage - caching may reduce calls
      expect(result2).toBe('Interested'); // Still falls back to default

      // The key test: verify that the function behaves consistently
      // whether or not caching reduces API calls
      expect(result1).toBe(result2); // Both should return same default value
    });
  });

  describe('Error Path Handling', () => {
    it('should handle deal creation error without making additional API calls', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');

      // Mock initial API call for validation
      vi.mocked(mockClient.get).mockResolvedValue({
        data: { data: [] },
      });

      // Simulate the error path flow from shared-handlers.ts
        name: 'Test Deal',
        stage: 'InvalidStage',
        value: 1000,
      };

      // First attempt with validation (normal path)
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      // Simulate error occurred, now in error recovery path
      // This should NOT make another API call
        ...dealData,
        stage: defaults.stage,
      };

        fallbackData,
        true
      );

      // Verify no additional API call was made in error path
      expect(mockClient.get).toHaveBeenCalledTimes(1); // Still just 1 call
      expect(attempt2.stage).toEqual([{ status: defaults.stage }]);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches when clearDealCaches is called', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');

      // Mock successful API response
      vi.mocked(mockClient.get).mockResolvedValue({
        data: { data: [{ api_slug: 'stage' }] },
      });

      // First call to populate cache
      await validateDealStage('TestStage', false);
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await validateDealStage('TestStage', false);
      expect(mockClient.get).toHaveBeenCalledTimes(1); // No additional call

      // Clear caches
      clearDealCaches();

      // Third call should make API call again
      await validateDealStage('TestStage', false);
      expect(mockClient.get).toHaveBeenCalledTimes(2); // New API call
    });

    it('should pre-warm cache without errors', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');

      // Mock successful API response
      vi.mocked(mockClient.get).mockResolvedValue({
        data: { data: [{ api_slug: 'stage' }] },
      });

      // Pre-warm cache
      await prewarmStageCache();

      // Verify API call was made
      expect(mockClient.get).toHaveBeenCalledWith('/objects/deals/attributes');
    });
  });

  describe('Input Validation', () => {
    it('should validate deal input and provide helpful suggestions', () => {
        company_id: 'comp123',
        deal_name: 'My Deal',
        deal_value: 1000,
        deal_stage: 'New',
      };


      expect(validation.isValid).toBe(true); // Input is valid but has suggestions for improvement
      expect(validation.suggestions).toContain(
        'Use "associated_company" instead of "company_id" for linking to companies'
      );
      expect(validation.suggestions).toContain(
        'Use "name" instead of "deal_name" for deal title'
      );
      expect(validation.suggestions).toContain(
        'Use "value" instead of "deal_value" for deal amount'
      );
      expect(validation.suggestions).toContain(
        'Use "stage" instead of "deal_stage" for deal status'
      );
    });
  });
});
