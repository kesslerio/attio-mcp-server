/**
 * Company fetching and processing for cleanup operations
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo } from '../core/utils.js';
import { fetchResourcesByCreator, processResources } from './generic.js';

/**
 * Fetch all companies with pagination
 */
export async function fetchAllCompanies(
  client: AxiosInstance,
  options: {
    pageSize?: number;
    maxPages?: number;
    rateLimit?: number;
  } = {}
): Promise<FetchResult> {
  const { fetchAllResources } = await import('./generic.js');
  return fetchAllResources(client, 'companies', options);
}

/**
 * Fetch companies with filtering by created_by API token
 */
export async function fetchCompaniesByCreator(
  client: AxiosInstance,
  apiToken: string,
  options: {
    pageSize?: number;
    maxPages?: number;
  } = {}
): Promise<FetchResult> {
  logInfo('Fetching companies filtered by API token creator', { 
    apiToken: apiToken.substring(0, 8) + '...'
  });

  return fetchResourcesByCreator(client, 'companies', apiToken, options);
}

/**
 * Process companies in batches for memory efficiency
 */
export async function processCompanies(
  client: AxiosInstance,
  processor: (companies: AttioRecord[]) => Promise<void>,
  options: {
    batchSize?: number;
    apiToken?: string;
  } = {}
): Promise<void> {
  return processResources(client, 'companies', processor, options);
}