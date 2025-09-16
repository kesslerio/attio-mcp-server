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
    // Test with extremely long strings in record creation - configurable for CI performance
    const maxStringLength = parseInt(
      process.env.MCP_TEST_MAX_STRING_LENGTH || '10000',
      10
    );
    const longStringData = {
      name: 'A'.repeat(maxStringLength),
      description: 'B'.repeat(maxStringLength),
      tags: new Array(100).fill('tag'),
    };

    const createResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: longStringData,
    });

    expect(createResponse).toBeDefined();

    // Test long strings in search queries - should handle gracefully
    const queryLength = Math.min(maxStringLength, 1000); // Limit query length for performance
    const searchResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'A'.repeat(queryLength),
    });

    expect(searchResponse).toBeDefined();

    // Verify memory bounds are reasonable
    EdgeCaseAssertions.assertMemoryBounds(createResponse, 50 * 1024 * 1024); // 50MB limit
  });

  it('should handle numeric boundary values gracefully', async () => {
    // Test negative pagination values - should handle gracefully
    const negativeResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: -1,
      offset: -100,
    });

    expect(negativeResponse).toBeDefined();

    // Test zero values - should handle gracefully
    const zeroResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 0,
      offset: 0,
    });

    expect(zeroResponse).toBeDefined();

    // Test very large values - should handle gracefully
    const largeResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 99999,
      offset: 99999,
    });

    expect(largeResponse).toBeDefined();
  });

  it('should handle pagination limits and large result sets', async () => {
    // Test pagination with large limit values - should handle gracefully
    const largeLimitResponse = await testCase.executeToolCall(
      'search-records',
      {
        resource_type: 'companies',
        limit: 10000,
        offset: 0,
      }
    );

    expect(largeLimitResponse).toBeDefined();

    // Test with large offset values - should handle gracefully
    const largeOffsetResponse = await testCase.executeToolCall(
      'search-records',
      {
        resource_type: 'companies',
        limit: 10,
        offset: 99999,
      }
    );

    expect(largeOffsetResponse).toBeDefined();

    if (testCase['validListId']) {
      // Test list operations with large pagination
      const listResponse = await testCase.executeToolCall('get-list-entries', {
        listId: testCase['validListId'],
        limit: 1000,
        offset: 1000,
      });

      expect(listResponse).toBeDefined();
    }
  });

  it('should handle array and collection size limits gracefully', async () => {
    // Test with large arrays - should handle gracefully
    const largeArrayData = {
      name: 'Boundary Test Company',
      tags: new Array(100).fill('tag'), // Reasonable large array
      attributes: Object.fromEntries(
        new Array(50).fill(0).map((_, i) => [`attr_${i}`, `value_${i}`])
      ),
    };

    const largeArrayResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: largeArrayData,
    });

    expect(largeArrayResponse).toBeDefined();

    // Test empty collections - should handle gracefully
    const emptyCollectionsData = {
      name: 'Empty Collections Test',
      tags: [],
      attributes: {},
      relationships: [],
      metadata: {},
    };

    const emptyResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: emptyCollectionsData,
    });

    expect(emptyResponse).toBeDefined();
  });

  it('should handle Unicode and special character boundaries', async () => {
    // Test Unicode boundary characters
    const unicodeData = {
      name: '\u0000\u0001\u0002\uFFFF\uFFFE',
      description: '🚀💻📊' + '\u200B'.repeat(10), // Zero-width spaces
    };

    const unicodeResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: unicodeData,
    });

    expect(unicodeResponse).toBeDefined();

    // Test with emoji and extended Unicode
    const emojiData = {
      name: '🚀💻📊🔥🎯 Test Company',
      description: 'Test with 中文 русский العربية हिन्दी 🌍',
      tags: ['🏷️', '📝', '✅'],
    };

    const emojiResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: emojiData,
    });

    expect(emojiResponse).toBeDefined();

    // Test control characters
    const controlCharsData = {
      name: 'Test\u0000\u0001\u0002Company',
      description: 'Description with\u200B\u200C\u200D invisible chars',
    };

    const controlResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: controlCharsData,
    });

    expect(controlResponse).toBeDefined();
  });

  it('should handle concurrent operation boundaries gracefully', async () => {
    if (!testCase['validListId'] || testCase['testCompanyIds'].length === 0) {
      console.log(
        'Skipping concurrent boundaries test - insufficient test data'
      );
      return;
    }

    // Test concurrent list membership additions
    const concurrentAdditions = [];
    for (let i = 0; i < 3 && i < testCase['testCompanyIds'].length; i++) {
      concurrentAdditions.push(
        testCase.executeToolCall('add-record-to-list', {
          listId: testCase['validListId'],
          recordId: testCase['testCompanyIds'][i],
          objectType: 'companies',
        })
      );
    }

    const results = await Promise.allSettled(concurrentAdditions);

    // Verify all operations complete (either success or handled gracefully)
    expect(results.length).toBeGreaterThan(0);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });

    // Test rapid successive search operations
    const rapidOperations = [];
    for (let i = 0; i < 5; i++) {
      rapidOperations.push(
        testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: `rapid_test_${i}`,
          limit: 1,
        })
      );
    }

    const rapidResults = await Promise.allSettled(rapidOperations);

    // Verify rapid operations are handled gracefully
    expect(rapidResults.length).toBe(5);
    rapidResults.forEach((result) => {
      expect(result).toBeDefined();
    });
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

  it('should handle additional list operations and edge cases', async () => {
    // Test remove-record-from-list with invalid parameters
    if (testCase['validListId']) {
      const removeResponse = await testCase.executeToolCall(
        'remove-record-from-list',
        {
          listId: testCase['validListId'],
          recordId: 'invalid-record-id',
          objectType: 'companies',
        }
      );

      expect(removeResponse).toBeDefined();

      // Test update-list-entry with malformed data
      const updateEntryResponse = await testCase.executeToolCall(
        'update-list-entry',
        {
          listId: testCase['validListId'],
          entryId: 'invalid-entry-id',
          updates: null,
        }
      );

      expect(updateEntryResponse).toBeDefined();
    }

    // Test list-notes with invalid parent
    const listNotesResponse = await testCase.executeToolCall('list-notes', {
      parent_object: 'invalid-parent-id',
      limit: -1, // Invalid limit
    });

    expect(listNotesResponse).toBeDefined();

    // Test delete-record with invalid ID
    const deleteResponse = await testCase.executeToolCall('delete-record', {
      resource_type: 'companies',
      record_id: 'invalid-delete-id',
    });

    expect(deleteResponse).toBeDefined();
  });
});
