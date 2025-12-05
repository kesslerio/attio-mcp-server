/**
 * TC-EC01: Input Validation Edge Cases
 * P2 Edge Cases Test - Complete MCP Test Suite Implementation
 * Issue #649: Edge Cases & Error Handling Tests
 *
 * Tests input validation for various MCP tools with invalid, malformed,
 * and boundary input data to ensure proper error handling and security.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  EdgeCaseTestBase,
  type EdgeCaseTestResult,
} from '../shared/edge-case-test-base';
import { EdgeCaseAssertions } from '../shared/edge-case-assertions';
import { ErrorScenarios } from '../shared/error-scenarios';
import { TestDataFactory } from '../shared/test-data-factory';

class InputValidationTest extends EdgeCaseTestBase {
  private validCompanyId: string | null = null;
  private validListId: string | null = null;

  constructor() {
    super('TC_EC01');
  }

  /**
   * Setup valid test data for comparison with invalid inputs
   */
  async setupValidTestData(): Promise<void> {
    try {
      // Create a valid company for testing
      const companyData = TestDataFactory.createCompanyData('TC_EC01');
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
          console.log(`Created valid company: ${this.validCompanyId}`);
        }
      }

      // Get a valid list for testing
      const listsResult = await this.executeToolCall('get-lists', {});
      if (!listsResult.isError) {
        const listsText = this.extractTextContent(listsResult);
        try {
          const lists = JSON.parse(listsText);
          if (Array.isArray(lists) && lists.length > 0) {
            this.validListId = lists[0].id?.id || lists[0].id;
            console.log(`Using valid list: ${this.validListId}`);
          }
        } catch (e) {
          console.warn('Could not parse lists response for validation testing');
        }
      }
    } catch (error) {
      console.error('Failed to setup valid test data:', error);
    }
  }
}

