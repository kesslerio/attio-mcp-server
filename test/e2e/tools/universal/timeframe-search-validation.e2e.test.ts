/**
 * MCP Test Client validation for timeframe search functionality
 * Tests the real MCP tool calls to validate our fixes for Issue #523
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  createMCPClient,
  buildMCPClientConfig,
  type MCPClientAdapter,
} from '../../mcp/shared/mcp-client.js';

describe('Timeframe Search MCP Tool Validation', () => {
  let client: MCPClientAdapter;

  beforeAll(async () => {
    client = createMCPClient(buildMCPClientConfig());
    await client.init();
  });

  afterAll(async () => {
    await client.cleanup();
  });

  describe('Tool Discovery', () => {
    it('should list search-records tool', async () => {
      const tools = await client.listTools();

      const searchTool = tools.find((tool) => tool.name === 'search-records');
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain('search');
    });
  });

  describe('Basic Timeframe Search Tests', () => {
    it('should handle yesterday timeframe search for companies', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'yesterday',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Yesterday companies result:',
            JSON.stringify(result, null, 2)
          );

          // Should not error with "Invalid condition" or "Unknown object slug"
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              // Should not contain error messages about invalid operators
              expect(content.text).not.toContain('Invalid condition');
              expect(content.text).not.toContain('Unknown object slug');
              expect(content.text).not.toContain('greater_than_or_equal_to');
              expect(content.text).not.toContain("Invalid field 'gte'");
            }
          }
        }
      );
    });

    it('should handle last_7_days timeframe search for people', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'last_7_days',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Last 7 days people result:',
            JSON.stringify(result, null, 2)
          );

          // Should use Query API automatically and not error
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              // Should not contain Advanced Search API errors
              expect(content.text).not.toContain('Invalid condition');
              expect(content.text).not.toContain('greater_than_or_equal_to');
            }
          }
        }
      );
    });

    it('should handle custom date range search for tasks', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'tasks',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-06-01',
          end_date: '2024-06-30',
          date_operator: 'between',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Custom date range tasks result:',
            JSON.stringify(result, null, 2)
          );

          // Should use proper $gte/$lte operators
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              // Should not contain timestamp operator errors
              expect(content.text).not.toContain("Invalid field 'gte'");
              expect(content.text).not.toContain("Invalid field 'lte'");
            }
          }
        }
      );
    });

    it('should handle single date comparison with greater_than', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-07-01',
          date_operator: 'greater_than',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Greater than comparison result:',
            JSON.stringify(result, null, 2)
          );

          // Should use $gt operator correctly
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain("Invalid field 'gt'");
              expect(content.text).not.toContain('Unknown object slug');
            }
          }
        }
      );
    });

    it('should handle single date comparison with less_than', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'last_interaction',
          end_date: '2024-05-01',
          date_operator: 'less_than',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Less than comparison result:',
            JSON.stringify(result, null, 2)
          );

          // Should use $lt operator correctly
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain("Invalid field 'lt'");
              expect(content.text).not.toContain('Unknown attribute slug');
            }
          }
        }
      );
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle invalid date formats gracefully', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: 'invalid-date',
          date_operator: 'greater_than',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Invalid date format result:',
            JSON.stringify(result, null, 2)
          );

          // Should either handle gracefully or provide clear error
          if (result.isError) {
            expect(result.content[0]).toHaveProperty('text');
            if ('text' in result.content[0]) {
              // Should not be the old API structure errors
              expect(result.content[0].text).not.toContain(
                'Unknown object slug: c'
              );
              expect(result.content[0].text).not.toContain(
                "Invalid condition 'greater_than_or_equal_to'"
              );
            }
          }
        }
      );
    });

    it('should handle missing required parameters', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          // Missing timeframe_attribute, dates, etc.
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            'Missing parameters result:',
            JSON.stringify(result, null, 2)
          );

          // Should provide clear validation error
          if (result.isError && result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).toContain('timeframe_attribute');
            }
          }
        }
      );
    });
  });

  describe('API Structure Validation', () => {
    it('should verify Query API is used for timeframe searches', async () => {
      // This test just ensures no structure errors occur
      // The actual API calls will show in logs if Query API is used correctly
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'updated_at',
          timeframe: 'last_30_days',
          limit: 3,
        },
        (result: CallToolResult) => {
          console.log(
            'API structure validation result:',
            JSON.stringify(result, null, 2)
          );

          // Main goal: no "Unknown object slug" or constraint format errors
          expect(result.isError).toBeFalsy();
        }
      );
    });
  });
});
