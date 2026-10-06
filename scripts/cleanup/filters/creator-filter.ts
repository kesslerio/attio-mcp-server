/**
 * Filter a fetched record set down to records created by the target API token.
 *
 * The Attio query endpoints do not support server-side filtering by
 * created_by, so every fetcher fetches first and filters client-side here.
 *
 * SAFETY: records whose creator cannot be verified are excluded, never
 * deleted — an unknown creator could be legitimate business data.
 */
import { AttioRecord, FetchResult, ResourceType } from '../core/types.js';
import { logInfo } from '../core/utils.js';

/**
 * Match either creator shape:
 * - tasks/notes/lists: root-level `created_by_actor`
 * - object records: `values.created_by[]` entries
 */
export function isCreatedOrUpdatedByApiToken(
  record: AttioRecord,
  apiToken: string
): boolean {
  const rootActor = record.created_by_actor;
  if (rootActor && typeof rootActor === 'object') {
    if (rootActor.type === 'api-token' && rootActor.id === apiToken) {
      return true;
    }
  }

  // Attio notes responses carry a top-level `creator` instead of values.created_by.
  const creator = record.creator;
  if (creator && typeof creator === 'object') {
    if (
      (creator.type === 'api-token' || creator.type === 'api_token') &&
      creator.id === apiToken
    ) {
      return true;
    }
  }

  const createdBy = record.values?.created_by;
  if (createdBy !== undefined) {
    const entries = Array.isArray(createdBy) ? createdBy : [createdBy];
    return entries.some(
      (entry) =>
        entry?.referenced_actor_type === 'api-token' &&
        entry?.referenced_actor_id === apiToken
    );
  }

  return false;
}

/**
 * Apply creator filtering to a fetch result, with debug-grade rejection stats.
 */
export function filterRecordsByCreator(
  fetchResult: FetchResult,
  apiToken: string,
  resourceType: ResourceType
): FetchResult {
  const target = apiToken.substring(0, 8) + '...';
  let matched = 0;
  let noCreatedByField = 0;
  let wrongActor = 0;
  const sampleNonMatches: Array<{ id: string; reason: string }> = [];

  const filteredRecords = fetchResult.records.filter((record, index) => {
    const recordId =
      record.id?.record_id ||
      record.id?.task_id ||
      record.id ||
      `index-${index}`;

    if (isCreatedOrUpdatedByApiToken(record, apiToken)) {
      matched++;
      return true;
    }

    const hasCreatorInfo =
      record.created_by_actor !== undefined ||
      record.values?.created_by !== undefined;
    if (!hasCreatorInfo) {
      noCreatedByField++;
    } else {
      wrongActor++;
    }

    if (sampleNonMatches.length < 5) {
      sampleNonMatches.push({
        id: String(recordId),
        reason: hasCreatorInfo ? 'creator_mismatch' : 'no_created_by_field',
      });
    }
    return false;
  });

  logInfo(`${resourceType} creator filtering completed`, {
    totalFetched: fetchResult.records.length,
    matchingCreator: matched,
    rejected: fetchResult.records.length - matched,
    rejectionReasons: { noCreatedByField, wrongActor },
    targetApiToken: target,
  });

  if (noCreatedByField > 0) {
    logInfo(
      `⚠️  SAFETY: ${noCreatedByField} ${resourceType} records excluded due to missing created_by field`,
      {
        count: noCreatedByField,
        message: 'Records without creator information are excluded for safety',
      }
    );
  }

  if (sampleNonMatches.length > 0) {
    logInfo(`DEBUG: Sample non-matching ${resourceType} records`, {
      samples: sampleNonMatches,
    });
  }

  if (fetchResult.hasMore) {
    logInfo(
      `⚠️ WARNING: ${resourceType} pagination limit reached during filtering`,
      {
        fetchedRecords: fetchResult.records.length,
        matchedRecords: matched,
        recommendation:
          'Consider increasing maxPages option in the cleanup script to fetch more records',
      }
    );
  }

  return {
    records: filteredRecords,
    total: filteredRecords.length,
    hasMore: fetchResult.hasMore,
    nextCursor: fetchResult.nextCursor,
  };
}
