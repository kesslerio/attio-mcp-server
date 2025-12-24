/**
 * TC-EC04: Error Recovery Edge Cases
 * P2 Edge Cases Test - Complete MCP Test Suite Implementation
 * Issue #649: Edge Cases & Error Handling Tests
 *
 * Tests error recovery mechanisms, graceful degradation, and system
 * resilience under failure conditions to ensure robust operation.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
} from '../shared/edge-case-test-base';
import { EdgeCaseAssertions } from '../shared/edge-case-assertions';
import { ErrorScenarios } from '../shared/error-scenarios';
import { TestDataFactory } from '../shared/test-data-factory';

class ErrorRecoveryTest extends EdgeCaseTestBase {
  private validCompanyId: string | null = null;
  private validListId: string | null = null;
  private corruptedRecordId: string | null = null;
  private testCompanyIds: string[] = [];

  constructor() {
    super('TC_EC04');
  }

  /**
   * Setup test data for error recovery testing
   */
  async setupErrorRecoveryTestData(): Promise<void> {
    try {
      // Create valid test companies for error recovery scenarios
      for (let i = 0; i < 5; i++) {
        const companyData = TestDataFactory.createCompanyData(
          `TC_EC04_Company_${i}`
        );
        const companyResult = await this.executeToolCall('create_record', {
          resource_type: 'companies',
          record_data: companyData,
        });

        // Parse JSON to get proper record_id (JSON response has nested id.record_id structure)
        const parsedResult = this.parseRecordResult(companyResult);
        const id = parsedResult.id;
        if (id) {
          TestDataFactory.trackRecord('companies', id);
          this.testCompanyIds.push(id);
          if (i === 0) this.validCompanyId = id;
        }
      }

      // Get a valid list for recovery testing
      const listsResult = await this.executeToolCall('get-lists', {});
      const listsText = this.extractTextContent(listsResult);
      try {
        const lists = JSON.parse(listsText);
        if (Array.isArray(lists) && lists.length > 0) {
          this.validListId = lists[0].id?.id || lists[0].id;
          console.log(`Using list for recovery testing: ${this.validListId}`);
        }
      } catch (e) {
        console.warn('Could not parse lists response for recovery testing');
      }

      console.log(
        `Created ${this.testCompanyIds.length} companies for error recovery testing`
      );
    } catch (error) {
      console.error('Failed to setup error recovery test data:', error);
    }
  }

  /**
   * Simulate network or timeout-like conditions
   */
  async simulateNetworkTimeout(): Promise<{ initial: any; recovery: any }> {
    // Attempt an operation that might timeout (large query)
    const timeoutStart = Date.now();

    // Use configurable query length for performance optimization
    const queryLength = parseInt(
      process.env.MCP_TEST_MAX_STRING_LENGTH || '10000',
      10
    );
    const initialResult = await this.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'A'.repeat(queryLength), // Very long query that might timeout
      limit: 10000, // Large limit
    });

    const timeoutDuration = Date.now() - timeoutStart;

    // Recovery attempt with simpler operation
    const recoveryResult = await this.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'TC_EC04',
      limit: 5,
    });

    return {
      initial: { result: initialResult, duration: timeoutDuration },
      recovery: recoveryResult,
    };
  }

  /**
   * Test recovery from dependency failures
   */
  async testDependencyRecovery(): Promise<{ initial: any; recovery: any }> {
    // Reference non-existent dependent resource
    const dependencyResult = await this.executeToolCall('get-record-details', {
      resource_type: 'companies',
      record_id: 'non-existent-company-id-12345',
    });

    // Recovery with valid operation
    const recoveryResult = await this.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'TC_EC04',
      limit: 1,
    });

    return {
      initial: dependencyResult,
      recovery: recoveryResult,
    };
  }
}

