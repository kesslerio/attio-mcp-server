/**
 * E2E Test Cleanup Utilities
 *
 * Provides utilities for cleaning up test data from Attio workspace,
 * including bulk cleanup operations and orphaned data detection.
 */
import {
  getAttioClient,
  initializeAttioClient,
} from '../../src/api/attio-client.js';
import { loadE2EConfig, type E2EConfig } from './utils/config-loader.js';
import type { AxiosInstance } from 'axios';

export interface CleanupOptions {
  dryRun?: boolean;
  batchSize?: number;
  maxAge?: number; // in hours
  includeTypes?: string[];
  excludeTypes?: string[];
  verbose?: boolean;
  force?: boolean;
}

export interface CleanupResult {
  type: string;
  attempted: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface OrphanedObject {
  type: string;
  id: string;
  name?: string;
  createdAt?: Date;
  matchesPattern: boolean;
}

/**
 * Main cleanup utility class
 */
export class E2ECleanup {
  private config: E2EConfig;
  private apiClient: AxiosInstance;
  private options: Required<CleanupOptions>;

  constructor(options: CleanupOptions = {}) {
    this.options = {
      dryRun: false,
      batchSize: 10,
      maxAge: 24, // 24 hours
      includeTypes: ['companies', 'people', 'lists', 'tasks', 'notes'],
      excludeTypes: [],
      verbose: false,
      force: false,
      ...options,
    };
  }

  /**
   * Initialize cleanup utility
   */
  async initialize(): Promise<void> {
    try {
      this.config = await loadE2EConfig();
      await initializeAttioClient();
      this.apiClient = getAttioClient();

      this.log('✅ Cleanup utility initialized');
    } catch (error) {
      throw new Error(`Failed to initialize cleanup utility: ${error}`);
    }
  }

  /**
   * Run complete cleanup operation
   */
  async runCleanup(): Promise<CleanupResult[]> {
    if (!this.options.force && !this.config.testSettings.cleanupAfterTests) {
      throw new Error(
        'Cleanup is disabled in configuration. Use --force to override.'
      );
    }

    this.log('🧹 Starting E2E test data cleanup...');

    const results: CleanupResult[] = [];
    const types = this.getTypesToClean();

    for (const type of types) {
      this.log(`\n📋 Cleaning ${type}...`);
      const result = await this.cleanupObjectType(type);
      results.push(result);
    }

    this.logCleanupSummary(results);
    return results;
  }

  /**
   * Find orphaned test objects
   */
  async findOrphanedObjects(): Promise<OrphanedObject[]> {
    this.log('🔍 Searching for orphaned test objects...');

    const orphanedObjects: OrphanedObject[] = [];
    const types = this.getTypesToClean();

    for (const type of types) {
      this.log(`Scanning ${type}...`);
      const objects = await this.findOrphanedObjectsOfType(type);
      orphanedObjects.push(...objects);
    }

    this.log(`📊 Found ${orphanedObjects.length} potentially orphaned objects`);
    return orphanedObjects;
  }

  /**
   * Clean up specific object type
   */
  private async cleanupObjectType(type: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      type,
      attempted: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    try {
      const orphanedObjects = await this.findOrphanedObjectsOfType(type);
      result.attempted = orphanedObjects.length;

      if (orphanedObjects.length === 0) {
        this.log(`✅ No orphaned ${type} found`);
        return result;
      }

      this.log(`Found ${orphanedObjects.length} orphaned ${type} objects`);

      if (this.options.dryRun) {
        this.log(
          `🔍 DRY RUN: Would delete ${orphanedObjects.length} ${type} objects`
        );
        result.successful = orphanedObjects.length;
        return result;
      }

      // Process in batches
      const batches = this.createBatches(
        orphanedObjects,
        this.options.batchSize
      );

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.log(
          `Processing batch ${i + 1}/${batches.length} (${batch.length} items)`
        );

        const batchResults = await Promise.allSettled(
          batch.map((obj) => this.deleteObject(type, obj.id))
        );

        // Count results
        batchResults.forEach((batchResult, index) => {
          if (batchResult.status === 'fulfilled') {
            result.successful++;
          } else {
            result.failed++;
            result.errors.push(`${batch[index].id}: ${batchResult.reason}`);
          }
        });

        // Rate limiting between batches
        if (i < batches.length - 1) {
          await this.sleep(1000);
        }
      }

      this.log(
        `✅ Cleanup completed: ${result.successful} successful, ${result.failed} failed`
      );
    } catch (error) {
      result.errors.push(`Failed to cleanup ${type}: ${error}`);
      this.log(`❌ Error cleaning ${type}: ${error}`);
    }

    return result;
  }

  /**
   * Find orphaned objects of specific type
   */
  private async findOrphanedObjectsOfType(
    type: string
  ): Promise<OrphanedObject[]> {
    const orphanedObjects: OrphanedObject[] = [];

    try {
      const objects = await this.fetchAllObjectsOfType(type);

      for (const obj of objects) {
        if (this.isOrphanedObject(obj, type)) {
          orphanedObjects.push({
            type,
            id: this.extractObjectId(obj, type),
            name: this.extractObjectName(obj, type),
            createdAt: this.extractCreatedAt(obj),
            matchesPattern: this.matchesTestPattern(obj),
          });
        }
      }
    } catch (error) {
      this.log(`⚠️  Error fetching ${type}: ${error}`);
    }

    return orphanedObjects;
  }

