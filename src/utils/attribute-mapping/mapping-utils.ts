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
export function createCaseInsensitiveMap<T>(
  mappings: Record<string, T>
): Map<string, { original: string; value: T }> {
  const map = new Map<string, { original: string; value: T }>();

  // Pre-process all keys to lowercase for faster lookups
  for (const [key, value] of Object.entries(mappings)) {
    map.set(key.toLowerCase(), { original: key, value });
  }

  return map;
}

/**
 * Lookup a value in a case-insensitive map
 *
 * @param map - The case-insensitive map to search in
 * @param key - The key to look up (will be converted to lowercase)
 * @returns The value if found, or undefined if not found
 */
export function lookupCaseInsensitive<T>(
  map: Map<string, { original: string; value: T }>,
  key: string
): T | undefined {
  const entry = map.get(key.toLowerCase());
  return entry ? entry.value : undefined;
}

/**
 * Normalizes a string by removing spaces and converting to lowercase
 *
 * @param input - The string to normalize
 * @returns The normalized string
 */
export function normalizeString(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '');
}

/**
 * More aggressive normalization that removes all non-alphanumeric characters
 *
 * @param input - The string to normalize
 * @returns The normalized string
 */
export function aggressiveNormalizeString(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Creates a normalized lookup map for fuzzy matching
 *
 * @param mappings - Original mapping object with string keys
 * @returns A Map with normalized keys (lowercase, no spaces) for fuzzy lookups
 */
export function createNormalizedMap<T>(
  mappings: Record<string, T>
): Map<string, { original: string; value: T }> {
  const map = new Map<string, { original: string; value: T }>();

  // Pre-process all keys to normalized form for faster lookups
  for (const [key, value] of Object.entries(mappings)) {
    map.set(normalizeString(key), { original: key, value });
  }

  return map;
}

/**
 * Creates a more aggressively normalized lookup map for fuzzy matching
 * Removes all non-alphanumeric characters
 *
 * @param mappings - Original mapping object with string keys
 * @returns A Map with aggressively normalized keys for fuzzy lookups
 */
export function createAggressiveNormalizedMap<T>(
  mappings: Record<string, T>
): Map<string, { original: string; value: T }> {
  const map = new Map<string, { original: string; value: T }>();

  // Pre-process all keys to normalized form for faster lookups
  for (const [key, value] of Object.entries(mappings)) {
    map.set(aggressiveNormalizeString(key), { original: key, value });
  }

  return map;
}

/**
 * Lookup a value in a normalized map (removes spaces, case-insensitive)
 *
 * @param map - The normalized map to search in
 * @param key - The key to look up (will be normalized)
 * @returns The value if found, or undefined if not found
 */
export function lookupNormalized<T>(
  map: Map<string, { original: string; value: T }>,
  key: string
): T | undefined {
  const entry = map.get(normalizeString(key));
  return entry ? entry.value : undefined;
}

/**
 * Lookup a value in an aggressively normalized map
 *
 * @param map - The aggressively normalized map to search in
 * @param key - The key to look up (will be aggressively normalized)
 * @returns The value if found, or undefined if not found
 */
export function lookupAggressiveNormalized<T>(
  map: Map<string, { original: string; value: T }>,
  key: string
): T | undefined {
  const entry = map.get(aggressiveNormalizeString(key));
  return entry ? entry.value : undefined;
}

/**
 * Special case handling for common problematic attribute names
 *
 * @param key - The attribute name to check
 * @returns The mapped value if it's a special case, or undefined
 */
export function handleSpecialCases(key: string): string | undefined {
  // Convert to lowercase for consistency
  const lowerKey = key.toLowerCase();

  // Map of special cases with their mappings
  const specialCases: Record<string, string> = {
    // B2B segment mappings
    b2b_segment: 'type_persona',
    'b2b segment': 'type_persona',
    b2bsegment: 'type_persona',
    b2b: 'type_persona',
    segment: 'type_persona',
    'business segment': 'type_persona',
    'business type': 'type_persona',
    'company segment': 'type_persona',
    'client segment': 'type_persona',
    'customer segment': 'type_persona',
    company_segment: 'type_persona',
    client_segment: 'type_persona',
    customer_segment: 'type_persona',

    // Industry mappings
    // Note: In Attio's API, the concept of 'industry' is represented through the 'categories' field.
    // This mapping ensures compatibility between MCP tools that use 'industry' and the Attio API
    // which uses 'categories' for industry classification. (Issue #176)
    industry: 'categories',
    'industry type': 'categories',
  };

  // Check for exact matches in the special cases
  if (specialCases[lowerKey]) {
    return specialCases[lowerKey];
  }

  // Check for normalized matches
  const normalizedKey = normalizeString(lowerKey);
  for (const [specialKey, value] of Object.entries(specialCases)) {
    if (normalizeString(specialKey) === normalizedKey) {
      return value;
    }
  }

  // No special case found
  return;
}
