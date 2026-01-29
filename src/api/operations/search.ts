/**
 * Search operations for Attio objects
 * Handles basic and advanced search functionality
 */

import { getLazyAttioClient } from '@api/lazy-client.js';
import { callWithRetry, RetryConfig } from '@api/operations/retry.js';
import { ListEntryFilters } from '@api/operations/types.js';
import { parseQuery, ParsedQuery } from '@api/operations/query-parser.js';
import { FilterValidationError } from '@errors/api-errors.js';
import { ErrorEnhancer } from '@errors/enhanced-api-errors.js';
import { transformFiltersToApiFormat } from '@utils/record-utils.js';
import {
  AttioRecord,
  ResourceType,
  AttioListResponse,
} from '@shared-types/attio.js';
import {
  ApiError,
  SearchRequestBody,
  ListRequestBody,
} from '@shared-types/api-operations.js';
import { LRUCache } from 'lru-cache';
import { scoreAndRank } from '../../services/search-utilities/SearchScorer.js';
import { createScopedLogger } from '../../utils/logger.js';

const logger = createScopedLogger('api.operations', 'search');

type FilterCondition = Record<string, unknown>;

type FastPathKind = 'domain' | 'email' | 'phone' | 'name';
type FastPathStrategy = 'eq' | 'contains';

interface FastPathCandidate {
  filter: FilterCondition;
  kind: FastPathKind;
  strategy: FastPathStrategy;
  value: string;
}

const ENABLE_SEARCH_SCORING = process.env.ENABLE_SEARCH_SCORING !== 'false';
const SEARCH_CACHE_TTL_MS = Number.parseInt(
  process.env.SEARCH_CACHE_TTL_MS ?? `${5 * 60 * 1000}`,
  10
);
const SEARCH_CACHE_MAX = Number.parseInt(
  process.env.SEARCH_CACHE_MAX ?? '500',
  10
);
const SEARCH_FETCH_MULTIPLIER = Number.parseInt(
  process.env.SEARCH_FETCH_MULTIPLIER ?? '5',
  10
);
const SEARCH_FETCH_MIN = Number.parseInt(
  process.env.SEARCH_FETCH_MIN ?? '50',
  10
);
const SEARCH_FAST_PATH_LIMIT = Number.parseInt(
  process.env.SEARCH_FAST_PATH_LIMIT ?? '5',
  10
);
const DEFAULT_FETCH_LIMIT = Number.parseInt(
  process.env.SEARCH_DEFAULT_LIMIT ?? '20',
  10
);

const searchCache = new LRUCache<string, AttioRecord[]>({
  max: Number.isFinite(SEARCH_CACHE_MAX) ? SEARCH_CACHE_MAX : 500,
  ttl: Number.isFinite(SEARCH_CACHE_TTL_MS)
    ? SEARCH_CACHE_TTL_MS
    : 5 * 60 * 1000,
});

function getCacheKey(
  objectType: ResourceType,
  query: string,
  limit: number
): string {
  return `${objectType}:${limit}:${query.toLowerCase()}`;
}

function normalizeDomainValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .trim();
}

function normalizePlainValue(value: string): string {
  return value.toLowerCase().trim();
}

function extractStringsFromField(
  fieldValue: unknown,
  keys: string[] = []
): string[] {
  const results: string[] = [];

  const pushString = (candidate: unknown) => {
    if (typeof candidate === 'string' && candidate.trim()) {
      results.push(candidate);
    }
  };

  if (!fieldValue) {
    return results;
  }

  if (typeof fieldValue === 'string') {
    pushString(fieldValue);
    return results;
  }

  if (Array.isArray(fieldValue)) {
    fieldValue.forEach((item) => {
      if (typeof item === 'string') {
        pushString(item);
      } else if (item && typeof item === 'object') {
        keys.forEach((key) => {
          pushString((item as Record<string, unknown>)[key]);
        });
      }
    });
    return results;
  }

  if (fieldValue && typeof fieldValue === 'object') {
    keys.forEach((key) => {
      pushString((fieldValue as Record<string, unknown>)[key]);
    });
  }

  return results;
}