  /**
   * Fetch all objects of a specific type
   */
  private async fetchAllObjectsOfType(type: string): Promise<any[]> {
    const allObjects: any[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.rateLimitedCall(async () => {
          const params: any = { limit: 100 };
          if (cursor) params.cursor = cursor;

          switch (type) {
            case 'companies':
              return await this.apiClient.get('/objects/companies/records', {
                params,
              });
            case 'people':
              return await this.apiClient.get('/objects/people/records', {
                params,
              });
            case 'lists':
              return await this.apiClient.get('/lists', { params });
            case 'tasks':
              return await this.apiClient.get('/tasks', { params });
            case 'notes':
              return await this.apiClient.get('/notes', { params });
            default:
              throw new Error(`Unsupported object type: ${type}`);
          }
        });

        const data = response.data.data || [];
        allObjects.push(...data);

        // Check for pagination
        cursor = response.data.pagination?.cursor;
        hasMore = response.data.pagination?.has_more || false;

        this.log(
          `Fetched ${data.length} ${type} (total: ${allObjects.length})`
        );
      } catch (error) {
        this.log(`Error fetching ${type}: ${error}`);
        break;
      }
    }

    return allObjects;
  }

  /**
   * Check if object is orphaned (matches test patterns and age criteria)
   */
  private isOrphanedObject(obj: any, type: string): boolean {
    // Check if object matches test pattern
    if (!this.matchesTestPattern(obj)) {
      return false;
    }

    // Check age if specified
    if (this.options.maxAge > 0) {
      const createdAt = this.extractCreatedAt(obj);
      if (createdAt) {
        const ageInHours =
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (ageInHours < this.options.maxAge) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if object matches test data patterns
   */
  private matchesTestPattern(obj: any): boolean {
    const testPrefix = this.config.testData.testDataPrefix;
    const testDomain = this.config.testData.testEmailDomain;
    const testCompanyDomain = this.config.testData.testCompanyDomain;

    // Convert object to string for pattern matching
    const objString = JSON.stringify(obj).toLowerCase();

    return (
      objString.includes(testPrefix.toLowerCase()) ||
      objString.includes(testDomain.toLowerCase()) ||
      objString.includes(testCompanyDomain.toLowerCase())
    );
  }

  /**
   * Extract object ID based on type
   */
  private extractObjectId(obj: any, type: string): string {
    switch (type) {
      case 'companies':
      case 'people':
        return obj.id?.record_id || obj.id || 'unknown';
      case 'lists':
        return obj.id?.list_id || obj.id || 'unknown';
      case 'tasks':
        return obj.id?.task_id || obj.id || 'unknown';
      case 'notes':
        return obj.id?.note_id || obj.id || 'unknown';
      default:
        return obj.id || 'unknown';
    }
  }

  /**
   * Extract object name for logging
   */
  private extractObjectName(obj: any, type: string): string | undefined {
    switch (type) {
      case 'companies':
      case 'people':
        return obj.values?.name?.[0]?.value;
      case 'lists':
        return obj.name;
      case 'tasks':
        return obj.title || obj.values?.title;
      case 'notes':
        return obj.title;
      default:
        return undefined;
    }
  }

  /**
   * Extract created date
   */
  private extractCreatedAt(obj: any): Date | undefined {
    const dateString = obj.created_at || obj.createdAt;
    return dateString ? new Date(dateString) : undefined;
  }

  /**
   * Delete a single object
   */
  private async deleteObject(type: string, id: string): Promise<void> {
    switch (type) {
      case 'companies':
        await this.apiClient.delete(`/objects/companies/records/${id}`);
        break;
      case 'people':
        await this.apiClient.delete(`/objects/people/records/${id}`);
        break;
      case 'lists':
        await this.apiClient.delete(`/lists/${id}`);
        break;
      case 'tasks':
        await this.apiClient.delete(`/tasks/${id}`);
        break;
      case 'notes':
        await this.apiClient.delete(`/notes/${id}`);
        break;
      default:
        throw new Error(`Unsupported object type for deletion: ${type}`);
    }

    this.log(`🗑️  Deleted ${type}:${id}`);
  }

  /**
   * Get types to clean based on options
   */
  private getTypesToClean(): string[] {
    let types = [...this.options.includeTypes];

    if (this.options.excludeTypes.length > 0) {
      types = types.filter((type) => !this.options.excludeTypes.includes(type));
    }

    return types;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Rate limited API call
   */
  private async rateLimitedCall<T>(operation: () => Promise<T>): Promise<T> {
    const delay = 1000 / this.config.api.rateLimit.requestsPerSecond;
    await this.sleep(delay);
    return await operation();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logging utility
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }

  /**
   * Log cleanup summary
   */
  private logCleanupSummary(results: CleanupResult[]): void {
    const totalAttempted = results.reduce((sum, r) => sum + r.attempted, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Total objects processed: ${totalAttempted}`);
    console.log(`   Successfully cleaned: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);

    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
      results.forEach((result) => {
        if (result.errors.length > 0) {
          console.log(`   ${result.type} errors:`, result.errors);
        }
      });
    }

    if (this.options.dryRun) {
      console.log('\n🔍 This was a DRY RUN - no objects were actually deleted');
    }
  }
}

/**
 * CLI-style cleanup function
 */
export async function runE2ECleanup(
  options: CleanupOptions = {}
): Promise<void> {
  const cleanup = new E2ECleanup(options);

  try {
    await cleanup.initialize();
    await cleanup.runCleanup();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

/**
 * Find orphaned objects without cleaning
 */
export async function findOrphanedE2EObjects(
  options: CleanupOptions = {}
): Promise<OrphanedObject[]> {
  const cleanup = new E2ECleanup(options);

  try {
    await cleanup.initialize();
    return await cleanup.findOrphanedObjects();
  } catch (error) {
    console.error('❌ Failed to find orphaned objects:', error);
    throw error;
  }
}

/**
 * Default export
 */
export default E2ECleanup;
