/**
 * Task fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError, chunk } from '../core/utils.js';
import { filterRecordsByCreator } from '../filters/creator-filter.js';

const TASKS_ENDPOINT = '/tasks';

/**
 * Fetch all tasks.
 *
 * The tasks API returns all open tasks in a single response; no pagination.
 */
export async function fetchAllTasks(
  client: AxiosInstance
): Promise<FetchResult> {
  logInfo('Starting task fetch operation');

  try {
    const response = await client.get(TASKS_ENDPOINT);

    if (response.status !== 200) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { data } = response.data;

    if (!Array.isArray(data)) {
      throw new Error('Invalid API response: expected data array');
    }

    logInfo(`Fetched ${data.length} tasks`, { total: data.length });

    return {
      records: data as AttioRecord[],
      total: data.length,
      hasMore: false,
    };
  } catch (error: any) {
    logError('Failed to fetch tasks', {
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Fetch tasks with filtering by created_by
 */
export async function fetchTasksByCreator(
  client: AxiosInstance,
  apiToken: string
): Promise<FetchResult> {
  logInfo('Fetching tasks filtered by API token creator', {
    apiToken: apiToken.substring(0, 8) + '...',
  });

  const result = await fetchAllTasks(client);
  return filterRecordsByCreator(result, apiToken, 'tasks');
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

  logInfo('Starting task processing', {
    batchSize,
    hasApiTokenFilter: !!apiToken,
  });

  try {
    const fetchResult = apiToken
      ? await fetchTasksByCreator(client, apiToken)
      : await fetchAllTasks(client);

    const batches = chunk(fetchResult.records, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logInfo(`Processing task batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
      });

      await processor(batch);
    }

    logInfo('Task processing completed', {
      totalTasks: fetchResult.total,
      totalBatches: batches.length,
    });
  } catch (error) {
    logError('Task processing failed', error);
    throw error;
  }
}
