export declare class AttributeMappingError extends Error {
    details: Record<string, any>;
    constructor(message: string, details?: Record<string, any>);
}
/**
 * Invalidates the configuration cache, forcing a reload on next access
 * This is useful for testing and when configuration files change
 */
export declare function invalidateConfigCache(): void;
/**
 * Looks up a human-readable attribute name and returns the corresponding slug
 *
 * @param attributeName - The user-provided attribute name
 * @param objectType - Optional object type for object-specific mappings
 * @returns The slug if found, or the original attributeName if not mapped
 */
export declare function getAttributeSlug(attributeName: string, objectType?: string): string;
/**
 * Gets the slug for an object type (e.g., "Companies" -> "companies")
 *
 * @param objectName - The human-readable object name
 * @returns The corresponding slug, or a normalized version of the original name if not found
 */
export declare function getObjectSlug(objectName: string): string;
/**
 * Gets the slug for a list name
 *
 * @param listName - The human-readable list name
 * @returns The corresponding slug, or the original name if not found
 */
export declare function getListSlug(listName: string): string;
//# sourceMappingURL=attribute-mappers.d.ts.map