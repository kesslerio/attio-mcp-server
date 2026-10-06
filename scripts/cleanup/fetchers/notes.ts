/**
 * Notes fetching for cleanup operations (issue #620).
 *
 * Notes are first-class Attio resources under /v2/notes — NOT object records.
 * Fetching them via /objects/notes/records/query 404s with
 * "No Object was found for path param slug 'notes'".
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError, delay } from '../core/utils.js';
import { filterRecordsByCreator } from '../filters/creator-filter.js';

const NOTES_ENDPOINT = '/notes';
const DEFAULT_PAGE_SIZE = 100;
const RATE_LIMIT_DELAY = 250; // ms between requests
const DEFAULT_MAX_PAGES = 100;

/**
 * Fetch notes with offset pagination.
 *
 * Attio limitation (issue #888, verified in test/e2e/mcp/note-operations/
 * note-search-validation.mcp.test.ts): GET /v2/notes WITHOUT parent_object /
 * parent_record_id filters returns an empty array — notes cannot be listed
 * workspace-wide. A parent scope is therefore required.
 */
export async function fetchAllNotes(
  client: AxiosInstance,
  parentScope: { parent_object: string; parent_record_id: string },
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = DEFAULT_MAX_PAGES,
    rateLimit = RATE_LIMIT_DELAY,
  } = options;

  logInfo('Starting note fetch operation', {
    pageSize,
    maxPages,
    parent_object: parentScope.parent_object,
    parent_record_id: parentScope.parent_record_id,
  });

  const allRecords: AttioRecord[] = [];
  let page = 0;
  let hasMore = true;
  let offset = 0;

  try {
    while (hasMore && page < maxPages) {
      // Offset pagination only — matching fetchers/generic.ts: Attio's
      // notes endpoint does not return usable cursor metadata.
      const params: Record<string, number | string> = {
        limit: pageSize,
        offset,
        parent_object: parentScope.parent_object,
        parent_record_id: parentScope.parent_record_id,
      };

      logInfo(`Fetching notes page ${page + 1}`, { offset, pageSize });

      const response = await client.get(NOTES_ENDPOINT, { params });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = response.data?.data;
      if (!Array.isArray(data)) {
        // Defensive: a non-array payload means we cannot trust pagination.
        logInfo('Notes response contained no data array; stopping pagination', {
          page: page + 1,
          keys: Object.keys(response.data ?? {}),
        });
        break;
      }

      allRecords.push(...data);

      // Short page = end of results (same termination rule as generic.ts).
      hasMore = data.length >= pageSize;
      if (hasMore) {
        offset += data.length;
      }

      logInfo(`Fetched ${data.length} notes`, {
        total: allRecords.length,
        hasMore,
        page: page + 1,
      });

      page++;

      if (hasMore && rateLimit > 0) {
        await delay(rateLimit);
      }
    }

    if (hasMore && page >= maxPages) {
      logInfo(`⚠️ WARNING: notes fetch stopped at page limit (${maxPages})`, {
        recordsFetched: allRecords.length,
        recommendation: 'Increase maxPages option if you need all records',
      });
    }

    logInfo('Note fetch completed', {
      totalRecords: allRecords.length,
      totalPages: page,
      hasMoreAvailable: hasMore,
    });

    return {
      records: allRecords,
      total: allRecords.length,
      hasMore,
    };
  } catch (error: any) {
    logError('Failed to fetch notes', {
      page,
      error: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Fetch notes for one parent record, filtered by created_by API token.
 */
export async function fetchNotesByCreator(
  client: AxiosInstance,
  apiToken: string,
  parentScope: { parent_object: string; parent_record_id: string },
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo('Fetching notes filtered by API token creator', {
    apiToken: apiToken.substring(0, 8) + '...',
    parent_object: parentScope.parent_object,
    parent_record_id: parentScope.parent_record_id,
  });

  const result = await fetchAllNotes(client, parentScope, options);
  return filterRecordsByCreator(result, apiToken, 'notes');
}
