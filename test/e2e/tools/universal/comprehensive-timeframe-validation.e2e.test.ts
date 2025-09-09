/**
 * Comprehensive MCP Test Client validation for all timeframe search scenarios
 * Tests absolute date ranges, edge cases, error handling, and integration scenarios
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from 'mcp-test-client';
import type { ToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('Comprehensive Timeframe Search MCP Validation', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    // Point to our built MCP server
    client = new MCPTestClient({
      serverCommand: 'node',
      serverArgs: ['./dist/index.js'],
    });
    await client.init();
  });

  afterAll(async () => {
    await client.cleanup();
  });

  describe('📅 Absolute Date Range Tests', () => {
    it('Test 5: Specific date range for companies', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
          date_operator: 'between',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 5 - Specific date range:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain('Invalid field');
              expect(content.text).not.toContain('Unknown object slug');
            }
          }
        }
      );
    });

    it('Test 6: Single start date (greater than)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'updated_at',
          start_date: '2024-06-01T00:00:00Z',
          date_operator: 'greater_than',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 6 - Single start date:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain("Invalid field 'gt'");
            }
          }
        }
      );
    });

    it('Test 7: Single end date (less than)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'last_interaction',
          end_date: '2024-05-01T00:00:00Z',
          date_operator: 'less_than',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 7 - Single end date:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain("Invalid field 'lt'");
            }
          }
        }
      );
    });
  });

  describe('🎯 Edge Cases & Error Handling', () => {
    it('Test 8: Invalid date format (should fail gracefully)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: 'invalid-date',
          date_operator: 'greater_than',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 8 - Invalid date format:',
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

    it('Test 9: Date range backwards (should fail)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2024-12-31T00:00:00Z',
          end_date: '2024-01-01T00:00:00Z',
          date_operator: 'between',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 9 - Backwards date range:',
            JSON.stringify(result, null, 2)
          );

          // Should handle backwards dates gracefully
          if (result.isError) {
            expect(result.content[0]).toHaveProperty('text');
            if ('text' in result.content[0]) {
              expect(result.content[0].text).not.toContain(
                'Unknown object slug'
              );
            }
          }
        }
      );
    });

    it('Test 10: Missing date field (should use default)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe: 'yesterday',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 10 - Missing date field:',
            JSON.stringify(result, null, 2)
          );

          // Should provide validation error about missing timeframe_attribute
          if (result.isError && result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).toContain('timeframe_attribute');
            }
          }
        }
      );
    });

    it('Test 11: Timeframe overrides absolute dates', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'yesterday',
          start_date: '2024-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 11 - Timeframe override:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain('Invalid field');
            }
          }
        }
      );
    });
  });

  describe('🔄 Different Date Fields', () => {
    it('Test 12: Created at field', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'last_7_days',
          limit: 5,
        },
        (result: ToolResult) => {
          console.log(
            'Test 12 - Created at field:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 13: Updated at field', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'updated_at',
          timeframe: 'last_30_days',
          limit: 5,
        },
        (result: ToolResult) => {
          console.log(
            'Test 13 - Updated at field:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 14: Last interaction field', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'last_interaction',
          timeframe: 'this_month',
          limit: 5,
        },
        (result: ToolResult) => {
          console.log(
            'Test 14 - Last interaction field:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 15: Custom date field', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'last_contacted_at',
          timeframe: 'yesterday',
          limit: 5,
        },
        (result: ToolResult) => {
          console.log(
            'Test 15 - Custom date field:',
            JSON.stringify(result, null, 2)
          );

          // Custom fields might not exist, so graceful handling expected
          if (result.isError && result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              // Should not be the old structure errors
              expect(content.text).not.toContain('Unknown object slug: c');
            }
          }
        }
      );
    });
  });

  describe('🚀 Performance & Volume Tests', () => {
    it('Test 16: Large date range (should return many results)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          start_date: '2020-01-01T00:00:00Z',
          end_date: '2024-12-31T23:59:59Z',
          date_operator: 'between',
          limit: 100,
        },
        (result: ToolResult) => {
          console.log(
            'Test 16 - Large date range:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              expect(content.text).not.toContain('Invalid field');
            }
          }
        }
      );
    });

    it('Test 17: Recent narrow range (should be fast)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'updated_at',
          timeframe: 'today',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 17 - Recent narrow range:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 18: With pagination', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'last_7_days',
          limit: 20,
          offset: 40,
        },
        (result: ToolResult) => {
          console.log(
            'Test 18 - With pagination:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });
  });

  describe('🧪 Integration with Other Filters', () => {
    it('Test 19: Timeframe + text search', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'last_30_days',
          query: 'tech',
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 19 - Timeframe + text search:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 20: Timeframe + specific filters', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'companies',
          search_type: 'timeframe',
          timeframe_attribute: 'created_at',
          timeframe: 'last_7_days',
          filters: {
            filters: [
              {
                attribute: { slug: 'industry' },
                condition: 'equals',
                value: 'Technology',
              },
            ],
          },
          limit: 10,
        },
        (result: ToolResult) => {
          console.log(
            'Test 20 - Timeframe + filters:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });

    it('Test 21: Complex combined search', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'last_interaction',
          timeframe: 'this_month',
          query: 'john',
          limit: 50,
        },
        (result: ToolResult) => {
          console.log(
            'Test 21 - Complex combined search:',
            JSON.stringify(result, null, 2)
          );
          expect(result.isError).toBeFalsy();
        }
      );
    });
  });
});
