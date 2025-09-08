/**
 * Deal fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo } from '../core/utils.js';
import { fetchResourcesByCreator, processResources } from './generic.js';

/**
 * Fetch all deals with pagination
 */
export async function fetchAllDeals(
  client: AxiosInstance,
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const { fetchAllResources } = await import('./generic.js');
  return fetchAllResources(client, 'deals', options);
}

/**
 * Fetch deals with filtering by created_by API token
 */
export async function fetchDealsByCreator(
  client: AxiosInstance,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo('Fetching deals filtered by API token creator', { 
    apiToken: apiToken.substring(0, 8) + '...'
  });

  return fetchResourcesByCreator(client, 'deals', apiToken, options);
}

/**
 * Process deals in batches for memory efficiency
 */
export async function processDeals(
  client: AxiosInstance,
  processor: (deals: AttioRecord[]) => Promise<void>,
  options: {
    batchSize?: number;
    apiToken?: string;
  } = {}
): Promise<void> {
  return processResources(client, 'deals', processor, options);
}