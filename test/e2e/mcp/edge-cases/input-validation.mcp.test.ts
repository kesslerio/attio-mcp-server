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
  });

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
  });

  it('should validate required fields in record creation', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const emptyFieldsScenario = scenarios.find(
      (s) => s.name === 'empty_required_fields'
    );

    expect(emptyFieldsScenario).toBeDefined();

    const result = await testCase.executeInputValidationTest(
      'empty_required_fields',
      'create-record',
      {
        resource_type: 'companies',
        record_data: emptyFieldsScenario!.inputData,
      }
    );

    expect(result.passed).toBe(true);
    EdgeCaseAssertions.assertInputValidation(
      await testCase.executeToolCall('create-record', {
        resource_type: 'companies',
        record_data: emptyFieldsScenario!.inputData,
      }),
      ['required', 'name', 'missing']
    );
  });

  it('should handle malformed UUID identifiers gracefully', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const uuidScenario = scenarios.find(
      (s) => s.name === 'invalid_uuid_format'
    );

    expect(uuidScenario).toBeDefined();

    // Test invalid UUID in get-record-details
    const result = await testCase.executeInputValidationTest(
      'invalid_uuid_get_record',
      'get-record-details',
      {
        resource_type: 'companies',
        record_id: uuidScenario!.inputData.id,
      }
    );

    expect(result.passed).toBe(true);

    // Test invalid UUID in list operations
    if (testCase['validListId']) {
      const listResult = await testCase.executeInputValidationTest(
        'invalid_uuid_list_operation',
        'add-record-to-list',
        {
          listId: testCase['validListId'],
          recordId: uuidScenario!.inputData.record_id,
          objectType: 'companies',
        }
      );

      expect(listResult.passed).toBe(true);
    }
  });

  it('should reject invalid data types appropriately', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const typeMismatchScenario = scenarios.find(
      (s) => s.name === 'type_mismatch'
    );

    expect(typeMismatchScenario).toBeDefined();

    const result = await testCase.executeInputValidationTest(
      'type_mismatch_validation',
      'create-record',
      {
        resource_type: 'companies',
        record_data: typeMismatchScenario!.inputData,
      }
    );

    expect(result.passed).toBe(true);

    // Also test type mismatches in search parameters
    const searchResult = await testCase.executeInputValidationTest(
      'type_mismatch_search',
      'search-records',
      {
        resource_type: 'companies',
        query: 12345, // Should be string
        limit: 'not-a-number', // Should be number
      }
    );

    expect(searchResult.passed).toBe(true);
  });

  it('should handle malformed JSON structures safely', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const jsonScenario = scenarios.find(
      (s) => s.name === 'malformed_json_structure'
    );

    expect(jsonScenario).toBeDefined();

    if (testCase['validListId']) {
      const result = await testCase.executeInputValidationTest(
        'malformed_json_filter',
        'advanced-filter-list-entries',
        {
          listId: testCase['validListId'],
          ...jsonScenario!.inputData,
        }
      );

      expect(result.passed).toBe(true);
    } else {
      // Skip test if no valid list available, but mark as passed
      console.log('Skipping malformed JSON test - no valid list available');
    }
  });

  it('should sanitize and handle potential security injection attempts', async () => {
    const scenarios = ErrorScenarios.getInputValidationScenarios();
    const injectionScenario = scenarios.find(
      (s) => s.name === 'special_characters_injection'
    );

    expect(injectionScenario).toBeDefined();

    const result = await testCase.executeExpectedFailureTest(
      'security_injection_test',
      'create-record',
      {
        resource_type: 'companies',
        record_data: injectionScenario!.inputData,
      },
      'graceful_handling', // Should handle gracefully, not fail validation
      ['sanitized', 'invalid', 'cleaned']
    );

    expect(result.passed).toBe(true);

    // Verify security sanitization
    const createResult = await testCase.executeToolCall('create-record', {
      resource_type: 'companies',
      record_data: injectionScenario!.inputData,
    });

    EdgeCaseAssertions.assertSecuritySanitization(createResult, [
      '<script>',
      'DROP TABLE',
      '../../../',
      'alert(',
    ]);

    // Test in search operations as well
    const searchResult = await testCase.executeExpectedFailureTest(
      'security_injection_search',
      'search-records',
      {
        resource_type: 'companies',
        query: injectionScenario!.inputData.name,
      },
      'graceful_handling',
      ['sanitized', 'invalid', 'cleaned']
    );

    expect(searchResult.passed).toBe(true);
  });

  it('should validate complex nested parameter structures', async () => {
    // Test deeply nested invalid structures
    const complexInvalidData = {
      advanced_filter: {
        $and: [
          { $or: null }, // Invalid null in logical operator
          { $not: { invalid: 'structure' } }, // Invalid structure
          { attribute: '', operator: '', value: undefined }, // Empty/undefined values
        ],
      },
      sort_options: {
        field: null,
        direction: 'invalid_direction',
      },
      pagination: {
        limit: 'not-a-number',
        offset: -1,
        page: {},
      },
    };

    if (testCase['validListId']) {
      const result = await testCase.executeInputValidationTest(
        'complex_nested_validation',
        'advanced-filter-list-entries',
        {
          listId: testCase['validListId'],
          ...complexInvalidData,
        }
      );

      expect(result.passed).toBe(true);
    }

    // Test invalid update operations with complex data
    if (testCase['validCompanyId']) {
      const updateResult = await testCase.executeInputValidationTest(
        'complex_update_validation',
        'update-record',
        {
          resource_type: 'companies',
          record_id: testCase['validCompanyId'],
          updates: {
            name: null,
            attributes: { deeply: { nested: { invalid: undefined } } },
            relationships: 'should-be-object',
          },
        }
      );

      expect(updateResult.passed).toBe(true);
    }
  });

  it('should handle edge cases in array and object parameters', async () => {
    // Test with circular references (if possible in JSON)
    const circularRef: Record<string, unknown> = { name: 'test' };
    circularRef.self = circularRef; // This will be removed by JSON.stringify

    const edgeCaseData = {
      tags: [null, undefined, '', 12345, {}, []], // Mixed invalid types in array
      attributes: {
        null_field: null,
        undefined_field: undefined,
        empty_string: '',
        number_as_string_key: 'value',
      },
      metadata: circularRef,
    };

    const result = await testCase.executeInputValidationTest(
      'array_object_edge_cases',
      'create-record',
      {
        resource_type: 'companies',
        record_data: edgeCaseData,
      }
    );

    expect(result.passed).toBe(true);

    // Test empty arrays and objects where content is expected
    const emptyCollectionsData = {
      name: 'Test Company',
      tags: [], // Empty array
      attributes: {}, // Empty object
      relationships: [], // Empty relationships
    };

    const emptyResult = await testCase.executeExpectedFailureTest(
      'empty_collections_validation',
      'create-record',
      {
        resource_type: 'companies',
        record_data: emptyCollectionsData,
      },
      'graceful_handling', // Should handle empty collections gracefully
      ['empty', 'no items', 'nothing']
    );

    expect(emptyResult.passed).toBe(true);
  });
});
