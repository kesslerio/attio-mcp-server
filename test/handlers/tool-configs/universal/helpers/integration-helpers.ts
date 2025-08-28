/**
 * Integration and performance test helpers for universal tools
 * 
 * This file provides specialized helpers for real API integration tests
 * and performance testing scenarios. Unlike the mock-based helpers,
 * these work with real API calls and data.
 * 
 * Used by: integration.test.ts, performance.test.ts
 */

import { config } from 'dotenv';
import { 
  UniversalResourceType,
  BatchOperationType,
} from '../../../../../src/handlers/tool-configs/universal/types.js';
import { 
  TEST_ENVIRONMENT, 
  TEST_TIMEOUTS, 
  PERFORMANCE_BUDGETS,
  BATCH_LIMITS,
  CLEANUP_DELAYS,
} from './test-constants.js';
import { IntegrationDataFactory } from './mock-data.js';

// Load environment variables
config();

/**
 * Integration Test Setup and Configuration
 */

export class IntegrationTestSetup {
  private static instance: IntegrationTestSetup;
  private apiClient: any = null;
  
  static getInstance(): IntegrationTestSetup {
    if (!IntegrationTestSetup.instance) {
      IntegrationTestSetup.instance = new IntegrationTestSetup();
    }
    return IntegrationTestSetup.instance;
  }

  /**
   * Initialize API client for integration tests
   */
  async initializeApiClient(): Promise<void> {
    if (!process.env.ATTIO_API_KEY) {
      throw new Error('ATTIO_API_KEY environment variable is required for integration tests');
    }

    const { initializeAttioClient } = await import(
      '../../../../../src/api/attio-client.js'
    );

    console.log('Initializing API client for integration tests...');
    initializeAttioClient(process.env.ATTIO_API_KEY);
    this.apiClient = true;
  }

  /**
   * Check if API client is initialized
   */
  isInitialized(): boolean {
    return this.apiClient !== null;
  }

  /**
   * Verify tool configurations are loaded
   */
  async verifyToolConfigs(): Promise<{
    coreOperations: string[];
    advancedOperations: string[];
  }> {
    try {
      const { coreOperationsToolConfigs, advancedOperationsToolConfigs } = await import(
        '../../../../../src/handlers/tool-configs/universal/index.js'
      );

      const coreTools = Object.keys(coreOperationsToolConfigs || {});
      const advancedTools = Object.keys(advancedOperationsToolConfigs || {});

      console.log('Core operations tools:', coreTools);
      console.log('Advanced operations tools:', advancedTools);

      return {
        coreOperations: coreTools,
        advancedOperations: advancedTools,
      };
    } catch (error) {
      console.error('Failed to load tool configurations:', error);
      throw error;
    }
  }
}

/**
 * Test Data Management for Integration Tests
 */

export class IntegrationTestDataManager {
  private createdRecords: Map<string, string[]> = new Map();
  private testIdentifiers = IntegrationDataFactory.generateTestIdentifiers();

  /**
   * Get unique test identifiers for this test run
   */
  getTestIdentifiers() {
    return this.testIdentifiers;
  }

  /**
   * Track a created record for cleanup
   */
  trackCreatedRecord(resourceType: string, recordId: string): void {
    const existing = this.createdRecords.get(resourceType) || [];
    existing.push(recordId);
    this.createdRecords.set(resourceType, existing);
  }

  /**
   * Track multiple created records
   */
  trackCreatedRecords(resourceType: string, recordIds: string[]): void {
    const existing = this.createdRecords.get(resourceType) || [];
    existing.push(...recordIds);
    this.createdRecords.set(resourceType, existing);
  }

  /**
   * Get all tracked records for a resource type
   */
  getTrackedRecords(resourceType: string): string[] {
    return this.createdRecords.get(resourceType) || [];
  }

  /**
   * Get all tracked records across all resource types
   */
  getAllTrackedRecords(): Map<string, string[]> {
    return new Map(this.createdRecords);
  }

