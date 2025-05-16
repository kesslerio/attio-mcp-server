/**
 * LRU Cache implementation with time-based expiration
 */
class LRUCache {
    cache;
    maxSize;
    ttlMs;
    /**
     * Create a new LRU cache
     *
     * @param maxSize - Maximum number of entries to store
     * @param ttlMs - Time to live in milliseconds
     */
    constructor(maxSize, ttlMs) {
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
    getKeyString(key) {
        return JSON.stringify(key);
    }
    /**
     * Get a value from the cache
     *
     * @param key - Cache key
     * @returns Cached value or undefined if not found or expired
     */
    get(key) {
        const keyString = this.getKeyString(key);
        const entry = this.cache.get(keyString);
        // Return undefined if no entry or entry is expired
        if (!entry || Date.now() - entry.timestamp > this.ttlMs) {
            if (entry) {
                // Remove expired entry
                this.cache.delete(keyString);
            }
            return undefined;
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
    set(key, value) {
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
            hits: 1
        });
    }
    /**
     * Remove all expired entries from the cache
     */
    cleanExpired() {
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
    evictLRU() {
        let lruKey = null;
        let lowestHits = Infinity;
        let oldestTimestamp = Infinity;
        // Find the entry with lowest hit count, or oldest if tied
        for (const [key, entry] of this.cache.entries()) {
            if (entry.hits < lowestHits ||
                (entry.hits === lowestHits && entry.timestamp < oldestTimestamp)) {
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
    clear() {
        this.cache.clear();
    }
    /**
     * Get the current size of the cache
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Get statistics about the cache
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlMs: this.ttlMs
        };
    }
}
/**
 * Cache for relationship filters with a 5-minute TTL
 */
const relationshipFilterCache = new LRUCache(100, // Store up to 100 filter configurations
5 * 60 * 1000 // 5 minutes TTL
);
/**
 * Cache for list membership filters with a longer 15-minute TTL
 * since list membership changes less frequently
 */
const listMembershipCache = new LRUCache(50, // Store up to 50 list filters
15 * 60 * 1000 // 15 minutes TTL
);
/**
 * Gets a cached relationship filter if available
 *
 * @param key - Filter cache key
 * @returns Cached filter or undefined if not found
 */
export function getCachedRelationshipFilter(key) {
    return relationshipFilterCache.get(key);
}
/**
 * Caches a relationship filter result
 *
 * @param key - Filter cache key
 * @param filter - Filter to cache
 */
export function cacheRelationshipFilter(key, filter) {
    relationshipFilterCache.set(key, filter);
}
/**
 * Gets a cached list membership filter if available
 *
 * @param listId - ID of the list
 * @param resourceType - Type of records (people or companies)
 * @returns Cached filter or undefined if not found
 */
export function getCachedListFilter(listId, resourceType) {
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
export function cacheListFilter(listId, resourceType, filter) {
    const key = `${listId}:${resourceType}`;
    listMembershipCache.set(key, filter);
}
/**
 * Creates a hash of filter configuration to use as part of the cache key
 *
 * @param filters - Filter configuration to hash
 * @returns String representation of the filter for caching
 */
export function hashFilters(filters) {
    // This is a simple hash function, but it's sufficient for caching purposes
    return JSON.stringify(filters);
}
/**
 * Get statistics for the relationship filter cache
 *
 * @returns Cache statistics
 */
export function getRelationshipCacheStats() {
    return relationshipFilterCache.getStats();
}
/**
 * Get statistics for the list membership cache
 *
 * @returns Cache statistics
 */
export function getListCacheStats() {
    return listMembershipCache.getStats();
}
/**
 * Clear all caches
 */
export function clearAllCaches() {
    relationshipFilterCache.clear();
    listMembershipCache.clear();
}
//# sourceMappingURL=cache.js.map