#!/usr/bin/env node
/**
 * API Token-Based Test Data Cleanup Utility
 *
 * This script provides comprehensive cleanup of test data created by specific API tokens.
 * Based on the existing cleanup-test-data.ts but enhanced with API token filtering.
 *
 * Usage:
 *   npm run cleanup:api-token -- --dry-run --api-token=TOKEN_ID
 *   npm run cleanup:api-token -- --live --api-token=TOKEN_ID --filter-mode=both
 *   npm run cleanup:api-token -- --dry-run --api-token=TOKEN_ID --exclude-pattern=Christina,Carol
 *
 * Features:
 * - API token filtering for targeted cleanup
 * - Combined filtering (API token + name patterns)
 * - Enhanced safety features and audit logging
 * - Pattern-based exclusion for protecting real data
 * - Detailed reporting and confirmation prompts
 */

import dotenv from 'dotenv';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getAttioClient } from '../src/api/attio-client.js';
import {
  retryWithBackoff,
  waitForRateLimit,
  getDetailedErrorMessage,
} from '../test/utils/test-cleanup.js';

// Load environment variables
dotenv.config({ debug: false });

interface CleanupOptions {
  dryRun: boolean;
  apiToken?: string;
  filterMode: 'prefix' | 'api-token' | 'both';
  prefixes: string[];
  excludePatterns: string[];
  resourceTypes: ResourceType[];
  parallel: number;
  verbose: boolean;
  requireConfirmation: boolean;
  auditLog: boolean;
}

type ResourceType =
  | 'companies'
  | 'people'
  | 'tasks'
  | 'lists'
  | 'notes'
  | 'deals'
  | 'all';

interface CleanupStats {
  [key: string]: {
    found: number;
    deleted: number;
    errors: number;
    skipped: number;
  };
}

interface DeletionRecord {
  resourceType: string;
  recordId: string;
  name: string;
  deletionReason: string;
  createdAt: string;
  createdBy: string;
  timestamp: string;
  recordData: any;
}

interface AttioClient {
  post(url: string, data: any): Promise<any>;
  delete(url: string): Promise<any>;
  get(url: string): Promise<any>;
}

class ApiTokenCleanup {
  private client: AttioClient;
  private options: CleanupOptions;
  private stats: CleanupStats = {};
  private auditLog: DeletionRecord[] = [];
  private whitelist: Set<string> = new Set();

  constructor(options: CleanupOptions) {
    this.options = options;

    // Validate required options
    if (options.filterMode === 'api-token' || options.filterMode === 'both') {
      if (!options.apiToken) {
        throw new Error('API token is required for api-token or both filter modes');
      }
    }

    // Validate API key
    const apiKey = process.env.ATTIO_API_KEY;
    if (!apiKey) {
      throw new Error('ATTIO_API_KEY environment variable is required');
    }

    this.client = getAttioClient();

    // Load whitelist if exists
    this.loadWhitelist();

    // Initialize stats
    const resourceTypes = options.resourceTypes.includes('all' as ResourceType)
      ? ['companies', 'people', 'tasks', 'lists', 'notes', 'deals']
      : options.resourceTypes;

    resourceTypes.forEach((type) => {
      if (type !== 'all') {
        this.stats[type] = { found: 0, deleted: 0, errors: 0, skipped: 0 };
      }
    });
  }

  /**
   * Load whitelist from file if it exists
   */
  private loadWhitelist(): void {
    const whitelistPath = join(process.cwd(), '.cleanup-whitelist.json');
    if (existsSync(whitelistPath)) {
      try {
        const data = readFileSync(whitelistPath, 'utf8');
        const whitelist = JSON.parse(data);
        this.whitelist = new Set(whitelist.recordIds || []);
        console.log(`📋 Loaded whitelist with ${this.whitelist.size} protected records`);
      } catch (error) {
        console.warn('⚠️  Failed to load whitelist:', error);
      }
    }
  }

