#!/usr/bin/env tsx
/**
 * Unified cleanup script for Attio MCP Server test data
 * 
 * SAFETY FIRST: Always uses API token filtering by default to ensure
 * only data created by the MCP server is deleted.
 */

import 'dotenv/config';
import { program } from 'commander';
import { CleanupOptions, CleanupResult, ResourceSummary } from './core/types.js';
import { initializeCleanupClient, testConnection, validateCleanupPermissions } from './core/client.js';
import { getValidatedApiToken } from './filters/api-token-filter.js';
import { fetchTasksByCreator } from './fetchers/tasks.js';
import { batchDeleteRecords, displayDeletionSummary, createResourceSummary, DeletionOptions } from './deleters/batch-deleter.js';
import { filterByApiToken } from './filters/api-token-filter.js';
import { filterByPatterns, getDefaultTestPatterns } from './filters/pattern-filter.js';
import { logInfo, logError, logSuccess, formatDuration } from './core/utils.js';

const DEFAULT_RESOURCES = ['tasks'];
const DEFAULT_PARALLEL = 5;
const DEFAULT_RATE_LIMIT = 250;

/**
 * Parse command line arguments
 */
function parseArguments(): CleanupOptions {
  program
    .name('cleanup')
    .description('Unified cleanup script for Attio MCP Server test data')
    .option('--dry-run', 'Preview what would be deleted without actually deleting', false)
    .option('--live', 'Perform actual deletion (opposite of dry-run)', false)
    .option('--resources <types>', 'Comma-separated list of resource types', DEFAULT_RESOURCES.join(','))
    .option('--api-token <token>', 'API token to filter by (defaults to WORKSPACE_API_UUID)')
    .option('--pattern <patterns>', 'Comma-separated list of name patterns to match')
    .option('--parallel <count>', 'Number of parallel deletion operations', String(DEFAULT_PARALLEL))
    .option('--verbose', 'Enable verbose logging', false)
    .parse();

  const opts = program.opts();
  
  return {
    dryRun: !opts.live, // Default to dry-run unless --live is specified
    live: opts.live,
    resources: opts.resources.split(',').map((s: string) => s.trim()),
    apiToken: opts.apiToken,
    pattern: opts.pattern,
    parallel: parseInt(opts.parallel, 10),
    verbose: opts.verbose
  };
}

/**
 * Clean up tasks
 */
async function cleanupTasks(
  apiToken: string, 
  patterns: string[], 
  deletionOptions: DeletionOptions
): Promise<ResourceSummary> {
  logInfo('🔍 Processing tasks...');
  
  const client = initializeCleanupClient();
  
  // Fetch tasks created by our API token
  const fetchResult = await fetchTasksByCreator(client, apiToken);
  
  if (fetchResult.records.length === 0) {
    logInfo('No tasks found created by API token');
    return createResourceSummary('tasks', [], {
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0
    });
  }

  // Apply pattern filtering if specified
  const patternResult = filterByPatterns(fetchResult.records, patterns, 'tasks');
  
  if (patternResult.matched.length === 0) {
    logInfo('No tasks match the specified patterns');
    return createResourceSummary('tasks', [], {
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0
    });
  }

  // Display what we found
  if (deletionOptions.dryRun) {
    console.log(`\n📋 Found ${patternResult.matched.length} tasks to delete:`);
    patternResult.matched.slice(0, 10).forEach((task, index) => {
      const name = task.content_plaintext || task.content || task.title || 'Unknown';
      const id = task.id?.task_id || task.id;
      console.log(`  ${index + 1}. ${name} (${id})`);
    });
    
    if (patternResult.matched.length > 10) {
      console.log(`  ... and ${patternResult.matched.length - 10} more`);
    }
  }

  // Delete the matched tasks
  const deletionResult = await batchDeleteRecords(
    client, 
    patternResult.matched, 
    'tasks', 
    deletionOptions
  );

  return createResourceSummary('tasks', patternResult.matched, deletionResult);
}

/**
 * Main cleanup function
 */
async function performCleanup(options: CleanupOptions): Promise<CleanupResult> {
  const startTime = Date.now();
  
  try {
    // Validate and get API token
    const apiToken = getValidatedApiToken(options.apiToken);
    logInfo('Using API token for filtering', { token: apiToken.substring(0, 8) + '...' });

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
      ? options.pattern.split(',').map(s => s.trim())
      : [];

    logInfo('Cleanup configuration', {
      resources: options.resources,
      dryRun: options.dryRun,
      patterns: patterns.length > 0 ? patterns : 'none (API token filtering only)',
      parallel: options.parallel
    });

    const deletionOptions: DeletionOptions = {
      parallel: options.parallel,
      rateLimit: DEFAULT_RATE_LIMIT,
      dryRun: options.dryRun,
      continueOnError: true
    };

    const summaries: ResourceSummary[] = [];

    // Process each resource type
    for (const resourceType of options.resources) {
      switch (resourceType.toLowerCase()) {
        case 'tasks':
          const taskSummary = await cleanupTasks(apiToken, patterns, deletionOptions);
          summaries.push(taskSummary);
          break;
        
        default:
          logError(`Unsupported resource type: ${resourceType}`);
          // Note: Other resource types (companies, people, etc.) would be implemented here
      }
    }

    // Display summary
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
      duration: Date.now() - startTime
    };

    if (result.success) {
      const action = options.dryRun ? 'would delete' : 'deleted';
      logSuccess(`Cleanup completed: ${action} ${totalDeleted} items in ${formatDuration(result.duration)}`);
    } else {
      logError(`Cleanup completed with ${totalErrors} errors in ${formatDuration(result.duration)}`);
    }

    return result;

  } catch (error) {
    logError('Cleanup failed', error);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    
    console.log('🧹 Attio MCP Server Test Data Cleanup\n');
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No data will be deleted');
    } else {
      console.log('⚠️  LIVE MODE - Data will be permanently deleted');
    }
    
    console.log('🛡️  SAFETY: Only deletes data created by your MCP server API token\n');

    const result = await performCleanup(options);
    
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
  main().catch(console.error);
}