function extractNormalizedName(record: AttioRecord): string {
  const values = (record?.values ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [];

  if ('name' in values) {
    candidates.push(values.name);
  }
  if ('full_name' in values) {
    candidates.push(values.full_name);
  }
  if ('title' in values) {
    candidates.push(values.title);
  }

  const normalizeCandidate = (candidate: unknown): string | null => {
    if (typeof candidate === 'string' && candidate.trim()) {
      return normalizePlainValue(candidate);
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const normalized = normalizeCandidate(item);
        if (normalized) {
          return normalized;
        }
      }
    }

    if (candidate && typeof candidate === 'object') {
      const obj = candidate as Record<string, unknown>;
      const nested = obj.full_name ?? obj.formatted ?? obj.value ?? obj.name;
      if (typeof nested === 'string' && nested.trim()) {
        return normalizePlainValue(nested);
      }
    }

    return null;
  };

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

/**
 * Build fast-path candidates for structured queries.
 *
 * Issue #885: Attio API supports $eq operator (verified 2025-10-07)
 * Supported operators: $eq, $contains, $starts_with, $ends_with, $not_empty
 * NOT supported: $equals, $in
 *
 * @see scripts/test-attio-operators.mjs for operator verification tests
 */
function buildFastPathCandidates(
  objectType: ResourceType,
  parsed: ParsedQuery,
  originalQuery: string
): FastPathCandidate[] {
  const candidates: FastPathCandidate[] = [];
  const trimmedQuery = originalQuery.trim();

  if (objectType === ResourceType.COMPANIES && parsed.domains.length === 1) {
    const normalizedDomain = normalizeDomainValue(parsed.domains[0]);
    candidates.push({
      filter: { domains: { $eq: normalizedDomain } },
      kind: 'domain',
      strategy: 'eq',
      value: normalizedDomain,
    });
    candidates.push({
      filter: { domains: { $contains: normalizedDomain } },
      kind: 'domain',
      strategy: 'contains',
      value: normalizedDomain,
    });
  }

  if (parsed.emails.length === 1) {
    const emailValue = parsed.emails[0].toLowerCase();
    candidates.push({
      filter: { email_addresses: { $eq: emailValue } },
      kind: 'email',
      strategy: 'eq',
      value: emailValue,
    });
    candidates.push({
      filter: { email_addresses: { $contains: emailValue } },
      kind: 'email',
      strategy: 'contains',
      value: emailValue,
    });
  }

  // Try all phone variants as fast path candidates (parser creates normalized forms)
  if (parsed.phones.length > 0) {
    parsed.phones.forEach((phoneValue) => {
      candidates.push({
        filter: { phone_numbers: { $eq: phoneValue } },
        kind: 'phone',
        strategy: 'eq',
        value: phoneValue,
      });
    });
  }

  const hasStructuredQuery =
    parsed.domains.length > 0 ||
    parsed.emails.length > 0 ||
    parsed.phones.length > 0;

  if (
    trimmedQuery &&
    !hasStructuredQuery &&
    (objectType === ResourceType.COMPANIES ||
      objectType === ResourceType.PEOPLE ||
      objectType === ResourceType.DEALS)
  ) {
    const normalizedName = normalizePlainValue(trimmedQuery);
    candidates.push({
      filter: { name: { $eq: trimmedQuery } },
      kind: 'name',
      strategy: 'eq',
      value: normalizedName,
    });
    candidates.push({
      filter: { name: { $contains: trimmedQuery } },
      kind: 'name',
      strategy: 'contains',
      value: normalizedName,
    });
  }

  return candidates;
}

function recordMatchesFastPath(
  record: AttioRecord,
  candidate: FastPathCandidate
): boolean {
  const values = (record?.values ?? {}) as Record<string, unknown>;

  switch (candidate.kind) {
    case 'domain': {
      const domains = extractStringsFromField(values.domains, [
        'domain',
        'value',
      ]).map(normalizeDomainValue);
      if (candidate.strategy === 'eq') {
        return domains.includes(candidate.value);
      }
      return domains.some((domain) => domain.includes(candidate.value));
    }
    case 'email': {
      const emails = extractStringsFromField(values.email_addresses, [
        'email_address',
        'value',
      ]).map(normalizePlainValue);
      if (candidate.strategy === 'eq') {
        return emails.includes(candidate.value);
      }
      return emails.some((email) => email.includes(candidate.value));
    }
    case 'phone': {
      const phones = extractStringsFromField(values.phone_numbers, [
        'phone_number', // Main normalized field
        'original_phone_number', // Original input
        'number', // Legacy fallback
        'normalized', // Legacy fallback
        'value', // Legacy fallback
      ]);
      const normalizedSet = new Set<string>();
      phones.forEach((phone) => {
        normalizedSet.add(phone);
        normalizedSet.add(phone.replace(/\s+/g, ''));
        // Also try with/without leading +
        if (phone.startsWith('+')) {
          normalizedSet.add(phone.substring(1));
        } else {
          normalizedSet.add(`+${phone}`);
        }
      });
      return (
        normalizedSet.has(candidate.value) ||
        normalizedSet.has(candidate.value.replace(/\s+/g, ''))
      );
    }
    case 'name': {
      const recordName = extractNormalizedName(record);
      if (!recordName) {
        return false;
      }
      if (candidate.strategy === 'eq') {
        return recordName === candidate.value;
      }
      return recordName.includes(candidate.value);
    }
    default:
      return false;
  }
}

function createLegacyFilter(
  objectType: ResourceType,
  query: string
): FilterCondition {
  if (objectType === ResourceType.PEOPLE) {
    return {
      $or: [
        { name: { $contains: query } },
        { email_addresses: { $contains: query } },
        { phone_numbers: { $contains: query } },
      ],
    };
  }

  return { name: { $contains: query } };
}

function addCondition(
  collection: FilterCondition[],
  seen: Set<string>,
  condition: FilterCondition
) {
  const key = JSON.stringify(condition);
  if (!seen.has(key)) {
    seen.add(key);
    collection.push(condition);
  }
}

function buildSearchFilter(
  objectType: ResourceType,
  query: string,
  parsedOverride?: ParsedQuery
): FilterCondition {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return createLegacyFilter(objectType, query);
  }

  const parsed = parsedOverride ?? parseQuery(trimmedQuery);
  const conditions: FilterCondition[] = [];
  const seen = new Set<string>();

  parsed.emails.forEach((email) => {
    addCondition(conditions, seen, {
      email_addresses: { $contains: email },
    });
  });

  parsed.phones.forEach((phone) => {
    addCondition(conditions, seen, {
      phone_numbers: { $contains: phone },
    });
  });

  if (objectType === ResourceType.COMPANIES) {
    parsed.domains.forEach((domain) => {
      addCondition(conditions, seen, {
        domains: { $contains: domain },
      });
    });
  }

  const tokenTargets = new Set<string>();
  tokenTargets.add('name');

  if (objectType === ResourceType.PEOPLE) {
    tokenTargets.add('email_addresses');
    tokenTargets.add('phone_numbers');
  }

  if (objectType === ResourceType.COMPANIES) {
    tokenTargets.add('domains');
  }

  const uniqueTokens = Array.from(
    new Set(parsed.tokens.filter((token) => token.length > 1))
  );

  // AND-of-OR search strategy (#885 fix):
  // For each token, allow it to match ANY field (name OR domains OR email/phone)
  // But ALL tokens must match SOMEWHERE
  // This provides precision (all tokens required) + cross-field flexibility (name + domain tokens)
  //
  // Example: "Elite Styles Beauty Mindful Program"
  // - "Elite" can match name OR domains
  // - "Styles" can match name OR domains
  // - "Mindful" can match name OR domains (will match domain mindfulbeautyprogram.com)
  // - etc.
  //
  // Result: Company "Elite Styles And Beauty" (mindfulbeautyprogram.com) matches because:
  // - "Elite" matches name ✓
  // - "Styles" matches name ✓
  // - "Beauty" matches name ✓
  // - "Mindful" matches domain ✓
  // - "Program" matches domain ✓
  if (uniqueTokens.length > 0) {
    if (uniqueTokens.length === 1) {
      // Single token: create OR condition across all relevant fields
      const token = uniqueTokens[0];
      tokenTargets.forEach((field) => {
        addCondition(conditions, seen, {
          [field]: { $contains: token },
        });
      });
    } else {
      // Multiple tokens: each token must match at least one field (AND of ORs)
      const tokenAndConditions = uniqueTokens.map((token) => {
        const tokenFieldConditions: FilterCondition[] = [];
        tokenTargets.forEach((field) => {
          tokenFieldConditions.push({
            [field]: { $contains: token },
          });
        });
        return {
          $or: tokenFieldConditions,
        };
      });

      // Combine all token conditions with AND
      addCondition(conditions, seen, {
        $and: tokenAndConditions,
      });
    }
  }

  if (conditions.length === 0) {
    return createLegacyFilter(objectType, trimmedQuery);
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    $or: conditions,
  };
}

