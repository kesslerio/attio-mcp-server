/**
 * Companies fetching for cleanup operations.
 *
 * Thin wrapper over the generic objects pipeline (issue #620 refactor):
 * creator filtering happens here, pattern filtering in the processor.
 */
import { AxiosInstance } from 'axios';
import { FetchResult } from '../core/types.js';
import { fetchResourcesByCreator } from './generic.js';

/**
 * Fetch companies filtered by created_by API token.
 */
export async function fetchCompaniesByCreator(
  client: AxiosInstance,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  return fetchResourcesByCreator(client, 'companies', apiToken, options);
}