  /**
   * Check if a record should be excluded based on patterns
   */
  private shouldExclude(record: any, resourceType: string): boolean {
    // Check whitelist first
    const recordId = record.id?.record_id || record.id?.task_id || record.id?.list_id || record.id?.note_id;
    if (recordId && this.whitelist.has(recordId)) {
      return true;
    }

    // Check exclude patterns
    if (this.options.excludePatterns.length === 0) {
      return false;
    }

    const name = this.extractRecordName(record, resourceType);
    return this.options.excludePatterns.some(pattern =>
      name.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Extract a readable name from a record
   */
  private extractRecordName(record: any, resourceType: string): string {
    switch (resourceType) {
      case 'companies':
        return record.values?.name?.[0]?.value || 'Unknown';
      case 'people':
        if (record.values?.name?.[0]) {
          const nameField = record.values.name[0];
          return nameField.full_name || 
                 `${nameField.first_name || ''} ${nameField.last_name || ''}`.trim() ||
                 'Unknown';
        }
        return 'Unknown';
      case 'tasks':
        return record.content || record.title || 'Unknown';
      case 'lists':
        return record.name || 'Unknown';
      case 'notes':
        return record.title || 'Unknown';
      case 'deals':
        return record.name || 'Unknown';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get deletion reason for a record
   */
  private getDeletionReason(record: any): string {
    const createdByApiToken = record.values?.created_by?.[0]?.referenced_actor_id === this.options.apiToken ||
                              record.created_by?.referenced_actor_id === this.options.apiToken;
    
    const matchesPrefix = this.options.prefixes.some(prefix => {
      const name = this.extractRecordName(record, 'companies'); // Generic check
      return name.startsWith(prefix);
    });

    if (createdByApiToken && matchesPrefix) {
      return 'API Token + Prefix Match';
    } else if (createdByApiToken) {
      return 'API Token Match';
    } else if (matchesPrefix) {
      return 'Prefix Match';
    }
    
    return 'Unknown Match';
  }

  /**
   * Check if a record looks like real data (not test data)
   */
  private looksLikeRealData(record: any, resourceType: string): boolean {
    const name = this.extractRecordName(record, resourceType);
    
    // Common test patterns that indicate test data
    const testPatterns = [
      /^test/i,
      /^demo/i,
      /^mock/i,
      /^sample/i,
      /^perf/i,
      /performance.*test/i,
      /🏢.*test/i,
      /test.*company/i,
      /\d{13,}/,  // Timestamps in names
    ];

    // If it matches test patterns, it's probably test data
    const matchesTestPattern = testPatterns.some(pattern => pattern.test(name));
    if (matchesTestPattern) {
      return false;
    }

    // If it looks like a real person name or company, be cautious
    const realDataPatterns = [
      /^dr\.\s/i,
      /\b(owner|founder|ceo|president)\b/i,
      /^[a-z]+\s[a-z]+$/i,  // Simple first last name
    ];

    return realDataPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Build filter for API queries
   */
  private buildFilter(resourceType: string, prefix?: string): any {
    const filters: any[] = [];

    // API token filter
    if (this.options.filterMode === 'api-token' || this.options.filterMode === 'both') {
      filters.push({
        created_by: { referenced_actor_id: this.options.apiToken }
      });
    }

    // Prefix filter
    if ((this.options.filterMode === 'prefix' || this.options.filterMode === 'both') && prefix) {
      const nameField = resourceType === 'people' ? 'name' : 'name';
      filters.push({
        [nameField]: { $starts_with: prefix }
      });
    }

    if (filters.length === 0) {
      return {};
    } else if (filters.length === 1) {
      return filters[0];
    } else {
      return { $and: filters };
    }
  }

  /**
   * Main cleanup execution
   */
  async execute(): Promise<void> {
    console.log('🧹 API Token-Based Test Data Cleanup Utility\n');
    console.log(
      `Mode: ${this.options.dryRun ? '🔍 DRY RUN' : '💥 LIVE DELETION'}`
    );
    console.log(`API Token: ${this.options.apiToken || 'None'}`);
    console.log(`Filter Mode: ${this.options.filterMode}`);
    console.log(`Prefixes: ${this.options.prefixes.join(', ')}`);
    console.log(`Exclude Patterns: ${this.options.excludePatterns.join(', ')}`);
    console.log(`Parallel operations: ${this.options.parallel}`);
    console.log(`Resource types: ${this.options.resourceTypes.join(', ')}\n`);

    // Enhanced warning for API token mode
    if (!this.options.dryRun) {
      console.log('⚠️  WARNING: This will permanently delete data!');
      console.log('💡 Use --dry-run to preview what would be deleted.');
      
      if (this.options.filterMode === 'api-token') {
        console.log('🚨 API TOKEN MODE: This will delete ALL records created by the specified token!');
      }
      console.log();

      // Required confirmation for non-dry-run mode
      if (this.options.requireConfirmation && process.stdout.isTTY) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('Continue with deletion? Type "DELETE" to confirm: ', resolve);
        });

        rl.close();

        if (answer !== 'DELETE') {
          console.log('Cleanup cancelled.');
          return;
        }
      }
    }

    const resourceTypes = this.options.resourceTypes.includes('all' as ResourceType)
      ? ['companies', 'people', 'tasks', 'lists', 'notes', 'deals']
      : this.options.resourceTypes.filter((t) => t !== 'all');

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
          case 'deals':
            await this.cleanupDeals();
            break;
        }
      } catch (error) {
        console.error(
          `❌ Error processing ${resourceType}:`,
          getDetailedErrorMessage(error)
        );
        this.stats[resourceType].errors++;
      }
    }

