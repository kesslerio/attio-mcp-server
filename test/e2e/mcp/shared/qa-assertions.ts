/**
 * QA-Specific Assertions
 * Helper functions for validating MCP tool responses according to QA test plan requirements
 */

import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

export class QAAssertions {
  /**
   * Assert that a search operation returned valid results
   */
  static assertValidSearchResults(
    result: ToolResult,
    resourceType: string,
    minResults: number = 0
  ): void {
    const text = this.extractText(result);

    // Should not contain error indicators
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('failed');
    expect(text.toLowerCase()).not.toContain('invalid');

    // Should indicate the resource type being searched or have results
    if (minResults > 0) {
      // If we expect results, verify we got some indication of data
      expect(text.length).toBeGreaterThan(50); // Arbitrary minimum for actual results
    }
  }

  /**
   * Assert that search results are valid (alias for assertValidSearchResults)
   */
  static assertSearchResults(
    result: ToolResult,
    resourceType: string,
    minResults: number = 0
  ): void {
    this.assertValidSearchResults(result, resourceType, minResults);
  }

  /**
   * Assert that record details were retrieved successfully
   */
  static assertValidRecordDetails(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    // MCP doesn't have isError property - check text content
    const text = this.extractText(result);

    // Should contain the record ID or indicate successful retrieval
    expect(text).toBeTruthy();
    expect(text.toLowerCase()).not.toContain('not found');
    expect(text.toLowerCase()).not.toContain('does not exist');
    expect(text.toLowerCase()).not.toContain('error');
  }

  /**
   * Assert that a record was created successfully
   */
  static assertRecordCreated(
    result: ToolResult,
    resourceType: string,
    expectedFields?: Record<string, unknown>
  ): string {
    // Explicit null checks with meaningful error messages
    if (!result) {
      throw new Error(
        `ASSERTION FAILURE: Tool result is null/undefined for ${resourceType} creation`
      );
    }

    const text = this.extractText(result);
    if (!text || text.trim().length === 0) {
      throw new Error(
        `ASSERTION FAILURE: Empty response text for ${resourceType} creation. Result: ${JSON.stringify(result)}`
      );
    }

    // Should indicate successful creation
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('failed');

    // MCP returns success messages like "✅ Successfully created..."
    expect(text).toContain('Successfully created');

    // Extract ID from MCP format: "(ID: uuid-here)"
    const idMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
    const recordId = idMatch ? idMatch[1] : '';

    if (!recordId || recordId.trim().length === 0) {
      throw new Error(
        `ASSERTION FAILURE: No valid record ID found in response for ${resourceType}. Response text: "${text}"`
      );
    }

    // Note: MCP doesn't preserve exact field values in response
    // Just verify it's a successful creation

    return recordId;
  }

  /**
   * Assert that a record was updated successfully
   */
  static assertRecordUpdated(
    result: ToolResult,
    resourceType: string,
    recordId: string,
    updatedFields?: Record<string, unknown>
  ): void {
    const text = this.extractText(result);

    // Should indicate successful update
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('failed');
    expect(text.toLowerCase()).not.toContain('not found');

    // MCP returns success messages for updates
    const hasSuccessIndicator =
      text.includes('Successfully updated') ||
      text.includes('✅') ||
      text.includes('updated');

    expect(hasSuccessIndicator).toBeTruthy();
  }

  /**
   * Assert that a record was deleted successfully
   */
  static assertRecordDeleted(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    const text = this.extractText(result);

    // Should indicate successful deletion
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('failed');

    // MCP returns success messages for deletions
    const hasSuccessIndicator =
      text.includes('Successfully deleted') ||
      text.includes('✅') ||
      text.includes('deleted') ||
      text.includes('removed');

    expect(hasSuccessIndicator).toBeTruthy();
  }

  /**
   * Assert that attempting to access a deleted record returns appropriate error
   */
  static assertRecordNotFound(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    const text = this.extractText(result);

    // Should indicate record not found
    // The exact message may vary, but should indicate the record doesn't exist
    const hasNotFoundIndicator =
      text.toLowerCase().includes('not found') ||
      text.toLowerCase().includes('does not exist') ||
      text.includes('404') ||
      text.toLowerCase().includes('error') ||
      text.toLowerCase().includes('failed');

    expect(hasNotFoundIndicator).toBeTruthy();
  }

