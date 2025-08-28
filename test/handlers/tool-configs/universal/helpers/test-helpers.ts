/**
 * Reusable test utilities and assertion helpers for universal tool tests
 * 
 * This file provides common testing utilities, assertion helpers, and
 * convenience functions used across multiple universal test files.
 * 
 * Follows the mock factory pattern and maintains clean separation from
 * production code.
 */

import { expect } from 'vitest';
import { MockRecord } from './mock-data.js';
import { PERFORMANCE_BUDGETS, TEST_LOGGING } from './test-constants.js';

/**
 * Assertion Helpers
 * Common assertion patterns used across tests
 */

export const assertionHelpers = {
  /**
   * Assert that a record has the expected structure
   */
  assertValidRecord: (record: MockRecord, expectedId?: string) => {
    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.id.record_id).toBeDefined();
    expect(record.values).toBeDefined();
    expect(typeof record.values).toBe('object');
    
    if (expectedId) {
      expect(record.id.record_id).toBe(expectedId);
    }
  },

  /**
   * Assert that a company record has expected fields
   */
  assertValidCompanyRecord: (record: MockRecord, expectedName?: string) => {
    assertionHelpers.assertValidRecord(record);
    expect(record.values.name).toBeDefined();
    expect(Array.isArray(record.values.name)).toBe(true);
    expect(record.values.name[0].value).toBeDefined();
    
    if (expectedName) {
      expect(record.values.name[0].value).toBe(expectedName);
    }
  },

  /**
   * Assert that a person record has expected fields
   */
  assertValidPersonRecord: (record: MockRecord, expectedEmail?: string) => {
    assertionHelpers.assertValidRecord(record);
    expect(record.values.email_addresses).toBeDefined();
    expect(Array.isArray(record.values.email_addresses)).toBe(true);
    expect(record.values.email_addresses[0].email_address).toBeDefined();
    
    if (expectedEmail) {
      expect(record.values.email_addresses[0].email_address).toBe(expectedEmail);
    }
  },

  /**
   * Assert that a task record has expected fields  
   */
  assertValidTaskRecord: (record: MockRecord, expectedTitle?: string) => {
    assertionHelpers.assertValidRecord(record);
    expect(record.values.title).toBeDefined();
    expect(Array.isArray(record.values.title)).toBe(true);
    expect(record.values.title[0].value).toBeDefined();
    
    if (expectedTitle) {
      expect(record.values.title[0].value).toBe(expectedTitle);
    }
  },

  /**
   * Assert that a search result array is valid
   */
  assertValidSearchResults: (results: MockRecord[], minCount: number = 0) => {
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(minCount);
    
    // Validate each record in the results
    results.forEach(record => {
      assertionHelpers.assertValidRecord(record);
    });
  },

  /**
   * Assert that a delete response is valid
   */
  assertValidDeleteResponse: (response: { success: boolean; record_id: string }, expectedId?: string) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.record_id).toBeDefined();
    
    if (expectedId) {
      expect(response.record_id).toBe(expectedId);
    }
  },

  /**
   * Assert that a batch operation response is valid
   */
  assertValidBatchResponse: (
    response: Array<{ success: boolean; result?: any; error?: string }>,
    expectedCount: number,
    minSuccessCount?: number
  ) => {
    expect(response).toBeDefined();
    expect(Array.isArray(response)).toBe(true);
    expect(response).toHaveLength(expectedCount);
    
    if (minSuccessCount !== undefined) {
      const successCount = response.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(minSuccessCount);
    }
  },
};

/**
 * Performance Testing Helpers
 * Utilities for measuring and asserting performance
 */

export const performanceHelpers = {
  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return { result, duration };
  },

  /**
   * Assert that an operation completes within a performance budget
   */
  assertWithinBudget: (duration: number, budgetType: keyof typeof PERFORMANCE_BUDGETS) => {
    const budget = PERFORMANCE_BUDGETS[budgetType];
    expect(duration).toBeLessThan(budget);
    
    if (TEST_LOGGING.debugEnabled) {
      TEST_LOGGING.logPerformance(`${budgetType} operation`, duration);
    }
  },

  /**
   * Log performance metrics for analysis
   */
  logPerformance: (operation: string, duration: number, budget?: number) => {
    console.log(`${operation}: ${duration}ms${budget ? ` (budget: ${budget}ms)` : ''}`);
    
    if (budget && duration > budget * 0.8) {
      console.warn(`⚠️  ${operation} took ${duration}ms (${((duration / budget) * 100).toFixed(1)}% of budget)`);
    }
  },

  /**
   * Create performance test wrapper
   */
  createPerformanceTest: <T>(
    operation: string,
    budgetType: keyof typeof PERFORMANCE_BUDGETS,
    testFn: () => Promise<T>
  ) => {
    return async (): Promise<T> => {
      const { result, duration } = await performanceHelpers.measureTime(testFn);
      
      performanceHelpers.logPerformance(operation, duration, PERFORMANCE_BUDGETS[budgetType]);
      performanceHelpers.assertWithinBudget(duration, budgetType);
      
      return result;
    };
  },
};

/**
 * Test Data Helpers
 * Utilities for managing test data and cleanup
 */

