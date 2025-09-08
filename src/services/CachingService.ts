/**
 * CachingService - Centralized caching utilities for universal handlers
 *
 * Extracted from shared-handlers.ts as part of Issue #489 Phase 2.
 * Provides task caching, 404 response caching, and attribute discovery caching
 * functionality with configurable TTLs and automatic cleanup.
 */

import { AttioRecord } from '../types/attio.js';
import { enhancedPerformanceTracker } from '../middleware/performance-enhanced.js';
import { generateIdCacheKey } from '../utils/validation/id-validation.js';
import { UniversalResourceType } from '../handlers/tool-configs/universal/types.js';

/**
 * Cache entry structure for storing cached data with timestamps
 */
interface CacheEntry {
  data: AttioRecord[];
  timestamp: number;
}

/**
 * Attribute cache entry structure for storing attribute discovery results
 */
interface AttributeCacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
  resourceType: UniversalResourceType;
  objectSlug?: string;
}

/**
 * 404 cache entry structure for storing failed lookup results
 */
interface NotFoundCacheEntry {
  timestamp: number;
  resourceType: string;
  recordId: string;
}

/**
 * Cache statistics for monitoring and debugging
 */
interface CacheStats {
  tasks: {
    hits: number;
    misses: number;
    entries: number;
  };
  attributes: {
    hits: number;
    misses: number;
    entries: number;
  };
  notFound: {
    hits: number;
    misses: number;
    entries: number;
  };
}

/**
 * CachingService provides centralized caching functionality for universal handlers
 */
export class CachingService {
  // Simple in-memory cache for tasks pagination performance optimization
  private static tasksCache = new Map<string, CacheEntry>();

  // Attribute discovery cache for performance optimization
  private static attributesCache = new Map<string, AttributeCacheEntry>();

  // 404 response cache to prevent repeated failed lookups
  private static notFoundCache = new Map<string, NotFoundCacheEntry>();

  // Cache statistics for monitoring
  private static stats: CacheStats = {
    tasks: { hits: 0, misses: 0, entries: 0 },
    attributes: { hits: 0, misses: 0, entries: 0 },
    notFound: { hits: 0, misses: 0, entries: 0 },
  };

  /**
   * Get cached tasks with automatic TTL management
   *
   * @param cacheKey - Cache key for the tasks
   * @param ttl - Time to live in milliseconds (default: 30 seconds)
   * @returns Cached tasks if available and valid, undefined otherwise
   */
  static getCachedTasks(
    cacheKey: string,
    ttl: number = DEFAULT_TASKS_CACHE_TTL
  ): AttioRecord[] | undefined {

    if (this.tasksCache.has(cacheKey)) {
      if (now - cached.timestamp < ttl) {
        this.stats.tasks.hits++;
        return cached.data;
      }
      // Remove expired cache entry
      this.tasksCache.delete(cacheKey);
      this.stats.tasks.entries--;
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
    this.tasksCache.set(cacheKey, { data, timestamp: now });
    this.stats.tasks.entries++;
    this.performCacheCleanup();
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
    ttl: number = DEFAULT_404_CACHE_TTL
  ): void {

    this.notFoundCache.set(cacheKey, {
      timestamp: now,
      resourceType,
      recordId,
    });
    this.stats.notFound.entries++;

    enhancedPerformanceTracker.cache404Response(
      cacheKey,
      { error: 'Not found' },
      ttl
    );
    this.performCacheCleanup();
  }

  // ========================================
  // Attribute Discovery Caching
  // ========================================

  /**
   * Generate cache key for attribute discovery
   *
   * @param resourceType - The resource type
   * @param objectSlug - Optional object slug for records
   * @returns Cache key string
   */
  private static getAttributeCacheKey(
    resourceType: UniversalResourceType,
    objectSlug?: string
  ): string {
    return objectSlug
      ? `attributes:${resourceType}:${objectSlug}`
      : `attributes:${resourceType}`;
  }

  /**
   * Get cached attribute discovery results
   *
   * @param resourceType - The resource type
   * @param objectSlug - Optional object slug for records
   * @param ttl - Time to live in milliseconds
   * @returns Cached attributes if available and valid, undefined otherwise
   */
  static getCachedAttributes(
    resourceType: UniversalResourceType,
    objectSlug?: string,
    ttl: number = DEFAULT_ATTRIBUTES_CACHE_TTL
  ): Record<string, unknown> | undefined {

    if (this.attributesCache.has(cacheKey)) {
      if (now - cached.timestamp < ttl) {
        this.stats.attributes.hits++;
        return cached.data;
      }
      // Remove expired cache entry
      this.attributesCache.delete(cacheKey);
      this.stats.attributes.entries--;
    }

    this.stats.attributes.misses++;
    return undefined;
  }

  /**
   * Cache attribute discovery results
   *
   * @param resourceType - The resource type
   * @param data - Attribute discovery results to cache
   * @param objectSlug - Optional object slug for records
   */
  static setCachedAttributes(
    resourceType: UniversalResourceType,
    data: Record<string, unknown>,
    objectSlug?: string
  ): void {

    this.attributesCache.set(cacheKey, {
      data,
      timestamp: now,
      resourceType,
      objectSlug,
    });
    this.stats.attributes.entries++;
    this.performCacheCleanup();
  }

  /**
   * Invalidate attribute cache for a specific resource type
   *
   * @param resourceType - The resource type to invalidate
   * @param objectSlug - Optional object slug to invalidate specific records cache
   */
  static invalidateAttributeCache(
    resourceType: UniversalResourceType,
    objectSlug?: string
  ): void {
    if (objectSlug) {
      if (this.attributesCache.delete(cacheKey)) {
        this.stats.attributes.entries--;
      }
    } else {
      // Invalidate all cache entries for this resource type
      const keysToDelete: string[] = [];
      for (const [key, entry] of Array.from(this.attributesCache.entries())) {
        if (entry.resourceType === resourceType) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.attributesCache.delete(key);
        this.stats.attributes.entries--;
      }
    }
  }

  /**
   * Manage attribute caching with automatic data loading
   *
   * @param dataLoader - Function to load attribute data when cache miss occurs
   * @param resourceType - The resource type
   * @param objectSlug - Optional object slug for records
   * @param ttl - Time to live in milliseconds
   * @returns Cached or freshly loaded attribute data
   */
  static async getOrLoadAttributes(
    dataLoader: () => Promise<Record<string, unknown>>,
    resourceType: UniversalResourceType,
    objectSlug?: string,
    ttl: number = DEFAULT_ATTRIBUTES_CACHE_TTL
  ): Promise<{ data: Record<string, unknown>; fromCache: boolean }> {
    // Check cache first
      resourceType,
      objectSlug,
      ttl
    );
    if (cachedAttributes) {
      return { data: cachedAttributes, fromCache: true };
    }

    // Load fresh data

    // Cache the fresh data
    this.setCachedAttributes(resourceType, freshData, objectSlug);

    return { data: freshData, fromCache: false };
  }

