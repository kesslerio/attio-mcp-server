/**
 * Batch deletion operations for cleanup scripts
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, ResourceType, ResourceSummary } from '../core/types.js';
import { extractRecordId, extractRecordName, delay, chunk, logInfo, logError, logSuccess } from '../core/utils.js';

export interface DeletionOptions {
  parallel: number;
  rateLimit: number;
  dryRun: boolean;
  continueOnError: boolean;
}

export interface DeletionResult {
  successful: number;
  failed: number;
  errors: Array<{ id: string; name: string; error: string }>;
  duration: number;
}

/**
 * Delete a single record
 */
async function deleteSingleRecord(
  client: AxiosInstance, 
  record: AttioRecord, 
  resourceType: ResourceType,
  dryRun: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const id = extractRecordId(record, resourceType);
  const name = extractRecordName(record, resourceType);

  if (dryRun) {
    logInfo(`[DRY RUN] Would delete ${resourceType}`, { id, name });
    return { success: true };
  }

  try {
    let endpoint: string;
    
    switch (resourceType) {
      case 'companies':
        endpoint = `/objects/companies/records/${id}`;
        break;
      case 'people':
        endpoint = `/objects/people/records/${id}`;
        break;
      case 'tasks':
        endpoint = `/tasks/${id}`;
        break;
      case 'lists':
        endpoint = `/objects/lists/records/${id}`;
        break;
      case 'notes':
        endpoint = `/objects/notes/records/${id}`;
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }

    const response = await client.delete(endpoint);
    
    if (response.status === 200 || response.status === 204) {
      logSuccess(`Deleted ${resourceType}`, { id, name });
      return { success: true };
    }
    
    throw new Error(`Unexpected status code: ${response.status}`);

  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
    logError(`Failed to delete ${resourceType}`, { id, name, error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Delete records in parallel batches
 */
export async function batchDeleteRecords(
  client: AxiosInstance,
  records: AttioRecord[],
  resourceType: ResourceType,
  options: DeletionOptions
): Promise<DeletionResult> {
  const startTime = Date.now();
  const { parallel, rateLimit, dryRun, continueOnError } = options;
  
  logInfo(`Starting ${dryRun ? 'DRY RUN ' : ''}batch deletion`, {
    resourceType,
    count: records.length,
    parallel,
    rateLimit
  });

  if (records.length === 0) {
    return { successful: 0, failed: 0, errors: [], duration: 0 };
  }

  const batches = chunk(records, parallel);
  const results: DeletionResult = {
    successful: 0,
    failed: 0,
    errors: [],
    duration: 0
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    logInfo(`Processing ${resourceType} batch ${i + 1}/${batches.length}`, { 
      batchSize: batch.length 
    });

    // Process batch in parallel
    const batchPromises = batch.map(record => 
      deleteSingleRecord(client, record, resourceType, dryRun)
    );

    const batchResults = await Promise.all(batchPromises);

    // Collect results
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const record = batch[j];
      
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          id: extractRecordId(record, resourceType),
          name: extractRecordName(record, resourceType),
          error: result.error || 'Unknown error'
        });

        if (!continueOnError) {
          throw new Error(`Deletion failed for ${extractRecordName(record, resourceType)}: ${result.error}`);
        }
      }
    }

    // Rate limiting between batches
    if (i < batches.length - 1 && rateLimit > 0) {
      await delay(rateLimit);
    }
  }

  results.duration = Date.now() - startTime;

  logInfo(`${dryRun ? 'DRY RUN ' : ''}Batch deletion completed`, {
    resourceType,
    successful: results.successful,
    failed: results.failed,
    duration: `${results.duration}ms`
  });

  return results;
}

/**
 * Create a resource summary from deletion results
 */
export function createResourceSummary(
  resourceType: ResourceType,
  records: AttioRecord[],
  deletionResult: DeletionResult
): ResourceSummary {
  return {
    type: resourceType,
    found: records.length,
    deleted: deletionResult.successful,
    errors: deletionResult.failed,
    items: records.map(record => ({
      id: extractRecordId(record, resourceType),
      name: extractRecordName(record, resourceType),
      createdBy: record.created_by_actor?.id,
      createdAt: record.created_at
    }))
  };
}

/**
 * Display deletion summary
 */
export function displayDeletionSummary(
  summaries: ResourceSummary[], 
  dryRun: boolean = false
): void {
  const mode = dryRun ? 'DRY RUN' : 'LIVE';
  const action = dryRun ? 'Would delete' : 'Deleted';
  
  console.log(`\n📊 ${mode} SUMMARY`);
  console.log('='.repeat(50));
  
  let totalFound = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const summary of summaries) {
    totalFound += summary.found;
    totalDeleted += summary.deleted;
    totalErrors += summary.errors;

    if (summary.found > 0) {
      console.log(`\n${summary.type.toUpperCase()}:`);
      console.log(`  Found: ${summary.found}`);
      console.log(`  ${action}: ${summary.deleted}`);
      if (summary.errors > 0) {
        console.log(`  Errors: ${summary.errors}`);
      }
    }
  }

  console.log(`\nTOTAL:`);
  console.log(`  Found: ${totalFound}`);
  console.log(`  ${action}: ${totalDeleted}`);
  if (totalErrors > 0) {
    console.log(`  Errors: ${totalErrors}`);
  }
  console.log();
}