export const testDataHelpers = {
  /**
   * Extract record IDs from results for cleanup
   */
  extractRecordIds: (results: Array<{ success: boolean; result?: any }>): string[] => {
    return results
      .filter(r => r.success && r.result?.id?.record_id)
      .map(r => r.result.id.record_id);
  },

  /**
   * Create unique test identifiers
   */
  createTestIdentifiers: (prefix: string = 'test') => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    
    return {
      timestamp,
      randomId,
      id: `${prefix}-${timestamp}-${randomId}`,
      name: `${prefix} ${timestamp}-${randomId}`,
      email: `${prefix}-${timestamp}-${randomId}@example.com`,
      domain: `${prefix}-${timestamp}-${randomId}.com`,
    };
  },

  /**
   * Wait for API indexing (integration tests)
   */
  waitForIndexing: (ms: number = 2000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry operation with exponential backoff
   */
  retryOperation: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
      }
    }
    
    throw lastError;
  },
};

/**
 * Error Testing Helpers
 * Utilities for testing error scenarios
 */

export const errorTestHelpers = {
  /**
   * Assert that an error has expected properties
   */
  assertError: (error: any, expectedMessage?: string, expectedType?: string) => {
    expect(error).toBeDefined();
    expect(error.message).toBeDefined();
    
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
    
    if (expectedType) {
      expect(error.constructor.name).toBe(expectedType);
    }
  },

  /**
   * Create error expectation helper
   */
  expectError: (promise: Promise<any>, expectedMessage?: string) => {
    return expect(promise).rejects.toThrow(expectedMessage);
  },

  /**
   * Test error propagation through handlers
   */
  testErrorPropagation: async (
    handler: (params: any) => Promise<any>,
    params: any,
    mockError: Error,
    expectedErrorMessage?: string
  ) => {
    // This would typically be used with a mocked function that throws
    await errorTestHelpers.expectError(
      handler(params),
      expectedErrorMessage || mockError.message
    );
  },
};

/**
 * Mock Verification Helpers
 * Utilities for verifying mock calls and behavior
 */

export const mockVerificationHelpers = {
  /**
   * Assert that a mock was called with expected parameters
   */
  assertMockCalledWith: (mockFn: any, expectedParams: any) => {
    expect(mockFn).toHaveBeenCalledWith(expectedParams);
  },

  /**
   * Assert that multiple mocks were called in correct order
   */
  assertMockCallOrder: (mocks: Array<{ mock: any; params?: any }>) => {
    mocks.forEach(({ mock, params }, index) => {
      expect(mock).toHaveBeenCalled();
      
      if (params) {
        expect(mock).toHaveBeenCalledWith(params);
      }
    });
  },

  /**
   * Get call arguments from a mock for inspection
   */
  getMockCallArgs: (mockFn: any, callIndex: number = 0) => {
    expect(mockFn).toHaveBeenCalled();
    return mockFn.mock.calls[callIndex];
  },

  /**
   * Assert mock was called specified number of times
   */
  assertMockCallCount: (mockFn: any, expectedCount: number) => {
    expect(mockFn).toHaveBeenCalledTimes(expectedCount);
  },
};

/**
 * Integration Test Helpers
 * Specific utilities for integration and API tests
 */

export const integrationHelpers = {
  /**
   * Check if integration tests should be skipped
   */
  shouldSkipIntegration: (): boolean => {
    return !process.env.ATTIO_API_KEY;
  },

  /**
   * Check if performance tests should be skipped
   */
  shouldSkipPerformance: (): boolean => {
    return !process.env.ATTIO_API_KEY || process.env.SKIP_PERFORMANCE_TESTS === 'true';
  },

  /**
   * Create skip message for tests
   */
  getSkipMessage: (testType: 'integration' | 'performance'): string => {
    if (testType === 'integration') {
      return 'Skipping integration tests - no API key found';
    } else {
      return 'Skipping performance tests - no API key found or explicitly skipped';
    }
  },

  /**
   * Setup API client for integration tests
   */
  setupApiClient: async (apiKey?: string) => {
    const { initializeAttioClient } = await import(
      '../../../../../src/api/attio-client.js'
    );
    
    const key = apiKey || process.env.ATTIO_API_KEY;
    if (!key) {
      throw new Error('No API key available for integration tests');
    }
    
    initializeAttioClient(key);
  },

  /**
   * Cleanup test records in batches
   */
  cleanupTestRecords: async (
    recordIds: string[], 
    resourceType: string,
    deleteHandler: (params: any) => Promise<any>
  ) => {
    if (recordIds.length === 0) return;
    
    const CLEANUP_BATCH_SIZE = 45; // Stay under 50 limit
    const batches = [];
    
    for (let i = 0; i < recordIds.length; i += CLEANUP_BATCH_SIZE) {
      batches.push(recordIds.slice(i, i + CLEANUP_BATCH_SIZE));
    }
    
    console.log(`Cleaning up ${recordIds.length} test records in ${batches.length} batches...`);
    
    const cleanupPromises = batches.map(async (batch, index) => {
      // Stagger requests to avoid overwhelming the API
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, index * 100));
      }
      
      return deleteHandler({
        resource_type: resourceType,
        operation_type: 'DELETE',
        record_ids: batch,
      });
    });
    
    await Promise.all(cleanupPromises);
    console.log('Test cleanup completed successfully');
  },
};