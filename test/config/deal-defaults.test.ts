/**
 * Tests for deal defaults configuration and validation
 * Specifically testing the fix for PR #389 - preventing API calls in error paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyDealDefaults,
  applyDealDefaultsWithValidation,
  validateDealStage,
  validateDealInput,
  getDealDefaults,
  clearDealCaches,
  prewarmStageCache
} from '../../src/config/deal-defaults.js';

// Mock the attio-client module
vi.mock('../../src/api/attio-client.js', () => ({
  getAttioClient: vi.fn(() => ({
    get: vi.fn()
  }))
}));

describe('Deal Defaults - PR #389 Fix', () => {
  beforeEach(() => {
    // Clear caches before each test
    clearDealCaches();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyDealDefaultsWithValidation', () => {
    it('should skip API validation when skipValidation is true', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const mockClient = getAttioClient();
      
      const dealData = {
        name: 'Test Deal',
        stage: 'InvalidStage',
        value: 1000
      };

      // Call with skipValidation = true (simulating error path)
      const result = await applyDealDefaultsWithValidation(dealData, true);

      // Verify no API call was made
      expect(mockClient.get).not.toHaveBeenCalled();
      
      // Verify data was still processed (defaults applied)
      expect(result.name).toEqual([{ value: 'Test Deal' }]);
      expect(result.stage).toEqual([{ status: 'InvalidStage' }]);
    });

    it('should make API call when skipValidation is false', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const mockClient = getAttioClient();
      
      // Mock API response
      mockClient.get = vi.fn().mockResolvedValue({
        data: {
          data: [
            { api_slug: 'stage', title: 'Stage' },
            { api_slug: 'name', title: 'Name' }
          ]
        }
      });

      const dealData = {
        name: 'Test Deal',
        stage: 'Interested',
        value: 1000
      };

      // Call with skipValidation = false (normal path)
      const result = await applyDealDefaultsWithValidation(dealData, false);

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
      const mockClient = getAttioClient();
      
      // Validate stage with skipApiCall = true
      const result = await validateDealStage('SomeStage', true);

      // Verify no API call was made
      expect(mockClient.get).not.toHaveBeenCalled();
      
      // Should return original stage when no cache and can't make API call
      expect(result).toBe('SomeStage');
    });

    it('should cache errors to prevent cascading failures', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const mockClient = getAttioClient();
      
      // Mock API to fail
      mockClient.get = vi.fn().mockRejectedValue(new Error('API Error'));

      // First call - should attempt API and fail
      const result1 = await validateDealStage('TestStage', false);
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result1).toBe('TestStage'); // Returns original on error

      // Second call immediately after - should use error cache
      const result2 = await validateDealStage('AnotherStage', false);
      expect(mockClient.get).toHaveBeenCalledTimes(1); // No additional call
      expect(result2).toBe('AnotherStage');
    });
  });

  describe('Error Path Handling', () => {
    it('should handle deal creation error without making additional API calls', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const mockClient = getAttioClient();
      
      // Mock initial API call for validation
      mockClient.get = vi.fn().mockResolvedValue({
        data: { data: [] }
      });

      // Simulate the error path flow from shared-handlers.ts
      const dealData = {
        name: 'Test Deal',
        stage: 'InvalidStage',
        value: 1000
      };

      // First attempt with validation (normal path)
      const attempt1 = await applyDealDefaultsWithValidation(dealData, false);
      expect(mockClient.get).toHaveBeenCalledTimes(1);

      // Simulate error occurred, now in error recovery path
      // This should NOT make another API call
      const defaults = getDealDefaults();
      const fallbackData = {
        ...dealData,
        stage: defaults.stage
      };
      
      const attempt2 = await applyDealDefaultsWithValidation(fallbackData, true);
      
      // Verify no additional API call was made in error path
      expect(mockClient.get).toHaveBeenCalledTimes(1); // Still just 1 call
      expect(attempt2.stage).toEqual([{ status: defaults.stage }]);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches when clearDealCaches is called', async () => {
      const { getAttioClient } = await import('../../src/api/attio-client.js');
      const mockClient = getAttioClient();
      
      // Mock successful API response
      mockClient.get = vi.fn().mockResolvedValue({
        data: { data: [{ api_slug: 'stage' }] }
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
      const mockClient = getAttioClient();
      
      // Mock successful API response
      mockClient.get = vi.fn().mockResolvedValue({
        data: { data: [{ api_slug: 'stage' }] }
      });

      // Pre-warm cache
      await prewarmStageCache();
      
      // Verify API call was made
      expect(mockClient.get).toHaveBeenCalledWith('/objects/deals/attributes');
    });
  });

  describe('Input Validation', () => {
    it('should validate deal input and provide helpful suggestions', () => {
      const input = {
        company_id: 'comp123',
        deal_name: 'My Deal',
        deal_value: 1000,
        deal_stage: 'New'
      };

      const validation = validateDealInput(input);
      
      expect(validation.isValid).toBe(false);
      expect(validation.suggestions).toContain('Use "associated_company" instead of "company_id" for linking to companies');
      expect(validation.suggestions).toContain('Use "name" instead of "deal_name" for deal title');
      expect(validation.suggestions).toContain('Use "value" instead of "deal_value" for deal amount');
      expect(validation.suggestions).toContain('Use "stage" instead of "deal_stage" for deal status');
    });
  });
});