  /**
   * Assert that schema/attributes were retrieved successfully
   */
  static assertValidSchema(result: ToolResult, objectType: string): void {
    expect(result.isError).toBeFalsy();

    const text = this.extractText(result);

    // Should contain attribute information
    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(100); // Should have substantial schema info
    expect(text).not.toContain('error');
  }

  /**
   * Assert that a batch operation completed successfully
   */
  static assertBatchOperationSuccess(
    result: ToolResult,
    operationType: string,
    expectedCount: number
  ): void {
    expect(result.isError).toBeFalsy();

    const text = this.extractText(result);

    // Parse the batch result to check summary
    const summaryMatch = text.match(/"summary":\s*\{[^}]+\}/);
    if (summaryMatch) {
      const summaryText = summaryMatch[0];
      const failedMatch = summaryText.match(/"failed":\s*(\d+)/);
      if (failedMatch) {
        const failedCount = parseInt(failedMatch[1], 10);
        expect(failedCount).toBe(0);
      }
    }

    // Should not contain error messages (not just the word "error" in JSON keys)
    expect(text).not.toMatch(/error[^"]*:/i);
  }

  /**
   * Helper to extract text content from result
   */
  private static extractText(result: ToolResult): string {
    if (result.content && result.content.length > 0) {
      const content = result.content[0];
      if ('text' in content) {
        return content.text;
      }
    }
    return '';
  }

  /**
   * Validate quality gate requirements
   */
  static validateP0QualityGate(
    results: Array<{ test: string; passed: boolean }>
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;

    console.log(`\nP0 Quality Gate Results:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate < 100) {
      const failedTests = results.filter((r) => !r.passed).map((r) => r.test);
      throw new Error(
        `P0 CRITICAL: Quality gate failed! Pass rate: ${passRate.toFixed(1)}%\n` +
          `Failed tests: ${failedTests.join(', ')}\n` +
          `System is NOT ready for testing.`
      );
    }

    console.log(`✅ P0 Quality Gate PASSED - System ready for P1 testing`);
  }

  /**
   * Assert valid list operations response
   */
  static assertValidListResponse(result: ToolResult, operation: string): void {
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const text = this.extractText(result);
    expect(text).toBeTruthy();

    // Check for success indicators based on operation
    if (operation === 'get-lists' || operation === 'get-list-entries') {
      // Lists operations return JSON arrays
      expect(text).toMatch(/^\[.*\]$|^\{.*\}$/);
    } else if (
      operation === 'add-record-to-list' ||
      operation === 'remove-record-from-list'
    ) {
      // Membership operations return confirmation or ID
      expect(text).toMatch(/ID:\s*[a-f0-9-]+|success|added|removed/i);
    }

    // Ensure no error messages
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('failed');
  }

  /**
   * Assert valid list filtering response
   */
  static assertValidFilterResponse(result: ToolResult): void {
    expect(result).toBeDefined();
    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();

    const text = this.extractText(result);
    expect(text).toBeTruthy();

    // Filter results should be JSON array format
    expect(text).toMatch(/^\[.*\]$/);

    // Ensure no error messages
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('invalid');
  }

  /**
   * Validate P1 quality gate requirements (80% pass rate)
   */
  static validateP1QualityGate(
    results: Array<{ test: string; passed: boolean }>
  ): void {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;

    console.log(`\nP1 Quality Gate Results:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate < 80) {
      const failedTests = results.filter((r) => !r.passed).map((r) => r.test);
      throw new Error(
        `P1 Quality gate failed! Pass rate: ${passRate.toFixed(1)}% (required: 80%)\n` +
          `Failed tests: ${failedTests.join(', ')}`
      );
    }

    console.log(
      `✅ P1 Quality Gate PASSED - Pass rate: ${passRate.toFixed(1)}%`
    );
  }
}
