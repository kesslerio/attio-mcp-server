/**
 * Type cache for company field type detection
 */

import { AttributeType } from '../attribute-validator.js';

export interface CachedTypeInfo {
  type: AttributeType;
  lastUpdated: number;
  confidence: number;
}

/**
 * In-memory cache for field type information
 */
class TypeCacheManager {
  private cache = new Map<string, CachedTypeInfo>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached type info for a field
   */
  get(fieldName: string): CachedTypeInfo | null {
    const cached = this.cache.get(fieldName);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.lastUpdated > this.CACHE_TTL) {
      this.cache.delete(fieldName);
      return null;
    }

    return cached;
  }

  /**
   * Set cached type info for a field
   */
  set(fieldName: string, typeInfo: CachedTypeInfo): void {
    this.cache.set(fieldName, {
      ...typeInfo,
      lastUpdated: Date.now()
    });
  }

  /**
   * Clear expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.lastUpdated > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get field type from cache (legacy method)
   */
  getFieldType(fieldName: string): AttributeType | null {
    return this.get(fieldName)?.type || null;
  }

  /**
   * Set field type in cache (legacy method)
   */
  setFieldType(fieldName: string, type: AttributeType, confidence: number = 1.0): void {
    this.set(fieldName, { type, confidence, lastUpdated: Date.now() });
  }

  /**
   * Get attribute type from cache (legacy method)
   */
  getAttributeType(fieldName: string): AttributeType | null {
    return this.get(fieldName)?.type || null;
  }

  /**
   * Set attribute type in cache (legacy method)
   */
  setAttributeType(fieldName: string, type: AttributeType, confidence: number = 1.0): void {
    this.set(fieldName, { type, confidence, lastUpdated: Date.now() });
  }

  /**
   * Check if cache entry is fresh (legacy method)
   */
  isFresh(fieldName: string): boolean {
    const cached = this.cache.get(fieldName);
    if (!cached) return false;
    return Date.now() - cached.lastUpdated < this.CACHE_TTL;
  }
}

// Export singleton instance
export const TypeCache = new TypeCacheManager();