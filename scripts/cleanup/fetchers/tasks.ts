/**
 * Task fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo } from '../core/utils.js';
import { filterRecordsByCreator } from '../filters/creator-filter.js';

const TASKS_ENDPOINT = '/tasks';

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

  const response = await client.get(TASKS_ENDPOINT);

  if (response.status !== 200) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = Array.isArray(response.data)
    ? response.data
    : response.data?.data || [];
  const records = data as AttioRecord[];

  return filterRecordsByCreator(
    { records, total: records.length, hasMore: false },
    apiToken,
    'tasks'
  );
}