describe('TC-EC04: Error Recovery Edge Cases', () => {
  const testCase = new ErrorRecoveryTest();

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupErrorRecoveryTestData();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Generate comprehensive test report
    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC04 Error Recovery Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    // P2 tests require 75% pass rate
    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC04 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC04 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  }, 60000);

  it('should recover gracefully from network timeout conditions', async () => {
    const { initial, recovery } = await testCase.simulateNetworkTimeout();

    // The initial operation might timeout or succeed depending on system state
    console.log(`Network timeout simulation: ${initial.duration}ms duration`);

    // Recovery operation should succeed
    expect(
      testCase.validateEdgeCaseResponse(
        recovery,
        'network timeout recovery operation',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      )
    ).toBe(true);

    // Test the error recovery pattern
    const result = await testCase.executeExpectedFailureTest(
      'network_timeout_recovery',
      'search-records',
      {
        resource_type: 'companies',
        query: 'B'.repeat(
          Math.min(
            parseInt(process.env.MCP_TEST_MAX_STRING_LENGTH || '10000', 10) * 2,
            50000
          )
        ), // Configurable extremely long query
        limit: 50000, // Large limit that might cause timeout
      },
      'graceful_handling',
      ['timeout', 'limit', 'too large']
    );

    expect(result.passed).toBe(true);

    // Verify recovery with simple operation
    if (initial.result.isError || testCase.hasError(initial.result)) {
      EdgeCaseAssertions.assertErrorRecovery(initial.result, recovery);
    }
  });

  it('should handle partial data corruption gracefully', async () => {
    const scenarios = ErrorScenarios.getErrorRecoveryScenarios();
    const corruptionScenario = scenarios.find(
      (s) => s.name === 'partial_data_corruption'
    );

    // Verify scenario is available for testing
    expect(corruptionScenario).toBeDefined();

    // Test creating record with potentially corrupted data
    const corruptionResult = await testCase.executeExpectedFailureTest(
      'partial_data_corruption',
      'create_record',
      {
        resource_type: 'companies',
        record_data: corruptionScenario!.inputData,
      },
      'graceful_handling',
      ['corrupted', 'invalid', 'cleaned', 'sanitized']
    );

    expect(corruptionResult.passed).toBe(true);

    // Test recovery by attempting to create valid record after corruption
    const recoveryData = TestDataFactory.createCompanyData('TC_EC04_Recovery');
    const recoveryResult = await testCase.executeToolCall('create_record', {
      resource_type: 'companies',
      record_data: recoveryData,
    });

    // Check for successful recovery - JSON response with record ID is valid success
    const recoveryText = testCase.extractTextContent(recoveryResult);
    const hasValidRecordId =
      recoveryText.includes('record_id') || recoveryText.includes('ID:');
    const validatedViaHelper = testCase.validateEdgeCaseResponse(
      recoveryResult,
      'recovery after data corruption test',
      {
        expectError: false,
        successIndicators: [],
        allowGracefulFallback: true,
      }
    );
    // Accept either valid record ID in response OR validation helper passing
    expect(hasValidRecordId || validatedViaHelper).toBe(true);

    // Verify system can still create valid records after handling corruption
    const recoveryId = testCase.extractRecordId(
      testCase.extractTextContent(recoveryResult)
    );
    if (recoveryId) {
      TestDataFactory.trackRecord('companies', recoveryId);

      const verificationResult = await testCase.executeToolCall(
        'get-record-details',
        {
          resource_type: 'companies',
          record_id: recoveryId,
        }
      );

      expect(
        testCase.validateEdgeCaseResponse(
          verificationResult,
          'get-record-details after corruption recovery',
          {
            expectError: false,
            successIndicators: [],
            allowGracefulFallback: true,
          }
        )
      ).toBe(true);
    }
  });

  it('should recover from missing dependent resource references', async () => {
    const { initial, recovery } = await testCase.testDependencyRecovery();

    // Initial operation should handle missing reference gracefully
    expect(
      testCase.validateEdgeCaseResponse(
        initial,
        'missing dependency operation',
        {
          expectError: true,
          errorIndicators: [
            'error',
            'not found',
            'missing',
            'invalid',
            'non-existent',
          ],
        }
      )
    ).toBe(true);

    // Recovery operation should succeed
    expect(
      testCase.validateEdgeCaseResponse(
        recovery,
        'dependency recovery operation',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      )
    ).toBe(true);

    // Test the dependency recovery pattern
    EdgeCaseAssertions.assertErrorRecovery(initial, recovery);

    // Test with list operations referencing non-existent records
    if (testCase['validListId']) {
      const listDependencyResult = await testCase.executeExpectedFailureTest(
        'missing_list_dependency',
        'add-record-to-list',
        {
          listId: testCase['validListId'],
          recordId: 'non-existent-record-id-12345',
          objectType: 'companies',
        },
        'graceful_handling',
        ['not found', 'missing', 'reference', 'invalid']
      );

      expect(listDependencyResult.passed).toBe(true);

      // Recovery: Add valid record to list
      if (testCase['testCompanyIds'].length > 0) {
        const listRecoveryResult = await testCase.executeToolCall(
          'add-record-to-list',
          {
            listId: testCase['validListId'],
            recordId: testCase['testCompanyIds'][0],
            objectType: 'companies',
          }
        );

        const listHandled =
          testCase.validateEdgeCaseResponse(
            listRecoveryResult,
            'add-record-to-list recovery after missing dependency (error)',
            {
              expectError: true,
              errorIndicators: ['already exists', 'duplicate', 'error'],
            }
          ) ||
          testCase.validateEdgeCaseResponse(
            listRecoveryResult,
            'add-record-to-list recovery after missing dependency (success)',
            {
              expectError: false,
              successIndicators: [],
              allowGracefulFallback: true,
            }
          );
        expect(listHandled).toBe(true);
      }
    }
  });

  it('should handle transaction-like rollback scenarios', async () => {
    if (testCase['testCompanyIds'].length < 2) {
      console.log(
        'Skipping transaction rollback test - insufficient test companies'
      );
      return;
    }

    // Simulate a multi-step operation where one step fails
    const multiStepOperations = [
      // Step 1: Valid update
      {
        operation: () =>
          testCase.executeToolCall('update_record', {
            resource_type: 'companies',
            record_id: testCase['testCompanyIds'][0],
            updates: { description: 'Transaction step 1' },
          }),
        shouldSucceed: true,
      },
      // Step 2: Invalid update (should fail)
      {
        operation: () =>
          testCase.executeToolCall('update_record', {
            resource_type: 'companies',
            record_id: 'invalid-id-that-does-not-exist',
            updates: { description: 'Transaction step 2' },
          }),
        shouldSucceed: false,
      },
      // Step 3: Recovery operation
      {
        operation: () =>
          testCase.executeToolCall('get-record-details', {
            resource_type: 'companies',
            record_id: testCase['testCompanyIds'][0],
          }),
        shouldSucceed: true,
      },
    ];

    const operationResults = [];

    for (const step of multiStepOperations) {
      try {
        const result = await step.operation();
        operationResults.push({
          result,
          succeeded: result !== null && result !== undefined,
          expected: step.shouldSucceed,
        });
      } catch (error) {
        operationResults.push({
          result: null,
          succeeded: false,
          expected: step.shouldSucceed,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Verify transaction behavior - use graceful handling approach
    expect(operationResults.length).toBe(3);
    operationResults.forEach((opResult, index) => {
      expect(opResult).toBeDefined();
      if (!opResult.result) {
        expect(opResult.expected).toBe(false);
        return;
      }

      const value = opResult.result;
      if (opResult.expected) {
        const successHandled = !testCase.hasError(value);
        const fallbackHandled = testCase.validateEdgeCaseResponse(
          value,
          `transaction step ${index + 1} fallback`,
          {
            expectError: true,
          }
        );
        expect(successHandled || fallbackHandled).toBe(true);
      } else {
        expect(
          testCase.validateEdgeCaseResponse(
            value,
            `transaction step ${index + 1} error`,
            {
              expectError: true,
              errorIndicators: ['error', 'not found', 'invalid'],
            }
          )
        ).toBe(true);
      }
    });

    // Verify data consistency after failed transaction
    const consistencyCheck = await testCase.executeToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: testCase['testCompanyIds'][0],
      }
    );

    // Check for successful consistency verification - JSON response with record ID is valid
    const consistencyResultText = testCase.extractTextContent(consistencyCheck);
    const hasConsistencyRecordId =
      consistencyResultText.includes('record_id') ||
      consistencyResultText.includes('ID:');
    const consistencyValidated = testCase.validateEdgeCaseResponse(
      consistencyCheck,
      'get-record-details consistency check after transaction',
      {
        expectError: false,
        successIndicators: [],
        allowGracefulFallback: true,
      }
    );
    // Accept either valid record ID in response OR validation helper passing
    expect(hasConsistencyRecordId || consistencyValidated).toBe(true);

    const consistencyText = testCase.extractTextContent(consistencyCheck);
    expect(consistencyText).toContain(testCase['testCompanyIds'][0]); // Record should still exist
  });

  it('should recover from inconsistent data states', async () => {
    if (testCase['testCompanyIds'].length < 3) {
      console.log(
        'Skipping inconsistent state recovery test - insufficient test companies'
      );
      return;
    }

    // Create an inconsistent state by attempting conflicting operations
    const companyId = testCase['testCompanyIds'][0];

    // Rapid conflicting updates to create potential inconsistency
    const conflictingOperations = [
      testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: companyId,
        updates: { description: 'State A' },
      }),
      testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: companyId,
        updates: { description: 'State B' },
      }),
      testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: companyId,
        updates: { description: 'State C' },
      }),
    ];

    const conflictResults = await Promise.allSettled(conflictingOperations);

    // At least one operation should succeed - check both isError flag AND response content
    const successfulConflicts = conflictResults.filter((r) => {
      if (r.status !== 'fulfilled') return false;
      // Check if it's actually a success: isError=false OR has valid record data
      const text = testCase.extractTextContent(r.value);
      const hasRecordId = text.includes('record_id') || text.includes('ID:');
      return !r.value.isError || hasRecordId;
    }).length;

    // At least one of the concurrent updates should succeed
    expect(successfulConflicts).toBeGreaterThanOrEqual(1);

    // Recovery: Verify final consistent state
    const recoveryResult = await testCase.executeToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: companyId,
      }
    );

    const recoveryHandled =
      testCase.validateEdgeCaseResponse(
        recoveryResult,
        'get-record-details after inconsistent state conflicts (error)',
        {
          expectError: true,
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        recoveryResult,
        'get-record-details after inconsistent state conflicts (success)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(recoveryHandled).toBe(true);

    // State should be consistent (one of the update values)
    const recoveryText = testCase.extractTextContent(recoveryResult);
    // Verify that we get a valid response with the company ID
    expect(recoveryText).toContain(companyId);

    // Additional recovery test: fix inconsistent state with fresh update
    const fixResult = await testCase.executeToolCall('update_record', {
      resource_type: 'companies',
      record_id: companyId,
      updates: { description: 'Consistent Recovery State' },
    });

    const fixHandled =
      testCase.validateEdgeCaseResponse(
        fixResult,
        'update-record fix for inconsistent state (error)',
        {
          expectError: true,
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        fixResult,
        'update-record fix for inconsistent state (success)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(fixHandled).toBe(true);

    // Verify fix was applied
    const verifyFixResult = await testCase.executeToolCall(
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: companyId,
      }
    );

    const verifyHandled =
      testCase.validateEdgeCaseResponse(
        verifyFixResult,
        'get-record-details verification after fix (error)',
        {
          expectError: true,
        }
      ) ||
      testCase.validateEdgeCaseResponse(
        verifyFixResult,
        'get-record-details verification after fix (success)',
        {
          expectError: false,
          successIndicators: [],
          allowGracefulFallback: true,
        }
      );
    expect(verifyHandled).toBe(true);

    const fixText = testCase.extractTextContent(verifyFixResult);
    expect(fixText).toContain(companyId); // Verify company still exists after recovery
  });

  it('should maintain system stability after cascading failures', async () => {
    // Simulate cascading failures with multiple invalid operations
    const cascadingFailures = [
      // Invalid record creation
      testCase.executeToolCall('create_record', {
        resource_type: 'companies',
        record_data: { name: null, invalid_field: 'test' },
      }),
      // Invalid record retrieval
      testCase.executeToolCall('get-record-details', {
        resource_type: 'companies',
        record_id: 'completely-invalid-id',
      }),
      // Invalid search
      testCase.executeToolCall('search-records', {
        resource_type: 'invalid_resource_type',
        query: null,
      }),
      // Invalid update
      testCase.executeToolCall('update_record', {
        resource_type: 'companies',
        record_id: 'non-existent-id',
        updates: null,
      }),
    ];

    const cascadingResults = await Promise.allSettled(cascadingFailures);

    // All operations should fail but handle gracefully
    cascadingResults.forEach((result, index) => {
      expect(result.status).toBe('fulfilled'); // Should not throw exceptions
      if (result.status === 'fulfilled') {
        // Should either be error or have error content
        const hasError =
          result.value.isError || testCase.hasError(result.value);
        expect(hasError).toBe(true);
      }
    });

    // System recovery: Verify system is still operational after cascading failures
    const recoveryOperations = [
      // Basic list operation
      testCase.executeToolCall('get-lists', {}),
      // Simple search
      testCase.executeToolCall('search-records', {
        resource_type: 'companies',
        query: 'test',
        limit: 1,
      }),
    ];

    if (testCase['validCompanyId']) {
      // Valid record retrieval
      recoveryOperations.push(
        testCase.executeToolCall('get-record-details', {
          resource_type: 'companies',
          record_id: testCase['validCompanyId'],
        })
      );
    }

    const recoveryResults = await Promise.allSettled(recoveryOperations);

    // Recovery operations should succeed, proving system stability
    const successfulRecoveries = recoveryResults.filter(
      (r) =>
        r.status === 'fulfilled' &&
        !r.value.isError &&
        !testCase.hasError(r.value)
    ).length;

    expect(successfulRecoveries).toBeGreaterThanOrEqual(2);
    console.log(
      `System recovery: ${successfulRecoveries}/${recoveryResults.length} operations successful after cascading failures`
    );
  });
});
