/**
 * Core attribute mapping functions for translating human-readable attribute names to API slugs
 */
import { loadMappingConfig, MappingConfig } from '../config-loader.js';
import { LEGACY_ATTRIBUTE_MAP } from './legacy-maps.js';
import { 
  createCaseInsensitiveMap, 
  lookupCaseInsensitive, 
  lookupNormalized, 
  createNormalizedMap,
  createAggressiveNormalizedMap,
  lookupAggressiveNormalized,
  handleSpecialCases
} from './mapping-utils.js';

/**
 * Converts a value to a boolean based on common string representations
 * 
 * @param value - The value to convert to boolean
 * @returns Boolean representation of the value
 */
export function convertToBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(lowerValue)) return true;
    if (['false', 'no', 'n', '0'].includes(lowerValue)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  
  // If we can't determine, return the original value as boolean
  return Boolean(value);
}

// Error class for attribute mapping errors
export class AttributeMappingError extends Error {
  constructor(message: string, public details: Record<string, any> = {}) {
    super(message);
    this.name = 'AttributeMappingError';
  }
}

// Cache the config to avoid repeatedly loading from disk
let cachedConfig: MappingConfig | null = null;

// Cache for case-insensitive lookups
const caseInsensitiveCaches: Record<string, Map<string, { original: string; value: string }>> = {};

// Cache for normalized lookups (spaces removed, case insensitive)
const normalizedCaches: Record<string, Map<string, { original: string; value: string }>> = {};

/**
 * Initialize lookup caches for faster mapping
 * 
 * @param config The configuration to create caches for
 */
function initializeLookupCaches(config: MappingConfig): void {
  // Create case-insensitive lookup maps
  caseInsensitiveCaches.common = createCaseInsensitiveMap(config.mappings.attributes.common);
  caseInsensitiveCaches.custom = createCaseInsensitiveMap(config.mappings.attributes.custom);
  caseInsensitiveCaches.objects = createCaseInsensitiveMap(config.mappings.objects);
  caseInsensitiveCaches.lists = createCaseInsensitiveMap(config.mappings.lists);
  caseInsensitiveCaches.legacy = createCaseInsensitiveMap(LEGACY_ATTRIBUTE_MAP);
  
  // Create normalized lookup maps for fuzzy matching
  normalizedCaches.legacy = createNormalizedMap(LEGACY_ATTRIBUTE_MAP);
  
  // Create maps for object-specific attributes
  for (const [objectType, mappings] of Object.entries(config.mappings.attributes.objects)) {
    caseInsensitiveCaches[`objects.${objectType}`] = createCaseInsensitiveMap(mappings);
  }
}

/**
 * Gets the mapping configuration, loading it from disk if necessary
 */
function getConfig(): MappingConfig {
  // Always reload the config in test environment to get fresh mocks
  if (!cachedConfig || process.env.NODE_ENV === 'test') {
    try {
      cachedConfig = loadMappingConfig();
      // Initialize lookup caches for faster access
      initializeLookupCaches(cachedConfig);
    } catch (error) {
      console.error('Failed to load mapping configuration:', error);
      
      // Create a simple config using the legacy map for backward compatibility
      cachedConfig = {
        version: '1.0',
        mappings: {
          attributes: {
            common: { ...LEGACY_ATTRIBUTE_MAP },
            objects: {},
            custom: {}
          },
          objects: {},
          lists: {},
          relationships: {}
        }
      };
      
      // Initialize with fallback configuration
      initializeLookupCaches(cachedConfig);
    }
  }
  return cachedConfig;
}

/**
 * Invalidates the configuration cache, forcing a reload on next access
 * This is useful for testing and when configuration files change
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  
  // Reset all lookup caches
  Object.keys(caseInsensitiveCaches).forEach(key => {
    delete caseInsensitiveCaches[key];
  });
  
  Object.keys(normalizedCaches).forEach(key => {
    delete normalizedCaches[key];
  });
}

/**
 * Looks up a human-readable attribute name and returns the corresponding slug
 * 
 * @param attributeName - The user-provided attribute name
 * @param objectType - Optional object type for object-specific mappings
 * @returns The slug if found, or the original attributeName if not mapped
 */