  // ========================================
  // Cache Management & Cleanup
  // ========================================

  /**
   * Clear all tasks cache entries
   */
  static clearTasksCache(): void {
    this.tasksCache.clear();
    this.stats.tasks.entries = 0;
  }

  /**
   * Clear all attributes cache entries
   */
  static clearAttributesCache(): void {
    this.attributesCache.clear();
    this.stats.attributes.entries = 0;
  }

  /**
   * Clear all 404 cache entries
   */
  static clearNotFoundCache(): void {
    this.notFoundCache.clear();
    this.stats.notFound.entries = 0;
  }

  /**
   * Clear all cache entries
   */
  static clearAllCache(): void {
    this.clearTasksCache();
    this.clearAttributesCache();
    this.clearNotFoundCache();

    // Reset stats
    this.stats = {
      tasks: { hits: 0, misses: 0, entries: 0 },
      attributes: { hits: 0, misses: 0, entries: 0 },
      notFound: { hits: 0, misses: 0, entries: 0 },
    };
  }

  /**
   * Clear expired cache entries for all cache types
   */
  static clearExpiredCache(): void {
    this.clearExpiredTasksCache();
    this.clearExpiredAttributesCache();
    this.clearExpiredNotFoundCache();
  }

  /**
   * Clear expired tasks cache entries
   *
   * @param ttl - Time to live in milliseconds
   */
  static clearExpiredTasksCache(ttl: number = DEFAULT_TASKS_CACHE_TTL): void {
    let deletedCount = 0;

    for (const [key, entry] of Array.from(this.tasksCache.entries())) {
      if (now - entry.timestamp >= ttl) {
        this.tasksCache.delete(key);
        deletedCount++;
      }
    }

    this.stats.tasks.entries -= deletedCount;
  }

  /**
   * Clear expired attributes cache entries
   *
   * @param ttl - Time to live in milliseconds
   */
  static clearExpiredAttributesCache(
    ttl: number = DEFAULT_ATTRIBUTES_CACHE_TTL
  ): void {
    let deletedCount = 0;

    for (const [key, entry] of Array.from(this.attributesCache.entries())) {
      if (now - entry.timestamp >= ttl) {
        this.attributesCache.delete(key);
        deletedCount++;
      }
    }

    this.stats.attributes.entries -= deletedCount;
  }