/**
 * Build OR-only fallback filter for when AND-of-OR returns zero results
 * Uses the same parsed structure but allows ANY token to match (no AND requirement)
 */
function buildORFallbackFilter(
  objectType: ResourceType,
  parsed: ParsedQuery
): FilterCondition {
  const conditions: FilterCondition[] = [];
  const seen = new Set<string>();

  // Include all structured fields as before
  parsed.emails.forEach((email) => {
    addCondition(conditions, seen, {
      email_addresses: { $contains: email },
    });
  });

  parsed.phones.forEach((phone) => {
    addCondition(conditions, seen, {
      phone_numbers: { $contains: phone },
    });
  });

  if (objectType === ResourceType.COMPANIES) {
    parsed.domains.forEach((domain) => {
      addCondition(conditions, seen, {
        domains: { $contains: domain },
      });
    });
  }

  const tokenTargets = new Set<string>();
  tokenTargets.add('name');

  if (objectType === ResourceType.PEOPLE) {
    tokenTargets.add('email_addresses');
    tokenTargets.add('phone_numbers');
  }

  if (objectType === ResourceType.COMPANIES) {
    tokenTargets.add('domains');
  }

  const uniqueTokens = Array.from(
    new Set(parsed.tokens.filter((token) => token.length > 1))
  );

  // OR-only fallback: each token can match any field (no AND requirement)
  // This provides maximum recall when the stricter AND-of-OR filter returns zero results
  uniqueTokens.forEach((token) => {
    tokenTargets.forEach((field) => {
      addCondition(conditions, seen, {
        [field]: { $contains: token },
      });
    });
  });

  if (conditions.length === 0) {
    // Shouldn't happen, but return safe fallback
    return { name: { $contains: parsed.tokens.join(' ') } };
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    $or: conditions,
  };
}

