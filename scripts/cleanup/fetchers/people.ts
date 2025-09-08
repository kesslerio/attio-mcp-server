/**
 * People fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo } from '../core/utils.js';
import { fetchResourcesByCreator, processResources } from './generic.js';

/**
 * Fetch all people with pagination
 */
export async function fetchAllPeople(
  client: AxiosInstance,
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const { fetchAllResources } = await import('./generic.js');
  return fetchAllResources(client, 'people', options);
}

/**
 * Fetch people with filtering by created_by API token
 */
export async function fetchPeopleByCreator(
  client: AxiosInstance,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo('Fetching people filtered by API token creator', { 
    apiToken: apiToken.substring(0, 8) + '...'
  });

  return fetchResourcesByCreator(client, 'people', apiToken, options);
}

/**
 * Process people in batches for memory efficiency
 */
export async function processPeople(
  client: AxiosInstance,
  processor: (people: AttioRecord[]) => Promise<void>,
  options: {
    batchSize?: number;
    apiToken?: string;
  } = {}
): Promise<void> {
  return processResources(client, 'people', processor, options);
}