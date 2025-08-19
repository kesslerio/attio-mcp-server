#!/usr/bin/env node
/**
 * Comprehensive Test Data Cleanup Utility
 * 
 * This script provides comprehensive cleanup of test data across all Attio resource types.
 * Uses direct API calls for efficiency and supports parallel processing with rate limiting.
 * 
 * Usage:
 *   npm run cleanup:test-data
 *   npm run cleanup:test-data -- --dry-run
 *   npm run cleanup:test-data -- --prefix=TEST_,QA_,E2E_ --parallel=3
 *   npm run cleanup:test-data -- --resource-type=companies --dry-run=false
 * 
 * Features:
 * - Direct API calls (not MCP) for performance
 * - Parallel processing with configurable concurrency
 * - Rate limiting with exponential backoff
 * - Progress tracking and detailed reporting
 * - Dry-run mode for safety
 * - Configurable test prefixes
 * - Support for all resource types: companies, people, tasks, lists, notes
 */

import dotenv from 'dotenv';
import { getAttioClient } from '../src/api/attio-client.js';
import { retryWithBackoff, waitForRateLimit, getDetailedErrorMessage } from '../test/utils/test-cleanup.js';

// Load environment variables
dotenv.config();

interface CleanupOptions {
  dryRun: boolean;
  prefixes: string[];
  resourceTypes: ResourceType[];
  parallel: number;
  verbose: boolean;
}

type ResourceType = 'companies' | 'people' | 'tasks' | 'lists' | 'notes' | 'all';

interface CleanupStats {
  [key: string]: {
    found: number;
    deleted: number;
    errors: number;
  };
}

interface AttioClient {
  post(url: string, data: any): Promise<any>;
  delete(url: string): Promise<any>;
  get(url: string): Promise<any>;
}

class TestDataCleanup {
  private client: AttioClient;
  private options: CleanupOptions;
  private stats: CleanupStats = {};

  constructor(options: CleanupOptions) {
    this.options = options;
    
    // Validate API key
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY environment variable is required');
    }

    this.client = getAttioClient();
    
    // Initialize stats
    const resourceTypes = options.resourceTypes.includes('all' as ResourceType) 
      ? ['companies', 'people', 'tasks', 'lists', 'notes'] 
      : options.resourceTypes;
      
