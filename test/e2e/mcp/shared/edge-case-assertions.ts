/**
 * Edge Case Assertions
 * Specialized assertion utilities for edge case and error handling validation
 * Issue #649: Complete MCP Test Suite Implementation - Edge Cases & Error Handling
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { expect } from 'vitest';

export class EdgeCaseAssertions {
  /**
   * Assert that a result contains appropriate error handling
   */
  static assertErrorHandling(
    result: CallToolResult,
    errorPatterns: string[] = ['error', 'invalid', 'failed']
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result);
    const hasErrorPattern = errorPatterns.some((pattern) =>
      text.toLowerCase().includes(pattern.toLowerCase())
    );

    expect(hasErrorPattern).toBe(true);
  }

  /**
   * Assert that input validation is working properly
   */
  static assertInputValidation(
    result: CallToolResult,
    expectedValidationMessages: string[] = ['required', 'invalid', 'missing']
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result);
    const hasValidationMessage = expectedValidationMessages.some((msg) =>
      text.toLowerCase().includes(msg.toLowerCase())
    );

    expect(hasValidationMessage).toBe(true);
  }

  /**
   * Assert that boundary limits are properly enforced
   */
  static assertBoundaryHandling(
    result: CallToolResult,
    boundaryMessages: string[] = ['limit', 'maximum', 'exceeded', 'too large']
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result);
    const hasBoundaryMessage = boundaryMessages.some((msg) =>
      text.toLowerCase().includes(msg.toLowerCase())
    );

    expect(hasBoundaryMessage).toBe(true);
  }

  /**
   * Assert that security input sanitization is working
   */
  static assertSecuritySanitization(
    result: CallToolResult,
    shouldNotContain: string[] = [
      '<script>',
      'DROP TABLE',
      '../../../',
      '${jndi:',
    ]
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result);

    shouldNotContain.forEach((dangerous) => {
      expect(text).not.toContain(dangerous);
    });
  }

  /**
   * Assert that concurrent operations handle conflicts gracefully
   */
  static assertConcurrencyHandling(
    results: CallToolResult[],
    expectedSuccesses: number,
    maxFailures: number
  ): void {
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const successes = results.filter(
      (r) => !r.isError && !EdgeCaseAssertions.hasErrorInText(r)
    ).length;
    const failures = results.length - successes;

    expect(successes).toBeGreaterThanOrEqual(expectedSuccesses);
    expect(failures).toBeLessThanOrEqual(maxFailures);
  }

  /**
   * Assert that error recovery mechanisms are functioning
   */
  static assertErrorRecovery(
    initialResult: CallToolResult,
    recoveryResult: CallToolResult
  ): void {
    // Initial operation should fail
    expect(
      EdgeCaseAssertions.hasErrorInText(initialResult) || initialResult.isError
    ).toBe(true);

    // Recovery operation should succeed
    expect(recoveryResult.isError).toBe(false);
    expect(EdgeCaseAssertions.hasErrorInText(recoveryResult)).toBe(false);
  }

  /**
   * Assert that rate limiting is properly implemented
   */
  static assertRateLimiting(
    results: CallToolResult[],
    executionTimes: number[],
    minimumDelayMs: number = 100
  ): void {
    expect(results.length).toBe(executionTimes.length);

    // Check that some operations were rate limited (indicated by longer execution times)
    const hasRateLimitedCalls = executionTimes.some(
      (time) => time >= minimumDelayMs
    );
    expect(hasRateLimitedCalls).toBe(true);

    // Check for rate limit error messages in some results
    const hasRateLimitMessages = results.some((result) => {
      const text = EdgeCaseAssertions.extractText(result);
      return (
        text.toLowerCase().includes('rate limit') ||
        text.toLowerCase().includes('too many requests') ||
        text.toLowerCase().includes('throttle')
      );
    });

    expect(hasRateLimitMessages).toBe(true);
  }

  /**
   * Assert that memory usage stays within bounds during large operations
   */
  static assertMemoryBounds(
    result: CallToolResult,
    maxExpectedSize: number = 10 * 1024 * 1024 // 10MB default
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result);
    const textSize = Buffer.byteLength(text, 'utf8');

    expect(textSize).toBeLessThan(maxExpectedSize);
  }

  /**
   * Assert that timeout handling works properly
   */
  static assertTimeoutHandling(
    result: CallToolResult,
    executionTimeMs: number,
    maxAllowedTimeMs: number = 30000 // 30 seconds default
  ): void {
    expect(result).toBeDefined();

    if (executionTimeMs > maxAllowedTimeMs) {
      // Should have timeout error
      const text = EdgeCaseAssertions.extractText(result);
      const hasTimeoutMessage =
        text.toLowerCase().includes('timeout') ||
        text.toLowerCase().includes('time out') ||
        result.isError;

      expect(hasTimeoutMessage).toBe(true);
    }
  }

  /**
   * Assert that resource cleanup occurs properly
   */
  static assertResourceCleanup(
    beforeCount: number,
    afterCount: number,
    shouldDecrease: boolean = true
  ): void {
    if (shouldDecrease) {
      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    } else {
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
    }
  }

  /**
   * Assert that data consistency is maintained during edge cases
   */
  static assertDataConsistency(
    beforeState: Record<string, unknown>,
    afterState: Record<string, unknown>,
    changedFields: string[] = []
  ): void {
    // Check that only expected fields changed
    Object.keys(beforeState).forEach((key) => {
      if (!changedFields.includes(key)) {
        expect(afterState[key]).toBe(beforeState[key]);
      }
    });

    // Ensure critical fields are preserved
    const criticalFields = ['id', 'created_at', 'type'];
    criticalFields.forEach((field) => {
      if (beforeState[field] !== undefined) {
        expect(afterState[field]).toBe(beforeState[field]);
      }
    });
  }

  /**
   * Assert that permission checks are enforced
   */
  static assertPermissionEnforcement(
    result: CallToolResult,
    shouldDenyAccess: boolean = true
  ): void {
    expect(result).toBeDefined();

    const text = EdgeCaseAssertions.extractText(result).toLowerCase();

    if (shouldDenyAccess) {
      const hasPermissionDenial =
        text.includes('unauthorized') ||
        text.includes('forbidden') ||
        text.includes('access denied') ||
        text.includes('permission') ||
        result.isError;

      expect(hasPermissionDenial).toBe(true);
    }
  }

  /**
   * Extract text content from CallToolResult
   */
  private static extractText(result: CallToolResult): string {
    if (!result.content || result.content.length === 0) {
      return '';
    }

    const content = result.content[0];
    return 'text' in content ? String(content.text) : '';
  }

  /**
   * Check if result text contains error indicators
   */
  private static hasErrorInText(result: CallToolResult): boolean {
    const text = EdgeCaseAssertions.extractText(result).toLowerCase();
    return (
      text.includes('error') ||
      text.includes('failed') ||
      text.includes('invalid') ||
      text.includes('not found')
    );
  }

  /**
   * Generate comprehensive test report for edge cases
   */
  static generateEdgeCaseReport(
    testResults: Array<{
      testName: string;
      passed: boolean;
      error?: string;
      executionTime?: number;
      category:
        | 'input_validation'
        | 'boundary_limits'
        | 'concurrency'
        | 'error_recovery';
    }>
  ): string {
    const categories = [
      'input_validation',
      'boundary_limits',
      'concurrency',
      'error_recovery',
    ];

    let report = '# Edge Case Test Report\n\n';

    categories.forEach((category) => {
      const categoryTests = testResults.filter((t) => t.category === category);
      const passed = categoryTests.filter((t) => t.passed).length;
      const total = categoryTests.length;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      report += `## ${category.replace('_', ' ').toUpperCase()}\n`;
      report += `Pass Rate: ${passed}/${total} (${passRate.toFixed(1)}%)\n\n`;

      categoryTests.forEach((test) => {
        const status = test.passed ? '✅' : '❌';
        const timing = test.executionTime ? ` (${test.executionTime}ms)` : '';
        report += `${status} ${test.testName}${timing}\n`;

        if (test.error) {
          report += `   Error: ${test.error}\n`;
        }
      });

      report += '\n';
    });

    // Overall summary
    const totalPassed = testResults.filter((t) => t.passed).length;
    const totalTests = testResults.length;
    const overallPassRate =
      totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    report += `## OVERALL SUMMARY\n`;
    report += `Total Tests: ${totalTests}\n`;
    report += `Passed: ${totalPassed}\n`;
    report += `Failed: ${totalTests - totalPassed}\n`;
    report += `Pass Rate: ${overallPassRate.toFixed(1)}%\n`;

    // Quality gate assessment
    if (overallPassRate >= 80) {
      report += `\n✅ QUALITY GATE: PASSED (≥80% required)\n`;
    } else {
      report += `\n❌ QUALITY GATE: FAILED (<80% pass rate)\n`;
    }

    return report;
  }
}