    this.printSummary();
    
    if (this.options.auditLog && this.auditLog.length > 0) {
      this.saveAuditLog();
    }
  }

  /**
   * Clean up companies with API token filtering
   */
  private async cleanupCompanies(): Promise<void> {
    const companies = await this.findRecordsByToken('companies');
    this.stats.companies.found = companies.length;

    if (companies.length === 0) {
      console.log('  ✅ No companies found');
      return;
    }

    console.log(`  🔍 Found ${companies.length} companies`);

    // Filter out excluded records
    const filteredCompanies = companies.filter(company => {
      const shouldSkip = this.shouldExclude(company, 'companies');
      if (shouldSkip) {
        this.stats.companies.skipped++;
      }
      return !shouldSkip;
    });

    console.log(`  📋 After exclusions: ${filteredCompanies.length} companies to process`);
    if (this.stats.companies.skipped > 0) {
      console.log(`  ⏭️  Skipped: ${this.stats.companies.skipped} companies (whitelist/exclusion patterns)`);
    }

    if (this.options.dryRun) {
      filteredCompanies.forEach((company, index) => {
        const name = this.extractRecordName(company, 'companies');
        const reason = this.getDeletionReason(company);
        const isRealData = this.looksLikeRealData(company, 'companies');
        const warning = isRealData ? ' ⚠️  LOOKS LIKE REAL DATA' : '';
        const createdAt = company.created_at || company.values?.created_at?.[0]?.value || 'Unknown';
        
        console.log(
          `    ${index + 1}. ${name} (${company.id.record_id})${warning}`
        );
        console.log(`       Reason: ${reason} | Created: ${createdAt}`);
      });
      return;
    }

    // Process in parallel chunks
    const chunks = this.chunkArray(filteredCompanies, this.options.parallel);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (company) => {
          try {
            await retryWithBackoff(async () => {
              await this.client.delete(
                `/objects/companies/records/${company.id.record_id}`
              );
            });

            // Log deletion
            if (this.options.auditLog) {
              this.auditLog.push({
                resourceType: 'companies',
                recordId: company.id.record_id,
                name: this.extractRecordName(company, 'companies'),
                deletionReason: this.getDeletionReason(company),
                createdAt: company.created_at || company.values?.created_at?.[0]?.value || 'Unknown',
                createdBy: company.values?.created_by?.[0]?.referenced_actor_id || 'Unknown',
                timestamp: new Date().toISOString(),
                recordData: company
              });
            }

            this.stats.companies.deleted++;
            if (this.options.verbose) {
              console.log(
                `    ✅ Deleted: ${this.extractRecordName(company, 'companies')}`
              );
            }
          } catch (error) {
            this.stats.companies.errors++;
            console.error(
              `    ❌ Failed to delete company ${company.id.record_id}:`,
              getDetailedErrorMessage(error)
            );
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
   * Find records by API token with enhanced filtering
   */
  private async findRecordsByToken(resourceType: string): Promise<any[]> {
    const allRecords: any[] = [];
    const endpoint = this.getQueryEndpoint(resourceType);

    if (!endpoint) {
      console.warn(`  ⚠️  No query endpoint available for ${resourceType}`);
      return [];
    }

    try {
      // If using prefix mode or both mode, query for each prefix
      if (this.options.filterMode === 'prefix' || this.options.filterMode === 'both') {
        for (const prefix of this.options.prefixes) {
          const filter = this.buildFilter(resourceType, prefix);
          
          const response = await retryWithBackoff(async () => {
            return this.client.post(endpoint, {
              filter,
              limit: 500,
            });
          });

          const records = response.data?.data ?? [];
          allRecords.push(...records);
        }
      } else {
        // API token only mode
        const filter = this.buildFilter(resourceType);
        
        const response = await retryWithBackoff(async () => {
          return this.client.post(endpoint, {
            filter,
            limit: 500,
          });
        });

        const records = response.data?.data ?? [];
        allRecords.push(...records);
      }
    } catch (error) {
      console.error(
        `    ❌ Error querying ${resourceType}:`,
        getDetailedErrorMessage(error)
      );
    }

    // Remove duplicates by record ID
    const uniqueRecords = allRecords.filter(
      (record, index, self) => {
        const recordId = record.id?.record_id || record.id?.task_id || record.id?.list_id || record.id?.note_id;
        return index === self.findIndex((r) => {
          const rId = r.id?.record_id || r.id?.task_id || r.id?.list_id || r.id?.note_id;
          return rId === recordId;
        });
      }
    );

    return uniqueRecords;
  }

  /**
   * Get query endpoint for resource type
   */
  private getQueryEndpoint(resourceType: string): string | null {
    switch (resourceType) {
      case 'companies':
        return '/objects/companies/records/query';
      case 'people':
        return '/objects/people/records/query';
      case 'deals':
        return '/objects/deals/records/query';
      default:
        return null; // Tasks, lists, notes need special handling
    }
  }

  /**
   * Placeholder cleanup methods for other resource types
   * These would need to be implemented similar to cleanupCompanies
   */
  private async cleanupPeople(): Promise<void> {
    console.log('  ⚠️  People cleanup not yet implemented in this version');
  }

  private async cleanupTasks(): Promise<void> {
    console.log('  ⚠️  Tasks cleanup not yet implemented in this version');
  }

  private async cleanupLists(): Promise<void> {
    console.log('  ⚠️  Lists cleanup not yet implemented in this version');
  }

  private async cleanupNotes(): Promise<void> {
    console.log('  ⚠️  Notes cleanup not yet implemented in this version');
  }

  private async cleanupDeals(): Promise<void> {
    console.log('  ⚠️  Deals cleanup not yet implemented in this version');
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
   * Save audit log to file
   */
  private saveAuditLog(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cleanup-audit-${timestamp}.json`;
    const filepath = join(process.cwd(), filename);
    
    try {
      writeFileSync(filepath, JSON.stringify(this.auditLog, null, 2));
      console.log(`\n📝 Audit log saved to: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to save audit log:', error);
    }
  }

  /**
   * Print cleanup summary
   */
  private printSummary(): void {
    console.log('\n📋 Cleanup Summary');
    console.log('='.repeat(60));

    let totalFound = 0;
    let totalDeleted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    Object.entries(this.stats).forEach(([resourceType, stats]) => {
      console.log(
        `${resourceType.padEnd(12)} | Found: ${stats.found.toString().padStart(3)} | Deleted: ${stats.deleted.toString().padStart(3)} | Skipped: ${stats.skipped.toString().padStart(3)} | Errors: ${stats.errors.toString().padStart(3)}`
      );
      totalFound += stats.found;
      totalDeleted += stats.deleted;
      totalErrors += stats.errors;
      totalSkipped += stats.skipped;
    });

    console.log('-'.repeat(60));
    console.log(
      `${'TOTAL'.padEnd(12)} | Found: ${totalFound.toString().padStart(3)} | Deleted: ${totalDeleted.toString().padStart(3)} | Skipped: ${totalSkipped.toString().padStart(3)} | Errors: ${totalErrors.toString().padStart(3)}`
    );

    if (this.options.dryRun) {
      console.log('\n💡 This was a dry run. No data was actually deleted.');
      console.log('   Run without --dry-run to perform actual cleanup.');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
    }

    if (totalErrors > 0) {
      console.log(
        `\n⚠️  ${totalErrors} errors occurred during cleanup. Check the logs above for details.`
      );
    }

    if (totalSkipped > 0) {
      console.log(
        `\n📋 ${totalSkipped} records were skipped due to whitelist or exclusion patterns.`
      );
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
    filterMode: 'both',
    prefixes: ['Perf Test', 'Perf Compare', '🏢 Test'],
    excludePatterns: [],
    resourceTypes: ['companies'],
    parallel: 3, // More conservative for API token mode
    verbose: false,
    requireConfirmation: true,
    auditLog: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--api-token=')) {
      options.apiToken = arg.split('=')[1];
    } else if (arg.startsWith('--filter-mode=')) {
      options.filterMode = arg.split('=')[1] as 'prefix' | 'api-token' | 'both';
    } else if (arg.startsWith('--dry-run=')) {
      options.dryRun = arg.split('=')[1] === 'true';
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--live') {
      options.dryRun = false;
    } else if (arg.startsWith('--prefix=')) {
      options.prefixes = arg
        .split('=')[1]
        .split(',')
        .map((p) => p.trim());
    } else if (arg.startsWith('--exclude-pattern=')) {
      options.excludePatterns = arg
        .split('=')[1]
        .split(',')
        .map((p) => p.trim());
    } else if (arg.startsWith('--resource-type=')) {
      options.resourceTypes = arg
        .split('=')[1]
        .split(',')
        .map((r) => r.trim()) as ResourceType[];
    } else if (arg.startsWith('--parallel=')) {
      options.parallel = parseInt(arg.split('=')[1]) || 3;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--no-confirmation') {
      options.requireConfirmation = false;
    } else if (arg === '--no-audit') {
      options.auditLog = false;
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
🧹 API Token-Based Test Data Cleanup Utility

USAGE:
  npm run cleanup:api-token [OPTIONS]

OPTIONS:
  --api-token=TOKEN        API token ID to filter by (required for api-token mode)
  --filter-mode=MODE       Filter mode: prefix|api-token|both (default: both)
  --dry-run               Preview what would be deleted (default: true)
  --live                  Perform actual deletion
  --prefix=PREFIX,...     Comma-separated list of name prefixes (default: "Perf Test,Perf Compare,🏢 Test")
  --exclude-pattern=P,... Comma-separated exclude patterns (e.g. "Christina,Carol")
  --resource-type=TYPE    Resource types: companies,people,tasks,lists,notes,deals,all (default: companies)
  --parallel=N            Number of parallel operations (default: 3)
  --verbose, -v           Verbose output
  --no-confirmation       Skip deletion confirmation prompt
  --no-audit              Disable audit logging
  --help, -h              Show this help

EXAMPLES:
  # Dry run review of all records by API token
  npm run cleanup:api-token -- --dry-run --api-token=a6a39ec3-12ea-489b-9c7a-4859c3b43215

  # Delete obvious test records (API token + test name patterns)
  npm run cleanup:api-token -- --live --api-token=a6a39ec3-12ea-489b-9c7a-4859c3b43215 --filter-mode=both

  # Review all API token records excluding certain patterns
  npm run cleanup:api-token -- --dry-run --api-token=a6a39ec3-12ea-489b-9c7a-4859c3b43215 --filter-mode=api-token --exclude-pattern="Christina,Carol,Dr."

SAFETY:
  - Dry run mode is enabled by default
  - Audit logging saves all deletions to timestamped files
  - Whitelist support via .cleanup-whitelist.json
  - Pattern exclusion to protect real data
  - Enhanced confirmation for live deletion mode
  `);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const cleanup = new ApiTokenCleanup(options);
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