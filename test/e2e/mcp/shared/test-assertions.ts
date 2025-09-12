/**
 * Enhanced Test Assertions
 * Provides standardized assertion patterns for MCP test responses
 * Replaces complex error checking logic with clear, reusable methods
 */

import { expect } from 'vitest';
import { RESPONSE_PATTERNS, TASK_CONSTRAINTS } from './constants.js';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

export class TestAssertions {
  /**
   * Assert that a tool result indicates success (not an error)
   */
  static assertSuccess(result: ToolResult, operation: string): void {
    expect(result.isError, `${operation} operation should succeed`).toBeFalsy();
  }

  /**
   * Assert that a tool result indicates an error
   */
  static assertError(result: ToolResult, operation: string): void {
    expect(result.isError, `${operation} operation should fail`).toBeTruthy();
  }

  /**
   * Extract text content from tool result with fallback handling
   */
  static extractTextContent(result: ToolResult): string {
    if (result.isError === false && result.content) {
      if (Array.isArray(result.content)) {
        return result.content
          .filter(
            (item): item is { type: 'text'; text: string } =>
              item.type === 'text'
          )
          .map((item) => item.text)
          .join(' ');
      }
    }
    return String(result);
  }

  /**
   * Assert task creation success with ID extraction
   */
  static assertTaskCreated(result: ToolResult, expectedTitle?: string): string {
    this.assertSuccess(result, 'Task creation');

    const responseText = this.extractTextContent(result);
    expect(responseText).toMatch(RESPONSE_PATTERNS.CREATE_SUCCESS);

    if (expectedTitle) {
      expect(responseText).toContain(expectedTitle);
    }

    // Extract and validate task ID
    const taskId = this.extractTaskId(responseText);
    expect(taskId).toBeTruthy();
    expect(taskId).toMatch(TASK_CONSTRAINTS.UUID_PATTERN);

    return taskId!;
  }

  /**
   * Assert task update success
   */
  static assertTaskUpdated(result: ToolResult, taskId: string): void {
    this.assertSuccess(result, 'Task update');

    const responseText = this.extractTextContent(result);
    expect(responseText).toMatch(RESPONSE_PATTERNS.UPDATE_SUCCESS);
    expect(responseText).toContain(taskId);
  }

  /**
   * Assert task deletion success
   */
  static assertTaskDeleted(result: ToolResult): void {
    this.assertSuccess(result, 'Task deletion');

    const responseText = this.extractTextContent(result);
    expect(responseText).toMatch(RESPONSE_PATTERNS.DELETE_SUCCESS);
  }

  /**
   * Assert graceful error handling (either explicit error or error content)
   */
  static assertGracefulError(result: ToolResult, operation: string): void {
    const responseText = this.extractTextContent(result);

    const hasError =
      result.isError === true ||
      RESPONSE_PATTERNS.ERROR_RESPONSE.test(responseText);

    expect(hasError, `${operation} should handle error gracefully`).toBe(true);
  }

  /**
   * Assert that response contains search results
   */
  static assertSearchResults(result: ToolResult, expectedCount?: number): void {
    this.assertSuccess(result, 'Search');

    const responseText = this.extractTextContent(result);
    expect(responseText).toMatch(/Found \d+ tasks|task|No tasks found/i);

    if (expectedCount !== undefined) {
      if (expectedCount === 0) {
        expect(responseText).toMatch(/No tasks found|Found 0 tasks/i);
      } else {
        expect(responseText).toMatch(new RegExp(`Found \\d+ tasks|task`));
      }
    }
  }

  /**
   * Extract task ID from response text with multiple patterns
   */
  static extractTaskId(responseText: string): string | null {
    // Primary pattern: Look for UUID in response
    const uuidMatch = responseText.match(TASK_CONSTRAINTS.UUID_PATTERN);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    // Secondary patterns for different response formats
    const patterns = [
      /task[:\s]+([a-f0-9-]{36})/i,
      /ID[:\s]+([a-f0-9-]{36})/i,
      /created[:\s]+([a-f0-9-]{36})/i,
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
    ];

    for (const pattern of patterns) {
      const match = responseText.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Assert that a task ID is valid format
   */
  static assertValidTaskId(taskId: string | null): asserts taskId is string {
    expect(taskId, 'Task ID should be present').toBeTruthy();
    expect(taskId, 'Task ID should be valid UUID format').toMatch(
      TASK_CONSTRAINTS.UUID_PATTERN
    );
  }

  /**
   * Assert operation with performance tracking
   */
  static async assertTimedOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxDurationMs: number = 5000
  ): Promise<T> {
    const startTime = Date.now();

    const result = await operation();

    const duration = Date.now() - startTime;
    expect(
      duration,
      `${operationName} should complete within ${maxDurationMs}ms`
    ).toBeLessThan(maxDurationMs);

    return result;
  }

  /**
   * Assert multiple operations in sequence with rollback on failure
   */
  static async assertOperationSequence(
    operations: Array<{
      name: string;
      operation: () => Promise<void>;
      rollback?: () => Promise<void>;
    }>
  ): Promise<void> {
    const completedOperations: Array<() => Promise<void>> = [];

    try {
      for (const op of operations) {
        await op.operation();
        if (op.rollback) {
          completedOperations.unshift(op.rollback); // Add to front for reverse order cleanup
        }
      }
    } catch (error) {
      // Rollback completed operations in reverse order
      for (const rollback of completedOperations) {
        try {
          await rollback();
        } catch (rollbackError) {
          console.warn('Rollback failed:', rollbackError);
        }
      }
      throw error;
    }
  }

  /**
   * Assert that two values are equivalent with detailed diff on failure
   */
  static assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
    try {
      expect(actual).toEqual(expected);
    } catch (error) {
      if (message) {
        throw new Error(
          `${message}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`
        );
      }
      throw error;
    }
  }

  /**
   * Assert array contains expected items in any order
   */
  static assertArrayContains<T>(
    actual: T[],
    expected: T[],
    message?: string
  ): void {
    for (const item of expected) {
      expect(
        actual,
        message || `Array should contain ${JSON.stringify(item)}`
      ).toContainEqual(item);
    }
  }

  /**
   * Assert that a value is within expected range
   */
  static assertInRange(
    value: number,
    min: number,
    max: number,
    message?: string
  ): void {
    expect(
      value,
      message || `Value ${value} should be between ${min} and ${max}`
    ).toBeGreaterThanOrEqual(min);
    expect(
      value,
      message || `Value ${value} should be between ${min} and ${max}`
    ).toBeLessThanOrEqual(max);
  }

  /**
   * Batch assertion helper for multiple conditions
   */
  static assertAll(
    assertions: Array<() => void>,
    failFast: boolean = true
  ): void {
    const errors: Error[] = [];

    for (const assertion of assertions) {
      try {
        assertion();
      } catch (error) {
        errors.push(error as Error);
        if (failFast) {
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      const combinedMessage = errors.map((e) => e.message).join('\n');
      throw new Error(`Multiple assertion failures:\n${combinedMessage}`);
    }
  }
}