  /**
   * Clear tracking for a specific resource type
   */
  clearTracking(resourceType: string): void {
    this.createdRecords.delete(resourceType);
  }

  /**
   * Clear all tracking
   */
  clearAllTracking(): void {
    this.createdRecords.clear();
  }

  /**
   * Cleanup tracked records using batch operations
   */
  async cleanupTrackedRecords(toolConfigs: any): Promise<void> {
    const allRecords = this.getAllTrackedRecords();
    
    for (const [resourceType, recordIds] of allRecords) {
      if (recordIds.length === 0) continue;

      await this.cleanupRecords(resourceType, recordIds, toolConfigs);
      this.clearTracking(resourceType);
    }
  }

  /**
   * Cleanup specific records in batches
   */
  private async cleanupRecords(
    resourceType: string, 
    recordIds: string[], 
    toolConfigs: any
  ): Promise<void> {
    try {
      // Split into batches to respect API limits
      const batches = [];
      for (let i = 0; i < recordIds.length; i += BATCH_LIMITS.cleanupBatchSize) {
        batches.push(recordIds.slice(i, i + BATCH_LIMITS.cleanupBatchSize));
      }

      console.log(
        `Cleaning up ${recordIds.length} ${resourceType} records in ${batches.length} batches...`
      );

      // Process batches in parallel with staggered delays
      const cleanupPromises = batches.map(async (batch, index) => {
        // Add staggered delay to avoid overwhelming the API
        if (index > 0) {
          await new Promise(resolve => 
            setTimeout(resolve, index * BATCH_LIMITS.staggerDelayMs)
          );
        }

        // Use batch operations if available, fallback to individual deletes
        if (toolConfigs['batch-operations']) {
          return toolConfigs['batch-operations'].handler({
            resource_type: resourceType,
            operation_type: BatchOperationType.DELETE,
            record_ids: batch,
          });
        } else if (toolConfigs['delete-record']) {
          // Fallback to individual delete operations
          const deletePromises = batch.map(recordId =>
            toolConfigs['delete-record'].handler({
              resource_type: resourceType,
              record_id: recordId,
            })
          );
          return Promise.all(deletePromises);
        } else {
          console.warn(`No delete handler available for ${resourceType}`);
        }
      });

      await Promise.all(cleanupPromises);
      console.log(`Cleanup completed for ${resourceType} records`);
    } catch (error) {
      console.error(`Cleanup failed for ${resourceType} records:`, error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }
}

/**
 * Performance Test Utilities
 */

export class PerformanceTestRunner {
  private results: Map<string, number[]> = new Map();

  /**
   * Run a performance test with measurement
   */
  async runPerformanceTest<T>(
    testName: string,
    testFn: () => Promise<T>,
    budgetKey?: keyof typeof PERFORMANCE_BUDGETS
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Track results for analysis
      this.trackResult(testName, duration);

      // Check against budget if provided
      if (budgetKey) {
        const budget = PERFORMANCE_BUDGETS[budgetKey];
        this.assertPerformanceBudget(testName, duration, budget);
      }

      // Log performance metrics
      console.log(`${testName}: ${duration}ms`);

      return { result, duration };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`${testName} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Track performance results for analysis
   */
  private trackResult(testName: string, duration: number): void {
    const existing = this.results.get(testName) || [];
    existing.push(duration);
    this.results.set(testName, existing);
  }

  /**
   * Assert performance meets budget requirements
   */
  private assertPerformanceBudget(testName: string, duration: number, budget: number): void {
    if (duration > budget) {
      const percentage = ((duration / budget) * 100).toFixed(1);
      throw new Error(
        `Performance budget exceeded for ${testName}: ${duration}ms > ${budget}ms (${percentage}% of budget)`
      );
    }

    // Warn if close to budget
    if (duration > budget * 0.8) {
      const percentage = ((duration / budget) * 100).toFixed(1);
      console.warn(
        `⚠️  ${testName} approaching budget limit: ${duration}ms (${percentage}% of ${budget}ms budget)`
      );
    }
  }

  /**
   * Get performance statistics for a test
   */
  getPerformanceStats(testName: string): {
    count: number;
    min: number;
    max: number;
    average: number;
    median: number;
  } | null {
    const results = this.results.get(testName);
    if (!results || results.length === 0) {
      return null;
    }

    const sorted = [...results].sort((a, b) => a - b);
    const count = results.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = results.reduce((sum, val) => sum + val, 0) / count;
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

    return { count, min, max, average, median };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const lines = ['Performance Test Results:', '========================'];
    
    for (const [testName, results] of this.results) {
      const stats = this.getPerformanceStats(testName);
      if (stats) {
        lines.push(
          `${testName}: avg=${stats.average.toFixed(0)}ms, min=${stats.min}ms, max=${stats.max}ms, median=${stats.median.toFixed(0)}ms (${stats.count} runs)`
        );
      }
    }

    return lines.join('\n');
  }
}

/**
 * Integration Test Configuration Helper
 */

export const integrationConfig = {
  /**
   * Check if integration tests should run
   */
  shouldRun: (): boolean => {
    return !TEST_ENVIRONMENT.skipIntegrationTests;
  },

  /**
   * Check if performance tests should run
   */
  shouldRunPerformance: (): boolean => {
    return !TEST_ENVIRONMENT.skipPerformanceTests;
  },

  /**
   * Get skip message for tests
   */
  getSkipMessage: (testType: 'integration' | 'performance'): string => {
    if (testType === 'integration') {
      return 'Skipping integration tests - no API key found';
    }
    return 'Skipping performance tests - no API key found or explicitly skipped';
  },

  /**
   * Get test timeouts with CI adjustments
   */
  getTimeouts: () => TEST_TIMEOUTS,

  /**
   * Get performance budgets with CI adjustments
   */
  getBudgets: () => PERFORMANCE_BUDGETS,

  /**
   * Log environment information
   */
  logEnvironment: (): void => {
    console.log(
      `Running tests with ${TEST_ENVIRONMENT.isCI ? 'CI' : 'LOCAL'} configuration (${TEST_ENVIRONMENT.ciMultiplier}x timeout multiplier)`
    );
  },
};

/**
 * Utility functions for integration tests
 */

export const integrationUtils = {
  /**
   * Wait for API indexing
   */
  waitForIndexing: (ms: number = CLEANUP_DELAYS.apiIndexing): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry operation with exponential backoff
   */
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    operationName?: string
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          if (operationName) {
            console.error(`${operationName} failed after ${maxRetries} attempts:`, error);
          }
          throw error;
        }
        
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (operationName) {
          console.log(`Retry ${operationName} (attempt ${attempt}/${maxRetries}) after ${delay}ms delay`);
        }
      }
    }
    
    throw lastError;
  },

  /**
   * Extract successful batch operation results
   */
  extractSuccessfulResults: (batchResults: Array<{ success: boolean; result?: any; error?: string }>): any[] => {
    return batchResults
      .filter(result => result.success && result.result)
      .map(result => result.result);
  },

  /**
   * Extract record IDs from batch results
   */
  extractRecordIds: (batchResults: Array<{ success: boolean; result?: any }>): string[] => {
    return integrationUtils.extractSuccessfulResults(batchResults)
      .filter(result => result.id?.record_id)
      .map(result => result.id.record_id);
  },

  /**
   * Log batch operation summary
   */
  logBatchSummary: (
    operation: string,
    results: Array<{ success: boolean; error?: string }>,
    duration?: number
  ): void => {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    
    console.log(
      `${operation}: ${successful}/${total} successful${duration ? ` (${duration}ms)` : ''}`
    );
    
    if (failed > 0) {
      const errors = results
        .filter(r => !r.success)
        .map(r => r.error)
        .slice(0, 3); // Show first 3 errors
      
      console.warn(`Failed operations (${failed}):`, errors.join(', '));
    }
  },
};