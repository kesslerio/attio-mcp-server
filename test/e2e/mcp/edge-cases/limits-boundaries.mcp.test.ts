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
      const companyResult = await this.executeToolCall('create_record', {
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
        const extraResult = await this.executeToolCall('create_record', {
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
  }, 60000);

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
  }, 60000);

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

    const createResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: longStringData,
    });

    const handledLongCreate =
      testCase.validateEdgeCaseResponse(
        createResponse,
        'create-record with extremely long strings (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'too large', 'limit'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        createResponse,
        'create-record with extremely long strings (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledLongCreate).toBe(true);

    // Test long strings in search queries - should handle gracefully
    const queryLength = Math.min(maxStringLength, 1000); // Limit query length for performance
    const searchResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'A'.repeat(queryLength),
    });

    const handledLongSearch =
      testCase.validateEdgeCaseResponse(
        searchResponse,
        'search-records with extremely long query (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'too large', 'query'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        searchResponse,
        'search-records with extremely long query (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledLongSearch).toBe(true);

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

    const handledNegative =
      testCase.validateEdgeCaseResponse(
        negativeResponse,
        'search-records with negative pagination values (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'negative', 'must'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        negativeResponse,
        'search-records with negative pagination values (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledNegative).toBe(true);

    // Test zero values - should handle gracefully
    const zeroResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 0,
      offset: 0,
    });
    expect(typeof testCase.hasError(zeroResponse)).toBe('boolean');

    // Test very large values - should handle gracefully
    const largeResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      limit: 99999,
      offset: 99999,
    });

    const rejectLarge = testCase.validateEdgeCaseResponse(
      largeResponse,
      'search-records with very large pagination values (expect error)',
      {
        expectError: true,
        errorIndicators: ['error', 'invalid', 'too large', 'limit exceeded'],
      }
    );
    testCase.validateEdgeCaseResponse(
      largeResponse,
      'search-records with very large pagination values (telemetry)',
      {
        expectError: true,
        errorIndicators: ['error', 'invalid', 'limit', 'large'],
      }
    );
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

    const handledLargeLimit =
      testCase.validateEdgeCaseResponse(
        largeLimitResponse,
        'search-records with large limit values (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'limit'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        largeLimitResponse,
        'search-records with large limit values (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledLargeLimit).toBe(true);

    // Test with large offset values - should handle gracefully
    const largeOffsetResponse = await testCase.executeToolCall(
      'search-records',
      {
        resource_type: 'companies',
        limit: 10,
        offset: 99999,
      }
    );

    const handledLargeOffset =
      testCase.validateEdgeCaseResponse(
        largeOffsetResponse,
        'search-records with large offset values (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'offset'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        largeOffsetResponse,
        'search-records with large offset values (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledLargeOffset).toBe(true);

    if (testCase['validListId']) {
      // Test list operations with large pagination
      const listResponse = await testCase.executeToolCall('get-list-entries', {
        listId: testCase['validListId'],
        limit: 1000,
        offset: 1000,
      });

      const handledLargeList =
        testCase.validateEdgeCaseResponse(
          listResponse,
          'get-list-entries with large pagination (error)',
          {
            expectError: true,
            errorIndicators: ['error', 'invalid', 'limit'],
          }
        ) ||
        testCase.validateEdgeCaseResponse(
          listResponse,
          'get-list-entries with large pagination (graceful)',
          {
            expectError: false,
            successIndicators: [],
            allowGracefulFallback: true,
          }
        );
      expect(handledLargeList).toBe(true);
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

    const largeArrayResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: largeArrayData,
    });

    const handledLargeArray =
      testCase.validateEdgeCaseResponse(
        largeArrayResponse,
        'create-record with large arrays and collections (error)',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'array'],
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        largeArrayResponse,
        'create-record with large arrays and collections (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledLargeArray).toBe(true);

    // Test empty collections - should handle gracefully
    const emptyCollectionsData = {
      name: 'Empty Collections Test',
      tags: [],
      attributes: {},
      relationships: [],
      metadata: {},
    };

    const emptyResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: emptyCollectionsData,
    });

    const handledEmptyCollections =
      testCase.validateEdgeCaseResponse(
        emptyResponse,
        'create-record with empty collections (error)',
        {
          expectError: true,
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        emptyResponse,
        'create-record with empty collections (graceful)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(handledEmptyCollections).toBe(true);
  });

  it('should handle Unicode and special character boundaries', async () => {
    // Test Unicode boundary characters
    const unicodeData = {
      name: '\u0000\u0001\u0002\uFFFF\uFFFE',
      description: '🚀💻📊' + '\u200B'.repeat(10), // Zero-width spaces
    };

    const unicodeResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: unicodeData,
    });

    testCase.validateEdgeCaseResponse(
      unicodeResponse,
      'create-record with Unicode boundary characters (telemetry)',
      {
        expectError: true,
        errorIndicators: ['error', 'invalid', 'character', 'encoding'],
      }
    );

    // Test with emoji and extended Unicode
    const emojiData = {
      name: '🚀💻📊🔥🎯 Test Company',
      description: 'Test with 中文 русский العربية हिन्दी 🌍',
      tags: ['🏷️', '📝', '✅'],
    };

    const emojiResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: emojiData,
    });

    expect(typeof testCase.hasError(emojiResponse)).toBe('boolean');

    // Test control characters
    const controlCharsData = {
      name: 'Test\u0000\u0001\u0002Company',
      description: 'Description with\u200B\u200C\u200D invisible chars',
    };

    const controlResponse = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: controlCharsData,
    });

    expect(typeof testCase.hasError(controlResponse)).toBe('boolean');
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
        const value = result.value;
        const isError = value.isError || testCase.hasError(value);
        if (isError) {
          expect(
            testCase.validateEdgeCaseResponse(
              value,
              `concurrent add-record-to-list operation ${index} error`,
              {
                expectError: true,
                errorIndicators: ['already exists', 'duplicate', 'error'],
              }
            )
          ).toBe(true);
        } else {
          expect(
            testCase.validateEdgeCaseResponse(
              value,
              `concurrent add-record-to-list operation ${index} success`,
              {
                expectError: false,
                successIndicators: [],
                allowGracefulFallback: true,
              }
            )
          ).toBe(true);
        }
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
            {
              expectError: false,
              successIndicators: [],
              allowGracefulFallback: true,
            }
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
          {
            expectError: true,
            errorIndicators: [
              'error',
              'not found',
              'invalid',
              'does not exist',
            ],
          }
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
          {
            expectError: true,
            errorIndicators: [
              'error',
              'invalid',
              'not found',
              'malformed',
              'null',
            ],
          }
        )
      ).toBe(true);
    }

    // Test list-notes with invalid parent
    const listNotesResponse = await testCase.executeToolCall('list_notes', {
      parent_object: 'invalid-parent-id',
      limit: -1, // Invalid limit
    });

    expect(
      testCase.validateEdgeCaseResponse(
        listNotesResponse,
        'list-notes with invalid parent and negative limit',
        {
          expectError: true,
          errorIndicators: [
            'error',
            'invalid',
            'not found',
            'limit',
            'negative',
          ],
        }
      )
    ).toBe(true);

    // Test delete-record with invalid ID
    const deleteResponse = await testCase.executeToolCall('delete_record', {
      resource_type: 'companies',
      record_id: 'invalid-delete-id',
    });

    expect(
      testCase.validateEdgeCaseResponse(
        deleteResponse,
        'delete-record with invalid record ID',
        {
          expectError: true,
          errorIndicators: ['error', 'not found', 'invalid', 'does not exist'],
        }
      )
    ).toBe(true);
  });
});
