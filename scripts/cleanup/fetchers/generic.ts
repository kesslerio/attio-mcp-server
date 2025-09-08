/**
 * Generic resource fetching for cleanup operations
 * Works with any Attio resource type (companies, people, deals, etc.)
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, FetchResult } from '../core/types.js';
import { logInfo, logError, delay, chunk } from '../core/utils.js';

const DEFAULT_PAGE_SIZE = 500;
const RATE_LIMIT_DELAY = 250; // ms between requests

// For cleanup operations, we need to fetch ALL records, not just the first few pages
const CLEANUP_MAX_PAGES = 1000; // Allow up to 500k records (1000 * 500)

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
  const { pageSize = DEFAULT_PAGE_SIZE, maxPages = CLEANUP_MAX_PAGES, rateLimit = RATE_LIMIT_DELAY } = options;
  
  logInfo(`DEBUG: fetchAllResources configuration`, {
    pageSize,
    maxPages,
    maxTotalRecords: pageSize * maxPages,
    resourceType
  });
  
  logInfo(`Starting ${resourceType} fetch operation`, { pageSize, maxPages });

  const allRecords: AttioRecord[] = [];
  let page = 0;
  let hasMore = true;
  let nextCursor: string | undefined;
  let offset = 0;

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
        // Use offset for pagination instead of cursor (Attio doesn't return cursor metadata)
        if (offset > 0) {
          requestBody.offset = offset;
        }
      }

      logInfo(`Fetching ${resourceType} page ${page + 1}`, { 
        offset: offset,
        cursor: nextCursor ? nextCursor.substring(0, 20) + '...' : 'none',
        requestBody: resourceType === 'tasks' ? 'GET (no body)' : JSON.stringify(requestBody).substring(0, 100) + '...'
      });

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
        // For objects endpoint, check if we got a full page
        // If we got fewer records than requested, we've reached the end
        if (data.length < pageSize) {
          hasMore = false; // Got fewer than requested, no more pages
        } else {
          hasMore = true; // Got full page, there might be more
          offset += data.length; // Update offset for next request
        }
        
        // Legacy cursor support (in case Attio adds it back)
        if (response.data.meta?.next_cursor) {
          nextCursor = response.data.meta.next_cursor;
        }
      }

      logInfo(`Fetched ${data.length} ${resourceType}`, { 
        total: allRecords.length, 
        hasMore,
        page: page + 1,
        offset: offset,
        cursor: nextCursor ? 'present' : 'none',
        pageProgress: `${page + 1}/${maxPages}`,
        gotFullPage: data.length === pageSize
      });

      page++;

      // Rate limiting
      if (hasMore && rateLimit > 0) {
        await delay(rateLimit);
      }
    }

    const hitPageLimit = hasMore && page >= maxPages;
    
    logInfo(`${resourceType} fetch completed`, {
      totalRecords: allRecords.length,
      totalPages: page,
      hasMoreAvailable: hasMore,
      maxPagesLimit: maxPages,
      hitPageLimit,
      finalCursor: nextCursor || 'none'
    });

    // Warn if we stopped due to page limit, not because we ran out of data
    if (hitPageLimit) {
      logInfo(`⚠️ WARNING: ${resourceType} fetch stopped at page limit (${maxPages})`, {
        recordsFetched: allRecords.length,
        estimatedTotal: `>${allRecords.length}`,
        recommendation: 'Increase maxPages option if you need all records'
      });
    }

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
  
  logInfo(`DEBUG: Starting filtering process for ${resourceType}`, {
    totalFetched: result.records.length,
    targetApiToken: apiToken.substring(0, 8) + '...',
    hasMore: result.hasMore
  });

  // Track filtering statistics
  let matchedByTaskPattern = 0;
  let matchedByValuesPattern = 0;
  let noCreatedByField = 0;
  let wrongActorType = 0;
  let wrongActorId = 0;
  const sampleNonMatches: Array<{id: string, reason: string, structure: string}> = [];
  
  // Filter by created_by API token
  const filteredRecords = result.records.filter((record, index) => {
    const recordId = record.id?.record_id || record.id?.task_id || record.id || `index-${index}`;
    
    // For tasks - check root level created_by_actor
    if (record.created_by_actor) {
      if (record.created_by_actor.type === 'api-token' && 
          record.created_by_actor.id === apiToken) {
        matchedByTaskPattern++;
        return true;
      } else {
        const reason = record.created_by_actor.type !== 'api-token' 
          ? `wrong_type:${record.created_by_actor.type}` 
          : `wrong_id:${record.created_by_actor.id?.substring(0, 8)}...`;
        
        if (sampleNonMatches.length < 5) {
          sampleNonMatches.push({
            id: recordId,
            reason: `task_pattern_${reason}`,
            structure: `created_by_actor:{type:${record.created_by_actor.type},id:${record.created_by_actor.id?.substring(0, 8)}...}`
          });
        }
        
        if (record.created_by_actor.type !== 'api-token') wrongActorType++;
        else wrongActorId++;
        
        return false;
      }
    }
    
    // For companies/people/deals - check values.created_by array
    if (record.values?.created_by) {
      const createdByEntries = Array.isArray(record.values.created_by) 
        ? record.values.created_by 
        : [record.values.created_by];
      
      const matched = createdByEntries.some(entry => 
        entry.referenced_actor_type === 'api-token' && 
        entry.referenced_actor_id === apiToken
      );
      
      if (matched) {
        matchedByValuesPattern++;
        return true;
      } else {
        // Log details about why this didn't match
        const entryReasons = createdByEntries.map(entry => 
          entry.referenced_actor_type !== 'api-token' 
            ? `wrong_type:${entry.referenced_actor_type}`
            : `wrong_id:${entry.referenced_actor_id?.substring(0, 8)}...`
        );
        
        if (sampleNonMatches.length < 5) {
          sampleNonMatches.push({
            id: recordId,
            reason: `values_pattern_${entryReasons.join('|')}`,
            structure: `values.created_by:[${createdByEntries.map(e => `{type:${e.referenced_actor_type},id:${e.referenced_actor_id?.substring(0, 8)}...}`).join(',')}]`
          });
        }
        
        createdByEntries.forEach(entry => {
          if (entry.referenced_actor_type !== 'api-token') wrongActorType++;
          else wrongActorId++;
        });
        
        return false;
      }
    }
    
    // No created_by information found
    noCreatedByField++;
    
    if (sampleNonMatches.length < 5) {
      const keys = Object.keys(record.values || {});
      sampleNonMatches.push({
        id: recordId,
        reason: 'no_created_by_field',
        structure: `available_fields:[${keys.slice(0, 5).join(',')}${keys.length > 5 ? '...' : ''}]`
      });
    }
    
    return false;
  });

  // Log comprehensive filtering results
  logInfo(`DEBUG: ${resourceType} filtering analysis`, {
    totalFetched: result.records.length,
    matchedRecords: filteredRecords.length,
    matchedByTaskPattern,
    matchedByValuesPattern,
    rejectedRecords: result.records.length - filteredRecords.length,
    rejectionReasons: {
      noCreatedByField,
      wrongActorType,
      wrongActorId
    },
    targetApiToken: apiToken.substring(0, 8) + '...'
  });

  // Log sample non-matching records for debugging
  if (sampleNonMatches.length > 0) {
    logInfo(`DEBUG: Sample non-matching ${resourceType} records`, {
      samples: sampleNonMatches
    });
  }

  // If we got fewer matches than expected, show pagination info
  if (result.hasMore) {
    logInfo(`⚠️ WARNING: ${resourceType} pagination limit reached during filtering`, {
      fetchedRecords: result.records.length,
      matchedRecords: filteredRecords.length,
      hasMoreAvailable: result.hasMore,
      possibleMissedRecords: 'Target records may exist beyond the fetched pages',
      recommendation: 'Consider increasing maxPages option in the cleanup script to fetch more records'
    });
  }

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