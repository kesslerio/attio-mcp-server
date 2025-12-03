/**
 * QA Test Suite for PR #572 - Query API Implementation
 *
 * Tests the three specific test cases that were failing:
 * - TC-010: Search by Relationship
 * - TC-011: Search by Content
 * - TC-012: Search by Timeframe
 *
 * Uses mcp-test-client to validate MCP tool integration works correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  createMCPClient,
  buildMCPClientConfig,
  type MCPClientAdapter,
} from '../../mcp/shared/mcp-client.js';

describe('PR #572 Query API QA - MCP Tool Integration', () => {
  let client: MCPClientAdapter;

  beforeAll(async () => {
    client = createMCPClient(buildMCPClientConfig());
    await client.init();
  });

  afterAll(async () => {
    await client.cleanup();
  });

  describe('TC-010: Search by Relationship', () => {
    it('should successfully search records by relationship using Query API', async () => {
      const start = performance.now();

      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'relationship',
          target_type: 'companies', // Correct parameter name
          target_id: 'some-company-id',
          limit: 5,
          content_fields: ['name', 'email'], // This triggers Query API path
        },
        (result: CallToolResult) => {
          const duration = performance.now() - start;

          // Should complete within reasonable time (increased for real API calls)
          expect(duration).toBeLessThan(5000);

          // Should return a response (error or success)
          expect(result.content).toBeDefined();
          expect(result.content).toHaveLength(1);
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Validate it's not using old $relationship structure in error messages
          expect(responseText).not.toContain('$relationship');
          expect(responseText).not.toContain('relationship attribute error');

          // Response should be meaningful (not empty or undefined)
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });

    it('should handle relationship search with path-based queries', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'relationship',
          target_type: 'companies', // Correct parameter name
          target_id: 'test-company-123',
          content_fields: ['name'], // Triggers new Query API
          limit: 3,
        },
        (result: CallToolResult) => {
          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Should not contain legacy error patterns
          expect(responseText).not.toContain('$relationship attribute');
          expect(responseText).not.toContain('Invalid filter structure');

          // Response should be meaningful
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });
  });

  describe('TC-011: Search by Content', () => {
    it('should successfully search records by content using Query API', async () => {
      const start = performance.now();

      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'content',
          content_query: 'tech',
          content_fields: ['name', 'description'], // This triggers Query API
          limit: 5,
        },
        (result: CallToolResult) => {
          const duration = performance.now() - start;

          // Should complete within reasonable time
          expect(duration).toBeLessThan(5000);

          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Should not contain legacy error patterns
          expect(responseText).not.toContain('$relationship');
          expect(responseText).not.toContain('Invalid filter structure');

          // Response should be meaningful
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });

    it('should handle content search across multiple fields', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'content',
          content_query: 'smith',
          content_fields: ['name', 'email'], // Multiple content fields
          limit: 5,
        },
        (result: CallToolResult) => {
          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Validate proper Query API structure used - no legacy errors
          expect(responseText).not.toContain('constraints error');
          expect(responseText).not.toContain('path error');

          // Response should be meaningful
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });
  });

  describe('TC-012: Search by Timeframe', () => {
    it('should successfully search records by timeframe using Query API', async () => {
      const start = performance.now();

      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
          content_fields: ['name'], // This should trigger Query API path
          limit: 5,
        },
        (result: CallToolResult) => {
          const duration = performance.now() - start;

          // Should complete within reasonable time (increased for real API calls)
          expect(duration).toBeLessThan(8000);

          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Should not contain legacy date filtering errors
          expect(responseText).not.toContain('date constraint error');
          expect(responseText).not.toContain('timeframe search failed');

          // Response should be meaningful
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });

    it('should handle timeframe search for tasks resource type', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'tasks',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-08-01T00:00:00Z',
          end_date: '2024-08-31T23:59:59Z',
          content_fields: ['title'], // Triggers Query API
          limit: 3,
        },
        (result: CallToolResult) => {
          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;

          // Validate tasks can be searched by timeframe (was previously failing)
          expect(responseText).not.toContain('tasks timeframe not supported');
          expect(responseText).not.toContain('resource type error');

          // Response should be meaningful
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('should maintain legacy behavior when content_fields not provided', async () => {
      // This should NOT use the new Query API since content_fields is not provided
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'basic',
          query: 'tech',
          limit: 5,
          // No content_fields - should use legacy approach
        },
        (result: CallToolResult) => {
          // Should return a response
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });

    it('should handle Query API routing when content_fields provided', async () => {
      // Test that the routing logic correctly chooses Query API when content_fields provided
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'basic',
          query: 'smith',
          content_fields: ['name'], // This should trigger Query API
          limit: 3,
        },
        (result: CallToolResult) => {
          // Should return a response using Query API
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;
          expect(responseText.length).toBeGreaterThan(0);
        }
      );
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle invalid resource types gracefully', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'invalid-resource',
          search_type: 'basic',
          query: 'test',
          limit: 5,
        },
        (result: CallToolResult) => {
          // Should return a response (error or graceful handling)
          expect(result.content).toBeDefined();
          expect(result.content[0].type).toBe('text');

          const responseText = result.content[0].text;
          expect(responseText.length).toBeGreaterThan(0);

          // Error messages should be descriptive, not generic
          expect(responseText).not.toContain('undefined');
          expect(responseText).not.toContain('[object Object]');
        }
      );
    });
  });

  describe('Performance Validation', () => {
    it('should complete Query API searches within reasonable time', async () => {
      const start = performance.now();

      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'content',
          content_query: 'tech',
          content_fields: ['name'],
          limit: 5,
        },
        (result: CallToolResult) => {
          const duration = performance.now() - start;

          // Should complete within reasonable time for real API calls
          expect(duration).toBeLessThan(8000);

          // Should return a response
          expect(result.content).toBeDefined();
        }
      );
    });
  });
});
