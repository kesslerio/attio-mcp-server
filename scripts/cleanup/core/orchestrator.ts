/**
 * Main cleanup orchestration (issue #620 refactor).
 */
import { CleanupOptions, CleanupResult, ResourceSummary } from './types.js';
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
import { processResourceType } from './resources.js';
import { logError, logInfo, logSuccess, formatDuration } from './utils.js';

const DEFAULT_RATE_LIMIT = 250;

/**
 * Run the cleanup pass across every requested resource type.
 */
export async function performCleanup(
  options: CleanupOptions
): Promise<CleanupResult> {
  const startTime = Date.now();

  try {
    // Validate and get API token
    const apiToken = getValidatedApiToken(options.apiToken);
    logInfo('Using API token for filtering', {
      token: apiToken.substring(0, 8) + '...',
    });

    // Test connection
    logInfo('🔗 Testing connection...');
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Connection test failed');
    }

    // Validate permissions
    await validateCleanupPermissions(apiToken);

    // Parse patterns
    const patterns = options.pattern
      ? options.pattern.split(',').map((s) => s.trim())
      : [];

    logInfo('Cleanup configuration', {
      resources: options.resources,
      dryRun: options.dryRun,
      patterns:
        patterns.length > 0 ? patterns : 'none (API token filtering only)',
      parallel: options.parallel,
    });

    const deletionOptions: DeletionOptions = {
      parallel: options.parallel,
      rateLimit: DEFAULT_RATE_LIMIT,
      dryRun: options.dryRun,
      continueOnError: true,
    };

    const client = initializeCleanupClient();
    const summaries: ResourceSummary[] = [];

    for (const resourceType of options.resources) {
      summaries.push(
        await processResourceType(
          client,
          resourceType as never,
          apiToken,
          patterns,
          deletionOptions
        )
      );
    }

    displayDeletionSummary(summaries, options.dryRun);

    const totalFound = summaries.reduce((sum, s) => sum + s.found, 0);
    const totalDeleted = summaries.reduce((sum, s) => sum + s.deleted, 0);
    const totalErrors = summaries.reduce((sum, s) => sum + s.errors, 0);

    const result: CleanupResult = {
      success: totalErrors === 0,
      summaries,
      totalFound,
      totalDeleted,
      totalErrors,
      duration: Date.now() - startTime,
    };

    if (result.success) {
      const action = options.dryRun ? 'would delete' : 'deleted';
      logSuccess(
        `Cleanup completed: ${action} ${totalDeleted} items in ${formatDuration(result.duration)}`
      );
    } else {
      logError(
        `Cleanup completed with ${totalErrors} errors in ${formatDuration(result.duration)}`
      );
    }

    return result;
  } catch (error) {
    logError('Cleanup failed', error);
    throw error;
  }
}
