/**
 * Select transformer - converts select option titles to ["uuid"] array format
 *
 * Problem: LLMs commonly pass select values as human-readable strings
 * (e.g., "Technology", "Potential Customer") but Attio API requires
 * array format with option UUIDs: ["uuid"]
 *
 * Solution: Auto-detect single-select attributes (type="select" AND
 * is_multiselect !== true) and transform string titles to UUID arrays.
 *
 * @see Issue #1019
 */

import {
  TransformContext,
  TransformResult,
  AttributeMetadata,
  AttributeOption,
} from './types.js';
import { AttributeOptionsService } from '@/services/metadata/index.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';
import { debug, error as logError, OperationType } from '@/utils/logger.js';
import { DEFAULT_ATTRIBUTES_CACHE_TTL } from '@/constants/universal.constants.js';

/**
 * Cache entry for select options
 */
interface SelectCacheEntry {
  data: AttributeOption[];
  timestamp: number;
}

/**
 * In-memory cache for select options
 * Key format: {objectSlug}:{attributeSlug}
 */
const selectOptionsCache = new Map<string, SelectCacheEntry>();

/**
 * TTL for select options cache (5 minutes)
 */
const SELECT_CACHE_TTL = DEFAULT_ATTRIBUTES_CACHE_TTL;

/**
 * Generate cache key for select options
 */
function getCacheKey(objectSlug: string, attributeSlug: string): string {
  return `${objectSlug}:${attributeSlug}`;
}

/**
 * Clear all cached select options (for testing)
 */
export function clearSelectCache(): void {
  selectOptionsCache.clear();
}

/**
 * Clean up expired cache entries
 * Called periodically (10% chance) to prevent memory growth
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of selectOptionsCache.entries()) {
    if (now - entry.timestamp >= SELECT_CACHE_TTL) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    selectOptionsCache.delete(key);
  }

  if (keysToDelete.length > 0) {
    debug(
      'select-transformer',
      `Cleaned up ${keysToDelete.length} expired cache entries`,
      { expiredKeys: keysToDelete.length },
      'cleanupExpiredEntries',
      OperationType.DATA_PROCESSING
    );
  }
}

/**
 * Fetch select options with TTL-based caching
 *
 * @param objectSlug - Object slug (e.g., "companies")
 * @param attributeSlug - Attribute slug (e.g., "industry")
 * @returns Array of select options
 */
async function getSelectOptionsWithCache(
  objectSlug: string,
  attributeSlug: string
): Promise<AttributeOption[]> {
  const cacheKey = getCacheKey(objectSlug, attributeSlug);
  const now = Date.now();

  // Check cache with TTL validation
  if (selectOptionsCache.has(cacheKey)) {
    const cached = selectOptionsCache.get(cacheKey)!;
    const age = now - cached.timestamp;

    if (age < SELECT_CACHE_TTL) {
      debug(
        'select-transformer',
        `Using cached select options for ${objectSlug}.${attributeSlug}`,
        {
          age: `${Math.round(age / 1000)}s`,
          ttl: `${SELECT_CACHE_TTL / 1000}s`,
        },
        'getSelectOptionsWithCache',
        OperationType.DATA_PROCESSING
      );
      return cached.data;
    }

    // Expired entry: delete and continue to fetch
    selectOptionsCache.delete(cacheKey);
    debug(
      'select-transformer',
      'Cache expired, fetching fresh data',
      { objectSlug, attributeSlug },
      'getSelectOptionsWithCache',
      OperationType.DATA_PROCESSING
    );
  }

  // Periodic cleanup (10% of requests)
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }

  // Fetch fresh data via AttributeOptionsService
  try {
    const result = await AttributeOptionsService.getOptions(
      objectSlug,
      attributeSlug,
      true // include archived for complete matching
    );

    // Map result to normalized AttributeOption format
    const options = result.options.map((opt) => ({
      id: 'id' in opt ? (opt.id as string) : '',
      title: opt.title,
      is_archived: opt.is_archived,
    }));

    // Store with timestamp
    selectOptionsCache.set(cacheKey, {
      data: options,
      timestamp: now,
    });

    debug(
      'select-transformer',
      'Cached fresh select options',
      { objectSlug, attributeSlug, optionCount: options.length },
      'getSelectOptionsWithCache',
      OperationType.DATA_PROCESSING
    );

    return options;
  } catch (err) {
    logError(
      'select-transformer',
      `Failed to fetch select options for ${objectSlug}.${attributeSlug}`,
      err
    );
    return [];
  }
}

/**
 * Find a select option by title (case-insensitive with partial matching)
 *
 * @param options - Available select options
 * @param title - Title to match
 * @returns Matched option or undefined
 */
