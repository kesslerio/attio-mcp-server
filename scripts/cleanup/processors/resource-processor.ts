/**
 * Shared cleanup pipeline for a single resource type (issue #620 refactor).
 *
 * Every resource flows through the same safety chain:
 * fetch by API-token creator → pattern filter (defaulting to conservative
 * test patterns) → optional extra safety filter → dry-run reporting to
 * /tmp → batch deletion → summary.
 */
import { AxiosInstance } from 'axios';
import { AttioRecord, ResourceSummary, ResourceType } from '../core/types.js';
import { filterByPatterns } from '../filters/pattern-filter.js';
import {
  batchDeleteRecords,
  createResourceSummary,
  DeletionOptions,
} from '../deleters/batch-deleter.js';
import { writeDeletionListToTmp } from '../utils/tmp-writer.js';
import { logInfo } from '../core/utils.js';
/** Preview a ≤10-record list to stdout during dry runs. */
export function previewRecords(
  label: string,
  records: AttioRecord[],
  describe: (record: AttioRecord) => string
): void {
  console.log(`\n📋 Found ${records.length} ${label} to delete:`);
  records.slice(0, 10).forEach((record, index) => {
    console.log(`  ${index + 1}. ${describe(record)}`);
  });
  if (records.length > 10) {
    console.log(`  ... and ${records.length - 10} more`);
  }
}

export interface ProcessResourceConfig {
  resourceType: ResourceType;
  /** Emoji-free label used in logs, e.g. 'tasks'. */
  label: string;
  /**
   * Fetch the candidate set, already narrowed to API-token-created records
   * (standard-object fetchers do the creator filter internally).
   */
  fetchRecords: (client: AxiosInstance) => Promise<AttioRecord[]>;
  defaultPatterns: string[];
  describeRecord: (record: AttioRecord) => string;
  /**
   * Optional extra safety gate applied after pattern filtering (e.g. the
   * protected-company allowlist). Returns records safe to delete and the
   * protected remainder, which is written to a /tmp file for review.
   */
  protect?: (matched: AttioRecord[]) => {
    toDelete: AttioRecord[];
    protectedRecords: AttioRecord[];
  };
}

/**
 * Run fetch → filter → delete for one resource type.
 */
export async function processResource(
  client: AxiosInstance,
  apiToken: string,
  patterns: string[],
  deletionOptions: DeletionOptions,
  config: ProcessResourceConfig
): Promise<ResourceSummary> {
  const {
    resourceType,
    label,
    fetchRecords,
    defaultPatterns,
    describeRecord,
    protect,
  } = config;

  logInfo(`🔍 Processing ${label}...`);

  const fetched = await fetchRecords(client);
  if (fetched.length === 0) {
    logInfo(`No ${label} found created by API token`);
    return createResourceSummary(resourceType, [], {
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0,
    });
  }

  // CRITICAL SAFETY: require BOTH API token filtering AND pattern filtering,
  // so legitimate business records are never deleted.
  let finalPatterns = patterns;
  if (patterns.length === 0) {
    finalPatterns = defaultPatterns;
    logInfo(
      `🛡️ SAFETY: Using default test patterns for ${label} (no patterns specified)`,
      {
        defaultPatterns: finalPatterns,
        reason: `${label} require pattern filtering to prevent deletion of legitimate business data`,
      }
    );
  }

  const patternResult = filterByPatterns(fetched, finalPatterns, resourceType);
  if (patternResult.matched.length === 0) {
    logInfo(
      `✅ SAFE: No ${label} match test patterns - legitimate business data preserved`,
      {
        apiTokenRecords: fetched.length,
        patternMatches: 0,
        excludedRecords: patternResult.excluded.length,
      }
    );
    return createResourceSummary(resourceType, [], {
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0,
    });
  }

  logInfo(
    `🔍 ${label.toUpperCase()} SAFETY CHECK: Found ${patternResult.matched.length} ${label} matching BOTH API token AND test patterns`,
    {
      totalApiTokenRecords: fetched.length,
      patternMatches: patternResult.matched.length,
      excludedByPatterns: patternResult.excluded.length,
      safetyNote: 'Only MCP-created records with test patterns will be deleted',
    }
  );

  let recordsToDelete = patternResult.matched;
  if (protect) {
    const { toDelete, protectedRecords } = protect(patternResult.matched);
    if (protectedRecords.length > 0) {
      console.log(
        `\n⚠️  Protected ${protectedRecords.length} real ${label} from deletion:`
      );
      protectedRecords.slice(0, 10).forEach((record, index) => {
        console.log(`  ${index + 1}. ${describeRecord(record)} (PROTECTED)`);
      });
      if (protectedRecords.length > 10) {
        console.log(`  ... and ${protectedRecords.length - 10} more protected`);
      }
    }
    if (deletionOptions.dryRun && protectedRecords.length > 0) {
      const protectedFile = writeDeletionListToTmp(
        label,
        protectedRecords,
        true,
        describeRecord
      );
      console.log(`\n📄 Protected ${label} list saved: ${protectedFile}`);
    }
    recordsToDelete = toDelete;
    if (recordsToDelete.length === 0) {
      logInfo(`No test ${label} to delete after safety filtering`);
      return createResourceSummary(resourceType, [], {
        successful: 0,
        failed: 0,
        errors: [],
        duration: 0,
      });
    }
  }

  if (deletionOptions.dryRun) {
    previewRecords(label, recordsToDelete, describeRecord);
    const deleteFile = writeDeletionListToTmp(
      label,
      recordsToDelete,
      false,
      describeRecord
    );
    console.log(`\n📄 ${label} to delete list saved: ${deleteFile}`);
  }

  const deletionResult = await batchDeleteRecords(
    client,
    recordsToDelete,
    resourceType,
    deletionOptions
  );
  return createResourceSummary(resourceType, recordsToDelete, deletionResult);
}