    resourceTypes.forEach(type => {
      if (type !== 'all') {
        this.stats[type] = { found: 0, deleted: 0, errors: 0 };
      }
    });
  }

  /**
   * Main cleanup execution
   */
  async execute(): Promise<void> {
    console.log('🧹 Attio Test Data Cleanup Utility\n');
    console.log(`Mode: ${this.options.dryRun ? '🔍 DRY RUN' : '💥 LIVE DELETION'}`);
    console.log(`Prefixes: ${this.options.prefixes.join(', ')}`);
    console.log(`Parallel operations: ${this.options.parallel}`);
    console.log(`Resource types: ${this.options.resourceTypes.join(', ')}\n`);

    if (!this.options.dryRun) {
      console.log('⚠️  WARNING: This will permanently delete test data!');
      console.log('💡 Use --dry-run to preview what would be deleted.\n');
      
      // Simple confirmation for non-dry-run mode
      if (process.stdout.isTTY) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise<string>((resolve) => {
          rl.question('Continue? (yes/no): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'yes') {
          console.log('Cleanup cancelled.');
          return;
        }
      }
    }

    const resourceTypes = this.options.resourceTypes.includes('all' as ResourceType)
      ? ['companies', 'people', 'tasks', 'lists', 'notes']
      : this.options.resourceTypes.filter(t => t !== 'all');

    // Process each resource type
    for (const resourceType of resourceTypes) {
      if (resourceType === 'all') continue;
      
      console.log(`\n📊 Processing ${resourceType}...`);
      
      try {
        switch (resourceType) {
          case 'companies':
            await this.cleanupCompanies();
            break;
          case 'people':
            await this.cleanupPeople();
            break;
          case 'tasks':
            await this.cleanupTasks();
            break;
          case 'lists':
            await this.cleanupLists();
            break;
          case 'notes':
            await this.cleanupNotes();
            break;
        }
      } catch (error) {
        console.error(`❌ Error processing ${resourceType}:`, getDetailedErrorMessage(error));
        this.stats[resourceType].errors++;
      }
    }

    this.printSummary();
  }

  /**
   * Clean up test companies with batch operations
   */
  private async cleanupCompanies(): Promise<void> {
    const companies = await this.findTestCompanies();
    this.stats.companies.found = companies.length;

    if (companies.length === 0) {
      console.log('  ✅ No test companies found');
      return;
    }

    console.log(`  🔍 Found ${companies.length} test companies`);

    if (this.options.dryRun) {
      companies.forEach((company, index) => {
        console.log(`    ${index + 1}. ${company.values?.name?.[0]?.value || 'Unknown'} (${company.id.record_id})`);
      });
      return;
    }

    // Process in parallel chunks
    const chunks = this.chunkArray(companies, this.options.parallel);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (company) => {
          try {
            await retryWithBackoff(async () => {
              await this.client.delete(`/objects/companies/records/${company.id.record_id}`);
            });
            
            this.stats.companies.deleted++;
            if (this.options.verbose) {
              console.log(`    ✅ Deleted: ${company.values?.name?.[0]?.value || company.id.record_id}`);
            }
          } catch (error) {
            this.stats.companies.errors++;
            console.error(`    ❌ Failed to delete company ${company.id.record_id}:`, getDetailedErrorMessage(error));
          }
        })
      );
      
      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await waitForRateLimit(200);
      }
    }
  }

  /**
   * Clean up test people
   */
  private async cleanupPeople(): Promise<void> {
    const people = await this.findTestPeople();
    this.stats.people.found = people.length;

    if (people.length === 0) {
      console.log('  ✅ No test people found');
      return;
    }

    console.log(`  🔍 Found ${people.length} test people`);

    if (this.options.dryRun) {
      people.forEach((person, index) => {
        const name = `${person.values?.first_name?.[0]?.value || ''} ${person.values?.last_name?.[0]?.value || ''}`.trim();
        console.log(`    ${index + 1}. ${name || 'Unknown'} (${person.id.record_id})`);
      });
      return;
    }

    // Process in parallel chunks
    const chunks = this.chunkArray(people, this.options.parallel);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (person) => {
          try {
            await retryWithBackoff(async () => {
              await this.client.delete(`/objects/people/records/${person.id.record_id}`);
            });
            
            this.stats.people.deleted++;
            if (this.options.verbose) {
              const name = `${person.values?.first_name?.[0]?.value || ''} ${person.values?.last_name?.[0]?.value || ''}`.trim();
              console.log(`    ✅ Deleted: ${name || person.id.record_id}`);
            }
          } catch (error) {
            this.stats.people.errors++;
            console.error(`    ❌ Failed to delete person ${person.id.record_id}:`, getDetailedErrorMessage(error));
          }
        })
      );
      
      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await waitForRateLimit(200);
      }
    }
  }

  /**
   * Clean up test tasks
   */
  private async cleanupTasks(): Promise<void> {
    const tasks = await this.findTestTasks();
    this.stats.tasks.found = tasks.length;

    if (tasks.length === 0) {
      console.log('  ✅ No test tasks found');
      return;
    }

    console.log(`  🔍 Found ${tasks.length} test tasks`);

    if (this.options.dryRun) {
      tasks.forEach((task, index) => {
        console.log(`    ${index + 1}. ${task.content || task.title || 'Unknown'} (${task.id.task_id})`);
      });
      return;
    }

    // Process in parallel chunks
    const chunks = this.chunkArray(tasks, this.options.parallel);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (task) => {
          try {
            await retryWithBackoff(async () => {
              await this.client.delete(`/tasks/${task.id.task_id}`);
            });
            
            this.stats.tasks.deleted++;
            if (this.options.verbose) {
              console.log(`    ✅ Deleted: ${task.content || task.title || task.id.task_id}`);
            }
          } catch (error) {
            this.stats.tasks.errors++;
            console.error(`    ❌ Failed to delete task ${task.id.task_id}:`, getDetailedErrorMessage(error));
          }
        })
      );
      
      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await waitForRateLimit(200);
      }
    }
  }

  /**
   * Clean up test lists
   */
  private async cleanupLists(): Promise<void> {
    const lists = await this.findTestLists();
    this.stats.lists.found = lists.length;

    if (lists.length === 0) {
      console.log('  ✅ No test lists found');
      return;
    }

    console.log(`  🔍 Found ${lists.length} test lists`);

    if (this.options.dryRun) {
      lists.forEach((list, index) => {
        console.log(`    ${index + 1}. ${list.name || 'Unknown'} (${list.id.list_id})`);
      });
      return;
    }

    // Process lists sequentially (they might have dependencies)
    for (const list of lists) {
      try {
        await retryWithBackoff(async () => {
          await this.client.delete(`/lists/${list.id.list_id}`);
        });
        
        this.stats.lists.deleted++;
        if (this.options.verbose) {
          console.log(`    ✅ Deleted: ${list.name || list.id.list_id}`);
        }
        
        // Small delay between list deletions
        await waitForRateLimit(500);
      } catch (error) {
        this.stats.lists.errors++;
        console.error(`    ❌ Failed to delete list ${list.id.list_id}:`, getDetailedErrorMessage(error));
      }
    }
  }

  /**
   * Clean up test notes (if API available)
   */
  private async cleanupNotes(): Promise<void> {
    console.log('  ⚠️  Notes cleanup not yet implemented (API endpoint research needed)');
    // TODO: Research notes API endpoints and implement cleanup
    this.stats.notes = { found: 0, deleted: 0, errors: 0 };
  }

  /**
   * Find test companies using configured prefixes
   */
  private async findTestCompanies(): Promise<any[]> {
    const allCompanies: any[] = [];
    
    for (const prefix of this.options.prefixes) {
      try {
        const response = await retryWithBackoff(async () => {
          return this.client.post('/objects/companies/records/query', {
            filter: {
              name: { $starts_with: prefix },
            },
            limit: 500 // Batch size
          });
        });
        
        const companies = response.data?.data ?? [];
        allCompanies.push(...companies);
      } catch (error) {
        console.error(`    ❌ Error querying companies with prefix ${prefix}:`, getDetailedErrorMessage(error));
      }
    }
    
    return allCompanies;
  }

  /**
   * Find test people using configured prefixes
   */
  private async findTestPeople(): Promise<any[]> {
    const allPeople: any[] = [];
    
    for (const prefix of this.options.prefixes) {
      try {
        // Search by name
        const nameResponse = await retryWithBackoff(async () => {
          return this.client.post('/objects/people/records/query', {
            filter: {
              name: { $starts_with: prefix },
            },
            limit: 500
          });
        });
        
        const people = nameResponse.data?.data ?? [];
        allPeople.push(...people);
        
        // Search by email (prefix in lowercase for email domains)
        const emailResponse = await retryWithBackoff(async () => {
          return this.client.post('/objects/people/records/query', {
            filter: {
              email_addresses: { $contains: prefix.toLowerCase() },
            },
            limit: 500
          });
        });
        
        const emailPeople = emailResponse.data?.data ?? [];
        allPeople.push(...emailPeople);
        
      } catch (error) {
        console.error(`    ❌ Error querying people with prefix ${prefix}:`, getDetailedErrorMessage(error));
      }
    }
    
    // Remove duplicates by record_id
    const uniquePeople = allPeople.filter((person, index, self) => 
      index === self.findIndex(p => p.id.record_id === person.id.record_id)
    );
    
    return uniquePeople;
  }

  /**
   * Find test tasks using configured prefixes
   */
  private async findTestTasks(): Promise<any[]> {
    const allTasks: any[] = [];
    
    try {
      // Get all tasks and filter client-side by prefix
      // Note: Attio tasks API uses GET with query parameters, not POST with filters
      const response = await retryWithBackoff(async () => {
        return this.client.get('/tasks?pageSize=500');
      });
      
      const tasks = response.data?.data ?? [];
      
      // Filter tasks by prefix in content or title
      for (const prefix of this.options.prefixes) {
        const prefixTasks = tasks.filter((task: any) => {
          const content = task.content || task.content_plaintext || '';
          const title = task.title || '';
          return content.startsWith(prefix) || title.startsWith(prefix);
        });
        allTasks.push(...prefixTasks);
      }
      
    } catch (error) {
      console.error(`    ❌ Error querying tasks:`, getDetailedErrorMessage(error));
    }
    
    // Remove duplicates by task_id
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex(t => t.id?.task_id === task.id?.task_id)
    );
    
    return uniqueTasks;
  }

  /**
   * Find test lists using configured prefixes
   */
  private async findTestLists(): Promise<any[]> {
    const allLists: any[] = [];
    
    try {
      const response = await retryWithBackoff(async () => {
        return this.client.get('/lists?limit=500');
      });
      
      const lists = response.data?.data ?? [];
      
      // Filter lists by name prefix
      for (const prefix of this.options.prefixes) {
        const prefixLists = lists.filter((list: any) => 
          list.name && list.name.startsWith(prefix)
        );
        allLists.push(...prefixLists);
      }
    } catch (error) {
      console.error('    ❌ Error querying lists:', getDetailedErrorMessage(error));
    }
    
    return allLists;
  }

  /**
   * Split array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Print cleanup summary
   */
  private printSummary(): void {
    console.log('\n📋 Cleanup Summary');
    console.log('='.repeat(50));
    
    let totalFound = 0;
    let totalDeleted = 0;
    let totalErrors = 0;
    
    Object.entries(this.stats).forEach(([resourceType, stats]) => {
      console.log(`${resourceType.padEnd(12)} | Found: ${stats.found.toString().padStart(3)} | Deleted: ${stats.deleted.toString().padStart(3)} | Errors: ${stats.errors.toString().padStart(3)}`);
      totalFound += stats.found;
      totalDeleted += stats.deleted;
      totalErrors += stats.errors;
    });
    
    console.log('-'.repeat(50));
    console.log(`${'TOTAL'.padEnd(12)} | Found: ${totalFound.toString().padStart(3)} | Deleted: ${totalDeleted.toString().padStart(3)} | Errors: ${totalErrors.toString().padStart(3)}`);
    
    if (this.options.dryRun) {
      console.log('\n💡 This was a dry run. No data was actually deleted.');
      console.log('   Run without --dry-run to perform actual cleanup.');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
    }
    
    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} errors occurred during cleanup. Check the logs above for details.`);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  
  const options: CleanupOptions = {
    dryRun: true, // Default to dry run for safety
    prefixes: ['TEST_', 'QA_', 'E2E_'],
    resourceTypes: ['all'],
    parallel: 5,
    verbose: false
  };
  
  for (const arg of args) {
    if (arg.startsWith('--dry-run=')) {
      options.dryRun = arg.split('=')[1] === 'true';
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--live') {
      options.dryRun = false;
    } else if (arg.startsWith('--prefix=')) {
      options.prefixes = arg.split('=')[1].split(',').map(p => p.trim());
    } else if (arg.startsWith('--resource-type=')) {
      options.resourceTypes = arg.split('=')[1].split(',').map(r => r.trim()) as ResourceType[];
    } else if (arg.startsWith('--parallel=')) {
      options.parallel = parseInt(arg.split('=')[1]) || 5;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Print help text
 */
function printHelp(): void {
  console.log(`
