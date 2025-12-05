/**
 * Test Utilities for MCP E2E Tests
 * Provides common patterns for ID extraction, error checking, and response validation
 */

import { expect } from 'vitest';
import type { MCPToolCallResult } from './mcp-test-base.js';

/**
 * Utility functions for common MCP test patterns
 */
export class TestUtilities {
  /**
   * Extract record ID from MCP tool response text
   * Handles multiple patterns:
   * - Text format: "(ID: abc-123-def)"
   * - JSON format: {"id":{"record_id":"abc-123-def",...},...}
   * - Direct record_id in JSON: {"record_id":"abc-123-def",...}
   */
  static extractRecordId(responseText: string): string | null {
    // Try text pattern first: (ID: abc-123-def)
    const idMatch = responseText.match(/\(ID:\s*([a-f0-9-]+)\)/i);
    if (idMatch?.[1]) {
      return idMatch[1];
    }

    // Try JSON parsing for nested id.record_id or direct record_id
    try {
      const parsed = JSON.parse(responseText);
      // Handle nested id.record_id structure
      if (parsed?.id?.record_id) {
        return parsed.id.record_id;
      }
      // Handle direct record_id
      if (parsed?.record_id) {
        return parsed.record_id;
      }
      // Handle values.record_id (some responses have it there)
      if (parsed?.values?.record_id) {
        return parsed.values.record_id;
      }
    } catch {
      // Not valid JSON, try regex patterns on the text
    }

    // Try regex for record_id in JSON-like text
    const recordIdMatch = responseText.match(
      /"record_id"\s*:\s*"([a-f0-9-]+)"/i
    );
    if (recordIdMatch?.[1]) {
      return recordIdMatch[1];
    }

    return null;
  }

  /**
   * Assert that MCP tool call was successful (no error)
   * @param result - MCP tool call result
   * @param context - Optional context for better error messages
   */
  static assertSuccess(result: MCPToolCallResult, context?: string): void {
    const message = context
      ? `${context}: Tool call failed`
      : 'Tool call failed';
    expect(result.isError, message).toBeFalsy();
  }

  /**
   * Assert that response contains expected content
   * @param result - MCP tool call result
   * @param expectedContent - Content that should be present
   * @param context - Optional context for better error messages
   */
  static assertContains(
    result: MCPToolCallResult,
    expectedContent: string,
    context?: string
  ): void {
    this.assertSuccess(result, context);
    const text = this.getResponseText(result);
    const message = context
      ? `${context}: Response should contain "${expectedContent}"`
      : `Response should contain "${expectedContent}"`;
    expect(text, message).toContain(expectedContent);
  }

  /**
   * Get response text from MCP tool call result
   */
  static getResponseText(result: MCPToolCallResult): string {
    return result.content?.[0]?.text || '';
  }

  /**
   * Create and track a record, returning the extracted ID
   * @param executeToolCall - Tool execution function
   * @param toolName - Name of the tool to call
   * @param params - Parameters for the tool call
   * @param trackFunction - Function to track the created record
   * @param context - Optional context for error messages
   * @returns The extracted record ID
   */
  static async createAndTrackRecord(
    executeToolCall: (
      toolName: string,
      params: any
    ) => Promise<MCPToolCallResult>,
    toolName: string,
    params: any,
    trackFunction: (id: string) => void,
    context?: string
  ): Promise<string | null> {
    const result = await executeToolCall(toolName, params);
    this.assertSuccess(result, context);

    const text = this.getResponseText(result);
    const recordId = this.extractRecordId(text);

    if (recordId) {
      trackFunction(recordId);
    }

    return recordId;
  }

  /**
   * Validate MCP tool response structure
   * @param result - MCP tool call result
   * @param expectedProperties - Properties that should exist in response
   */
  static validateResponseStructure(
    result: MCPToolCallResult,
    expectedProperties: string[] = []
  ): void {
    this.assertSuccess(result);
    expect(result.content).toBeTruthy();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content!.length).toBeGreaterThan(0);

    const text = this.getResponseText(result);
    expect(text.length).toBeGreaterThan(0);

    // Check for expected properties in response text
    expectedProperties.forEach((property) => {
      expect(text).toContain(property);
    });
  }

  /**
   * Enhanced error checking with detailed error context
   * @param result - MCP tool call result
   * @param operationName - Name of the operation being tested
   * @param expectedSuccessMessage - Expected success message pattern
   */
  static assertOperationSuccess(
    result: MCPToolCallResult,
    operationName: string,
    expectedSuccessMessage?: string
  ): void {
    if (result.isError) {
      const errorText = this.getResponseText(result);
      throw new Error(`${operationName} failed: ${errorText}`);
    }

    const text = this.getResponseText(result);
    expect(
      text.length,
      `${operationName} should return content`
    ).toBeGreaterThan(0);

    // If a success message is provided, check for it OR common success indicators
    if (expectedSuccessMessage) {
      const hasExpectedMessage = text.includes(expectedSuccessMessage);
      const hasSuccessIndicator =
        text.toLowerCase().includes('success') ||
        text.toLowerCase().includes('created') ||
        text.toLowerCase().includes('updated') ||
        text.toLowerCase().includes('note') ||
        text.includes('id') ||
        text.includes('ID');

      if (!hasExpectedMessage && !hasSuccessIndicator) {
        throw new Error(
          `${operationName}: Expected "${expectedSuccessMessage}" or success indicator in response`
        );
      }
    }
  }

  /**
   * Extract and validate record ID from create operation
   * @param result - MCP tool call result from create operation
   * @param resourceType - Type of resource being created
   * @param trackFunction - Function to track the created record
   * @returns The extracted and tracked record ID
   */
  static extractAndTrackId(
    result: MCPToolCallResult,
    resourceType: string,
    trackFunction: (id: string) => void
  ): string {
    this.assertSuccess(result, `Create ${resourceType}`);

    const text = this.getResponseText(result);
    const recordId = this.extractRecordId(text);

    if (!recordId) {
      throw new Error(
        `Failed to extract ID from ${resourceType} creation response: ${text}`
      );
    }

    trackFunction(recordId);
    return recordId;
  }

  /**
   * Batch operation helper for multiple records
   * @param operations - Array of operation functions to execute
   * @param errorContext - Context for error reporting
   */
  static async executeBatch(
    operations: Array<() => Promise<any>>,
    errorContext: string = 'Batch operation'
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push(result);
      } catch (error) {
        throw new Error(`${errorContext} failed at step ${i + 1}: ${error}`);
      }
    }

    return results;
  }
}

/**
 * Type-safe MCP response helpers
 */
export class MCPResponseHelpers {
  /**
   * Check if response indicates "no results found"
   */
  static isEmptyResult(result: MCPToolCallResult): boolean {
    const text = TestUtilities.getResponseText(result);
    return (
      text.includes('No notes found') ||
      text.includes('No results found') ||
      text.includes('0 found') ||
      text.length === 0
    );
  }

  /**
   * Check if response indicates successful creation
   */
  static isCreationSuccess(result: MCPToolCallResult): boolean {
    const text = TestUtilities.getResponseText(result);
    return (
      text.includes('created successfully') ||
      text.includes('Created successfully') ||
      text.includes('Note created successfully')
    );
  }

  /**
   * Extract count from list response (e.g., "Found 5 notes:")
   */
  static extractResultCount(result: MCPToolCallResult): number {
    const text = TestUtilities.getResponseText(result);
    const countMatch = text.match(/Found (\d+)/i);
    return countMatch ? parseInt(countMatch[1], 10) : 0;
  }
}
