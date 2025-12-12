/**
 * Status transformer - converts status titles to {status_id: "uuid"} format
 *
 * Problem: LLMs commonly pass status values as strings (e.g., "Demo Scheduling")
 * but Attio API requires {status_id: "uuid"} format.
 *
 * Solution: Auto-detect status attributes and transform string titles to the
 * required object format by looking up the status ID from the workspace options.
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
 * Cache entry with timestamp for TTL expiration
 * @see Issue #984 - Add TTL to status cache
 */
interface StatusCacheEntry {
  data: AttributeOption[];
  timestamp: number;
}

/**
 * Cache for status options with TTL-based expiration
 * @see Issue #984 - Add 5-minute TTL to prevent stale data
 */
const statusOptionsCache = new Map<string, StatusCacheEntry>();

/**
 * TTL for status options cache (5 minutes)
 */
const STATUS_CACHE_TTL = DEFAULT_ATTRIBUTES_CACHE_TTL;

/**
 * Get cache key for status options
 */
function getCacheKey(objectSlug: string, attributeSlug: string): string {
  return `${objectSlug}:${attributeSlug}`;
}

/**
 * Clear the status options cache (useful for testing)
 */
export function clearStatusCache(): void {
  statusOptionsCache.clear();
}

/**
 * Clean up expired cache entries (lazy eviction)
 * @see Issue #984 - Remove expired entries to prevent memory growth
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of statusOptionsCache.entries()) {
    if (now - entry.timestamp >= STATUS_CACHE_TTL) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    statusOptionsCache.delete(key);
  }

  if (keysToDelete.length > 0) {
    debug(
      'status-transformer',
      `Cleaned up ${keysToDelete.length} expired cache entries`,
      { expiredKeys: keysToDelete.length },
      'cleanupExpiredEntries',
      OperationType.DATA_PROCESSING
    );
  }
}

/**
 * Fetch status options with TTL-based caching
 * @see Issue #984 - Add TTL expiration to prevent stale data
 */
async function getStatusOptionsWithCache(
  objectSlug: string,
  attributeSlug: string
): Promise<AttributeOption[]> {
  const cacheKey = getCacheKey(objectSlug, attributeSlug);
  const now = Date.now();

  // Check cache with TTL
  if (statusOptionsCache.has(cacheKey)) {
    const cached = statusOptionsCache.get(cacheKey)!;
    const age = now - cached.timestamp;

    if (age < STATUS_CACHE_TTL) {
      debug(
        'status-transformer',
        `Using cached status options for ${objectSlug}.${attributeSlug}`,
        {
          age: `${Math.round(age / 1000)}s`,
          ttl: `${STATUS_CACHE_TTL / 1000}s`,
        },
        'getStatusOptionsWithCache',
        OperationType.DATA_PROCESSING
      );
      return cached.data;
    }

    // Expired, remove it
    statusOptionsCache.delete(cacheKey);
    debug(
      'status-transformer',
      `Cache expired for ${objectSlug}.${attributeSlug}`,
      { age: `${Math.round(age / 1000)}s` },
      'getStatusOptionsWithCache',
      OperationType.DATA_PROCESSING
    );
  }

  // Periodically clean up expired entries (every 10th fetch)
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }

  // Fetch fresh data
  try {
    const result = await AttributeOptionsService.getOptions(
      objectSlug,
      attributeSlug,
      true // include archived for complete matching
    );

    const options = result.options.map((opt) => ({
      id: 'id' in opt ? (opt.id as string) : '',
      title: opt.title,
      is_archived: opt.is_archived,
    }));

    // Cache with timestamp
    statusOptionsCache.set(cacheKey, {
      data: options,
      timestamp: now,
    });

    debug(
      'status-transformer',
      `Cached fresh status options for ${objectSlug}.${attributeSlug}`,
      { optionCount: options.length },
      'getStatusOptionsWithCache',
      OperationType.DATA_PROCESSING
    );

    return options;
  } catch (err) {
    logError(
      'status-transformer',
      `Failed to fetch status options for ${objectSlug}.${attributeSlug}`,
      err
    );
    return [];
  }
}

/**
 * Find status ID by title (case-insensitive)
 */
function findStatusByTitle(
  options: AttributeOption[],
  title: string
): AttributeOption | undefined {
  const titleLower = title.toLowerCase().trim();

  // First try exact match (case-insensitive)
  const exactMatch = options.find(
    (opt) => opt.title.toLowerCase() === titleLower
  );
  if (exactMatch) return exactMatch;

  // Then try partial match
  const partialMatch = options.find(
    (opt) =>
      opt.title.toLowerCase().includes(titleLower) ||
      titleLower.includes(opt.title.toLowerCase())
  );

  return partialMatch;
}

/**
 * Check if a value is already in the correct status format
 */
function isStatusFormat(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return 'status_id' in value || 'status' in value;
}

/**
 * Transform a status value from string title to {status_id: "uuid"} format
 *
 * @param value - The value to transform
 * @param attributeSlug - The attribute slug (e.g., "stage")
 * @param context - Transformation context
 * @param attributeMeta - Attribute metadata (must have type "status")
 * @returns Transform result
 */
export async function transformStatusValue(
  value: unknown,
  attributeSlug: string,
  context: TransformContext,
  attributeMeta: AttributeMetadata
): Promise<TransformResult> {
  // Only transform status type attributes
  if (attributeMeta.type !== 'status') {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Skip if already in correct format
  if (isStatusFormat(value)) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Only transform string values
  if (typeof value !== 'string') {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Short-circuit if value is already a UUID
  if (isValidUUID(value)) {
    const transformedValue = { status_id: value };

    debug(
      'status-transformer',
      `Detected UUID string for status attribute`,
      {
        attribute: attributeSlug,
        from: value,
        to: transformedValue,
      },
      'transformStatusValue',
      OperationType.DATA_PROCESSING
    );

    return {
      transformed: true,
      originalValue: value,
      transformedValue,
      description: `Converted UUID string to status_id for ${attributeSlug}`,
    };
  }

  // Map resource type to object slug
  const objectSlug = context.resourceType.toLowerCase();

  // Fetch status options
  const options = await getStatusOptionsWithCache(objectSlug, attributeSlug);

  if (options.length === 0) {
    debug(
      'status-transformer',
      `No status options found for ${objectSlug}.${attributeSlug}`,
      { value },
      'transformStatusValue',
      OperationType.DATA_PROCESSING
    );
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Find matching status
  const match = findStatusByTitle(options, value);

  if (!match) {
    // No match found - return error with valid options
    const validOptions = options
      .filter((opt) => !opt.is_archived)
      .map((opt) => `"${opt.title}"`)
      .join(', ');

    throw new Error(
      `Invalid status value "${value}" for ${attributeSlug}. ` +
        `Valid options are: ${validOptions}`
    );
  }

  // Transform to status ID format
  const transformedValue = { status_id: match.id };

  debug(
    'status-transformer',
    `Transformed status value`,
    {
      attribute: attributeSlug,
      from: value,
      to: transformedValue,
      matchedTitle: match.title,
    },
    'transformStatusValue',
    OperationType.DATA_PROCESSING
  );

  return {
    transformed: true,
    originalValue: value,
    transformedValue,
    description: `Converted status title "${value}" to status_id "${match.id}" (matched: "${match.title}")`,
  };
}

/**
 * Get valid status options for error messages
 */
export async function getValidStatusOptions(
  objectSlug: string,
  attributeSlug: string
): Promise<string[]> {
  const options = await getStatusOptionsWithCache(objectSlug, attributeSlug);
  return options.filter((opt) => !opt.is_archived).map((opt) => opt.title);
}
