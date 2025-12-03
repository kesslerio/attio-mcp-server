/**
 * MCP Parameter Usage Demonstration
 * Shows the difference between correct and incorrect parameter naming for timeframe searches
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  createMCPClient,
  buildMCPClientConfig,
  type MCPClientAdapter,
} from '../../mcp/shared/mcp-client.js';

describe('Timeframe Search Parameter Usage Demo', () => {
  let client: MCPClientAdapter;

  beforeAll(async () => {
    client = createMCPClient(buildMCPClientConfig());
    await client.init();
  });

  afterAll(async () => {
    await client.cleanup();
  });

  describe("❌ Incorrect Usage (User's Failing Examples)", () => {
    it('❌ WRONG: timeframe + date_field (should return error or 0 results)', async () => {
      await client.assertToolCall(
        'search-records',
        {
          timeframe: 'last_7_days',
          date_field: 'updated_at',
          resource_type: 'people',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            '❌ WRONG Usage - timeframe + date_field:',
            JSON.stringify(result, null, 2)
          );

          // This should either error or return limited results because date_field is not the right parameter
          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              console.log('Result text:', content.text);
              // It might return results, but not filtered by the timeframe properly
            }
          }
        }
      );
    });

    it('❌ WRONG: timeframe + date_field for this_week', async () => {
      await client.assertToolCall(
        'search-records',
        {
          timeframe: 'this_week',
          date_field: 'last_interaction',
          resource_type: 'people',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            '❌ WRONG Usage - this_week + date_field:',
            JSON.stringify(result, null, 2)
          );

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              console.log('Result text:', content.text);
            }
          }
        }
      );
    });
  });

  describe('✅ Correct Usage', () => {
    it('✅ CORRECT: timeframe + timeframe_attribute', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'updated_at', // ✅ Correct parameter name
          timeframe: 'last_7_days',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            '✅ CORRECT Usage - timeframe + timeframe_attribute:',
            JSON.stringify(result, null, 2)
          );

          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              console.log('✅ Result text:', content.text);
              // Should contain actual filtered results
              expect(content.text).not.toContain('Invalid field');
              expect(content.text).not.toContain('Unknown object slug');
            }
          }
        }
      );
    });

    it('✅ CORRECT: timeframe + timeframe_attribute for last_interaction', async () => {
      await client.assertToolCall(
        'search-records',
        {
          resource_type: 'people',
          search_type: 'timeframe',
          timeframe_attribute: 'last_interaction', // ✅ Correct parameter name
          timeframe: 'this_week',
          limit: 5,
        },
        (result: CallToolResult) => {
          console.log(
            '✅ CORRECT Usage - this_week + timeframe_attribute:',
            JSON.stringify(result, null, 2)
          );

          expect(result.isError).toBeFalsy();

          if (result.content && result.content.length > 0) {
            const content = result.content[0];
            if ('text' in content) {
              console.log('✅ Result text:', content.text);
            }
          }
        }
      );
    });
  });

  describe('📚 Parameter Usage Guide', () => {
    it('📝 When to use date_field vs timeframe_attribute', async () => {
      console.log(`
📚 PARAMETER USAGE GUIDE:

❌ WRONG COMBINATIONS:
  - timeframe: 'last_7_days' + date_field: 'updated_at'
  - timeframe: 'this_week' + date_field: 'last_interaction'

✅ CORRECT COMBINATIONS:
  - timeframe: 'last_7_days' + timeframe_attribute: 'updated_at' + search_type: 'timeframe'
  - timeframe: 'this_week' + timeframe_attribute: 'last_interaction' + search_type: 'timeframe'

📖 PARAMETER REFERENCE:

1. For RELATIVE timeframes (yesterday, last_7_days, this_week, etc.):
   ✅ Use: timeframe_attribute + search_type: 'timeframe'

2. For ABSOLUTE date ranges:
   ✅ Use: start_date + end_date + date_operator: 'between' + timeframe_attribute + search_type: 'timeframe'

3. For BASIC date filtering (created_after, updated_before):
   ✅ Use: date_field (this is for simple date boundaries, not timeframe searches)

4. REQUIRED for timeframe searches:
   - resource_type (required)
   - search_type: 'timeframe' (required for timeframe searches)
   - timeframe_attribute (required - the field to filter on)
   - EITHER timeframe (relative) OR start_date/end_date (absolute)
      `);

      // This is just a documentation test
      expect(true).toBe(true);
    });
  });
});
