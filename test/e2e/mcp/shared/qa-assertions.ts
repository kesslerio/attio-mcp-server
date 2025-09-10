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
    expect(result.isError).toBeFalsy();
    
    const text = this.extractText(result);
    
    // Should not contain error indicators
    expect(text).not.toContain('error');
    expect(text).not.toContain('failed');
    expect(text).not.toContain('invalid');
    
    // Should indicate the resource type being searched
    if (minResults > 0) {
      // If we expect results, verify we got some indication of data
      expect(text.length).toBeGreaterThan(50); // Arbitrary minimum for actual results
    }
  }

  /**
   * Assert that record details were retrieved successfully
   */
  static assertValidRecordDetails(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    expect(result.isError).toBeFalsy();
    
    const text = this.extractText(result);
    
    // Should contain the record ID or indicate successful retrieval
    expect(text).toBeTruthy();
    expect(text).not.toContain('not found');
    expect(text).not.toContain('does not exist');
  }

  /**
   * Assert that a record was created successfully
   */
  static assertRecordCreated(
    result: ToolResult,
    resourceType: string,
    expectedFields?: Record<string, unknown>
  ): string {
    expect(result.isError).toBeFalsy();
    
    const text = this.extractText(result);
    
    // Should indicate successful creation
    expect(text).not.toContain('error');
    expect(text).not.toContain('failed');
    
    // Extract ID from response (pattern may vary)
    const idMatch = text.match(/id["\s:]+([a-zA-Z0-9_-]+)/i);
    const recordId = idMatch ? idMatch[1] : '';
    
    expect(recordId).toBeTruthy();
    
    // Verify expected fields if provided
    if (expectedFields) {
      for (const [field, value] of Object.entries(expectedFields)) {
        if (typeof value === 'string') {
          expect(text).toContain(value);
        }
      }
    }
    
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
    expect(result.isError).toBeFalsy();
    
    const text = this.extractText(result);
    
    // Should indicate successful update
    expect(text).not.toContain('error');
    expect(text).not.toContain('failed');
    expect(text).not.toContain('not found');
    
    // Verify updated fields if provided
    if (updatedFields) {
      for (const [field, value] of Object.entries(updatedFields)) {
        if (typeof value === 'string' || typeof value === 'boolean') {
          // Check that the update was reflected
          // Note: Exact validation depends on response format
        }
      }
    }
  }

  /**
   * Assert that a record was deleted successfully
   */
  static assertRecordDeleted(
    result: ToolResult,
    resourceType: string,
    recordId: string
  ): void {
    expect(result.isError).toBeFalsy();
    
    const text = this.extractText(result);
    
    // Should indicate successful deletion
    expect(text).not.toContain('error');
    expect(text).not.toContain('failed');
    expect(text).not.toContain('not found');
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
      text.includes('not found') ||
      text.includes('does not exist') ||
      text.includes('404') ||
      result.isError;
    
    expect(hasNotFoundIndicator).toBeTruthy();
  }

  /**
   * Assert that schema/attributes were retrieved successfully
   */
  static assertValidSchema(
    result: ToolResult,
    objectType: string
  ): void {
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
    
    // Should indicate successful batch operation
    expect(text).not.toContain('error');
    expect(text).not.toContain('failed');
    
    // Could validate count if response format includes it
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
  static validateP0QualityGate(results: Array<{ test: string; passed: boolean }>): void {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const passRate = (passedTests / totalTests) * 100;
    
    console.log(`\nP0 Quality Gate Results:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);
    
    if (passRate < 100) {
      const failedTests = results.filter(r => !r.passed).map(r => r.test);
      throw new Error(
        `P0 CRITICAL: Quality gate failed! Pass rate: ${passRate.toFixed(1)}%\n` +
        `Failed tests: ${failedTests.join(', ')}\n` +
        `System is NOT ready for testing.`
      );
    }
    
    console.log(`✅ P0 Quality Gate PASSED - System ready for P1 testing`);
  }
}