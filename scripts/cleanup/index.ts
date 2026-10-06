#!/usr/bin/env tsx
/**
 * Unified cleanup script for Attio MCP Server test data
 *
 * SAFETY FIRST: Always uses API token filtering by default to ensure
 * only data created by the MCP server is deleted.
 *
 * Resource handling per Attio API shape (issue #620):
 * - companies / people / deals — standard objects via /objects/{slug}/records
 * - tasks — GET /tasks, DELETE /tasks/{id}
 * - lists — GET /lists, DELETE /lists/{id} (list resources, not memberships)
 * - notes — unsupported here: Attio only lists notes per parent record
 *   (unfiltered GET /v2/notes returns nothing); delete notes via the MCP
 *   delete_record tool with resource_type 'notes'
 *
 * Implementation lives in ./core (cli, preflight, orchestrator, main),
 * ./fetchers, ./filters, ./processors, ./deleters, and ./utils.
 */
import 'dotenv/config';
import { parseArguments } from './core/cli.js';
import { runCleanupWithSafety } from './core/main.js';
import { logError } from './core/utils.js';

async function main(): Promise<void> {
  try {
    const options = parseArguments();

    console.log('🧹 Attio MCP Server Test Data Cleanup\n');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
    } else {
      console.log('⚠️  LIVE MODE - Data will be permanently deleted');
    }

    console.log(
      '🛡️  SAFETY: Only deletes data created by your MCP server API token\n'
    );

    const result = await runCleanupWithSafety(options);

    if (options.dryRun && result.totalFound > 0) {
      console.log('\n💡 To perform actual deletion, run with --live flag');
    }

    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    try {
      const opts = parseArguments();
      if (opts?.verbose) {
        console.error(error.stack);
      }
    } catch {
      // Ignore parsing errors in error handler
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => logError('Unhandled cleanup failure', err));
}