/**
 * Generic function to search any object type by name, email, or phone (when applicable)
 *
 * @param objectType - The type of object to search (people or companies)
 * @param query - Search query string
 * @param options - Optional search options (limit, retryConfig)
 * @returns Array of matching records
 */
export async function searchObject<T extends AttioRecord>(
  objectType: ResourceType,
  query: string,
  options?: { limit?: number; retryConfig?: Partial<RetryConfig> }
): Promise<T[]> {
  const retryConfig = options?.retryConfig;
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

  const trimmedQuery = query.trim();
  const scoringEnabled = ENABLE_SEARCH_SCORING && trimmedQuery.length > 0;
  // Use caller's limit if provided, otherwise fall back to default
  const requestedLimit = options?.limit;
  const baseLimit =
    requestedLimit !== undefined && requestedLimit > 0
      ? requestedLimit
      : Number.isFinite(DEFAULT_FETCH_LIMIT) && DEFAULT_FETCH_LIMIT > 0
        ? DEFAULT_FETCH_LIMIT
        : 20;
  const multiplier =
    Number.isFinite(SEARCH_FETCH_MULTIPLIER) && SEARCH_FETCH_MULTIPLIER > 0
      ? SEARCH_FETCH_MULTIPLIER
      : 5;
  const minimumFetch =
    Number.isFinite(SEARCH_FETCH_MIN) && SEARCH_FETCH_MIN > 0
      ? SEARCH_FETCH_MIN
      : 50;
  const fastPathLimit =
    Number.isFinite(SEARCH_FAST_PATH_LIMIT) && SEARCH_FAST_PATH_LIMIT > 0
      ? Math.max(baseLimit, SEARCH_FAST_PATH_LIMIT)
      : baseLimit;

  const parsedQuery = trimmedQuery ? parseQuery(trimmedQuery) : null;
  const cacheKey =
    scoringEnabled && trimmedQuery
      ? getCacheKey(objectType, trimmedQuery, baseLimit)
      : null;

  if (scoringEnabled && cacheKey) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached as unknown as T[];
    }
  }

  if (scoringEnabled && parsedQuery) {
    const fastCandidates = buildFastPathCandidates(
      objectType,
      parsedQuery,
      trimmedQuery
    );

    for (const candidate of fastCandidates) {
      const candidateLimit =
        candidate.kind === 'name' && candidate.strategy === 'contains'
          ? Math.min(100, Math.max(minimumFetch, baseLimit * multiplier))
          : candidate.kind === 'name' && candidate.strategy === 'eq'
            ? baseLimit
            : fastPathLimit;

      logger.debug('[FastPath] Trying candidate', {
        kind: candidate.kind,
        strategy: candidate.strategy,
        filter: candidate.filter,
        limit: candidateLimit,
      });

      try {
        const fastResponse = await callWithRetry(async () => {
          return api.post<AttioListResponse<T>>(path, {
            filter: candidate.filter,
            limit: candidateLimit,
          });
        }, retryConfig);

        const fastData = Array.isArray(fastResponse?.data?.data)
          ? (fastResponse?.data?.data as AttioRecord[])
          : [];

        logger.debug('[FastPath] Received results', {
          count: fastData.length,
        });

        if (!fastData.length) {
          logger.debug('[FastPath] No results for candidate');
          continue;
        }

        const hasMatch = fastData.some((record) =>
          recordMatchesFastPath(record, candidate)
        );

        if (!hasMatch) {
          logger.debug('[FastPath] Validation failed', {
            candidateKind: candidate.kind,
            candidateStrategy: candidate.strategy,
            candidateValue: candidate.value,
            resultCount: fastData.length,
          });
          continue;
        }

        logger.debug('[FastPath] Validation passed, ranking');

        const rankedFast = scoreAndRank(
          trimmedQuery,
          fastData,
          parsedQuery
        ) as AttioRecord[];
        const truncatedFast = rankedFast.slice(0, baseLimit);

        if (cacheKey) {
          searchCache.set(cacheKey, truncatedFast);
        }

        return truncatedFast as unknown as T[];
      } catch (error) {
        logger.debug('[FastPath] Error executing candidate', {
          kind: candidate.kind,
          strategy: candidate.strategy,
          filter: candidate.filter,
          error: error instanceof Error ? error.message : String(error),
        });
        void error; // Non-fatal fast-path failure; fall back to next candidate
      }
    }
  }

  const filter = buildSearchFilter(objectType, query, parsedQuery ?? undefined);
  const fetchLimit = scoringEnabled
    ? Math.max(minimumFetch, baseLimit * multiplier)
    : baseLimit;

  return callWithRetry(async () => {
    try {
      const response = await api.post<AttioListResponse<T>>(path, {
        filter,
        limit: fetchLimit,
      });
      const rawData = response?.data?.data;
      let data = Array.isArray(rawData) ? (rawData as AttioRecord[]) : [];

      // OR-only fallback when AND-of-OR returns zero results (#885 recall fix)
      // This handles over-constrained queries like "Beauty Glow Aesthetics Frisco"
      // where some tokens don't exist but the record should still match
      // Runs regardless of scoring state - scoring only affects ranking, not recall
      if (data.length === 0 && parsedQuery) {
        logger.debug('[Fallback] Zero results from AND-of-OR, trying OR-only', {
          query: trimmedQuery,
          objectType,
        });

        const fallbackFilter = buildORFallbackFilter(objectType, parsedQuery);
        const fallbackResponse = await api.post<AttioListResponse<T>>(path, {
          filter: fallbackFilter,
          limit: fetchLimit,
        });
        const fallbackRawData = fallbackResponse?.data?.data;
        data = Array.isArray(fallbackRawData)
          ? (fallbackRawData as AttioRecord[])
          : [];

        logger.debug('[Fallback] OR-only results', {
          count: data.length,
        });
      }

      if (!scoringEnabled || data.length <= 1) {
        const truncated = data.slice(0, baseLimit);
        return truncated as unknown as T[];
      }

      const ranked = scoreAndRank(
        trimmedQuery,
        data,
        parsedQuery ?? undefined
      ) as AttioRecord[];
      const truncated = ranked.slice(0, baseLimit);

      if (cacheKey) {
        searchCache.set(cacheKey, truncated);
      }

      return truncated as unknown as T[];
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.response && apiError.response.status === 404) {
        throw new Error(`No ${objectType} found matching '${query}'`);
      }
      throw error;
    }
  }, retryConfig);
}

