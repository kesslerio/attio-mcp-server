/**
 * TC-EC02: Limits & Boundaries Edge Cases
 * P2 Edge Cases Test - Complete MCP Test Suite Implementation
 * Issue #649: Edge Cases & Error Handling Tests
 *
 * Tests boundary conditions, size limits, and resource constraints
 * to ensure proper handling of extreme values and system limits.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
} from '../shared/edge-case-test-base';
import { EdgeCaseAssertions } from '../shared/edge-case-assertions';
import { ErrorScenarios } from '../shared/error-scenarios';
import { TestDataFactory } from '../shared/test-data-factory';

class LimitsBoundariesTest extends EdgeCaseTestBase {
  private validCompanyId: string | null = null;
  private validListId: string | null = null;
  private testCompanyIds: string[] = [];

  constructor() {
    super('TC_EC02');
  }

  /**
   * Setup test data for boundary testing
   */
  async setupBoundaryTestData(): Promise<void> {
    try {
      // Create a valid company for boundary testing
      const companyData = TestDataFactory.createCompanyData('TC_EC02');
      const companyResult = await this.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: companyData,
      });

      if (!companyResult.isError) {
        this.validCompanyId = this.extractRecordId(
          this.extractTextContent(companyResult)
        );
        if (this.validCompanyId) {
          TestDataFactory.trackRecord('companies', this.validCompanyId);
          this.testCompanyIds.push(this.validCompanyId);
          console.log(`Created boundary test company: ${this.validCompanyId}`);
        }
      }

      // Get a valid list for boundary testing
      const listsResult = await this.executeToolCall('get-lists', {});
      if (!listsResult.isError) {
        const listsText = this.extractTextContent(listsResult);
        try {
          const lists = JSON.parse(listsText);
          if (Array.isArray(lists) && lists.length > 0) {
            this.validListId = lists[0].id?.id || lists[0].id;
            console.log(`Using list for boundary testing: ${this.validListId}`);
          }
        } catch (e) {
          console.warn('Could not parse lists response for boundary testing');
        }
      }

      // Create multiple companies for pagination boundary testing
      for (let i = 0; i < 5; i++) {
        const extraCompanyData = TestDataFactory.createCompanyData(
          `TC_EC02_${i}`
        );
        const extraResult = await this.executeToolCall('create-record', {
          resource_type: 'companies',
          record_data: extraCompanyData,
        });

        if (!extraResult.isError) {
          const id = this.extractRecordId(this.extractTextContent(extraResult));
          if (id) {
            TestDataFactory.trackRecord('companies', id);
            this.testCompanyIds.push(id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to setup boundary test data:', error);
    }
  }
}

describe('TC-EC02: Limits & Boundaries Edge Cases', () => {
  const testCase = new LimitsBoundariesTest();

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupBoundaryTestData();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Generate comprehensive test report
    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC02 Limits & Boundaries Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    // P2 tests require 75% pass rate
    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC02 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC02 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  });

  it('should handle extremely long string inputs gracefully', async () => {
    const scenarios = ErrorScenarios.getBoundaryLimitScenarios();
    const longStringsScenario = scenarios.find(
      (s) => s.name === 'extremely_long_strings'
    );

    expect(longStringsScenario).toBeDefined();

    // Test with extremely long strings in record creation
    const result = await testCase.executeBoundaryTest(
      'extremely_long_strings_create',
      'create-record',
      {
        resource_type: 'companies',
        record_data: longStringsScenario!.inputData,
      },
      'graceful_handling'
    );

    expect(result.passed).toBe(true);

    // Test long strings in search queries
    const searchResult = await testCase.executeBoundaryTest(
      'extremely_long_strings_search',
      'search-records',
      {
        resource_type: 'companies',
        query: 'A'.repeat(50000), // 50KB query string
      },
      'graceful_handling'
    );

    expect(searchResult.passed).toBe(true);

    // Verify memory bounds
    const createResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: longStringsScenario!.inputData,
    });

    EdgeCaseAssertions.assertMemoryBounds(createResponse, 50 * 1024 * 1024); // 50MB limit
  });

  it('should validate numeric boundary values appropriately', async () => {
    const scenarios = ErrorScenarios.getBoundaryLimitScenarios();
    const numericScenario = scenarios.find(
      (s) => s.name === 'negative_numeric_values'
    );

    expect(numericScenario).toBeDefined();

    // Test negative pagination values
    const paginationResult = await testCase.executeBoundaryTest(
      'negative_pagination_values',
      'search-records',
      {
        resource_type: 'companies',
        limit: -1,
        offset: -100,
      },
      'validation_failure'
    );

    expect(paginationResult.passed).toBe(true);

    // Test zero values
    const zeroResult = await testCase.executeBoundaryTest(
      'zero_boundary_values',
      'search-records',
      {
        resource_type: 'companies',
        limit: 0,
        offset: 0,
      },
      'graceful_handling'
    );

    expect(zeroResult.passed).toBe(true);

    // Test maximum safe integer overflow
    const overflowScenario = scenarios.find(
      (s) => s.name === 'maximum_safe_integer_overflow'
    );
    expect(overflowScenario).toBeDefined();

    const overflowResult = await testCase.executeBoundaryTest(
      'integer_overflow_test',
      'search-records',
      {
        resource_type: 'companies',
        limit: Number.MAX_SAFE_INTEGER,
        offset: Number.MAX_SAFE_INTEGER,
      },
      'graceful_handling'
    );

    expect(overflowResult.passed).toBe(true);
  });

  it('should handle pagination limits and large result sets', async () => {
    // Test pagination with extremely large limit values
    const largeLimitResult = await testCase.executeBoundaryTest(
      'large_pagination_limit',
      'search-records',
      {
        resource_type: 'companies',
        limit: 100000, // Very large limit
        offset: 0,
      },
      'graceful_handling'
    );

    expect(largeLimitResult.passed).toBe(true);

    // Test with large offset values
    const largeOffsetResult = await testCase.executeBoundaryTest(
      'large_pagination_offset',
      'search-records',
      {
        resource_type: 'companies',
        limit: 10,
        offset: 999999, // Large offset beyond available data
      },
      'graceful_handling'
    );

    expect(largeOffsetResult.passed).toBe(true);

    if (testCase['validListId']) {
      // Test list operations with large pagination
      const listPaginationResult = await testCase.executeBoundaryTest(
        'list_large_pagination',
        'get-list-entries',
        {
          listId: testCase['validListId'],
          limit: 50000,
          offset: 100000,
        },
        'graceful_handling'
      );

      expect(listPaginationResult.passed).toBe(true);
    }
  });

  it('should enforce array and collection size limits', async () => {
    // Test with extremely large arrays
    const largeArrayData = {
      name: 'Boundary Test Company',
      tags: new Array(10000).fill('tag'), // Large array
      categories: new Array(5000).fill('category'),
      attributes: Object.fromEntries(
        new Array(1000).fill(0).map((_, i) => [`attr_${i}`, `value_${i}`])
      ), // Large object with many properties
    };

    const largeArrayResult = await testCase.executeBoundaryTest(
      'large_array_collections',
      'create-record',
      {
        resource_type: 'companies',
        record_data: largeArrayData,
      },
      'graceful_handling'
    );

    expect(largeArrayResult.passed).toBe(true);

    // Test empty collections boundary
    const scenarios = ErrorScenarios.getBoundaryLimitScenarios();
    const emptyCollectionsScenario = scenarios.find(
      (s) => s.name === 'empty_arrays_and_objects'
    );

    expect(emptyCollectionsScenario).toBeDefined();

    const emptyResult = await testCase.executeBoundaryTest(
      'empty_collections_boundary',
      'create-record',
      {
        resource_type: 'companies',
        record_data: emptyCollectionsScenario!.inputData,
      },
      'graceful_handling'
    );

    expect(emptyResult.passed).toBe(true);
  });

  it('should handle Unicode and special character boundaries', async () => {
    const scenarios = ErrorScenarios.getBoundaryLimitScenarios();
    const unicodeScenario = scenarios.find(
      (s) => s.name === 'unicode_boundary_characters'
    );

    expect(unicodeScenario).toBeDefined();

    // Test Unicode boundary characters
    const unicodeResult = await testCase.executeBoundaryTest(
      'unicode_boundary_characters',
      'create-record',
      {
        resource_type: 'companies',
        record_data: unicodeScenario!.inputData,
      },
      'graceful_handling'
    );

    expect(unicodeResult.passed).toBe(true);

    // Test with emoji and extended Unicode
    const emojiData = {
      name: '🚀💻📊🔥🎯' + '🌟'.repeat(1000), // Long emoji string
      description: 'Test with 中文 русский العربية हिन्दी 🌍',
      tags: ['🏷️', '📝', '✅', '⚡', '🔍'],
    };

    const emojiResult = await testCase.executeBoundaryTest(
      'emoji_unicode_boundary',
      'create-record',
      {
        resource_type: 'companies',
        record_data: emojiData,
      },
      'graceful_handling'
    );

    expect(emojiResult.passed).toBe(true);

    // Test control characters and invisible characters
    const controlCharsData = {
      name: 'Test\u0000\u0001\u0002Company', // Null and control characters
      description: 'Description with\u200B\u200C\u200D\uFEFF invisible chars', // Zero-width chars
      notes: '\uFFFF\uFFFE\uFFFD replacement chars', // Unicode replacement characters
    };

    const controlResult = await testCase.executeBoundaryTest(
      'control_characters_boundary',
      'create-record',
      {
        resource_type: 'companies',
        record_data: controlCharsData,
      },
      'graceful_handling'
    );

    expect(controlResult.passed).toBe(true);
  });

  it('should validate and limit concurrent operation boundaries', async () => {
    if (!testCase['validListId'] || testCase['testCompanyIds'].length === 0) {
      console.log(
        'Skipping concurrent boundaries test - insufficient test data'
      );
      return;
    }

    // Test concurrent list membership additions with the same record
    const concurrentAdditions = async () => {
      const promises = testCase['testCompanyIds'].slice(0, 3).map((companyId) =>
        testCase.executeToolCall('add-record-to-list', {
          listId: testCase['validListId'],
          recordId: companyId,
          objectType: 'companies',
        })
      );

      return Promise.allSettled(promises);
    };

    const startTime = Date.now();
    const results = await concurrentAdditions();
    const executionTime = Date.now() - startTime;

    // Verify concurrent operations are handled properly
    EdgeCaseAssertions.assertConcurrencyHandling(
      results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : ({ isError: true, content: [] } as any)
      ),
      1, // At least 1 should succeed
      results.length - 1 // Allow others to fail due to constraints
    );

    // Test rapid successive operations
    const rapidOperations = [];
    for (let i = 0; i < 10; i++) {
      rapidOperations.push(
        testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: `rapid_test_${i}`,
          limit: 1,
        })
      );
    }

    const rapidResults = await Promise.allSettled(rapidOperations);
    const rapidExecutionTime = Date.now() - startTime;

    // Check if rate limiting is working
    EdgeCaseAssertions.assertRateLimiting(
      rapidResults.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : ({ isError: true, content: [] } as any)
      ),
      [rapidExecutionTime], // Single timing measurement
      100 // Minimum expected delay
    );
  });

  it('should handle memory and resource consumption limits', async () => {
    // Test with large query operations
    const largeQueryResult = await testCase.executeBoundaryTest(
      'large_memory_query',
      'search-records',
      {
        resource_type: 'companies',
        query: 'test', // Simple query
        limit: 10000, // Large result set request
      },
      'graceful_handling'
    );

    expect(largeQueryResult.passed).toBe(true);

    // Verify response size is manageable
    const queryResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'test',
      limit: 1000,
    });

    EdgeCaseAssertions.assertMemoryBounds(queryResponse, 20 * 1024 * 1024); // 20MB limit

    // Test timeout boundaries with complex operations
    if (testCase['validListId']) {
      const startTime = Date.now();

      const complexFilterResult = await testCase.executeToolCall(
        'advanced-filter-list-entries',
        {
          listId: testCase['validListId'],
          filter: {
            $and: new Array(100).fill({
              attribute: 'name',
              operator: 'contains',
              value: 'test',
            }),
          },
        }
      );

      const complexExecutionTime = Date.now() - startTime;

      EdgeCaseAssertions.assertTimeoutHandling(
        complexFilterResult,
        complexExecutionTime,
        30000 // 30 second timeout
      );
    }
  });
});
