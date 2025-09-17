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
  handleSpecialCases,
} from './mapping-utils.js';
import { createScopedLogger } from '../logger.js';

const logger = createScopedLogger(
  'utils.attribute-mappers',
  'attribute-mappers'
);

/**
 * Converts a value to a boolean based on common string representations
 *
 * @param value - The value to convert to boolean
 * @returns Boolean representation of the value
 */
export function convertToBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(lowerValue)) return true;
    if (['false', 'no', 'n', '0'].includes(lowerValue)) return false;
  }
  if (typeof value === 'number') return !isNaN(value) && value !== 0;

  // If we can't determine, return the original value as boolean
  return Boolean(value);
}

// Error class for attribute mapping errors
export class AttributeMappingError extends Error {
  constructor(
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AttributeMappingError';
  }
}

// Cache the config to avoid repeatedly loading from disk
let cachedConfig: MappingConfig | null = null;

// Cache for case-insensitive lookups
const caseInsensitiveCaches: Record<
  string,
  Map<string, { original: string; value: string }>
> = {};

// Cache for normalized lookups (spaces removed, case insensitive)
const normalizedCaches: Record<
  string,
  Map<string, { original: string; value: string }>
> = {};

/**
 * Initialize lookup caches for faster mapping
 *
 * @param config The configuration to create caches for
 */
