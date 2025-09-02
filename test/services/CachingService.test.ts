/**
 * Test suite for CachingService
 *
 * Tests all caching functionality extracted from shared-handlers.ts
 * as part of Issue #489 Phase 2.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CachingService } from '../../src/services/CachingService.js';
import type { AttioRecord } from '../../src/types/attio.js';

// Mock the dependencies
vi.mock('../../src/middleware/performance-enhanced.js', () => ({
  enhancedPerformanceTracker: {
    getCached404: vi.fn(),
    cache404Response: vi.fn(),
  },
}));

vi.mock('../../src/utils/validation/id-validation.js', () => ({
  generateIdCacheKey: vi.fn(
    (resourceType: string, recordId: string) => `${resourceType}:${recordId}`
  ),
}));

import { enhancedPerformanceTracker } from '../../src/middleware/performance-enhanced.js';

describe('CachingService', () => {
  const mockTasks: AttioRecord[] = [
    { id: { record_id: '1' }, values: { name: 'Task 1' } },
    { id: { record_id: '2' }, values: { name: 'Task 2' } },
  ];

  beforeEach(() => {
    // Clear all caches before each test
    CachingService.clearTasksCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    CachingService.clearTasksCache();
  });

  describe('Task Caching', () => {
    it('should cache and retrieve tasks with default TTL', () => {
      const cacheKey = CachingService.getTasksListCacheKey();

      // Initially no cache
      expect(CachingService.getCachedTasks(cacheKey)).toBeUndefined();

      // Cache tasks
      CachingService.setCachedTasks(cacheKey, mockTasks);

      // Should retrieve cached tasks
      const cachedTasks = CachingService.getCachedTasks(cacheKey);
      expect(cachedTasks).toEqual(mockTasks);
    });

    it('should respect custom TTL', () => {
      const cacheKey = CachingService.getTasksListCacheKey();
      const shortTTL = 100; // 100ms

      // Cache tasks
      CachingService.setCachedTasks(cacheKey, mockTasks);

      // Should be available immediately
      expect(CachingService.getCachedTasks(cacheKey, shortTTL)).toEqual(
        mockTasks
      );

      // Wait for TTL to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          // Should be expired
          expect(
            CachingService.getCachedTasks(cacheKey, shortTTL)
          ).toBeUndefined();
          resolve(undefined);
        }, shortTTL + 10);
      });
    });

    it('should generate consistent cache keys', () => {
      const key1 = CachingService.getTasksListCacheKey();
      const key2 = CachingService.getTasksListCacheKey();

      expect(key1).toBe(key2);
      expect(key1).toBe('tasks_list_all');
    });

    it('should clear all tasks cache', () => {
      const cacheKey = CachingService.getTasksListCacheKey();

      // Cache some tasks
      CachingService.setCachedTasks(cacheKey, mockTasks);
      expect(CachingService.getCachedTasks(cacheKey)).toEqual(mockTasks);

      // Clear cache
      CachingService.clearTasksCache();
      expect(CachingService.getCachedTasks(cacheKey)).toBeUndefined();
    });

    it('should clear only expired cache entries', () => {
      const shortTTL = 50;
      const longTTL = 10000;

      // Cache with different keys (simulating different cache entries)
      CachingService.setCachedTasks('key1', mockTasks);

      // Wait a bit then add another entry
      setTimeout(() => {
        CachingService.setCachedTasks('key2', mockTasks);
      }, shortTTL + 10);

      return new Promise((resolve) => {
        setTimeout(() => {
          // Clear expired entries
          CachingService.clearExpiredTasksCache(shortTTL);

          // First entry should be cleared, second should remain
          expect(
            CachingService.getCachedTasks('key1', longTTL)
          ).toBeUndefined();
          expect(CachingService.getCachedTasks('key2', longTTL)).toEqual(
            mockTasks
          );
          resolve(undefined);
        }, shortTTL * 2);
      });
    });

    it('should provide cache statistics', () => {
      // Initially empty
      let stats = CachingService.getCacheStats();
      expect(stats.tasksCacheSize).toBe(0);
      expect(stats.tasksCacheEntries).toEqual([]);

      // Add some entries
      CachingService.setCachedTasks('test1', mockTasks);
      CachingService.setCachedTasks('test2', mockTasks);

      stats = CachingService.getCacheStats();
      expect(stats.tasksCacheSize).toBe(2);
      expect(stats.tasksCacheEntries).toEqual(['test1', 'test2']);
    });
  });

  describe('404 Response Caching', () => {
    it('should check for cached 404 responses', () => {
      const resourceType = 'companies';
      const recordId = 'test-uuid';

      // Mock performance tracker response
      vi.mocked(enhancedPerformanceTracker.getCached404).mockReturnValue(null);

      // Should not be cached initially
      expect(CachingService.isCached404(resourceType, recordId)).toBe(false);

      // Mock cached response
      vi.mocked(enhancedPerformanceTracker.getCached404).mockReturnValue({
        error: 'Not found',
      });

      // Should be cached now
      expect(CachingService.isCached404(resourceType, recordId)).toBe(true);
    });

    it('should cache 404 responses with default TTL', () => {
      const resourceType = 'people';
      const recordId = 'invalid-uuid';

      // Cache 404 response
      CachingService.cache404Response(resourceType, recordId);

      // Should call performance tracker with correct parameters
      expect(enhancedPerformanceTracker.cache404Response).toHaveBeenCalledWith(
        `${resourceType}:${recordId}`,
        { error: 'Not found' },
        60000 // default TTL
      );
    });

    it('should cache 404 responses with custom TTL', () => {
      const resourceType = 'tasks';
      const recordId = 'nonexistent-task';
      const customTTL = 120000;

      // Cache 404 response with custom TTL
      CachingService.cache404Response(resourceType, recordId, customTTL);

      // Should call performance tracker with custom TTL
      expect(enhancedPerformanceTracker.cache404Response).toHaveBeenCalledWith(
        `${resourceType}:${recordId}`,
        { error: 'Not found' },
        customTTL
      );
    });
  });

  describe('getOrLoadTasks Integration', () => {
    const mockDataLoader = vi.fn();

    beforeEach(() => {
      mockDataLoader.mockClear();
    });

    it('should load data when cache is empty', async () => {
      const expectedTasks = mockTasks;
      mockDataLoader.mockResolvedValue(expectedTasks);

      const result = await CachingService.getOrLoadTasks(mockDataLoader);

      expect(result.data).toEqual(expectedTasks);
      expect(result.fromCache).toBe(false);
      expect(mockDataLoader).toHaveBeenCalledOnce();
    });

    it('should return cached data when available', async () => {
      const cacheKey = CachingService.getTasksListCacheKey();

      // Pre-populate cache
      CachingService.setCachedTasks(cacheKey, mockTasks);

      const result = await CachingService.getOrLoadTasks(mockDataLoader);

      expect(result.data).toEqual(mockTasks);
      expect(result.fromCache).toBe(true);
      expect(mockDataLoader).not.toHaveBeenCalled();
    });

    it('should handle data loader errors gracefully', async () => {
      const error = new Error('API failure');
      mockDataLoader.mockRejectedValue(error);

      await expect(
        CachingService.getOrLoadTasks(mockDataLoader)
      ).rejects.toThrow(error);
      expect(mockDataLoader).toHaveBeenCalledOnce();
    });

    it('should use custom cache key and TTL', async () => {
      const customKey = 'custom_tasks_key';
      const customTTL = 5000;
      mockDataLoader.mockResolvedValue(mockTasks);

      // First call should load data
      const result1 = await CachingService.getOrLoadTasks(
        mockDataLoader,
        customKey,
        customTTL
      );
      expect(result1.fromCache).toBe(false);

      // Second call should use cache
      const result2 = await CachingService.getOrLoadTasks(
        mockDataLoader,
        customKey,
        customTTL
      );
      expect(result2.fromCache).toBe(true);
      expect(result2.data).toEqual(mockTasks);

      // Data loader should only be called once
      expect(mockDataLoader).toHaveBeenCalledTimes(1);
    });

    it('should reload data when cache expires', async () => {
      const shortTTL = 50;
      const freshTasks = [
        { id: { record_id: '3' }, values: { name: [{ value: 'Fresh Task' }] } },
      ];

      mockDataLoader
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce(freshTasks);

      // First call loads data
      const result1 = await CachingService.getOrLoadTasks(
        mockDataLoader,
        undefined,
        shortTTL
      );
      expect(result1.fromCache).toBe(false);
      expect(result1.data).toEqual(mockTasks);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, shortTTL + 10));

      // Second call should reload data
      const result2 = await CachingService.getOrLoadTasks(
        mockDataLoader,
        undefined,
        shortTTL
      );
      expect(result2.fromCache).toBe(false);
      expect(result2.data).toEqual(freshTasks);

      expect(mockDataLoader).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in cache', () => {
      const cacheKey = CachingService.getTasksListCacheKey();
      const emptyTasks: AttioRecord[] = [];

      CachingService.setCachedTasks(cacheKey, emptyTasks);
      const result = CachingService.getCachedTasks(cacheKey);

      expect(result).toEqual(emptyTasks);
      expect(Array.isArray(result)).toBe(true);
      expect(result?.length).toBe(0);
    });

    it('should handle undefined cache keys gracefully', () => {
      // This should not throw
      expect(() => {
        CachingService.getCachedTasks('nonexistent-key');
      }).not.toThrow();

      expect(CachingService.getCachedTasks('nonexistent-key')).toBeUndefined();
    });

    it('should handle concurrent cache operations', async () => {
      const cacheKey = CachingService.getTasksListCacheKey();
      const tasks1 = [mockTasks[0]];
      const tasks2 = [mockTasks[1]];

      // Simulate concurrent cache operations
      CachingService.setCachedTasks(cacheKey, tasks1);
      CachingService.setCachedTasks(cacheKey, tasks2);

      // Last write should win
      const result = CachingService.getCachedTasks(cacheKey);
      expect(result).toEqual(tasks2);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large datasets efficiently', () => {
      const largeTasks: AttioRecord[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: { record_id: `task-${i}` },
          values: { name: `Task ${i}` },
        })
      );

      const cacheKey = CachingService.getTasksListCacheKey();

      // Should handle large datasets without issues
      const start = performance.now();
      CachingService.setCachedTasks(cacheKey, largeTasks);
      const cached = CachingService.getCachedTasks(cacheKey);
      const end = performance.now();

      expect(cached).toEqual(largeTasks);
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should maintain performance with multiple cache keys', () => {
      const numKeys = 100;
      const keys: string[] = [];

      // Create many cache entries
      for (let i = 0; i < numKeys; i++) {
        const key = `tasks_key_${i}`;
        keys.push(key);
        CachingService.setCachedTasks(key, mockTasks);
      }

      // Access should still be fast
      const start = performance.now();
      for (const key of keys) {
        CachingService.getCachedTasks(key);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Should be fast even with many keys

      // Verify stats
      const stats = CachingService.getCacheStats();
      expect(stats.tasksCacheSize).toBe(numKeys);
    });
  });
});