function findOptionByTitle(
  options: AttributeOption[],
  title: string
): AttributeOption | undefined {
  const titleLower = title.toLowerCase().trim();

  // Priority 1: Exact match (case-insensitive)
  const exactMatch = options.find(
    (opt) => opt.title.toLowerCase() === titleLower
  );
  if (exactMatch) return exactMatch;

  // Priority 2: Partial match (one-directional: option title contains input)
  return options.find((opt) => opt.title.toLowerCase().includes(titleLower));
}

/**
 * Check if an attribute is a single-select (NOT multi-select)
 *
 * CRITICAL (Issue #992): Attio uses type="select" for BOTH single-select
 * and multi-select. The is_multiselect flag distinguishes them.
 *
 * - Single-select: type="select" && is_multiselect !== true
 * - Multi-select: type="select" && is_multiselect === true
 *
 * Multi-select is handled by multi-select-transformer, so we skip here.
 */
function isSingleSelectAttribute(meta: AttributeMetadata): boolean {
  return meta.type === 'select' && meta.is_multiselect !== true;
}

/**
 * Create a "no transformation needed" result
 */
function noTransform(value: unknown): TransformResult {
  return { transformed: false, originalValue: value, transformedValue: value };
}

/**
 * Transform a select value from string title to ["uuid"] array format
 *
 * Supports:
 * - Case-insensitive title matching: "technology" → ["uuid"]
 * - Partial matching: "Tech" → ["uuid"] (if matches "Technology")
 * - UUID pass-through: "uuid-string" → ["uuid-string"] (no API lookup)
 * - Error suggestions: Lists valid options on invalid input
 *
 * @param value - The value to transform
 * @param attributeSlug - The attribute slug
 * @param context - Transformation context
 * @param attributeMeta - Attribute metadata (must be single-select)
 * @returns Transform result with ["uuid"] format
 */
export async function transformSelectValue(
  value: unknown,
  attributeSlug: string,
  context: TransformContext,
  attributeMeta: AttributeMetadata
): Promise<TransformResult> {
  // Guard: Only transform single-select string values not already in array format
  if (!isSingleSelectAttribute(attributeMeta)) return noTransform(value);
  if (Array.isArray(value)) return noTransform(value);
  if (typeof value !== 'string') return noTransform(value);

  // Short-circuit: UUID string detection (skip lookup)
  if (isValidUUID(value)) {
    const transformedValue = [value];

    debug(
      'select-transformer',
      'Detected UUID string for select attribute',
      { attribute: attributeSlug, matchType: 'uuid-passthrough' },
      'transformSelectValue',
      OperationType.DATA_PROCESSING
    );

    return {
      transformed: true,
      originalValue: value,
      transformedValue,
      description: `Wrapped UUID string in array for ${attributeSlug}`,
    };
  }

  // Map resource type to object slug
  const objectSlug = context.resourceType.toLowerCase();

  // Fetch select options with caching
  const options = await getSelectOptionsWithCache(objectSlug, attributeSlug);

  if (options.length === 0) {
    debug(
      'select-transformer',
      `No select options found for ${objectSlug}.${attributeSlug}`,
      { value },
      'transformSelectValue',
      OperationType.DATA_PROCESSING
    );
    return noTransform(value);
  }

  // Find matching option
  const match = findOptionByTitle(options, value);

  if (!match) {
    // No match - throw error with valid options
    const validOptions = options
      .filter((opt) => !opt.is_archived)
      .map((opt) => `"${opt.title}"`)
      .join(', ');

    throw new Error(
      `Invalid select value "${value}" for ${attributeSlug}. ` +
        `Valid options are: ${validOptions}`
    );
  }

  // Transform to array format with option ID
  const transformedValue = [match.id];

  debug(
    'select-transformer',
    'Transformed select value',
    {
      attribute: attributeSlug,
      matchType:
        match.title.toLowerCase() === value.toLowerCase().trim()
          ? 'exact'
          : 'partial',
      matchedTitle: match.title,
    },
    'transformSelectValue',
    OperationType.DATA_PROCESSING
  );

  return {
    transformed: true,
    originalValue: value,
    transformedValue,
    description: `Converted select title "${value}" to ["${match.id}"] (matched: "${match.title}")`,
  };
}

/**
 * Get valid select options for error messages
 *
 * @param objectSlug - Object slug
 * @param attributeSlug - Attribute slug
 * @returns Array of valid option titles
 */
export async function getValidSelectOptions(
  objectSlug: string,
  attributeSlug: string
): Promise<string[]> {
  const options = await getSelectOptionsWithCache(objectSlug, attributeSlug);
  return options.filter((opt) => !opt.is_archived).map((opt) => opt.title);
}
