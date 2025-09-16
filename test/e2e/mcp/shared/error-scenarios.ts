/**
 * Error Scenarios
 * Predefined error scenarios and data patterns for comprehensive edge case testing
 * Issue #649: Complete MCP Test Suite Implementation - Edge Cases & Error Handling
 */

export interface ErrorScenario {
  name: string;
  description: string;
  inputData: Record<string, unknown>;
  expectedBehavior: 'error' | 'graceful_handling' | 'validation_failure';
  expectedPatterns: string[];
  category:
    | 'input_validation'
    | 'boundary_limits'
    | 'concurrency'
    | 'error_recovery'
    | 'security';
}

export class ErrorScenarios {
  /**
   * Input validation error scenarios
   */
  static getInputValidationScenarios(): ErrorScenario[] {
    return [
      {
        name: 'empty_required_fields',
        description: 'Test with empty or null required fields',
        inputData: { name: '', description: null },
        expectedBehavior: 'validation_failure',
        expectedPatterns: ['required', 'missing', 'empty'],
        category: 'input_validation',
      },
      {
        name: 'invalid_uuid_format',
        description: 'Test with malformed UUID identifiers',
        inputData: { id: 'not-a-uuid', record_id: '123-invalid-format' },
        expectedBehavior: 'validation_failure',
        expectedPatterns: ['invalid', 'uuid', 'format'],
        category: 'input_validation',
      },
      {
        name: 'type_mismatch',
        description: 'Test with wrong data types',
        inputData: { name: 12345, description: true, tags: 'should-be-array' },
        expectedBehavior: 'validation_failure',
        expectedPatterns: ['type', 'invalid', 'expected'],
        category: 'input_validation',
      },
      {
        name: 'malformed_json_structure',
        description: 'Test with deeply nested malformed structures',
        inputData: {
          filter: { $and: { $or: null } },
          sort: { field: '', direction: 'invalid' },
        },
        expectedBehavior: 'validation_failure',
        expectedPatterns: ['malformed', 'invalid', 'structure'],
        category: 'input_validation',
      },
      {
        name: 'special_characters_injection',
        description:
          'Test with special characters and potential injection attempts',
        inputData: {
          name: '<script>alert("xss")</script>',
          description: "'; DROP TABLE companies; --",
          notes: '../../../etc/passwd',
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['sanitized', 'invalid', 'cleaned'],
        category: 'security',
      },
    ];
  }

  /**
   * Boundary and limits error scenarios
   */
  static getBoundaryLimitScenarios(): ErrorScenario[] {
    return [
      {
        name: 'extremely_long_strings',
        description: 'Test with strings exceeding reasonable limits',
        inputData: {
          name: 'A'.repeat(10000),
          description: 'B'.repeat(100000),
          tags: new Array(1000).fill('tag'),
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['limit', 'too long', 'maximum', 'exceeded'],
        category: 'boundary_limits',
      },
      {
        name: 'negative_numeric_values',
        description: 'Test with negative values where positive expected',
        inputData: { limit: -1, offset: -100, page: -5 },
        expectedBehavior: 'validation_failure',
        expectedPatterns: ['positive', 'invalid', 'range'],
        category: 'boundary_limits',
      },
      {
        name: 'maximum_safe_integer_overflow',
        description: 'Test with extremely large numeric values',
        inputData: {
          limit: Number.MAX_SAFE_INTEGER,
          offset: Number.MAX_SAFE_INTEGER,
          count: Number.MAX_VALUE,
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['limit', 'maximum', 'overflow'],
        category: 'boundary_limits',
      },
      {
        name: 'empty_arrays_and_objects',
        description: 'Test with empty collections where content expected',
        inputData: {
          tags: [],
          attributes: {},
          relationships: [],
          metadata: {},
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['empty', 'no items', 'nothing'],
        category: 'boundary_limits',
      },
      {
        name: 'unicode_boundary_characters',
        description: 'Test with Unicode boundary and control characters',
        inputData: {
          name: '\u0000\u0001\u0002\uFFFF\uFFFE',
          description: '🚀💻📊' + '\u200B'.repeat(100), // Zero-width spaces
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['invalid', 'character', 'encoding'],
        category: 'boundary_limits',
      },
    ];
  }

  /**
   * Concurrency conflict scenarios
   */
  static getConcurrencyScenarios(): ErrorScenario[] {
    return [
      {
        name: 'simultaneous_record_creation',
        description: 'Multiple clients creating records with same identifiers',
        inputData: {
          name: 'Concurrent Test Company',
          unique_field: 'same-value',
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['conflict', 'duplicate', 'already exists'],
        category: 'concurrency',
      },
      {
        name: 'rapid_successive_updates',
        description: 'Rapid updates to the same record',
        inputData: { id: 'test-record-id', name: 'Updated Name' },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['conflict', 'version', 'modified'],
        category: 'concurrency',
      },
      {
        name: 'concurrent_list_modifications',
        description: 'Simultaneous modifications to list membership',
        inputData: {
          listId: 'test-list',
          recordId: 'test-record',
          action: 'add',
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['conflict', 'concurrent', 'retry'],
        category: 'concurrency',
      },
      {
        name: 'rate_limit_exceeding',
        description: 'Exceed API rate limits with rapid requests',
        inputData: { burst_count: 100, delay_ms: 10 },
        expectedBehavior: 'error',
        expectedPatterns: ['rate limit', 'too many requests', 'throttle'],
        category: 'concurrency',
      },
      {
        name: 'resource_exhaustion',
        description: 'Test behavior under resource exhaustion',
        inputData: { large_operation_size: 10000 },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['limit', 'resources', 'capacity'],
        category: 'concurrency',
      },
    ];
  }

  /**
   * Error recovery scenarios
   */
  static getErrorRecoveryScenarios(): ErrorScenario[] {
    return [
      {
        name: 'network_timeout_recovery',
        description: 'Simulate network timeouts and recovery',
        inputData: { simulate_timeout: true, retry_count: 3 },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['timeout', 'retry', 'recovered'],
        category: 'error_recovery',
      },
      {
        name: 'partial_data_corruption',
        description: 'Handle partially corrupted data gracefully',
        inputData: {
          name: 'Valid Name',
          corrupted_field: Buffer.from([0xff, 0xfe, 0x00]).toString('utf8'),
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['corrupted', 'invalid', 'cleaned'],
        category: 'error_recovery',
      },
      {
        name: 'dependent_resource_missing',
        description: 'Reference to non-existent dependent resources',
        inputData: {
          company_id: 'non-existent-company-id',
          list_id: 'non-existent-list-id',
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['not found', 'missing', 'reference'],
        category: 'error_recovery',
      },
      {
        name: 'transaction_rollback',
        description: 'Test transaction rollback on partial failures',
        inputData: {
          operations: [
            { action: 'create', valid: true },
            { action: 'create', valid: false }, // This should fail
            { action: 'create', valid: true },
          ],
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['rollback', 'transaction', 'failed'],
        category: 'error_recovery',
      },
      {
        name: 'inconsistent_state_recovery',
        description: 'Recovery from inconsistent data states',
        inputData: {
          record_id: 'test-record',
          force_inconsistent_state: true,
        },
        expectedBehavior: 'graceful_handling',
        expectedPatterns: ['inconsistent', 'recovered', 'fixed'],
        category: 'error_recovery',
      },
    ];
  }

  /**
   * Get all scenarios by category
   */
  static getScenariosByCategory(
    category: ErrorScenario['category']
  ): ErrorScenario[] {
    const allScenarios = [
      ...this.getInputValidationScenarios(),
      ...this.getBoundaryLimitScenarios(),
      ...this.getConcurrencyScenarios(),
      ...this.getErrorRecoveryScenarios(),
    ];

    return allScenarios.filter((scenario) => scenario.category === category);
  }

  /**
   * Get all scenarios
   */
  static getAllScenarios(): ErrorScenario[] {
    return [
      ...this.getInputValidationScenarios(),
      ...this.getBoundaryLimitScenarios(),
      ...this.getConcurrencyScenarios(),
      ...this.getErrorRecoveryScenarios(),
    ];
  }

  /**
   * Generate dynamic error scenarios based on tool configuration
   */
  static generateDynamicScenarios(
    toolName: string,
    toolParams: Record<string, unknown>
  ): ErrorScenario[] {
    const scenarios: ErrorScenario[] = [];

    // Generate scenarios based on parameter types
    Object.keys(toolParams).forEach((paramName) => {
      const paramValue = toolParams[paramName];

      if (typeof paramValue === 'string') {
        scenarios.push({
          name: `${toolName}_${paramName}_string_boundary`,
          description: `Test ${paramName} with boundary string values`,
          inputData: { [paramName]: 'A'.repeat(10000) },
          expectedBehavior: 'graceful_handling',
          expectedPatterns: ['limit', 'too long'],
          category: 'boundary_limits',
        });
      }

      if (typeof paramValue === 'number') {
        scenarios.push({
          name: `${toolName}_${paramName}_number_boundary`,
          description: `Test ${paramName} with boundary numeric values`,
          inputData: { [paramName]: -1 },
          expectedBehavior: 'validation_failure',
          expectedPatterns: ['invalid', 'range'],
          category: 'boundary_limits',
        });
      }
    });

    return scenarios;
  }

  /**
   * Create test data combinations for comprehensive testing
   */
  static createTestDataCombinations(): Record<string, unknown>[] {
    const validData = {
      name: 'Test Company',
      description: 'Valid test description',
      tags: ['test', 'valid'],
    };

    const invalidCombinations = [
      // Single field violations
      { ...validData, name: '' },
      { ...validData, name: null },
      { ...validData, description: 'A'.repeat(100000) },

      // Multiple field violations
      { name: '', description: null },
      { name: 12345, description: true },

      // Complex violations
      {
        name: '<script>alert("xss")</script>',
        description: "'; DROP TABLE test; --",
        tags: 'not-an-array',
      },
    ];

    return invalidCombinations;
  }
}
