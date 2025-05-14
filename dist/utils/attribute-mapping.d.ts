export declare const COMMON_ATTRIBUTE_MAP: Record<string, string>;
/**
 * Looks up a human-readable attribute name and returns the corresponding slug
 *
 * @param attributeName - The user-provided attribute name
 * @param objectType - Optional object type for object-specific mappings
 * @returns The slug if found, or the original attributeName if not mapped
 */
export declare function getAttributeSlug(attributeName: string, objectType?: string): string;
/**
 * Processes a filter structure to translate any human-readable attribute names to their slug equivalents
 *
 * @param filters - The filters object possibly containing human-readable attribute names
 * @param objectType - Optional object type for more specific attribute mapping
 * @returns A new filters object with attribute names translated to slugs where applicable
 */
export declare function translateAttributeNamesInFilters(filters: any, objectType?: string): any;
/**
 * Gets the slug for an object type (e.g., "Companies" -> "companies")
 *
 * @param objectName - The human-readable object name
 * @returns The corresponding slug, or the original name if not found
 */
export declare function getObjectSlug(objectName: string): string;
/**
 * Gets the slug for a list name
 *
 * @param listName - The human-readable list name
 * @returns The corresponding slug, or the original name if not found
 */
export declare function getListSlug(listName: string): string;
//# sourceMappingURL=attribute-mapping.d.ts.map