  /**
   * Clear expired 404 cache entries
   *
   * @param ttl - Time to live in milliseconds
   */
  static clearExpiredNotFoundCache(ttl: number = DEFAULT_404_CACHE_TTL): void {
    let deletedCount = 0;

    for (const [key, entry] of Array.from(this.notFoundCache.entries())) {
      if (now - entry.timestamp >= ttl) {
        this.notFoundCache.delete(key);
        deletedCount++;
      }
    }

    this.stats.notFound.entries -= deletedCount;
  }

  /**
   * Perform automatic cache cleanup when cache size exceeds limits
   */
  private static performCacheCleanup(): void {
      this.tasksCache.size +
      this.attributesCache.size +
      this.notFoundCache.size;

    if (totalEntries > MAX_CACHE_ENTRIES) {
      // Clear expired entries first
      this.clearExpiredCache();

      // If still too large, clear oldest entries
        this.tasksCache.size +
        this.attributesCache.size +
        this.notFoundCache.size;
      if (remainingEntries > MAX_CACHE_ENTRIES) {
        this.clearOldestEntries();
      }
    }
  }

  /**
   * Clear oldest cache entries to maintain cache size limits
   */
  private static clearOldestEntries(): void {
    // Collect all entries with timestamps
    const allEntries: Array<{
      key: string;
      timestamp: number;
      type: 'tasks' | 'attributes' | 'notFound';
    }> = [];

    // Collect tasks entries
    for (const [key, entry] of Array.from(this.tasksCache.entries())) {
      allEntries.push({ key, timestamp: entry.timestamp, type: 'tasks' });
    }

    // Collect attributes entries
    for (const [key, entry] of Array.from(this.attributesCache.entries())) {
      allEntries.push({ key, timestamp: entry.timestamp, type: 'attributes' });
    }

    // Collect 404 entries
    for (const [key, entry] of Array.from(this.notFoundCache.entries())) {
      allEntries.push({ key, timestamp: entry.timestamp, type: 'notFound' });
    }

    // Sort by timestamp (oldest first)
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until under limit
      allEntries.length - Math.floor(MAX_CACHE_ENTRIES * 0.8); // Keep 80% of max

    for (let i = 0; i < entriesToRemove && i < allEntries.length; i++) {

      switch (entry.type) {
        case 'tasks':
          this.tasksCache.delete(entry.key);
          this.stats.tasks.entries--;
          break;
        case 'attributes':
          this.attributesCache.delete(entry.key);
          this.stats.attributes.entries--;
          break;
        case 'notFound':
          this.notFoundCache.delete(entry.key);
          this.stats.notFound.entries--;
          break;
      }
    }
  }

  /**
   * Get comprehensive cache statistics for monitoring
   *
   * @returns Detailed cache statistics
   */
  static getCacheStats(): CacheStats & {
    totalEntries: number;
    tasksCacheSize: number;
    tasksCacheEntries: string[];
    cacheEfficiency: {
      tasks: number;
      attributes: number;
      notFound: number;
      overall: number;
    };
  } {
      this.stats.tasks.hits +
      this.stats.attributes.hits +
      this.stats.notFound.hits;
      totalHits +
      this.stats.tasks.misses +
      this.stats.attributes.misses +
      this.stats.notFound.misses;

    return {
      ...this.stats,
      totalEntries:
        this.tasksCache.size +
        this.attributesCache.size +
        this.notFoundCache.size,
      tasksCacheSize: this.tasksCache.size,
      tasksCacheEntries: Array.from(this.tasksCache.keys()),
      cacheEfficiency: {
        tasks:
          this.stats.tasks.hits + this.stats.tasks.misses > 0
            ? this.stats.tasks.hits /
              (this.stats.tasks.hits + this.stats.tasks.misses)
            : 0,
        attributes:
          this.stats.attributes.hits + this.stats.attributes.misses > 0
            ? this.stats.attributes.hits /
              (this.stats.attributes.hits + this.stats.attributes.misses)
            : 0,
        notFound:
          this.stats.notFound.hits + this.stats.notFound.misses > 0
            ? this.stats.notFound.hits /
              (this.stats.notFound.hits + this.stats.notFound.misses)
            : 0,
        overall: totalRequests > 0 ? totalHits / totalRequests : 0,
      },
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
   * @param ttl - Time to live in milliseconds
   * @returns Cached or freshly loaded data
   */
  static async getOrLoadTasks(
    dataLoader: () => Promise<AttioRecord[]>,
    cacheKey: string = this.getTasksListCacheKey(),
    ttl: number = DEFAULT_TASKS_CACHE_TTL
  ): Promise<{ data: AttioRecord[]; fromCache: boolean }> {
    // Check cache first
    if (cachedTasks) {
      return { data: cachedTasks, fromCache: true };
    }

    // Load fresh data

    // Cache the fresh data
    this.setCachedTasks(cacheKey, freshData);

    return { data: freshData, fromCache: false };
  }
}