function initializeLookupCaches(config: MappingConfig): void {
  // Create case-insensitive lookup maps
  caseInsensitiveCaches.common = createCaseInsensitiveMap(
    config.mappings.attributes.common
  );
  caseInsensitiveCaches.custom = createCaseInsensitiveMap(
    config.mappings.attributes.custom
  );
  caseInsensitiveCaches.objects = createCaseInsensitiveMap(
    config.mappings.objects
  );
  caseInsensitiveCaches.lists = createCaseInsensitiveMap(config.mappings.lists);
  caseInsensitiveCaches.legacy = createCaseInsensitiveMap(LEGACY_ATTRIBUTE_MAP);

  // Create normalized lookup maps for fuzzy matching
  normalizedCaches.legacy = createNormalizedMap(LEGACY_ATTRIBUTE_MAP);

  // Create maps for object-specific attributes
  for (const [objectType, mappings] of Object.entries(
    config.mappings.attributes.objects
  )) {
    caseInsensitiveCaches[`objects.${objectType}`] =
      createCaseInsensitiveMap(mappings);
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
    } catch (error: unknown) {
      logger.warn('Failed to load mapping configuration', {
        error: String(error),
      });

      // Create a simple config using the legacy map for backward compatibility
      cachedConfig = {
        version: '1.0',
        mappings: {
          attributes: {
            common: { ...LEGACY_ATTRIBUTE_MAP },
            objects: {},
            custom: {},
          },
          objects: {},
          lists: {},
          relationships: {},
        },
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
  Object.keys(caseInsensitiveCaches).forEach((key) => {
    delete caseInsensitiveCaches[key];
  });

  Object.keys(normalizedCaches).forEach((key) => {
    delete normalizedCaches[key];
  });
}

/**
 * Attempts snake case conversion and lookup for attribute mapping.
 * This function safely converts snake_case attributes to Display Case format
 * and looks them up in the mapping caches without causing infinite recursion.
 *
 * @param attributeName - The snake_case attribute name to convert and lookup
 * @returns The mapped slug if found, or undefined if no mapping exists
 *
 * @example
 * ```typescript
 * // For input "custom_field", converts to "Custom Field" and looks up mapping
 * const result = trySnakeCaseConversion("custom_field"); // Returns mapped value if found
 * ```
 */
function trySnakeCaseConversion(attributeName: string): string | undefined {
  // Guard conditions to prevent infinite recursion
  // Skip if name already contains spaces or has no underscores to convert
  if (attributeName.includes(' ') || !attributeName.includes('_')) {
    return undefined;
  }

  try {
    // Convert snake_case to Display Case (e.g., "custom_field" -> "Custom Field")
    const potentialDisplayName = attributeName
      .replace(/_/g, ' ')
      .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest);

    // Additional safety check: if conversion results in same string, avoid lookup
    if (potentialDisplayName === attributeName) {
      return undefined;
    }

    // Use direct cache lookups to avoid recursive getAttributeSlug calls
    // This prevents infinite recursion while maintaining mapping functionality

    // Try special cases first (highest priority)
    let result = handleSpecialCases(potentialDisplayName);
    if (result) return result;

    // Try cache lookups in order of priority
    if (caseInsensitiveCaches.common) {
      result = lookupCaseInsensitive(
        caseInsensitiveCaches.common,
        potentialDisplayName
      );
      if (result) return result;
    }

    if (caseInsensitiveCaches.custom) {
      result = lookupCaseInsensitive(
        caseInsensitiveCaches.custom,
        potentialDisplayName
      );
      if (result) return result;
    }

    if (caseInsensitiveCaches.legacy) {
      result = lookupCaseInsensitive(
        caseInsensitiveCaches.legacy,
        potentialDisplayName
      );
      if (result) return result;
    }

    return undefined;
  } catch (err) {
    // Graceful error handling: log warning but don't throw
    logger.warn('Error in snake case conversion', {
      attributeName,
      error: String(err),
    });
    return undefined;
  }
}

/**
 * Looks up a human-readable attribute name and returns the corresponding slug
 *
 * @param attributeName - The user-provided attribute name
 * @param objectType - Optional object type for object-specific mappings
 * @returns The slug if found, or the original attributeName if not mapped
 */
export function getAttributeSlug(
  attributeName: string,
  objectType?: string
): string {
  if (!attributeName) return attributeName;

  try {
    // First check for special cases that commonly need to be handled
    const specialCaseResult = handleSpecialCases(attributeName);
    if (specialCaseResult) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Special case match', {
          attributeName,
          specialCaseResult,
        });
      }
      return specialCaseResult;
    }

    // Make sure config is loaded (in case we haven't initialized caches yet)
    const config = getConfig();

    // Ensure at least the basic lookup caches exist (this can happen if called before initialization)
    if (
      !caseInsensitiveCaches.common ||
      !caseInsensitiveCaches.custom ||
      !caseInsensitiveCaches.legacy
    ) {
      // Initialize lookup caches if missing
      initializeLookupCaches(config);
    }

    // Create aggressive normalized caches if they don't exist
    if (!normalizedCaches.aggressiveLegacy) {
      normalizedCaches.aggressiveLegacy =
        createAggressiveNormalizedMap(LEGACY_ATTRIBUTE_MAP);
    }

    let result: string | undefined;

    // TIER 1: Check object-specific mappings if objectType is provided (exact matches)
    if (objectType) {
      const cacheKey = `objects.${objectType}`;
      // Make sure this object-specific cache exists
      if (
        !caseInsensitiveCaches[cacheKey] &&
        config.mappings.attributes.objects[objectType]
      ) {
        caseInsensitiveCaches[cacheKey] = createCaseInsensitiveMap(
          config.mappings.attributes.objects[objectType]
        );
      }

      const objectSpecificCache = caseInsensitiveCaches[cacheKey];
      if (objectSpecificCache) {
        result = lookupCaseInsensitive(objectSpecificCache, attributeName);
        if (result) {
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Object-specific case-insensitive match', {
              objectType,
              attributeName,
              result,
            });
          }
          return result;
        }
      }
    }

    // TIER 2: Check custom and common mappings with case-insensitive lookup
    result = lookupCaseInsensitive(caseInsensitiveCaches.custom, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Custom case-insensitive match', {
          attributeName,
          result,
        });
      }
      return result;
    }

    result = lookupCaseInsensitive(caseInsensitiveCaches.common, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Common case-insensitive match', {
          attributeName,
          result,
        });
      }
      return result;
    }

    // TIER 3: Legacy mapping with case-insensitive lookup
    result = lookupCaseInsensitive(caseInsensitiveCaches.legacy, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Legacy case-insensitive match', {
          attributeName,
          result,
        });
      }
      return result;
    }

    // TIER 4: Try normalized lookup (removes spaces, case-insensitive)
    // Create normalized caches for object-specific mappings if they don't exist
    if (objectType) {
      const normalizedCacheKey = `normalized.objects.${objectType}`;
      if (
        !normalizedCaches[normalizedCacheKey] &&
        config.mappings.attributes.objects[objectType]
      ) {
        normalizedCaches[normalizedCacheKey] = createNormalizedMap(
          config.mappings.attributes.objects[objectType]
        );
      }

      const normalizedObjectSpecificCache =
        normalizedCaches[normalizedCacheKey];
      if (normalizedObjectSpecificCache) {
        result = lookupNormalized(normalizedObjectSpecificCache, attributeName);
        if (result) {
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `[attribute-mappers] Object-specific normalized match for ${objectType}: "${attributeName}" -> "${result}"`
            );
          }
          return result;
        }
      }
    }

    // Check common and custom normalized caches
    if (!normalizedCaches.common) {
      normalizedCaches.common = createNormalizedMap(
        config.mappings.attributes.common
      );
    }

    if (!normalizedCaches.custom) {
      normalizedCaches.custom = createNormalizedMap(
        config.mappings.attributes.custom
      );
    }

    result = lookupNormalized(normalizedCaches.custom, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[attribute-mappers] Custom normalized match: "${attributeName}" -> "${result}"`
        );
      }
      return result;
    }

    result = lookupNormalized(normalizedCaches.common, attributeName);
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[attribute-mappers] Common normalized match: "${attributeName}" -> "${result}"`
        );
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
        logger.debug('Legacy normalized match', { attributeName, result });
      }
      return result;
    }

    // TIER 5: Aggressive normalization (removes all non-alphanumeric characters)
    result = lookupAggressiveNormalized(
      normalizedCaches.aggressiveLegacy,
      attributeName
    );
    if (result) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Aggressive normalized match', { attributeName, result });
      }
      return result;
    }

    // TIER 6: Snake case conversion fallback (last resort)
    result = trySnakeCaseConversion(attributeName);
    if (result && result !== attributeName) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Snake case conversion match', { attributeName, result });
      }
      return result;
    }
  } catch (error: unknown) {
    // If there's an error with the config, log detailed error and suggestions
    const errorMsg =
      error instanceof AttributeMappingError
        ? `${error.message} - ${JSON.stringify(error.details)}`
        : `Error using config for attribute mapping: ${error}`;

    logger.error(errorMsg);
    logger.warn(
      'Falling back to legacy behavior. Check your configuration files for errors.'
    );

    // Try special cases as a last resort, even if there was an error earlier
    const specialCaseResult = handleSpecialCases(attributeName);
    if (specialCaseResult) {
      logger.info('Special case match after error', {
        attributeName,
        specialCaseResult,
      });
      return specialCaseResult;
    }
  }

  // Log that no match was found for easier debugging
  // Keep test output simple without importing logger in this tight utility path

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
    const result = lookupCaseInsensitive(
      caseInsensitiveCaches.objects,
      objectName
    );
    if (result) return result;
  } catch (error: unknown) {
    // If there's an error with the config, fall back to simple normalization
    logger.error('Error using config for object mapping', {
      error: String(error),
    });
    logger.warn(
      'Check your configuration files for errors in the objects section.'
    );
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
  } catch (error: unknown) {
    // If there's an error with the config, fall back to simple normalization
    logger.error('Error using config for list mapping', {
      error: String(error),
    });
    logger.warn(
      'Check your configuration files for errors in the lists section.'
    );
  }

  // If no match is found, return the original
  return listName;
}