/**
 * Generic function to search any object type with advanced filtering capabilities
 *
 * @param objectType - The type of object to search (people or companies)
 * @param filters - Optional filters to apply
 * @param limit - Maximum number of results to return (optional)
 * @param offset - Number of results to skip (optional)
 * @param retryConfig - Optional retry configuration
 * @returns Array of matching records
 */
export async function advancedSearchObject<T extends AttioRecord>(
  objectType: ResourceType,
  filters?: ListEntryFilters,
  limit?: number,
  offset?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

  // Coerce input parameters to ensure proper types
  const safeLimit = typeof limit === 'number' ? limit : undefined;
  const safeOffset = typeof offset === 'number' ? offset : undefined;

  // Create request body with parameters and filters
  const createRequestBody = async () => {
    // Start with base parameters
    const body: SearchRequestBody = {
      limit: safeLimit !== undefined ? safeLimit : 20, // Default to 20 if not specified
      offset: safeOffset !== undefined ? safeOffset : 0, // Default to 0 if not specified
    };

    try {
      // If filters is undefined, return body without filter
      if (!filters) {
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').debug(
            'No filters provided, using default parameters only'
          );
        }
        return body;
      }

      // Import validation utilities dynamically to avoid circular dependencies
      const { validateFilters } =
        await import('../../utils/filters/validation-utils.js');

      // Use centralized validation with consistent error messages
      try {
        validateFilters(filters);
      } catch (validationError) {
        // Enhance error with API operation context, but preserve original message and category
        if (validationError instanceof FilterValidationError) {
          throw new FilterValidationError(
            `Advanced search filter validation failed: ${validationError.message}`,
            validationError.category
          );
        }
        throw validationError;
      }

      // Use our shared utility to transform filters to API format
      const filterObject = await transformFiltersToApiFormat(
        filters,
        true,
        false,
        objectType
      );

      // Add filter to body if it exists
      if (filterObject.filter) {
        body.filter = filterObject.filter;

        // Log filter transformation for debugging in development
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').debug(
            'Transformed filters',
            {
              originalFilters: JSON.stringify(filters),
              transformedFilters: JSON.stringify(filterObject.filter),
              useOrLogic: filters?.matchAny === true,
              filterCount: filters?.filters?.length || 0,
            }
          );
        }
      }
    } catch (err: unknown) {
      // Enhanced error handling with detailed context and examples
      if (err instanceof FilterValidationError) {
        // Log the full details for debugging
        if (process.env.NODE_ENV === 'development') {
          const { createScopedLogger } = await import('../../utils/logger.js');
          createScopedLogger('operations.search', 'advancedSearchObject').warn(
            'Filter validation error',
            {
              error: err.message,
              providedFilters: JSON.stringify(filters, (key, value) =>
                // Handle circular references in error logging
                typeof value === 'object' && value !== null
                  ? Object.keys(value).length > 0
                    ? value
                    : '[Empty Object]'
                  : value
              ),
            }
          );
        }

        // The error message may already include examples, so just rethrow
        throw err;
      }

      // For other error types
      const errorMessage =
        err instanceof Error
          ? `Error processing search filters: ${err.message}`
          : 'Unknown error processing search filters';

      throw new Error(errorMessage);
    }

    return body;
  };

  return callWithRetry(async () => {
    try {
      const requestBody = await createRequestBody();
      const response = await api.post<AttioListResponse<T>>(path, requestBody);
      const data = response?.data?.data;

      // Ensure we always return an array, never boolean or other types
      if (Array.isArray(data)) {
        return data;
      }

      // Return empty array if data is null, undefined, or not an array
      return [];
    } catch (err) {
      // If the error is a FilterValidationError, rethrow it unchanged
      // Tests expect this specific error type to bubble up
      if (
        err instanceof FilterValidationError ||
        (err as Record<string, unknown>)?.name === 'FilterValidationError'
      ) {
        throw err;
      }

      // For all other errors, enhance them for consistency
      throw ErrorEnhancer.ensureEnhanced(err, {
        resourceType: objectType,
      });
    }
  }, retryConfig);
}

/**
 * Generic function to list any object type with pagination and sorting
 *
 * @param objectType - The type of object to list (people or companies)
 * @param limit - Maximum number of results to return
 * @param retryConfig - Optional retry configuration
 * @returns Array of records
 */
export async function listObjects<T extends AttioRecord>(
  objectType: ResourceType,
  limit?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<T[]> {
  const api = getLazyAttioClient();
  const path = `/objects/${objectType}/records/query`;

  return callWithRetry(async () => {
    const body: ListRequestBody = {
      limit: limit || 20,
      sorts: [
        {
          attribute: 'last_interaction',
          field: 'interacted_at',
          direction: 'desc',
        },
      ],
    };

    const response = await api.post<AttioListResponse<T>>(path, body);
    let result = response?.data?.data || [];

    // BUGFIX: Handle case where API returns {} instead of [] for empty results
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      result = [];
    }

    return result;
  }, retryConfig);
}
