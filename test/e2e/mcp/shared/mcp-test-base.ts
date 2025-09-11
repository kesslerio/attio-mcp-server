/**
 * Base MCP Test Class
 * Provides common setup, teardown, and utilities for MCP protocol testing
 */

import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface MCPTestConfig {
  serverCommand?: string;
  serverArgs?: string[];
  timeout?: number;
}

export abstract class MCPTestBase {
  protected client: MCPTestClient;
  protected testPrefix: string;
  
  constructor(testPrefix: string = 'TC') {
    this.testPrefix = testPrefix;
  }

  /**
   * Initialize MCP test client
   */
  async setup(config: MCPTestConfig = {}): Promise<void> {
    this.client = new MCPTestClient({
      serverCommand: config.serverCommand || 'node',
      serverArgs: config.serverArgs || ['./dist/cli.js'],
    });
    
    await this.client.init();
  }

  /**
   * Cleanup MCP test client
   */
  async teardown(): Promise<void> {
    if (this.client) {
      await this.client.cleanup();
    }
  }

  /**
   * Execute a tool call and validate the result
   */
  async executeToolCall(
    toolName: string,
    params: Record<string, unknown>,
    validator?: (result: ToolResult) => void
  ): Promise<ToolResult> {
    let capturedResult: ToolResult | null = null;
    
    await this.client.assertToolCall(
      toolName,
      params,
      (result: ToolResult) => {
        capturedResult = result;
        
        // Basic validation that should pass for all successful calls
        if (!result.isError) {
          this.validateSuccessfulResult(result);
        }
        
        // Custom validation if provided
        if (validator) {
          validator(result);
        }
      }
    );
    
    if (!capturedResult) {
      throw new Error(`Tool call '${toolName}' did not capture a result`);
    }
    
    return capturedResult;
  }

  /**
   * Basic validation for successful MCP responses
   */
  protected validateSuccessfulResult(result: ToolResult): void {
    // Ensure result has content
    if (!result.content || result.content.length === 0) {
      throw new Error('Successful result should have content');
    }
    
    // Ensure content has text
    const content = result.content[0];
    if (!('text' in content)) {
      throw new Error('Result content should have text property');
    }
  }

  /**
   * Extract text content from a tool result
   */
  protected extractTextContent(result: ToolResult): string {
    if (result.content && result.content.length > 0) {
      const content = result.content[0];
      if ('text' in content) {
        return content.text;
      }
    }
    return '';
  }

  /**
   * Generate test data with unique identifiers
   */
  protected generateTestId(suffix: string = ''): string {
    const timestamp = Date.now();
    return `${this.testPrefix}_${timestamp}${suffix ? '_' + suffix : ''}`;
  }

  /**
   * Parse JSON from result text content
   */
  protected parseJsonFromResult(result: ToolResult): unknown {
    const text = this.extractTextContent(result);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse JSON from result: ${text}`);
    }
  }

  /**
   * Extract record ID from MCP response text
   * MCP returns IDs in format: "(ID: uuid-here)"
   */
  protected extractRecordId(text: string): string | null {
    // Primary pattern for MCP responses: (ID: uuid)
    const idInParensMatch = text.match(/\(ID:\s*([a-f0-9-]+)\)/i);
    if (idInParensMatch && idInParensMatch[1]) {
      return idInParensMatch[1];
    }
    
    // Fallback patterns
    const patterns = [
      /"id"\s*:\s*"([^"]+)"/i,
      /\bid\s*=\s*["']([^"']+)["']/i,
      /record_id["\s:]+([a-zA-Z0-9_-]+)/i,
      /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i, // UUID
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Check if result indicates an error condition
   */
  protected hasError(result: ToolResult): boolean {
    if (result.isError) return true;
    
    const text = this.extractTextContent(result).toLowerCase();
    return text.includes('error') || 
           text.includes('failed') || 
           text.includes('invalid') ||
           text.includes('not found');
  }
}