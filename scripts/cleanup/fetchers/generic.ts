/**
 * Generic resource fetching for cleanup operations
 * Works with any Attio resource type (companies, people, deals, etc.)
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult, StandardResource } from '../core/types.js';
import { logInfo, logError, delay, chunk } from '../core/utils.js';
import { filterRecordsByCreator } from '../filters/creator-filter.js';

const DEFAULT_PAGE_SIZE = 500;
const RATE_LIMIT_DELAY = 250; // ms between requests

// For cleanup operations, we need to fetch ALL records, not just the first few pages
const CLEANUP_MAX_PAGES = 1000; // Allow up to 500k records (1000 * 500)

/**
 * Object-record slugs handled through `/objects/{slug}/records/query`.
 * tasks, notes, and lists are first-class resources with dedicated fetchers.
 */
export type ResourceType = StandardResource;

/**
 * Fetch all records of a given resource type with pagination
 */
export async function fetchAllResources(
  client: AxiosInstance,
  resourceType: ResourceType,
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = CLEANUP_MAX_PAGES,
    rateLimit = RATE_LIMIT_DELAY,
  } = options;

  logInfo(`DEBUG: fetchAllResources configuration`, {
    pageSize,
    maxPages,
    maxTotalRecords: pageSize * maxPages,
    resourceType,
  });

  logInfo(`Starting ${resourceType} fetch operation`, { pageSize, maxPages });

  const allRecords: AttioRecord[] = [];
  let page = 0;
  let hasMore = true;
  let nextCursor: string | undefined;
  let offset = 0;

  try {
    while (hasMore && page < maxPages) {
      const endpoint = `/objects/${resourceType}/records/query`;
      const requestBody: Record<string, unknown> = { limit: pageSize };

      // Use offset for pagination instead of cursor (Attio doesn't return cursor metadata)
      if (offset > 0) {
        requestBody.offset = offset;
      }

      logInfo(`Fetching ${resourceType} page ${page + 1}`, {
        offset: offset,
        requestBody: JSON.stringify(requestBody).substring(0, 100) + '...',
      });

      const response = await client.post(endpoint, requestBody);

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const { data } = response.data;

      if (!Array.isArray(data)) {
        throw new Error(
          `Invalid API response: expected data array for ${resourceType}`
        );
      }

      allRecords.push(...data);

      // For the objects endpoint, a short page means we've reached the end.
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        hasMore = true;
        offset += data.length;
      }

      // Legacy cursor support (in case Attio adds it back)
      if (response.data.meta?.next_cursor) {
        nextCursor = response.data.meta.next_cursor;
      }

      logInfo(`Fetched ${data.length} ${resourceType}`, {
        total: allRecords.length,
        hasMore,
        page: page + 1,
        offset: offset,
        cursor: nextCursor ? 'present' : 'none',
        pageProgress: `${page + 1}/${maxPages}`,
        gotFullPage: data.length === pageSize,
      });

      page++;

      // Rate limiting
      if (hasMore && rateLimit > 0) {
        await delay(rateLimit);
      }
    }

    const hitPageLimit = hasMore && page >= maxPages;

    logInfo(`${resourceType} fetch completed`, {
      totalRecords: allRecords.length,
      totalPages: page,
      hasMoreAvailable: hasMore,
      maxPagesLimit: maxPages,
      hitPageLimit,
      finalCursor: nextCursor || 'none',
    });

    // Warn if we stopped due to page limit, not because we ran out of data
    if (hitPageLimit) {
      logInfo(
        `⚠️ WARNING: ${resourceType} fetch stopped at page limit (${maxPages})`,
        {
          recordsFetched: allRecords.length,
          estimatedTotal: `>${allRecords.length}`,
          recommendation: 'Increase maxPages option if you need all records',
        }
      );
    }

    return {
      records: allRecords,
      total: allRecords.length,
      hasMore,
      nextCursor,
    };
  } catch (error: any) {
    logError(`Failed to fetch ${resourceType}`, {
      page,
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Fetch resources with filtering by created_by API token
 */
export async function fetchResourcesByCreator(
  client: AxiosInstance,
  resourceType: ResourceType,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo(`Fetching ${resourceType} filtered by API token creator`, {
    apiToken: apiToken.substring(0, 8) + '...',
  });

  // Fetch all resources first, then filter client-side via the shared filter.
  const result = await fetchAllResources(client, resourceType, options);
  return filterRecordsByCreator(result, apiToken, resourceType);
}

/**
 * Process resources in batches for memory efficiency
 */
export async function processResources(
  client: AxiosInstance,
  resourceType: ResourceType,
  processor: (resources: AttioRecord[]) => Promise<void>,
  options: {
    batchSize?: number;
    apiToken?: string;
  } = {}
): Promise<void> {
  const { batchSize = 50, apiToken } = options;

  logInfo(`Starting ${resourceType} processing`, {
    batchSize,
    hasApiTokenFilter: !!apiToken,
  });

  try {
    const fetchResult = apiToken
      ? await fetchResourcesByCreator(client, resourceType, apiToken)
      : await fetchAllResources(client, resourceType);

    const batches = chunk(fetchResult.records, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logInfo(`Processing ${resourceType} batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      await processor(batch);
    }

    logInfo(`${resourceType} processing completed`, {
      totalRecords: fetchResult.total,
      totalBatches: batches.length,
    });
  } catch (error) {
    logError(`${resourceType} processing failed`, error);
    throw error;
  }
}
