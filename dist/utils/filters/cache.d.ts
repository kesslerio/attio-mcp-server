/**
 * Caching layer for filters, especially relationship-based filters
 * Provides an in-memory LRU cache for expensive filter operations
 */
import { ListEntryFilters } from "../../api/operations/index.js";
import { ResourceType, RelationshipType } from "../../types/attio.js";
/**
 * Key structure for relationship filter cache
 */
interface RelationshipFilterCacheKey {
    relationshipType: RelationshipType;
    sourceType: ResourceType;
    targetType: ResourceType;
    targetFilterHash: string;
    listId?: string;
    isNested?: boolean;
}
/**
 * Gets a cached relationship filter if available
 *
 * @param key - Filter cache key
 * @returns Cached filter or undefined if not found
 */
export declare function getCachedRelationshipFilter(key: RelationshipFilterCacheKey): ListEntryFilters | undefined;
/**
 * Caches a relationship filter result
 *
 * @param key - Filter cache key
 * @param filter - Filter to cache
 */
export declare function cacheRelationshipFilter(key: RelationshipFilterCacheKey, filter: ListEntryFilters): void;
/**
 * Gets a cached list membership filter if available
 *
 * @param listId - ID of the list
 * @param resourceType - Type of records (people or companies)
 * @returns Cached filter or undefined if not found
 */
export declare function getCachedListFilter(listId: string, resourceType: ResourceType): ListEntryFilters | undefined;
/**
 * Caches a list membership filter result
 *
 * @param listId - ID of the list
 * @param resourceType - Type of records (people or companies)
 * @param filter - Filter to cache
 */
export declare function cacheListFilter(listId: string, resourceType: ResourceType, filter: ListEntryFilters): void;
/**
 * Creates a hash of filter configuration to use as part of the cache key
 *
 * @param filters - Filter configuration to hash
 * @returns String representation of the filter for caching
 */
export declare function hashFilters(filters: ListEntryFilters): string;
/**
 * Get statistics for the relationship filter cache
 *
 * @returns Cache statistics
 */
export declare function getRelationshipCacheStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
};
/**
 * Get statistics for the list membership cache
 *
 * @returns Cache statistics
 */
export declare function getListCacheStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
};
/**
 * Clear all caches
 */
export declare function clearAllCaches(): void;
export {};
//# sourceMappingURL=cache.d.ts.map