🧹 Attio Test Data Cleanup Utility

USAGE:
  npm run cleanup:test-data [OPTIONS]

OPTIONS:
  --dry-run             Preview what would be deleted (default: true)
  --live                Perform actual deletion (same as --dry-run=false)
  --prefix=PREFIX,...   Comma-separated list of test prefixes (default: TEST_,QA_,E2E_)
  --resource-type=TYPE  Resource types to clean: companies,people,tasks,lists,notes,all (default: all)
  --parallel=N          Number of parallel operations (default: 5)
  --verbose, -v         Verbose output
  --help, -h            Show this help

EXAMPLES:
  npm run cleanup:test-data                                    # Dry run all resources
  npm run cleanup:test-data -- --live                          # Live deletion
  npm run cleanup:test-data -- --prefix=DEMO_,TEMP_            # Custom prefixes
  npm run cleanup:test-data -- --resource-type=companies       # Only companies
  npm run cleanup:test-data -- --parallel=3 --verbose          # 3 parallel ops with verbose output

SAFETY:
  - Dry run mode is enabled by default
  - Uses test prefixes to avoid production data
  - Includes confirmation prompt for live deletion
  - Implements rate limiting and error handling
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const cleanup = new TestDataCleanup(options);
    await cleanup.execute();
  } catch (error) {
    console.error('❌ Fatal error:', getDetailedErrorMessage(error));
    process.exit(1);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}