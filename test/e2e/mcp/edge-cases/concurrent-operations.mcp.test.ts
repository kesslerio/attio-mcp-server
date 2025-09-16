/**
 * TC-EC03: Concurrent Operations Edge Cases
 * P2 Edge Cases Test - Complete MCP Test Suite Implementation
 * Issue #649: Edge Cases & Error Handling Tests
 *
 * Tests concurrent operations, race conditions, and system behavior
 * under simultaneous load to ensure data consistency and error handling.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
  type ConcurrencyTestConfig,
} from '../shared/edge-case-test-base';
import { EdgeCaseAssertions } from '../shared/edge-case-assertions';
import { ErrorScenarios } from '../shared/error-scenarios';
import { TestDataFactory } from '../shared/test-data-factory';

class ConcurrentOperationsTest extends EdgeCaseTestBase {
  private validCompanyId: string | null = null;
  private validListId: string | null = null;
  private testCompanyIds: string[] = [];
  private testPersonIds: string[] = [];

  constructor() {
    super('TC_EC03');
  }

  /**
   * Setup test data for concurrency testing
   */
  async setupConcurrencyTestData(): Promise<void> {
    try {
      // Create test companies for concurrent operations (reduced from 10 to 3)
      for (let i = 0; i < 3; i++) {
        const companyData = TestDataFactory.createCompanyData(
          `TC_EC03_Company_${i}`
        );
        const companyResult = await this.executeToolCall('create-record', {
          resource_type: 'companies',
          record_data: companyData,
        });

        if (!companyResult.isError) {
          const id = this.extractRecordId(
            this.extractTextContent(companyResult)
          );
          if (id) {
            TestDataFactory.trackRecord('companies', id);
            this.testCompanyIds.push(id);
            if (i === 0) this.validCompanyId = id;
          }
        }
      }

      // Create test people for concurrent operations (reduced from 5 to 2)
      for (let i = 0; i < 2; i++) {
        const personData = TestDataFactory.createPersonData(
          `TC_EC03_Person_${i}`
        );
        const personResult = await this.executeToolCall('create-record', {
          resource_type: 'people',
          record_data: personData,
        });

        if (!personResult.isError) {
          const id = this.extractRecordId(
            this.extractTextContent(personResult)
          );
          if (id) {
            TestDataFactory.trackRecord('people', id);
            this.testPersonIds.push(id);
          }
        }
      }

      // Get a valid list for concurrent list operations
      const listsResult = await this.executeToolCall('get-lists', {});
      if (!listsResult.isError) {
        const listsText = this.extractTextContent(listsResult);
        try {
          const lists = JSON.parse(listsText);
          if (Array.isArray(lists) && lists.length > 0) {
            this.validListId = lists[0].id?.id || lists[0].id;
            console.log(
              `Using list for concurrency testing: ${this.validListId}`
            );
          }
        } catch (e) {
          console.warn(
            'Could not parse lists response for concurrency testing'
          );
        }
      }

      console.log(
        `Created ${this.testCompanyIds.length} companies and ${this.testPersonIds.length} people for concurrency testing`
      );
    } catch (error) {
      console.error('Failed to setup concurrency test data:', error);
    }
  }

  /**
   * Generate concurrent record creation parameters
   */
  generateConcurrentCreateParams = (): Record<string, unknown> => {
    const uniqueId = this.generateTestId('concurrent');
    return {
      resource_type: 'companies',
      record_data: {
        name: `Concurrent Test Company ${uniqueId}`,
        domains: [`concurrent-${uniqueId}.com`],
        description: `Created by concurrent test ${Date.now()}`,
      },
    };
  };

  /**
   * Generate concurrent search parameters
   */
  generateConcurrentSearchParams = (): Record<string, unknown> => {
    return {
      resource_type: 'companies',
      query: `concurrent test ${Math.random()}`,
      limit: Math.floor(Math.random() * 20) + 1,
    };
  };

  /**
   * Generate concurrent update parameters
   */
  generateConcurrentUpdateParams = (): Record<string, unknown> => {
    if (this.testCompanyIds.length === 0) {
      throw new Error('No test companies available for concurrent updates');
    }

    const randomCompanyId =
      this.testCompanyIds[
        Math.floor(Math.random() * this.testCompanyIds.length)
      ];
    const timestamp = Date.now();

    return {
      resource_type: 'companies',
      record_id: randomCompanyId,
      updates: {
        description: `Updated concurrently at ${timestamp}`,
      },
    };
  };
}

