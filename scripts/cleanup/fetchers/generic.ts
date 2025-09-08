/**
 * Generic resource fetching for cleanup operations
 * Works with any Attio resource type (companies, people, deals, etc.)
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError, delay, chunk } from '../core/utils.js';

const DEFAULT_PAGE_SIZE = 500;
const RATE_LIMIT_DELAY = 250; // ms between requests

export type ResourceType = 'companies' | 'people' | 'deals' | 'tasks' | 'notes';

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
  const { pageSize = DEFAULT_PAGE_SIZE, maxPages = 50, rateLimit = RATE_LIMIT_DELAY } = options;
  
  logInfo(`Starting ${resourceType} fetch operation`, { pageSize, maxPages });

  const allRecords: AttioRecord[] = [];
  let page = 0;
  let hasMore = true;
  let nextCursor: string | undefined;

  try {
    while (hasMore && page < maxPages) {
      let endpoint: string;
      let requestBody: any = {
        limit: pageSize
      };

      // Different endpoints based on resource type
      if (resourceType === 'tasks') {
        endpoint = '/tasks';
        // Tasks use GET without body
        requestBody = undefined;
      } else {
        endpoint = `/objects/${resourceType}/records/query`;
        // Other resources use POST with query body
        if (nextCursor) {
          requestBody.cursor = nextCursor;
        }
      }

      logInfo(`Fetching ${resourceType} page ${page + 1}`, { cursor: nextCursor ? 'present' : 'none' });

      let response;
      if (resourceType === 'tasks') {
        response = await client.get(endpoint);
      } else {
        response = await client.post(endpoint, requestBody);
      }

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const { data } = response.data;
      
      if (!Array.isArray(data)) {
        throw new Error(`Invalid API response: expected data array for ${resourceType}`);
      }

      allRecords.push(...data);
      
      // Check pagination - tasks return all at once, others may paginate
      if (resourceType === 'tasks') {
        hasMore = false;
      } else {
        // For objects endpoint, check if there are more results
        if (response.data.meta?.next_cursor) {
          nextCursor = response.data.meta.next_cursor;
          hasMore = page < maxPages - 1;
        } else {
          hasMore = false;
        }
      }

      logInfo(`Fetched ${data.length} ${resourceType}`, { 
        total: allRecords.length, 
        hasMore,
        page: page + 1
      });

      page++;

      // Rate limiting
      if (hasMore && rateLimit > 0) {
        await delay(rateLimit);
      }
    }

    logInfo(`${resourceType} fetch completed`, {
      totalRecords: allRecords.length,
      totalPages: page,
      hasMoreAvailable: hasMore
    });

    return {
      records: allRecords,
      total: allRecords.length,
      hasMore,
      nextCursor
    };

  } catch (error: any) {
    logError(`Failed to fetch ${resourceType}`, {
      page,
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data
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
    apiToken: apiToken.substring(0, 8) + '...'
  });

  // Fetch all resources first, then filter
  // Note: Attio API doesn't support filtering by created_by in the query,
  // so we need to fetch and filter client-side
  const result = await fetchAllResources(client, resourceType, options);
  
  // Filter by created_by API token
  const filteredRecords = result.records.filter(record => {
    // For tasks - check root level created_by_actor
    if (record.created_by_actor) {
      return record.created_by_actor.type === 'api-token' && 
             record.created_by_actor.id === apiToken;
    }
    
    // For companies/people/deals - check values.created_by array
    if (record.values?.created_by) {
      const createdByEntries = Array.isArray(record.values.created_by) 
        ? record.values.created_by 
        : [record.values.created_by];
      
      return createdByEntries.some(entry => 
        entry.referenced_actor_type === 'api-token' && 
        entry.referenced_actor_id === apiToken
      );
    }
    
    return false;
  });

  logInfo(`${resourceType} filtering completed`, {
    totalFetched: result.records.length,
    matchingCreator: filteredRecords.length,
    apiToken: apiToken.substring(0, 8) + '...'
  });

  return {
    records: filteredRecords,
    total: filteredRecords.length,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor
  };
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

  logInfo(`Starting ${resourceType} processing`, { batchSize, hasApiTokenFilter: !!apiToken });

  try {
    const fetchResult = apiToken 
      ? await fetchResourcesByCreator(client, resourceType, apiToken)
      : await fetchAllResources(client, resourceType);

    const batches = chunk(fetchResult.records, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logInfo(`Processing ${resourceType} batch ${i + 1}/${batches.length}`, { 
        batchSize: batch.length 
      });

      await processor(batch);
    }

    logInfo(`${resourceType} processing completed`, {
      totalRecords: fetchResult.total,
      totalBatches: batches.length
    });

  } catch (error) {
    logError(`${resourceType} processing failed`, error);
    throw error;
  }
}