export function getAttributeSlug(attributeName: string, objectType?: string): string {
  if (!attributeName) return attributeName;
  
  try {
    // First check for special cases that commonly need to be handled
    const specialCaseResult = handleSpecialCases(attributeName);
    if (specialCaseResult) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Special case match: "${attributeName}" -> "${specialCaseResult}"`);
      }
      return specialCaseResult;
    }
    
    // Make sure config is loaded (in case we haven't initialized caches yet)
    const config = getConfig();
    
    // Ensure at least the basic lookup caches exist (this can happen if called before initialization)
    if (!caseInsensitiveCaches.common || !caseInsensitiveCaches.custom || !caseInsensitiveCaches.legacy) {
      // Initialize lookup caches if missing
      initializeLookupCaches(config);
    }
    
    // Create aggressive normalized caches if they don't exist
    if (!normalizedCaches.aggressiveLegacy) {
      normalizedCaches.aggressiveLegacy = createAggressiveNormalizedMap(LEGACY_ATTRIBUTE_MAP);
    }
    
    let result: string | undefined;
    
    // TIER 1: Check object-specific mappings if objectType is provided (exact matches)
    if (objectType) {
      const cacheKey = `objects.${objectType}`;
      // Make sure this object-specific cache exists
      if (!caseInsensitiveCaches[cacheKey] && config.mappings.attributes.objects[objectType]) {
        caseInsensitiveCaches[cacheKey] = createCaseInsensitiveMap(config.mappings.attributes.objects[objectType]);
      }
      
      const objectSpecificCache = caseInsensitiveCaches[cacheKey];
      if (objectSpecificCache) {
        result = lookupCaseInsensitive(objectSpecificCache, attributeName);
        if (result) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[attribute-mappers] Object-specific case-insensitive match for ${objectType}: "${attributeName}" -> "${result}"`);
          }
          return result;
        }
      }
    }
    
    // TIER 2: Check custom and common mappings with case-insensitive lookup
    result = lookupCaseInsensitive(caseInsensitiveCaches.custom, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Custom case-insensitive match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    result = lookupCaseInsensitive(caseInsensitiveCaches.common, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Common case-insensitive match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    // TIER 3: Legacy mapping with case-insensitive lookup
    result = lookupCaseInsensitive(caseInsensitiveCaches.legacy, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Legacy case-insensitive match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    // TIER 4: Try normalized lookup (removes spaces, case-insensitive)
    // Create normalized caches for object-specific mappings if they don't exist
    if (objectType) {
      const normalizedCacheKey = `normalized.objects.${objectType}`;
      if (!normalizedCaches[normalizedCacheKey] && config.mappings.attributes.objects[objectType]) {
        normalizedCaches[normalizedCacheKey] = createNormalizedMap(config.mappings.attributes.objects[objectType]);
      }
      
      const normalizedObjectSpecificCache = normalizedCaches[normalizedCacheKey];
      if (normalizedObjectSpecificCache) {
        result = lookupNormalized(normalizedObjectSpecificCache, attributeName);
        if (result) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[attribute-mappers] Object-specific normalized match for ${objectType}: "${attributeName}" -> "${result}"`);
          }
          return result;
        }
      }
    }
    
    // Check common and custom normalized caches
    if (!normalizedCaches.common) {
      normalizedCaches.common = createNormalizedMap(config.mappings.attributes.common);
    }
    
    if (!normalizedCaches.custom) {
      normalizedCaches.custom = createNormalizedMap(config.mappings.attributes.custom);
    }
    
    result = lookupNormalized(normalizedCaches.custom, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Custom normalized match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    result = lookupNormalized(normalizedCaches.common, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Common normalized match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    // Check legacy normalized
    if (!normalizedCaches.legacy) {
      normalizedCaches.legacy = createNormalizedMap(LEGACY_ATTRIBUTE_MAP);
    }
    
    result = lookupNormalized(normalizedCaches.legacy, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Legacy normalized match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    // TIER 5: Aggressive normalization (removes all non-alphanumeric characters)
    result = lookupAggressiveNormalized(normalizedCaches.aggressiveLegacy, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[attribute-mappers] Aggressive normalized match: "${attributeName}" -> "${result}"`);
      }
      return result;
    }
    
    // If we got here, we need to check if it's a snake case conversion of a known attribute
    // This handles cases where the input is already in snake case format (e.g., "b2b_segment")
    
    // IMPORTANT: Skip snake case conversion if the attributeName already contains spaces
    // or if it's identical to its snake case conversion (to prevent infinite recursion)
    if (!attributeName.includes(' ') && attributeName !== attributeName.replace(/_/g, '')) {
      const potentialDisplayName = attributeName
        .replace(/_/g, ' ')
        .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest);
      
      // Skip recursive call if potentialDisplayName is the same as attributeName or 
      // if we already processed this name (prevents circular reference)
      if (potentialDisplayName !== attributeName) {
        try {
          // Set a recursion guard to prevent stack overflow
          const isRecursiveCall = true;
          
          // We use special lookup methods directly instead of recursive getAttributeSlug call
          // to avoid potential infinite recursion
          
          // First try special cases
          result = handleSpecialCases(potentialDisplayName);
          
          // If no special case, check other mapping sources
          if (!result) {
            if (caseInsensitiveCaches.common) {
              result = lookupCaseInsensitive(caseInsensitiveCaches.common, potentialDisplayName);
            }
            
            if (!result && caseInsensitiveCaches.custom) {
              result = lookupCaseInsensitive(caseInsensitiveCaches.custom, potentialDisplayName);
            }
            
            if (!result && caseInsensitiveCaches.legacy) {
              result = lookupCaseInsensitive(caseInsensitiveCaches.legacy, potentialDisplayName);
            }
          }
          
          if (result) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[attribute-mappers] Snake case conversion match: "${attributeName}" -> "${potentialDisplayName}" -> "${result}"`);
            }
            return result;
          }
        } catch (err) {
          // Silently continue if we encounter an error in snake case processing
          console.warn(`[attribute-mappers] Error in snake case processing: ${err}`);
        }
      }
    }
    
  } catch (error) {
    // If there's an error with the config, log detailed error and suggestions
    const errorMsg = error instanceof AttributeMappingError
      ? `${error.message} - ${JSON.stringify(error.details)}`
      : `Error using config for attribute mapping: ${error}`;
    
    console.error(errorMsg);
    console.warn('Falling back to legacy behavior. Check your configuration files for errors.');
    
    // Try special cases as a last resort, even if there was an error earlier
    const specialCaseResult = handleSpecialCases(attributeName);
    if (specialCaseResult) {
      console.log(`[attribute-mappers] Special case match after error: "${attributeName}" -> "${specialCaseResult}"`);
      return specialCaseResult;
    }
  }
  
  // Log that no match was found for easier debugging
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[attribute-mappers] No mapping found for attribute: "${attributeName}"`);
  }
  
  // If no match found, return the original
  return attributeName;
}

/**
 * Gets the slug for an object type (e.g., "Companies" -> "companies")
 * 
 * @param objectName - The human-readable object name
 * @returns The corresponding slug, or a normalized version of the original name if not found
 */
export function getObjectSlug(objectName: string): string {
  if (!objectName) return objectName;
  
  try {
    // Make sure config is loaded (in case we haven't initialized caches yet)
    const config = getConfig();
    
    // Ensure the lookup caches exist (this can happen if called before initialization)
    if (!caseInsensitiveCaches.objects) {
      // Initialize lookup caches if missing
      initializeLookupCaches(config);
    }
    
    // Use case-insensitive lookup
    const result = lookupCaseInsensitive(caseInsensitiveCaches.objects, objectName);
    if (result) return result;
    
  } catch (error) {
    // If there's an error with the config, fall back to simple normalization
    console.error('Error using config for object mapping:', error);
    console.warn('Check your configuration files for errors in the objects section.');
  }
  
  // If no match is found, convert to lowercase and remove spaces as a fallback
  return objectName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Gets the slug for a list name
 * 
 * @param listName - The human-readable list name
 * @returns The corresponding slug, or the original name if not found
 */
export function getListSlug(listName: string): string {
  if (!listName) return listName;
  
  try {
    // Make sure config is loaded (in case we haven't initialized caches yet)
    const config = getConfig();
    
    // Ensure the lookup caches exist (this can happen if called before initialization)
    if (!caseInsensitiveCaches.lists) {
      // Initialize lookup caches if missing
      initializeLookupCaches(config);
    }
    
    // Use case-insensitive lookup
    const result = lookupCaseInsensitive(caseInsensitiveCaches.lists, listName);
    if (result) return result;
    
  } catch (error) {
    // If there's an error with the config, fall back to simple normalization
    console.error('Error using config for list mapping:', error);
    console.warn('Check your configuration files for errors in the lists section.');
  }
  
  // If no match is found, return the original
  return listName;
}