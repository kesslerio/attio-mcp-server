/**
 * Command-line argument parsing for the cleanup script (issue #620 refactor).
 */
import { program } from 'commander';
import { CleanupOptions } from '../core/types.js';
import { DEFAULT_RESOURCES } from '../core/resources.js';
import { validateRunInputs } from '../validation/preflight.js';

const DEFAULT_PARALLEL = 5;

/**
 * Parse process.argv into validated CleanupOptions.
 *
 * Note: dry-run is the default; `--live` is the only way to delete. The
 * historical `--dry-run` flag is accepted but has no effect (it is the
 * default), matching the pre-refactor behavior.
 */
export function parseArguments(argv?: string[]): CleanupOptions {
  program
    .name('cleanup')
    .description('Unified cleanup script for Attio MCP Server test data')
    .option(
      '--dry-run',
      'Preview what would be deleted without actually deleting',
      false
    )
    .option('--live', 'Perform actual deletion (opposite of dry-run)', false)
    .option(
      '--resources <types>',
      'Comma-separated list of resource types',
      DEFAULT_RESOURCES.join(',')
    )
    .option(
      '--api-token <token>',
      'API token to filter by (defaults to WORKSPACE_API_UUID)'
    )
    .option(
      '--pattern <patterns>',
      'Comma-separated list of name patterns to match'
    )
    .option(
      '--parallel <count>',
      'Number of parallel deletion operations',
      String(DEFAULT_PARALLEL)
    )
    .option('--verbose', 'Enable verbose logging', false)
    .option('--force', 'Override safety limits (allow >100 deletions)', false);

  if (argv) {
    program.parse(argv);
  } else {
    program.parse();
  }

  const opts = program.opts();

  const resources = opts.resources.split(',').map((s: string) => s.trim());

  // Validate resource types (exits 1 on unsupported resources).
  validateRunInputs(resources);

  return {
    dryRun: !opts.live, // Default to dry-run unless --live is specified
    live: opts.live,
    resources,
    apiToken: opts.apiToken,
    pattern: opts.pattern,
    parallel: parseInt(opts.parallel, 10),
    verbose: opts.verbose,
    force: opts.force,
  };
}

export { DEFAULT_PARALLEL };
