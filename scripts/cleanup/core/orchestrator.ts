/**
 * Cleanup orchestration: one pass of the fetch → filter → delete pipeline
 * (issue #620).
 *
 * The safety gate lives in core/main.ts and reads the totals returned here.
 *
 * FETCH-IDENTITY INVARIANT: both the dry-run pass and the live pass call
 * this same runCleanupPass, so the gate vets exactly the record set the
 * live pass would delete. If these two paths ever diverge, the gate vets
 * one set while the other is deleted. Keep a single fetch path.
 */
import type { AxiosInstance } from 'axios';
import {
  AttioRecord,
  CleanupOptions,
  RegistryResource,
  ResourceSummary,
} from './types.js';
import {
  initializeCleanupClient,
  testConnection,
  validateCleanupPermissions,
} from './client.js';
import { getValidatedApiToken } from '../filters/api-token-filter.js';
import {
  displayDeletionSummary,
  DeletionOptions,
} from '../deleters/batch-deleter.js';
import {
  buildResourceConfig,
  isRegistryResource,
  NOTES_UNSUPPORTED_NOTICE,
} from './resources.js';
import { processResource } from '../processors/resource-processor.js';
import { validateRunInputs } from '../validation/preflight.js';
import { logError, logInfo, logSuccess, formatDuration } from './utils.js';

const DEFAULT_RATE_LIMIT = 250;

/**
 * Injectable handlers. Production callers omit them and get the real Attio
 * client and resource registry; tests inject fakes to exercise the safety
 * gate without network access or live deletion.
 */
export interface CleanupHandlers {
  getClient: () => AxiosInstance;
  testConnection: () => Promise<boolean>;
  validatePermissions: (apiToken: string) => Promise<void>;
  /**
   * The safety chain shared by every pass — fetch + creator filter +
   * pattern filter + protected-allowlist gate.
   */
  applySafetyChain: (
    client: AxiosInstance,
    resource: RegistryResource,
    apiToken: string,
    patterns: string[],
    dryRun: boolean,
    parallel: number
  ) => Promise<ResourceSummary>;
}

/**
 * Production safety chain.
 *
 * SAFETY: every resource passes BOTH the API-token creator filter AND the
 * test-name pattern filter (empty patterns match nothing, by design). For
 * companies a third gate excludes the protected allowlist. Records whose
 * creator cannot be attributed are excluded. See the guard comments in
 * processors/resource-processor.ts.
 */
async function productionSafetyChain(
  client: AxiosInstance,
  resource: RegistryResource,
  apiToken: string,
  patterns: string[],
  dryRun: boolean,
  parallel: number
): Promise<ResourceSummary> {
  // Deliberate documented no-op for notes (see NOTES_UNSUPPORTED_NOTICE in
  // resources.ts). A zero summary is truthful: there are no retrievable
  // candidates, so nothing can be deleted.
  if (resource === 'notes') {
    logInfo(NOTES_UNSUPPORTED_NOTICE);
    return { type: 'notes', found: 0, deleted: 0, errors: 0, items: [] };
  }

  const config = buildResourceConfig(resource, apiToken);
  const deletionOptions: DeletionOptions = {
    parallel,
    rateLimit: DEFAULT_RATE_LIMIT,
    dryRun,
    continueOnError: true,
  };
  return processResource(client, apiToken, patterns, deletionOptions, config);
}

function defaultHandlers(): CleanupHandlers {
  return {
    getClient: () => initializeCleanupClient(),
    testConnection: () => testConnection(),
    validatePermissions: (apiToken: string) =>
      validateCleanupPermissions(apiToken),
    applySafetyChain: productionSafetyChain,
  };
}

/**
 * Run one full cleanup pass (dry-run or live) over the requested
 * resources. Returns the per-resource summaries and the total candidate
 * count — the number the safety gate reads.
 *
 * Any failure — connection test, permission validation, fetch, or a
 * mid-list delete error with continueOnError — throws, so no records can
 * be deleted by a run whose gate did not see the same failure.
 */
export async function runCleanupPass(
  options: CleanupOptions,
  live: boolean,
  handlerOverrides?: Partial<CleanupHandlers>
): Promise<{
  summaries: ResourceSummary[];
  totalFound: number;
  durationMs: number;
}> {
  const handlers = { ...defaultHandlers(), ...handlerOverrides };
  const startTime = Date.now();

  // Validate resource types even for programmatic callers: the live path
  // in main.ts reaches this pass directly, bypassing parseArguments.
  validateRunInputs(options.resources);

  const apiToken = getValidatedApiToken(options.apiToken);
  logInfo('Using API token for filtering', {
    token: apiToken.substring(0, 8) + '...',
  });

  logInfo('🔗 Testing connection...');
  const connectionOk = await handlers.testConnection();
  if (!connectionOk) {
    throw new Error('Connection test failed');
  }

  await handlers.validatePermissions(apiToken);

  const patterns = options.pattern
    ? options.pattern.split(',').map((s) => s.trim())
    : [];

  logInfo('Cleanup configuration', {
    resources: options.resources,
    live,
    patterns:
      patterns.length > 0 ? patterns : 'none (API token filtering only)',
    parallel: options.parallel,
  });

  const client = handlers.getClient();
  const summaries: ResourceSummary[] = [];

  for (const resourceType of options.resources) {
    // Fail-closed narrowing (defense-in-depth after validateRunInputs):
    // an unrecognized value is skipped, never routed onward.
    if (!isRegistryResource(resourceType)) {
      logError(`Skipping unrecognized resource type: ${resourceType}`);
      continue;
    }
    // The SAME chain runs for dry-run and live passes; dry-run summaries
    // report found-but-not-deleted, live passes delete.
    summaries.push(
      await handlers.applySafetyChain(
        client,
        resourceType,
        apiToken,
        patterns,
        !live,
        options.parallel
      )
    );
  }

  displayDeletionSummary(summaries, !live);

  const totalFound = summaries.reduce((sum, s) => sum + s.found, 0);
  const totalDeleted = summaries.reduce((sum, s) => sum + s.deleted, 0);
  const totalErrors = summaries.reduce((sum, s) => sum + s.errors, 0);
  const duration = Date.now() - startTime;

  if (totalErrors === 0) {
    const action = live ? 'deleted' : 'would delete';
    logSuccess(
      `Cleanup completed: ${action} ${totalDeleted} items in ${formatDuration(duration)}`
    );
  } else {
    logError(
      `Cleanup completed with ${totalErrors} errors in ${formatDuration(duration)}`
    );
  }

  return { summaries, totalFound, durationMs: duration };
}
