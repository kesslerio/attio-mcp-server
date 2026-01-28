/**
 * Status transformer - converts status titles to Attio status object format
 *
 * Problem: LLMs commonly pass status values as strings (e.g., "Demo Scheduling")
 * but Attio API requires a structured object for status attributes.
 *
 * Solution: Auto-detect status attributes and transform string titles to the
 * required object format by looking up the status ID from the workspace options.
 *
 * Note: Attio expects the key `status` (not `status_id`). The value can be the
 * status UUID. We always wrap as an array to match Attio attribute value shapes.
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

    const options = result.options.map((opt) => {
      // Extract status ID - handle both string and object formats from Attio API
      let id = '';
      if ('id' in opt && opt.id) {
        if (typeof opt.id === 'string') {
          // Simple string ID
          id = opt.id;
        } else if (typeof opt.id === 'object' && opt.id !== null) {
          // Object ID structure: { workspace_id, object_id, attribute_id, option_id }
          const idObj = opt.id as Record<string, unknown>;
          if ('option_id' in idObj && typeof idObj.option_id === 'string') {
            id = idObj.option_id;
          } else if (
            'status_id' in idObj &&
            typeof idObj.status_id === 'string'
          ) {
            id = idObj.status_id;
          }
        }
      }
      return {
        id,
        title: opt.title,
        is_archived: opt.is_archived,
      };
    });

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
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) return false;
  return 'status' in first;
}

function hasStringKey(
  value: unknown,
  key: 'status' | 'status_id' | 'title'
): value is Record<string, unknown> & { [K in typeof key]: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === 'string'
  );
}

function normalizeIncomingStatusValue(value: unknown): {
  normalized: unknown;
  extractedText?: string;
} {
  // Already-correct Attio form: [{ status: "..." }]
  if (isStatusFormat(value)) {
    const first = Array.isArray(value) ? value[0] : undefined;
    const statusValue =
      first && typeof first === 'object' && !Array.isArray(first)
        ? (first as Record<string, unknown>).status
        : undefined;
    if (typeof statusValue === 'string' && !isValidUUID(statusValue)) {
      return { normalized: value, extractedText: statusValue };
    }
    return { normalized: value };
  }

  // Handle array-of-objects with the legacy key: [{ status_id: "..." }] → [{ status: "..." }]
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    hasStringKey(value[0], 'status_id')
  ) {
    return { normalized: [{ status: value[0].status_id }] };
  }

  // Handle single object forms (common mistakes): { status: "..." } / { status_id: "..." }
  if (hasStringKey(value, 'status')) {
    const extractedText = isValidUUID(value.status) ? undefined : value.status;
    return {
      normalized: [{ status: value.status }],
      extractedText,
    };
  }

  if (hasStringKey(value, 'status_id')) {
    return {
      normalized: [{ status: value.status_id }],
    };
  }

  if (hasStringKey(value, 'title')) {
    return {
      normalized: [{ status: value.title }],
      extractedText: value.title,
    };
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    !Array.isArray(value[0]) &&
    'title' in (value[0] as Record<string, unknown>) &&
    typeof (value[0] as Record<string, unknown>).title === 'string'
  ) {
    const title = (value[0] as Record<string, unknown>).title as string;
    return { normalized: [{ status: title }], extractedText: title };
  }

  // Handle array of string values: ["Demo Scheduling"] → "Demo Scheduling"
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'string'
  ) {
    return { normalized: value, extractedText: value[0] };
  }

  return { normalized: value };
}

/**
 * Transform a status value from string title to Attio status object format
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

  const normalizedIncoming = normalizeIncomingStatusValue(value);
  const normalizedValue = normalizedIncoming.normalized;

  // Skip if already in correct Attio format after normalization
  if (isStatusFormat(normalizedValue) && !normalizedIncoming.extractedText) {
    return {
      transformed: normalizedValue !== value,
      originalValue: value,
      transformedValue: normalizedValue,
      description:
        normalizedValue !== value
          ? `Normalized status value format for ${attributeSlug}`
          : undefined,
    };
  }

  const extractedText =
    typeof normalizedIncoming.extractedText === 'string'
      ? normalizedIncoming.extractedText
      : typeof normalizedValue === 'string'
        ? normalizedValue
        : undefined;

  // Only transform string-like values
  if (typeof extractedText !== 'string') {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: normalizedValue,
    };
  }

  // Short-circuit if value is already a UUID
  if (isValidUUID(extractedText)) {
    const transformedValue = [{ status: extractedText }];

    debug(
      'status-transformer',
      `Detected UUID string for status attribute`,
      {
        attribute: attributeSlug,
        from: extractedText,
        to: transformedValue,
      },
      'transformStatusValue',
      OperationType.DATA_PROCESSING
    );

    return {
      transformed: true,
      originalValue: value,
      transformedValue,
      description: `Converted UUID string to status object for ${attributeSlug}`,
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
      { value: extractedText },
      'transformStatusValue',
      OperationType.DATA_PROCESSING
    );
    return {
      transformed: false,
      originalValue: value,
      transformedValue: normalizedValue,
    };
  }

  // Find matching status
  const match = findStatusByTitle(options, extractedText);

  if (!match) {
    // No match found - return error with valid options
    const validOptions = options
      .filter((opt) => !opt.is_archived)
      .map((opt) => `"${opt.title}"`)
      .join(', ');

    throw new Error(
      `Invalid status value "${extractedText}" for ${attributeSlug}. ` +
        `Valid options are: ${validOptions}`
    );
  }

  // Transform to status ID format
  const transformedValue = [{ status: match.id }];

  debug(
    'status-transformer',
    `Transformed status value`,
    {
      attribute: attributeSlug,
      from: extractedText,
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
    description: `Converted status title "${extractedText}" to status "${match.id}" (matched: "${match.title}")`,
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
