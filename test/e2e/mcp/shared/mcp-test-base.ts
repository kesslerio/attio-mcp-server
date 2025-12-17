/**
 * Base MCP Test Class
 * Provides common setup, teardown, and utilities for MCP protocol testing
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TestDataFactory } from './test-data-factory.js';
import {
  buildMCPClientConfig,
  createMCPClient,
  type MCPClientAdapter,
} from './mcp-client.js';

export interface MCPTestConfig {
  serverCommand?: string;
  serverArgs?: string[];
  timeout?: number;
}

export abstract class MCPTestBase {
  protected client: MCPClientAdapter;
  protected testPrefix: string;
  private lastApiCall: number = 0;
  // Make rate limiting configurable for CI environments (Issue #649 feedback)
  private readonly API_RATE_LIMIT_MS = parseInt(
    process.env.MCP_TEST_RATE_LIMIT_MS || '100',
    10
  );
  private createdRecords: Array<{ type: string; id: string }> = [];

  constructor(testPrefix: string = 'TC') {
    this.testPrefix = testPrefix;
  }

  /**
   * Rate limiting protection - ensures minimum delay between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.API_RATE_LIMIT_MS) {
      const delayNeeded = this.API_RATE_LIMIT_MS - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    this.lastApiCall = Date.now();
  }

  /**
   * Initialize MCP test client
   */
  async setup(config: MCPTestConfig = {}): Promise<void> {
    const clientConfig = buildMCPClientConfig({
      serverCommand: config.serverCommand,
      serverArgs: config.serverArgs,
    });

    this.client = createMCPClient(clientConfig);
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
   * Track a record created during the test run so cleanup hooks can delete it reliably.
   * Uses a simple de-dupe to avoid hitting the API multiple times for the same record.
   */
  public trackRecord(type: string, id: string | null | undefined): void {
    if (!type || !id) {
      return;
    }

    const alreadyTracked = this.createdRecords.some(
      (record) => record.type === type && record.id === id
    );

    if (!alreadyTracked) {
      this.createdRecords.push({ type, id });
    }

    TestDataFactory.trackRecord(type, id);
  }

  /**
   * Temporary compatibility helper for legacy suites that still call the old
   * task-specific tracker. Normalizes to the generic trackRecord implementation.
   */
  public trackTaskForCleanup(id: string | null | undefined): void {
    this.trackRecord('tasks', id);
  }

  /**
   * Delete all tracked records using the universal delete tool.
   * Always best-effort: failures are logged but do not throw to keep tests from cascading.
   */
  public async cleanupTestData(): Promise<void> {
    const trackedByInstance = [...this.createdRecords];
    const trackedByFactory = TestDataFactory.getTrackedRecords();

    // Merge and de-dupe by resource type + id
    const allTracked = new Map<string, { type: string; id: string }>();
    for (const record of [...trackedByInstance, ...trackedByFactory]) {
      const key = `${record.type}:${record.id}`;
      if (!allTracked.has(key)) {
        allTracked.set(key, record);
      }
    }

    if (allTracked.size === 0) {
      return;
    }

    for (const { type, id } of allTracked.values()) {
      try {
        const result = await this.executeToolCall('delete_record', {
          resource_type: type,
          record_id: id,
        });

        const text = this.extractTextContent(result);

        if (result.isError && !this.isBenignCleanupFailure(text)) {
          console.warn(`⚠️ Cleanup failed for ${type} ${id}: ${text}`);
        } else {
          console.log(`✅ Cleanup removed ${type} ${id}`);
        }
      } catch (error) {
        console.warn(`⚠️ Cleanup threw for ${type} ${id}:`, error);
      }
    }

    this.createdRecords = [];
    TestDataFactory.clearTrackedRecords();
  }

  private isBenignCleanupFailure(responseText: string): boolean {
    const normalized = responseText.toLowerCase();
    return (
      normalized.includes('not found') ||
      normalized.includes('already deleted') ||
      normalized.includes('does not exist') ||
      normalized.includes('404') ||
      normalized.includes('400') ||
      normalized.includes('uniqueness') ||
      normalized.includes('conflict') ||
      normalized.includes('duplicate') ||
      normalized.includes('cannot delete')
    );
  }

  /**
   * Execute a tool call and validate the result
   */
  async executeToolCall(
    toolName: string,
    params: Record<string, unknown>,
    validator?: (result: CallToolResult) => void
  ): Promise<CallToolResult> {
    // Apply rate limiting protection for sequential API calls
    await this.enforceRateLimit();

    let capturedResult: CallToolResult | null = null;

    await this.client.assertToolCall(
      toolName,
      params,
      (result: CallToolResult) => {
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
  protected validateSuccessfulResult(result: CallToolResult): void {
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
  protected extractTextContent(result: CallToolResult): string {
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
  protected parseJsonFromResult(result: CallToolResult): unknown {
    const structured = this.extractJsonContent(result);
    if (structured !== null && structured !== undefined) {
      return structured;
    }

    const text = this.extractTextContent(result);
    const candidates: string[] = [];
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      candidates.push(trimmed);
    } else {
      const braceIndex = trimmed.indexOf('{');
      const bracketIndex = trimmed.indexOf('[');
      const validIndexes = [braceIndex, bracketIndex].filter(
        (index) => index >= 0
      );
      if (validIndexes.length > 0) {
        const startIndex = Math.min(...validIndexes);
        candidates.push(trimmed.slice(startIndex));
      }
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (error) {
        // Try the next candidate if parsing fails.
        continue;
      }
    }

    return null;
  }

  /**
   * Extract commonly used fields from tool responses that return record data.
   */
  protected parseRecordResult(result: CallToolResult): {
    text: string;
    id: string;
    values: Record<string, unknown>;
  } {
    const text = this.extractTextContent(result);
    const parsed = this.parseJsonFromResult(result) as {
      id?: { record_id?: string };
      values?: Record<string, unknown>;
    } | null;
    const id =
      parsed?.id?.record_id ??
      this.extractRecordId(text) ??
      this.extractFirstUuid(text) ??
      '';
    return {
      text,
      id,
      values: parsed?.values ?? {},
    };
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
   * Extract all UUID-looking record identifiers from a block of text. Useful
   * when search responses return multiple records.
   */
  protected extractRecordIdsFromText(text: string): string[] {
    const matches = text.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
    );

    if (!matches) {
      return [];
    }

    const unique = new Set(matches.map((id) => id.toLowerCase()));
    return Array.from(unique);
  }

  private extractFirstUuid(text: string): string | null {
    const ids = this.extractRecordIdsFromText(text);
    return ids.length > 0 ? ids[0] : null;
  }

  /**
   * Extract structured JSON content if the MCP response returned JSON payloads
   * in addition to (or instead of) plain text.
   */
  private extractJsonContent(result: CallToolResult): unknown {
    if (!result.content) {
      return null;
    }

    for (const part of result.content) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const type = 'type' in part ? String(part.type).toLowerCase() : '';

      if (type.includes('json')) {
        if ('data' in part && part.data !== undefined) {
          return part.data as unknown;
        }

        if ('json' in part && part.json !== undefined) {
          return part.json as unknown;
        }

        if ('text' in part && typeof part.text === 'string') {
          try {
            return JSON.parse(part.text);
          } catch (error) {
            // If parsing fails, continue checking other content blocks.
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if result indicates an error condition
   */
  protected hasError(result: CallToolResult): boolean {
    if (result.isError) return true;

    const text = this.extractTextContent(result).toLowerCase();
    return (
      text.includes('error') ||
      text.includes('failed') ||
      text.includes('invalid') ||
      text.includes('not found')
    );
  }

  /**
   * Discover available deal stages from the workspace.
   * Queries the API to get actual stage names, making tests workspace-agnostic.
   */
  async discoverDealStages(): Promise<string[]> {
    try {
      const result = await this.executeToolCall('records_discover_attributes', {
        resource_type: 'deals',
      });

      const parsed = this.parseJsonFromResult(result) as {
        attributes?: Array<{
          api_slug: string;
          config?: {
            statuses?: Array<{
              title: string;
              is_archived?: boolean;
            }>;
          };
        }>;
      };

      // Find stage attribute and extract status titles
      const stageAttr = parsed?.attributes?.find((a) => a.api_slug === 'stage');

      const stages =
        stageAttr?.config?.statuses
          ?.filter((s) => !s.is_archived)
          ?.map((s) => s.title)
          .filter((title): title is string => typeof title === 'string') || [];

      if (stages.length === 0) {
        console.warn('⚠️ No deal stages found via API, using fallback stages');
        return ['MQL', 'Sales Qualified', 'Demo Booked', 'Negotiations'];
      }

      return stages;
    } catch (error) {
      console.warn('⚠️ Failed to discover deal stages:', error);
      // Fallback to common stages if discovery fails
      return ['MQL', 'Sales Qualified', 'Demo Booked', 'Negotiations'];
    }
  }

  /**
   * Discover workspace members from the workspace.
   * Queries the API to get actual member details, making tests workspace-agnostic.
   */
  async discoverWorkspaceMembers(): Promise<
    Array<{ id: string; email: string; name: string }>
  > {
    try {
      const result = await this.executeToolCall('list-workspace-members', {});

      const parsed = this.parseJsonFromResult(result) as {
        members?: Array<{
          id?: { workspace_member_id?: string };
          email_address?: string;
          first_name?: string;
          last_name?: string;
        }>;
      };

      const members =
        parsed?.members?.map((m) => ({
          id: m.id?.workspace_member_id || '',
          email: m.email_address || '',
          name: [m.first_name, m.last_name].filter(Boolean).join(' '),
        })) || [];

      if (members.length === 0) {
        console.warn('⚠️ No workspace members found via API');
        return [];
      }

      return members.filter((m) => m.id && m.email);
    } catch (error) {
      console.warn('⚠️ Failed to discover workspace members:', error);
      return [];
    }
  }

  /**
   * Discover list attributes/schema for a specific list.
   * Queries the API to get available fields, making tests workspace-agnostic.
   */
  async discoverListAttributes(listId: string): Promise<string[]> {
    try {
      const result = await this.executeToolCall('get-list-details', { listId });

      const parsed = this.parseJsonFromResult(result) as {
        attributes?: Array<{
          api_slug?: string;
        }>;
      };

      const attributes =
        parsed?.attributes
          ?.map((a) => a.api_slug)
          .filter((slug): slug is string => typeof slug === 'string') || [];

      if (attributes.length === 0) {
        console.warn(
          `⚠️ No attributes found for list ${listId}, using common defaults`
        );
        return ['name', 'stage', 'status'];
      }

      return attributes;
    } catch (error) {
      console.warn(
        `⚠️ Failed to discover list attributes for ${listId}:`,
        error
      );
      return ['name', 'stage', 'status'];
    }
  }
}
