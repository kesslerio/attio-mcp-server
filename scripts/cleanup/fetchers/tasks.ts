/**
 * Task fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError, delay, chunk } from '../core/utils.js';

const TASKS_ENDPOINT = '/tasks';
const DEFAULT_PAGE_SIZE = 100;
const RATE_LIMIT_DELAY = 250; // ms between requests

/**
 * Fetch all tasks with pagination
 */
export async function fetchAllTasks(
  client: AxiosInstance,
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const { pageSize = DEFAULT_PAGE_SIZE, maxPages = 50, rateLimit = RATE_LIMIT_DELAY } = options;
  
  logInfo('Starting task fetch operation', { pageSize, maxPages });

  const allRecords: AttioRecord[] = [];
  let page = 0;
  let hasMore = true;
  let nextCursor: string | undefined;

  try {
    while (hasMore && page < maxPages) {
      const requestBody: any = {
        limit: pageSize
      };

      if (nextCursor) {
        requestBody.cursor = nextCursor;
      }

      logInfo(`Fetching tasks page ${page + 1}`, { cursor: nextCursor ? 'present' : 'none' });

      const response = await client.get(TASKS_ENDPOINT);

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const { data } = response.data;
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid API response: expected data array');
      }

      allRecords.push(...data);
      
      // Tasks API returns all tasks at once, no pagination
      hasMore = false;

      logInfo(`Fetched ${data.length} tasks`, { 
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

    logInfo('Task fetch completed', {
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
    logError('Failed to fetch tasks', {
      page,
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data
    });
    throw error;
  }
}

/**
 * Fetch tasks with filtering by created_by
 */
export async function fetchTasksByCreator(
  client: AxiosInstance,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo('Fetching tasks filtered by API token creator', { 
    apiToken: apiToken.substring(0, 8) + '...'
  });

  // Fetch all tasks first, then filter
  // Note: Attio API doesn't support filtering by created_by in the query,
  // so we need to fetch and filter client-side
  const result = await fetchAllTasks(client, options);
  
  // Filter by created_by API token
  const filteredRecords = result.records.filter(record => 
    record.created_by_actor?.type === 'api-token' && 
    record.created_by_actor?.id === apiToken
  );

  logInfo('Task filtering completed', {
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
 * Process tasks in batches for memory efficiency
 */
export async function processTasks(
  client: AxiosInstance,
  processor: (tasks: AttioRecord[]) => Promise<void>,
  options: {
    batchSize?: number;
    apiToken?: string;
  } = {}
): Promise<void> {
  const { batchSize = 50, apiToken } = options;

  logInfo('Starting task processing', { batchSize, hasApiTokenFilter: !!apiToken });

  try {
    const fetchResult = apiToken 
      ? await fetchTasksByCreator(client, apiToken)
      : await fetchAllTasks(client);

    const batches = chunk(fetchResult.records, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logInfo(`Processing task batch ${i + 1}/${batches.length}`, { 
        batchSize: batch.length 
      });

      await processor(batch);
    }

    logInfo('Task processing completed', {
      totalTasks: fetchResult.total,
      totalBatches: batches.length
    });

  } catch (error) {
    logError('Task processing failed', error);
    throw error;
  }
}