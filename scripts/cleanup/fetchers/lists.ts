/**
 * Lists fetching for cleanup operations (issue #620).
 *
 * Lists are first-class Attio resources under /v2/lists — NOT object records.
 * Fetching them via /objects/lists/records/query 404s with
 * "No Object was found for path param slug 'lists'".
 *
 * Scope: the cleanup deletes LIST resources themselves (DELETE /lists/{id}),
 * the same object the universal delete tool exposes. It does not remove
 * list-entry memberships of other records.
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError } from '../core/utils.js';
import { filterRecordsByCreator } from '../filters/creator-filter.js';

const LISTS_ENDPOINT = '/lists';
const DEFAULT_LIMIT = 200;

/**
 * Normalize the several documented list-response envelopes to an array.
 * (`response.data | .lists | .items`, plus a possible double `data` wrapper.)
 */
export function normalizeListResponse(payload: unknown): AttioRecord[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const data = (payload as Record<string, unknown>).data ?? payload;
  const candidates = [
    (data as Record<string, unknown>)?.data,
    data,
    (data as Record<string, unknown>)?.lists,
    (data as Record<string, unknown>)?.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as AttioRecord[];
    }
  }
  return [];
}

/**
 * Fetch all lists in the workspace.
 *
 * The lists API returns the full set for the workspace; no pagination loop.
 */
export async function fetchAllLists(
  client: AxiosInstance
): Promise<FetchResult> {
  logInfo('Starting list fetch operation', { limit: DEFAULT_LIMIT });

  try {
    const response = await client.get(LISTS_ENDPOINT, {
      params: { limit: DEFAULT_LIMIT },
    });

    if (response.status !== 200) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const records = normalizeListResponse(response.data);

    logInfo('List fetch completed', { totalRecords: records.length });

    return {
      records,
      total: records.length,
      hasMore: false,
    };
  } catch (error: any) {
    logError('Failed to fetch lists', {
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Fetch lists filtered by created_by API token.
 *
 * SAFETY note: lists created through the UI often have no creator metadata,
 * and the creator filter excludes anything it cannot attribute — so an
 * empty result here is the safe, expected outcome, not a bug.
 */
export async function fetchListsByCreator(
  client: AxiosInstance,
  apiToken: string
): Promise<FetchResult> {
  logInfo('Fetching lists filtered by API token creator', {
    apiToken: apiToken.substring(0, 8) + '...',
  });

  const result = await fetchAllLists(client);
  return filterRecordsByCreator(result, apiToken, 'lists');
}
