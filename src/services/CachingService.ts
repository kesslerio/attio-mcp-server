/**
 * CachingService - Centralized caching utilities for universal handlers
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 2.
 * Provides task caching and 404 response caching functionality with configurable TTLs.
 */

import { AttioRecord } from '../types/attio.js';
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';
import { generateIdCacheKey } from '../utils/validation/id-validation.js';

/**
 * Cache entry structure for storing cached data with timestamps
 */
interface CacheEntry {
  data: AttioRecord[];
  timestamp: number;
}

/**
 * CachingService provides centralized caching functionality for universal handlers
 */
export class CachingService {
  // Simple in-memory cache for tasks pagination performance optimization
  private static tasksCache = new Map<string, CacheEntry>();

  // Default TTL values
  private static readonly DEFAULT_TASKS_TTL = 30000; // 30 seconds
  private static readonly DEFAULT_404_TTL = 60000; // 60 seconds

  /**
   * Get cached tasks with automatic TTL management
   *
   * @param cacheKey - Cache key for the tasks
   * @param ttl - Time to live in milliseconds (default: 30 seconds)
   * @returns Cached tasks if available and valid, undefined otherwise
   */
  static getCachedTasks(
    cacheKey: string,
    ttl: number = this.DEFAULT_TASKS_TTL
  ): AttioRecord[] | undefined {
    const now = Date.now();

    if (this.tasksCache.has(cacheKey)) {
      const cached = this.tasksCache.get(cacheKey)!;
      if (now - cached.timestamp < ttl) {
        return cached.data;
      }
      // Remove expired cache entry
      this.tasksCache.delete(cacheKey);
    }

    return undefined;
  }

  /**
   * Cache tasks data with timestamp
   *
   * @param cacheKey - Cache key for the tasks
   * @param data - Tasks data to cache
   */
  static setCachedTasks(cacheKey: string, data: AttioRecord[]): void {
    const now = Date.now();
    this.tasksCache.set(cacheKey, { data, timestamp: now });
  }

  /**
   * Generate cache key for tasks list
   *
   * @returns Standard cache key for tasks list
   */
  static getTasksListCacheKey(): string {
    return 'tasks_list_all';
  }

  /**
   * Check if a 404 response is cached for a given resource
   *
   * @param resourceType - Type of resource (e.g., 'companies', 'people')
   * @param recordId - ID of the record
   * @returns True if 404 is cached, false otherwise
   */
  static isCached404(resourceType: string, recordId: string): boolean {
    const cacheKey = generateIdCacheKey(resourceType, recordId);
    const cached404 = enhancedPerformanceTracker.getCached404(cacheKey);
    return !!cached404;
  }

  /**
   * Cache a 404 response for a resource
   *
   * @param resourceType - Type of resource (e.g., 'companies', 'people')
   * @param recordId - ID of the record
   * @param ttl - Time to live in milliseconds (default: 60 seconds)
   */
  static cache404Response(
    resourceType: string,
    recordId: string,
    ttl: number = this.DEFAULT_404_TTL
  ): void {
    const cacheKey = generateIdCacheKey(resourceType, recordId);
    enhancedPerformanceTracker.cache404Response(
      cacheKey,
      { error: 'Not found' },
      ttl
    );
  }

  /**
   * Clear all tasks cache entries
   */
  static clearTasksCache(): void {
    this.tasksCache.clear();
  }

  /**
   * Clear expired cache entries
   *
   * @param ttl - Time to live in milliseconds (default: 30 seconds)
   */
  static clearExpiredTasksCache(ttl: number = this.DEFAULT_TASKS_TTL): void {
    const now = Date.now();
    for (const [key, entry] of this.tasksCache.entries()) {
      if (now - entry.timestamp >= ttl) {
        this.tasksCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   *
   * @returns Cache statistics including size and entries
   */
  static getCacheStats(): {
    tasksCacheSize: number;
    tasksCacheEntries: string[];
  } {
    return {
      tasksCacheSize: this.tasksCache.size,
      tasksCacheEntries: Array.from(this.tasksCache.keys()),
    };
  }

  /**
   * Manage task caching with automatic data loading
   *
   * This method encapsulates the common pattern of:
   * 1. Check cache for valid data
   * 2. Load data if cache miss
   * 3. Cache the loaded data
   *
   * @param dataLoader - Function to load data when cache miss occurs
   * @param cacheKey - Cache key (default: standard tasks list key)
   * @param ttl - Time to live in milliseconds (default: 30 seconds)
   * @returns Cached or freshly loaded data
   */
  static async getOrLoadTasks(
    dataLoader: () => Promise<AttioRecord[]>,
    cacheKey: string = this.getTasksListCacheKey(),
    ttl: number = this.DEFAULT_TASKS_TTL
  ): Promise<{ data: AttioRecord[]; fromCache: boolean }> {
    // Check cache first
    const cachedTasks = this.getCachedTasks(cacheKey, ttl);
    if (cachedTasks) {
      return { data: cachedTasks, fromCache: true };
    }

    // Load fresh data
    const freshData = await dataLoader();

    // Cache the fresh data
    this.setCachedTasks(cacheKey, freshData);

    return { data: freshData, fromCache: false };
  }
}