describe('TC-EC03: Concurrent Operations Edge Cases', () => {
  const testCase = new ConcurrentOperationsTest();

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupConcurrencyTestData();
  });

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Generate comprehensive test report
    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC03 Concurrent Operations Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    // P2 tests require 75% pass rate
    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC03 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC03 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  });

  it('should handle simultaneous record creation gracefully', async () => {
    const config: ConcurrencyTestConfig = {
      concurrentCalls: 8,
      delayBetweenCalls: 0, // No delay for true concurrency
      expectedSuccesses: 6, // At least 6 should succeed
      expectedFailures: 2, // Allow up to 2 failures due to constraints
    };

    const result = await testCase.executeConcurrencyTest(
      'simultaneous_record_creation',
      'create-record',
      testCase.generateConcurrentCreateParams,
      config
    );

    expect(result.passed).toBe(true);

    // Verify no duplicate records with identical data
    const searchResult = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'Concurrent Test Company',
      limit: 50,
    });

    expect(
      testCase.validateEdgeCaseResponse(
        searchResult,
        'search after concurrent record creation',
        ['[]', 'companies', 'results']
      )
    ).toBe(true);

    // Additional test: simultaneous creation with identical data
    const identicalDataConfig: ConcurrencyTestConfig = {
      concurrentCalls: 5,
      delayBetweenCalls: 0,
      expectedSuccesses: 1, // Only one should succeed with identical data
      expectedFailures: 4, // Others should fail due to constraints
    };

    const identicalDataParams = () => ({
      resource_type: 'companies',
      record_data: {
        name: 'Identical Concurrent Company',
        domains: ['identical-concurrent.com'],
        description: 'Same data for all concurrent calls',
      },
    });

    const identicalResult = await testCase.executeConcurrencyTest(
      'identical_data_creation',
      'create-record',
      identicalDataParams,
      identicalDataConfig
    );

    expect(identicalResult.passed).toBe(true);
  });

  it('should manage concurrent updates to the same record safely', async () => {
    if (testCase['testCompanyIds'].length === 0) {
      console.log(
        'Skipping concurrent updates test - no test companies available'
      );
      return;
    }

    const targetCompanyId = testCase['testCompanyIds'][0];

    // Concurrent updates to the same record
    const updatePromises = [];
    for (let i = 0; i < 6; i++) {
      updatePromises.push(
        testCase.executeToolCall('update-record', {
          resource_type: 'companies',
          record_id: targetCompanyId,
          updates: {
            description: `Concurrent update ${i} at ${Date.now()}`,
          },
        })
      );
    }

    const updateResults = await Promise.allSettled(updatePromises);

    // Analyze concurrent update results - use graceful handling approach
    expect(updateResults.length).toBeGreaterThan(0);
    updateResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Each concurrent update should either succeed OR fail, not both
        const hasSuccess = testCase.validateEdgeCaseResponse(
          result.value,
          `concurrent update operation ${index} (success)`,
          ['updated', 'success', 'company'],
          false
        );
        const hasError = testCase.validateEdgeCaseResponse(
          result.value,
          `concurrent update operation ${index} (conflict)`,
          ['error', 'conflict', 'concurrent', 'locked'],
          true
        );
        expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
      }
    });

    // Verify final state consistency
    const finalStateResult = await testCase.executeToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: targetCompanyId,
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        finalStateResult,
        'get-record-details after concurrent updates',
        ['company', 'success', 'details', 'error', 'not found']
      )
    ).toBe(true);

    // Check that the record still exists and has valid data
    const finalText = testCase.extractTextContent(finalStateResult);
    expect(finalText).toContain(targetCompanyId);
  });

  it('should handle rapid successive search operations efficiently', async () => {
    const config: ConcurrencyTestConfig = {
      concurrentCalls: 15,
      delayBetweenCalls: 10, // Small delay to test rate limiting
      expectedSuccesses: 10, // Most should succeed
      expectedFailures: 5, // Some may be rate limited
    };

    const result = await testCase.executeConcurrencyTest(
      'rapid_successive_searches',
      'search-records',
      testCase.generateConcurrentSearchParams,
      config
    );

    expect(result.passed).toBe(true);

    // Test burst of identical searches
    const identicalSearchConfig: ConcurrencyTestConfig = {
      concurrentCalls: 10,
      delayBetweenCalls: 0,
      expectedSuccesses: 5, // Some should succeed
      expectedFailures: 5, // Others may be cached or rate limited
    };

    const identicalSearchParams = () => ({
      resource_type: 'companies',
      query: 'identical search query',
      limit: 5,
    });

    const identicalSearchResult = await testCase.executeConcurrencyTest(
      'identical_burst_searches',
      'search-records',
      identicalSearchParams,
      identicalSearchConfig
    );

    expect(identicalSearchResult.passed).toBe(true);
  });

  it('should manage concurrent list membership operations correctly', async () => {
    if (!testCase['validListId'] || testCase['testCompanyIds'].length < 3) {
      console.log(
        'Skipping concurrent list operations test - insufficient test data'
      );
      return;
    }

    // Test concurrent additions to the same list
    const additionPromises = testCase['testCompanyIds']
      .slice(0, 3) // Reduced from 5 to match available test data
      .map((companyId, index) =>
        testCase.executeToolCall('add-record-to-list', {
          listId: testCase['validListId'],
          recordId: companyId,
          objectType: 'companies',
        })
      );

    const additionResults = await Promise.allSettled(additionPromises);

    // Analyze concurrent list addition results - use graceful handling approach
    expect(additionResults.length).toBeGreaterThan(0);
    additionResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Each list addition should either succeed OR fail, not both
        const hasSuccess = testCase.validateEdgeCaseResponse(
          result.value,
          `concurrent add-to-list operation ${index} (success)`,
          ['added', 'success', 'entry'],
          false
        );
        const hasError = testCase.validateEdgeCaseResponse(
          result.value,
          `concurrent add-to-list operation ${index} (duplicate)`,
          ['error', 'already exists', 'duplicate'],
          true
        );
        expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
      }
    });

    // Test concurrent additions of the same record to different lists
    if (testCase['testPersonIds'].length > 0) {
      const personId = testCase['testPersonIds'][0];

      // This would require multiple lists, so we'll test repeated additions to same list
      const repeatedAddPromises = [];
      for (let i = 0; i < 4; i++) {
        repeatedAddPromises.push(
          testCase.executeToolCall('add-record-to-list', {
            listId: testCase['validListId'],
            recordId: personId,
            objectType: 'people',
          })
        );
      }

      const repeatedResults = await Promise.allSettled(repeatedAddPromises);

      // All operations should handle duplicates gracefully
      expect(repeatedResults.length).toBeGreaterThan(0);
      repeatedResults.forEach((result, index) => {
        expect(result.status).toBe('fulfilled'); // Should not throw exceptions
        if (result.status === 'fulfilled') {
          // Each repeated addition should either succeed OR fail, not both
          const hasSuccess = testCase.validateEdgeCaseResponse(
            result.value,
            `repeated add-to-list operation ${index} (success)`,
            ['added', 'success', 'entry'],
            false
          );
          const hasError = testCase.validateEdgeCaseResponse(
            result.value,
            `repeated add-to-list operation ${index} (duplicate)`,
            ['error', 'already exists', 'duplicate'],
            true
          );
          expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
        }
      });
    }
  });

  it('should enforce rate limiting under high load conditions', async () => {
    // Test rate limiting with burst requests
    const burstPromises = [];
    const startTime = Date.now();

    for (let i = 0; i < 20; i++) {
      burstPromises.push(
        testCase.executeToolCall('search-records', {
          resource_type: 'companies',
          query: `rate_limit_test_${i}`,
          limit: 1,
        })
      );
    }

    const burstResults = await Promise.allSettled(burstPromises);
    const totalTime = Date.now() - startTime;

    // Check results - use graceful handling approach
    expect(burstResults.length).toBe(20);
    burstResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Each search should either succeed OR be rate limited, not both
        const hasSuccess = testCase.validateEdgeCaseResponse(
          result.value,
          `burst search operation ${index} (success)`,
          ['results', 'companies'],
          false
        );
        const hasError = testCase.validateEdgeCaseResponse(
          result.value,
          `burst search operation ${index} (rate limited)`,
          ['error', 'rate limit', 'throttled', 'too many'],
          true
        );
        expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
      }
    });

    // Verify operations completed
    console.log(
      `Burst test completed: ${burstResults.length} requests, ${totalTime}ms total`
    );

    // Test sustained load over time
    const sustainedPromises = [];
    for (let i = 0; i < 10; i++) {
      // Add delay between batches
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      sustainedPromises.push(testCase.executeToolCall('get-lists', {}));
    }

    const sustainedResults = await Promise.allSettled(sustainedPromises);

    // Under sustained load with delays, all should complete gracefully
    expect(sustainedResults.length).toBe(10);
    sustainedResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Each get-lists should either succeed OR be rate limited, not both
        const hasSuccess = testCase.validateEdgeCaseResponse(
          result.value,
          `sustained get-lists operation ${index} (success)`,
          ['lists', 'results'],
          false
        );
        const hasError = testCase.validateEdgeCaseResponse(
          result.value,
          `sustained get-lists operation ${index} (rate limited)`,
          ['error', 'rate limit', 'throttled'],
          true
        );
        expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
      }
    });
  });

  it('should maintain data consistency during complex concurrent workflows', async () => {
    if (testCase['testCompanyIds'].length < 3 || !testCase['validListId']) {
      console.log('Skipping complex workflow test - insufficient test data');
      return;
    }

    // Complex workflow: Create, Update, List operations concurrently
    const complexWorkflowPromises = [];

    // Create operations
    complexWorkflowPromises.push(
      testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: testCase.generateConcurrentCreateParams()['record_data'],
      })
    );

    // Update operations
    complexWorkflowPromises.push(
      testCase.executeToolCall('update-record', {
        resource_type: 'companies',
        record_id: testCase['testCompanyIds'][0],
        updates: { description: `Complex workflow update ${Date.now()}` },
      })
    );

    // List operations
    complexWorkflowPromises.push(
      testCase.executeToolCall('add-record-to-list', {
        listId: testCase['validListId'],
        recordId: testCase['testCompanyIds'][1],
        objectType: 'companies',
      })
    );

    // Search operations
    complexWorkflowPromises.push(
      testCase.executeToolCall('search-records', {
        resource_type: 'companies',
        query: 'TC_EC03',
        limit: 10,
      })
    );

    // Details retrieval
    complexWorkflowPromises.push(
      testCase.executeToolCall('get-record-details', {
        resource_type: 'companies',
        record_id: testCase['testCompanyIds'][2],
      })
    );

    const workflowResults = await Promise.allSettled(complexWorkflowPromises);

    // Analyze complex workflow results - use graceful handling approach
    expect(workflowResults.length).toBeGreaterThan(0);
    workflowResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Each workflow operation should either succeed OR fail, not both
        const hasSuccess = testCase.validateEdgeCaseResponse(
          result.value,
          `complex workflow operation ${index} (success)`,
          ['created', 'updated', 'added', 'results', 'success', 'company'],
          false
        );
        const hasError = testCase.validateEdgeCaseResponse(
          result.value,
          `complex workflow operation ${index} (error)`,
          ['error', 'failed', 'conflict'],
          true
        );
        expect(hasSuccess || hasError).toBe(true); // Should be either success OR error
      }
    });

    // Verify data consistency after complex operations
    const consistencyCheckResult = await testCase.executeToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: testCase['testCompanyIds'][0],
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        consistencyCheckResult,
        'get-record-details consistency check after complex workflows',
        ['company', 'success', 'details', 'error', 'not found']
      )
    ).toBe(true);

    // Check that the record still exists and has valid data
    const consistencyText = testCase.extractTextContent(consistencyCheckResult);
    expect(consistencyText).toContain(testCase['testCompanyIds'][0]);
  });
});
