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

    expect(
      testCase.validateEdgeCaseResponse(
        createResponse,
        'create-record with extremely long strings',
        ['error', 'invalid', 'too large', 'limit exceeded', 'rejected'],
        true // Extremely long strings should be rejected
      )
    ).toBe(true);

    // Test long strings in search queries - should handle gracefully
    const queryLength = Math.min(maxStringLength, 1000); // Limit query length for performance
    const searchResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'A'.repeat(queryLength),
    });

    expect(
      testCase.validateEdgeCaseResponse(
        searchResponse,
        'search-records with extremely long query',
        ['error', 'invalid', 'too large', 'query too long'],
        true // Extremely long queries should be rejected
      )
    ).toBe(true);

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

    expect(
      testCase.validateEdgeCaseResponse(
        negativeResponse,
        'search-records with negative pagination values',
        ['error', 'invalid', 'negative', 'must be positive'],
        true // Negative pagination values should be rejected
      )
    ).toBe(true);

    // Test zero values - should handle gracefully
    const zeroResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 0,
      offset: 0,
    });

    expect(
      testCase.validateEdgeCaseResponse(
        zeroResponse,
        'search-records with zero pagination values',
        ['results', 'companies', '[]'], // Zero limit should return empty results
        false // Zero pagination is valid, should succeed
      )
    ).toBe(true);

    // Test very large values - should handle gracefully
    const largeResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 99999,
      offset: 99999,
    });

    expect(
      testCase.validateEdgeCaseResponse(
        largeResponse,
        'search-records with very large pagination values',
        ['error', 'invalid', 'too large', 'limit exceeded'],
        true // Very large pagination should be rejected
      )
    ).toBe(true);
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

    expect(
      testCase.validateEdgeCaseResponse(
        largeLimitResponse,
        'search-records with large limit values',
        ['error', 'invalid', 'too large', 'limit exceeded'],
        true // Large limits should be rejected
      )
    ).toBe(true);

    // Test with large offset values - should handle gracefully
    const largeOffsetResponse = await testCase.executeToolCall(
      'search-records',
      {
        resource_type: 'companies',
        limit: 10,
        offset: 99999,
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        largeOffsetResponse,
        'search-records with large offset values',
        ['error', 'invalid', 'too large', 'offset exceeded'],
        true // Large offsets should be rejected
      )
    ).toBe(true);

    if (testCase['validListId']) {
      // Test list operations with large pagination
      const listResponse = await testCase.executeToolCall('get-list-entries', {
        listId: testCase['validListId'],
        limit: 1000,
        offset: 1000,
      });

      expect(
        testCase.validateEdgeCaseResponse(
          listResponse,
          'get-list-entries with large pagination',
          ['error', 'invalid', 'too large', 'limit exceeded'],
          true // Large pagination should be rejected
        )
      ).toBe(true);
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

    expect(
      testCase.validateEdgeCaseResponse(
        largeArrayResponse,
        'create-record with large arrays and collections',
        ['error', 'invalid', 'too large', 'array too large'],
        true // Large arrays should be rejected
      )
    ).toBe(true);

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

    expect(
      testCase.validateEdgeCaseResponse(
        emptyResponse,
        'create-record with empty collections',
        ['created', 'success', 'company'], // Empty collections should be valid
        false // This should succeed
      )
    ).toBe(true);
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

    expect(
      testCase.validateEdgeCaseResponse(
        unicodeResponse,
        'create-record with Unicode boundary characters',
        ['error', 'invalid', 'character', 'encoding'],
        true // Null bytes and boundary characters should be rejected
      )
    ).toBe(true);

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

    expect(
      testCase.validateEdgeCaseResponse(
        emojiResponse,
        'create-record with emoji and extended Unicode',
        ['created', 'success', 'company'], // Emojis and normal Unicode should be valid
        false // This should succeed
      )
    ).toBe(true);

    // Test control characters
    const controlCharsData = {
      name: 'Test\u0000\u0001\u0002Company',
      description: 'Description with\u200B\u200C\u200D invisible chars',
    };

    const controlResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: controlCharsData,
    });

    expect(
      testCase.validateEdgeCaseResponse(
        controlResponse,
        'create-record with control characters',
        ['error', 'invalid', 'control character', 'not allowed'],
        true // Control characters should be rejected
      )
    ).toBe(true);
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
    results.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        expect(
          testCase.validateEdgeCaseResponse(
            result.value,
            `concurrent add-record-to-list operation ${index}`,
            [
              'added',
              'success',
              'entry',
              'error',
              'already exists',
              'duplicate',
            ]
          )
        ).toBe(true);
      }
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
    rapidResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        expect(
          testCase.validateEdgeCaseResponse(
            result.value,
            `rapid search operation ${index}`,
            ['results', 'companies', '[]', 'error', 'rate limit', 'throttled']
          )
        ).toBe(true);
      }
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

      expect(
        testCase.validateEdgeCaseResponse(
          removeResponse,
          'remove-record-from-list with invalid record ID',
          ['error', 'not found', 'invalid', 'does not exist'],
          true // Invalid ID should produce error
        )
      ).toBe(true);

      // Test update-list-entry with malformed data
      const updateEntryResponse = await testCase.executeToolCall(
        'update-list-entry',
        {
          listId: testCase['validListId'],
          entryId: 'invalid-entry-id',
          updates: null,
        }
      );

      expect(
        testCase.validateEdgeCaseResponse(
          updateEntryResponse,
          'update-list-entry with malformed data',
          ['error', 'invalid', 'not found', 'malformed', 'null'],
          true // Invalid entry ID and null updates should produce error
        )
      ).toBe(true);
    }

    // Test list-notes with invalid parent
    const listNotesResponse = await testCase.executeToolCall('list-notes', {
      parent_object: 'invalid-parent-id',
      limit: -1, // Invalid limit
    });

    expect(
      testCase.validateEdgeCaseResponse(
        listNotesResponse,
        'list-notes with invalid parent and negative limit',
        ['error', 'invalid', 'not found', 'limit', 'negative'],
        true // Invalid parent ID and negative limit should produce error
      )
    ).toBe(true);

    // Test delete-record with invalid ID
    const deleteResponse = await testCase.executeToolCall('delete-record', {
      resource_type: 'companies',
      record_id: 'invalid-delete-id',
    });

    expect(
      testCase.validateEdgeCaseResponse(
        deleteResponse,
        'delete-record with invalid record ID',
        ['error', 'not found', 'invalid', 'does not exist'],
        true // Invalid ID should produce error
      )
    ).toBe(true);
  });
});
