/**
 * Two-pass cleanup orchestration and the mass-deletion safety gate
 * (issue #620).
 *
 * PASS 1: a dry-run pass over the requested resources — fetch + filter, no
 * deletions. Its totalFound is the gate's observation.
 * GATE: a live run whose pass-1 totalFound exceeds SAFETY_MAX_DELETIONS is
 * refused unless --force was passed.
 * PASS 2: the live pass, which may delete.
 *
 * FETCH-IDENTITY INVARIANT: both passes call the same runCleanupPass, so
 * the set the gate vets is the set the live pass sees. Keep one fetch path.
 *
 * RESIDUAL WINDOW: pass 2 re-fetches and may observe a different set
 * (Attio eventual consistency, concurrent workspace edits, a mid-list
 * failure). The gate therefore limits per-batch blast radius; it cannot
 * guarantee a global cap on live deletions. The 250ms inter-batch delay
 * keeps batches observable and interruptible.
 */
import { CleanupOptions, CleanupResult } from './types.js';
import { runCleanupPass, type CleanupHandlers } from './orchestrator.js';
import { logInfo } from './utils.js';

export const SAFETY_MAX_DELETIONS = 100;

/**
 * Run the cleanup with the two-pass safety protocol.
 *
 * Dry-run requests perform a single dry-run pass and nothing is deleted.
 * Live requests run the dry-run pass first, enforce the gate, then run the
 * live pass.
 *
 * `handlerOverrides` is a test seam only: production callers never pass it;
 * tests inject fakes to exercise the gate without network or deletion.
 */
export async function runCleanupWithSafety(
  options: CleanupOptions,
  handlerOverrides?: Partial<CleanupHandlers>
): Promise<CleanupResult> {
  // --- PASS 1: dry-run (the gate's observation) ---
  const firstPass = await runCleanupPass(options, false, handlerOverrides);

  if (options.dryRun) {
    return summarizePass(firstPass, true);
  }

  // --- GATE: refuse large live runs without --force ---
  if (firstPass.totalFound > SAFETY_MAX_DELETIONS && !options.force) {
    throw new Error(`
🚨 SAFETY LIMIT EXCEEDED: Found ${firstPass.totalFound} records to delete.

For safety, this script limits deletions to ${SAFETY_MAX_DELETIONS} records unless --force is used.

This limit prevents accidental mass deletion of data. Review the records carefully:
- Run with --dry-run to see what would be deleted
- Check /tmp/ files for detailed record lists
- Verify WORKSPACE_API_UUID is correctly set
- Use --force flag if you're certain these are all test records

To proceed: bun run cleanup:test-data -- --live --force
`);
  }

  if (firstPass.totalFound > SAFETY_MAX_DELETIONS) {
    logInfo(
      `⚠️  FORCE MODE: Proceeding with ${firstPass.totalFound} deletions (safety limit overridden)`,
      {
        recordCount: firstPass.totalFound,
        safetyLimit: SAFETY_MAX_DELETIONS,
        warning: 'Please ensure all records are test data',
      }
    );
  }

  // --- PASS 2: live (deletions allowed) ---
  const livePass = await runCleanupPass(options, true, handlerOverrides);
  return summarizePass(livePass, false);
}

function summarizePass(
  pass: {
    summaries: CleanupResult['summaries'];
    totalFound: number;
    durationMs: number;
  },
  dryRun: boolean
): CleanupResult {
  const totalDeleted = pass.summaries.reduce((sum, s) => sum + s.deleted, 0);
  const totalErrors = pass.summaries.reduce((sum, s) => sum + s.errors, 0);
  return {
    success: totalErrors === 0,
    summaries: pass.summaries,
    totalFound: pass.totalFound,
    // A dry-run pass reports zero deleted regardless of summary counts.
    totalDeleted: dryRun ? 0 : totalDeleted,
    totalErrors,
    duration: pass.durationMs,
  };
}
