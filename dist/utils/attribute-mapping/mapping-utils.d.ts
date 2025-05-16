/**
 * Utility functions for attribute mapping
 * This file contains helper functions used by the attribute mapping system
 */
/**
 * Creates a case-insensitive lookup map for faster lookups
 *
 * @param mappings - Original mapping object with string keys
 * @returns A Map with lowercase keys for case-insensitive lookups
 */
export declare function createCaseInsensitiveMap<T>(mappings: Record<string, T>): Map<string, {
    original: string;
    value: T;
}>;
/**
 * Lookup a value in a case-insensitive map
 *
 * @param map - The case-insensitive map to search in
 * @param key - The key to look up (will be converted to lowercase)
 * @returns The value if found, or undefined if not found
 */
export declare function lookupCaseInsensitive<T>(map: Map<string, {
    original: string;
    value: T;
}>, key: string): T | undefined;
/**
 * Normalizes a string by removing spaces and converting to lowercase
 *
 * @param input - The string to normalize
 * @returns The normalized string
 */
export declare function normalizeString(input: string): string;
/**
 * More aggressive normalization that removes all non-alphanumeric characters
 *
 * @param input - The string to normalize
 * @returns The normalized string
 */
export declare function aggressiveNormalizeString(input: string): string;
/**
 * Creates a normalized lookup map for fuzzy matching
 *
 * @param mappings - Original mapping object with string keys
 * @returns A Map with normalized keys (lowercase, no spaces) for fuzzy lookups
 */
export declare function createNormalizedMap<T>(mappings: Record<string, T>): Map<string, {
    original: string;
    value: T;
}>;
/**
 * Creates a more aggressively normalized lookup map for fuzzy matching
 * Removes all non-alphanumeric characters
 *
 * @param mappings - Original mapping object with string keys
 * @returns A Map with aggressively normalized keys for fuzzy lookups
 */
export declare function createAggressiveNormalizedMap<T>(mappings: Record<string, T>): Map<string, {
    original: string;
    value: T;
}>;
/**
 * Lookup a value in a normalized map (removes spaces, case-insensitive)
 *
 * @param map - The normalized map to search in
 * @param key - The key to look up (will be normalized)
 * @returns The value if found, or undefined if not found
 */
export declare function lookupNormalized<T>(map: Map<string, {
    original: string;
    value: T;
}>, key: string): T | undefined;
/**
 * Lookup a value in an aggressively normalized map
 *
 * @param map - The aggressively normalized map to search in
 * @param key - The key to look up (will be aggressively normalized)
 * @returns The value if found, or undefined if not found
 */
export declare function lookupAggressiveNormalized<T>(map: Map<string, {
    original: string;
    value: T;
}>, key: string): T | undefined;
/**
 * Special case handling for common problematic attribute names
 *
 * @param key - The attribute name to check
 * @returns The mapped value if it's a special case, or undefined
 */
export declare function handleSpecialCases(key: string): string | undefined;
//# sourceMappingURL=mapping-utils.d.ts.map