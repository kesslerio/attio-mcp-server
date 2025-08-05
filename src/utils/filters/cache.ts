/**
 * Caching layer for filters, especially relationship-based filters
 * Provides an in-memory LRU cache for expensive filter operations
 */
import type { ListEntryFilters } from '../../api/operations/index.js';
import type { RelationshipType, ResourceType } from '../../types/attio.js';

/**
 * Structure to represent a cache entry
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

/**
 * LRU Cache implementation with time-based expiration
 */
class LRUCache<K, V> {
  private cache: Map<string, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  /**
   * Create a new LRU cache
   *
   * @param maxSize - Maximum number of entries to store
   * @param ttlMs - Time to live in milliseconds
   */
  constructor(maxSize: number, ttlMs: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a string key from any object
   *
   * @param key - Key object to stringify
   * @returns String representation
   */
  private getKeyString(key: K): string {
    return JSON.stringify(key);
  }

  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: K): V | undefined {
    const keyString = this.getKeyString(key);
    const entry = this.cache.get(keyString);

    // Return undefined if no entry or entry is expired
    if (!entry || Date.now() - entry.timestamp > this.ttlMs) {
      if (entry) {
        // Remove expired entry
        this.cache.delete(keyString);
      }
      return;
    }

    // Update hit count
    entry.hits++;

    return entry.value;
  }

  /**
   * Store a value in the cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Clean up expired entries first
    this.cleanExpired();

    const keyString = this.getKeyString(key);

    // If we're at capacity and the key doesn't already exist,
    // remove the least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(keyString)) {
      this.evictLRU();
    }

    // Add or update the cache
    this.cache.set(keyString, {
      value,
      timestamp: Date.now(),
      hits: 1,
    });
  }

  /**
   * Remove all expired entries from the cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove the least recently used entry from the cache
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lowestHits = Number.POSITIVE_INFINITY;
    let oldestTimestamp = Number.POSITIVE_INFINITY;

    // Find the entry with lowest hit count, or oldest if tied
    for (const [key, entry] of this.cache.entries()) {
      if (
        entry.hits < lowestHits ||
        (entry.hits === lowestHits && entry.timestamp < oldestTimestamp)
      ) {
        lruKey = key;
        lowestHits = entry.hits;
        oldestTimestamp = entry.timestamp;
      }
    }

    // Remove the LRU entry
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get statistics about the cache
   */
  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

/**
 * Key structure for relationship filter cache
 */
interface RelationshipFilterCacheKey {
  relationshipType: RelationshipType;
  sourceType: ResourceType;
  targetType: ResourceType;
  targetFilterHash: string; // JSON stringified and hashed target filters
  listId?: string; // For list-based relationships
  isNested?: boolean; // Whether this is a nested relationship
}

/**
 * Cache for relationship filters with a 5-minute TTL
 */
const relationshipFilterCache = new LRUCache<
  RelationshipFilterCacheKey,
  ListEntryFilters
>(
  100, // Store up to 100 filter configurations
  5 * 60 * 1000 // 5 minutes TTL
);

/**
 * Cache for list membership filters with a longer 15-minute TTL
 * since list membership changes less frequently
 */
const listMembershipCache = new LRUCache<string, ListEntryFilters>(
  50, // Store up to 50 list filters
  15 * 60 * 1000 // 15 minutes TTL
);

/**
 * Gets a cached relationship filter if available
 *
 * @param key - Filter cache key
 * @returns Cached filter or undefined if not found
 */
export function getCachedRelationshipFilter(
  key: RelationshipFilterCacheKey
): ListEntryFilters | undefined {
  return relationshipFilterCache.get(key);
}

/**
 * Caches a relationship filter result
 *
 * @param key - Filter cache key
 * @param filter - Filter to cache
 */
export function cacheRelationshipFilter(
  key: RelationshipFilterCacheKey,
  filter: ListEntryFilters
): void {
  relationshipFilterCache.set(key, filter);
}

/**
 * Gets a cached list membership filter if available
 *
 * @param listId - ID of the list
 * @param resourceType - Type of records (people or companies)
 * @returns Cached filter or undefined if not found
 */
export function getCachedListFilter(
  listId: string,
  resourceType: ResourceType
): ListEntryFilters | undefined {
  const key = `${listId}:${resourceType}`;
  return listMembershipCache.get(key);
}

/**
 * Caches a list membership filter result
 *
 * @param listId - ID of the list
 * @param resourceType - Type of records (people or companies)
 * @param filter - Filter to cache
 */
export function cacheListFilter(
  listId: string,
  resourceType: ResourceType,
  filter: ListEntryFilters
): void {
  const key = `${listId}:${resourceType}`;
  listMembershipCache.set(key, filter);
}

/**
 * Creates a hash of filter configuration to use as part of the cache key
 *
 * @param filters - Filter configuration to hash
 * @returns String representation of the filter for caching
 */
export function hashFilters(filters: ListEntryFilters): string {
  // This is a simple hash function, but it's sufficient for caching purposes
  return JSON.stringify(filters);
}

/**
 * Get statistics for the relationship filter cache
 *
 * @returns Cache statistics
 */
export function getRelationshipCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return relationshipFilterCache.getStats();
}

/**
 * Get statistics for the list membership cache
 *
 * @returns Cache statistics
 */
export function getListCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return listMembershipCache.getStats();
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  relationshipFilterCache.clear();
  listMembershipCache.clear();
}