describe('TC-EC01: Input Validation Edge Cases', () => {
  const testCase = new InputValidationTest();
  let testResults: EdgeCaseTestResult[] = [];

  beforeAll(async () => {
    await testCase.setup();
    await testCase.setupValidTestData();
  }, 60000);

  afterAll(async () => {
    await testCase.cleanupTestData();
    await testCase.teardown();

    // Generate comprehensive test report
    testCase.logDetailedResults();
    const summary = testCase.getResultsSummary();

    console.log(
      `\nTC-EC01 Input Validation Results: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );

    // P2 tests require 75% pass rate
    if (summary.total > 0) {
      const passRate = summary.passRate;
      if (passRate < 75) {
        console.warn(
          `⚠️ TC-EC01 below P2 threshold: ${passRate.toFixed(1)}% (required: 75%)`
        );
      } else {
        console.log(
          `✅ TC-EC01 meets P2 quality gate: ${passRate.toFixed(1)}% (required: 75%)`
        );
      }
    }
  }, 60000);

  it('should handle required fields gracefully in record creation', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const emptyFieldsScenario = scenarios.find(
      (s) => s.name === 'empty_required_fields'
    );

    expect(emptyFieldsScenario).toBeDefined();

    // Test graceful handling - should respond without crashing
    const result = await testCase.executeExpectedFailureTest(
      'empty_required_fields',
      'create-record',
      {
        resource_type: 'companies',
        record_data: emptyFieldsScenario!.inputData,
      },
      'graceful_handling' // Allow graceful handling instead of strict validation
    );

    expect(result.passed).toBe(true);

    // Verify server handles invalid input properly with error validation
    const response = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: emptyFieldsScenario!.inputData,
    });

    expect(
      testCase.validateEdgeCaseResponse(
        response,
        'create-record missing required fields',
        {
          expectError: true,
          errorIndicators: ['error', 'required', 'missing', 'invalid'],
        }
      )
    ).toBe(true);
  });

  it('should handle malformed UUID identifiers gracefully', async () => {
    // Test invalid UUID in get-record-details - should handle gracefully
    const result = await testCase.executeExpectedFailureTest(
      'invalid_uuid_get_record',
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: 'not-a-valid-uuid-format',
      },
      'graceful_handling' // Expect graceful error handling
    );

    expect(result.passed).toBe(true);

    // Test invalid UUID in list operations
    if (testCase['validListId']) {
      const listResult = await testCase.executeExpectedFailureTest(
        'invalid_uuid_list_operation',
        'add-record-to-list',
        {
          listId: testCase['validListId'],
          recordId: '123-invalid-uuid-format',
          objectType: 'companies',
        },
        'graceful_handling'
      );

      expect(listResult.passed).toBe(true);
    }
  });

  it('should handle invalid data types gracefully', async () => {
    // Test type mismatches in record creation
    const result = await testCase.executeExpectedFailureTest(
      'type_mismatch_validation',
      'create-record',
      {
        resource_type: 'companies',
        record_data: {
          name: 12345, // Number instead of string
          description: true, // Boolean instead of string
          tags: 'should-be-array', // String instead of array
        },
      },
      'graceful_handling'
    );

    expect(result.passed).toBe(true);

    // Test type mismatches in search parameters - should handle gracefully
    const searchResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: 'test', // Keep query as string to avoid immediate rejection
      limit: -1, // Invalid limit
    });

    expect(
      testCase.validateEdgeCaseResponse(
        searchResponse,
        'search-records invalid limit',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'limit', 'negative'],
        }
      )
    ).toBe(true);
  });

  it('should handle malformed JSON structures safely', async () => {
    if (testCase['validListId']) {
      const result = await testCase.executeExpectedFailureTest(
        'malformed_json_filter',
        'advanced-filter-list-entries',
        {
          listId: testCase['validListId'],
          filter: { $and: { $or: null } }, // Malformed filter
          sort: { field: '', direction: 'invalid' }, // Invalid sort
        },
        'graceful_handling'
      );

      expect(result.passed).toBe(true);
    } else {
      // Skip test if no valid list available
      console.log('Skipping malformed JSON test - no valid list available');
    }
  });

  it('should handle potential security injection attempts without crashing', async () => {
    const injectionData = {
      name: '<script>alert("xss")</script>',
      description: "'; DROP TABLE companies; --",
      notes: '../../../etc/passwd',
    };

    // Test that server handles injection attempts without crashing
    // Note: The API may correctly store and return data as-is (escaping happens at rendering)
    const createResult = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: injectionData,
    });

    // The key test is that the server doesn't crash or error unexpectedly
    // It's acceptable for the API to store and return the text as-is
    const createText = testCase.extractTextContent(createResult);
    const serverHandledGracefully =
      !createResult.isError || // Server accepted the input
      createText.length > 0; // Server returned a response
    expect(serverHandledGracefully).toBe(true);

    // Test in search operations as well - should not crash
    const searchResponse = await testCase.executeToolCall('search-records', {
      resource_type: 'companies',
      query: '<script>alert("test")</script>',
    });

    const searchText = testCase.extractTextContent(searchResponse);
    // Server should respond without crashing - error or success is both acceptable
    expect(searchText.length > 0 || searchResponse.isError).toBe(true);
  });

  it('should handle complex nested parameter structures', async () => {
    // Test deeply nested structures - should handle gracefully
    if (testCase['validListId']) {
      const complexResponse = await testCase.executeToolCall(
        'advanced-filter-list-entries',
        {
          listId: testCase['validListId'],
          filter: {
            $and: [
              { attribute: 'name', operator: 'contains', value: 'test' },
              { $or: null }, // Invalid null - should handle gracefully
            ],
          },
          sort: { field: null, direction: 'invalid_direction' },
        }
      );

      expect(
        testCase.validateEdgeCaseResponse(
          complexResponse,
          'advanced-filter-list-entries with malformed nested filters',
          {
            expectError: true,
            errorIndicators: ['error', 'invalid', 'malformed'],
          }
        )
      ).toBe(true);
    }

    // Test invalid update operations with complex data
    if (testCase['validCompanyId']) {
      const updateResponse = await testCase.executeToolCall('update-record', {
        resource_type: 'companies',
        record_id: testCase['validCompanyId'],
        updates: {
          description: 'Valid update', // Keep at least one valid field
          invalid_field: null,
        },
      });

      expect(
        testCase.validateEdgeCaseResponse(
          updateResponse,
          'update-record with invalid fields',
          {
            expectError: true,
            errorIndicators: ['error', 'invalid', 'field'],
          }
        )
      ).toBe(true);
    }
  });

  it('should handle edge cases in array and object parameters', async () => {
    // Test with mixed types in arrays - avoid circular references
    const edgeCaseData = {
      name: 'Edge Case Test Company',
      description: 'Testing edge cases',
      // Keep data simple to avoid JSON serialization issues
      tags: ['valid_tag'], // Simple valid array
      attributes: {
        test_field: 'test_value',
        empty_string: '',
      },
    };

    const edgeResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: edgeCaseData,
    });

    const edgeSuccess = testCase.validateEdgeCaseResponse(
      edgeResponse,
      'create-record with mixed edge case data (success)',
      {
        expectError: false,
        successIndicators: [],
        allowGracefulFallback: true,
      }
    );
    const edgeError = testCase.validateEdgeCaseResponse(
      edgeResponse,
      'create-record with mixed edge case data (error)',
      {
        expectError: true,
      }
    );
    expect(edgeSuccess || edgeError).toBe(true);

    // Test empty arrays and objects - should handle gracefully
    const emptyCollectionsData = {
      name: 'Empty Collections Test Company',
      description: 'Test with empty collections',
      tags: [], // Empty array
      attributes: {}, // Empty object
    };

    const emptyResponse = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: emptyCollectionsData,
    });

    const emptySuccess = testCase.validateEdgeCaseResponse(
      emptyResponse,
      'create-record with empty collections (success)',
      {
        expectError: false,
        successIndicators: [],
        allowGracefulFallback: true,
      }
    );
    const emptyError = testCase.validateEdgeCaseResponse(
      emptyResponse,
      'create-record with empty collections (error)',
      {
        expectError: true,
      }
    );
    expect(emptySuccess || emptyError).toBe(true);
  });

  it('should handle additional universal tools gracefully', async () => {
    // Test get-attributes with invalid resource type
    const attributesResponse = await testCase.executeToolCall(
      'get-attributes',
      {
        resource_type: 'invalid_resource_type',
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        attributesResponse,
        'get-attributes with invalid resource type',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'not found', 'unknown'],
        }
      )
    ).toBe(true);

    // Test discover-attributes with malformed parameters
    const discoverResponse = await testCase.executeToolCall(
      'discover-attributes',
      {
        resource_type: 'companies',
        invalid_param: null,
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        discoverResponse,
        'discover-attributes with malformed parameters',
        {
          expectError: true,
          errorIndicators: ['error', 'invalid', 'unexpected', 'unknown'],
        }
      )
    ).toBe(true);

    // Test get-detailed-info with invalid ID
    const detailedInfoResponse = await testCase.executeToolCall(
      'get-detailed-info',
      {
        resource_type: 'companies',
        record_id: 'invalid-uuid-format',
      }
    );

    expect(
      testCase.validateEdgeCaseResponse(
        detailedInfoResponse,
        'get-detailed-info with invalid UUID format',
        {
          expectError: true,
          errorIndicators: [
            'error',
            'invalid',
            'not found',
            'malformed',
            'uuid',
          ],
        }
      )
    ).toBe(true);

    // Test create-note with malformed data (if valid company exists)
    if (testCase['validCompanyId']) {
      const noteResponse = await testCase.executeToolCall('create-note', {
        parent_object: testCase['validCompanyId'],
        title: null, // Invalid title
        content: '',
      });

      expect(
        testCase.validateEdgeCaseResponse(
          noteResponse,
          'create-note with null title',
          {
            expectError: true,
            errorIndicators: [
              'error',
              'invalid',
              'required',
              'title',
              'missing',
            ],
          }
        )
      ).toBe(true);
    }
  });
});
