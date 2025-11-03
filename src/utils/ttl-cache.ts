/**
 * Simple TTL (Time-To-Live) Cache Implementation
 *
 * Provides automatic expiration of cached entries after a specified duration.
 * Used for workspace-level caching of attribute metadata to reduce API calls
 * while preventing stale data issues.
 */

export interface TTLCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private cache: Map<K, TTLCacheEntry<V>>;
  private readonly ttlMs: number;
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Creates a new TTL cache
   *
   * @param ttlMs - Time-to-live in milliseconds (default: 15 minutes)
   * @param cleanupIntervalMs - How often to check for expired entries (default: 5 minutes)
   */
  constructor(
    ttlMs: number = 15 * 60 * 1000,
    cleanupIntervalMs: number = 5 * 60 * 1000
  ) {
    this.cache = new Map();
    this.ttlMs = ttlMs;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    // Ensure cleanup interval doesn't keep process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Gets a value from the cache
   *
   * @param key - The cache key
   * @returns The cached value, or undefined if not found or expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Sets a value in the cache with TTL
   *
   * @param key - The cache key
   * @param value - The value to cache
   */
  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Checks if a key exists and is not expired
   *
   * @param key - The cache key
   * @returns True if the key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Removes a specific key from the cache
   *
   * @param key - The cache key to remove
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the number of entries in the cache (including expired ones)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Removes expired entries from the cache
   * Called automatically by cleanup interval
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stops the cleanup interval
   * Should be called when the cache is no longer needed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}
