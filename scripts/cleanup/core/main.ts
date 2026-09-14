/**
 * Entry orchestration: banner, safety pre-flight, and cleanup runs
 * (issue #620 refactor).
 */
import { CleanupOptions } from './types.js';
import { performCleanup } from './orchestrator.js';
import { logInfo } from './utils.js';

export const SAFETY_MAX_DELETIONS = 100;

/**
 * Run the cleanup, enforcing the mass-deletion safety limit for live runs.
 */
export async function runCleanupWithSafety(
  options: CleanupOptions
): Promise<void> {
  if (!options.dryRun) {
    logInfo('🔍 Performing safety pre-flight check...');
    const preflightOptions = { ...options, dryRun: true };
    const preflightResult = await performCleanup(preflightOptions);

    if (preflightResult.totalFound > SAFETY_MAX_DELETIONS && !options.force) {
      throw new Error(`
🚨 SAFETY LIMIT EXCEEDED: Found ${preflightResult.totalFound} records to delete.

For safety, this script limits deletions to ${SAFETY_MAX_DELETIONS} records unless --force is used.

This limit prevents accidental mass deletion of data. Review the records carefully:
- Run with --dry-run to see what would be deleted
- Check /tmp/ files for detailed record lists
- Verify WORKSPACE_API_UUID is correctly set
- Use --force flag if you're certain these are all test records

To proceed: bun run cleanup:test-data -- --live --force
`);
    }

    if (preflightResult.totalFound > SAFETY_MAX_DELETIONS) {
      logInfo(
        `⚠️  FORCE MODE: Proceeding with ${preflightResult.totalFound} deletions (safety limit overridden)`,
        {
          recordCount: preflightResult.totalFound,
          safetyLimit: SAFETY_MAX_DELETIONS,
          warning: 'Please ensure all records are test data',
        }
      );
    }
  }

  const result = await performCleanup(options);

  if (options.dryRun && result.totalFound > 0) {
    console.log('\n💡 To perform actual deletion, run with --live flag');
  }

  process.exit(result.success ? 0 : 1);
}
