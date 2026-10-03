import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

// This starts the built server over stdio; no in-process API mocks are injected.
describe('structured results over MCP stdio', () => {
  // mcp-test-client 1.0.1 strips structuredContent and isError, and its cleanup
  // does not close the transport. Use the resolved SDK for this wire assertion.
  const client = new Client({ name: 'structured-results-test', version: '1' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/cli.js'],
    env: {
      ...getDefaultEnvironment(),
      NODE_ENV: 'production',
      MCP_LOG_LEVEL: 'ERROR',
      ATTIO_MCP_TOOL_MODE: 'full',
      ...(process.env.ATTIO_API_KEY
        ? { ATTIO_API_KEY: process.env.ATTIO_API_KEY }
        : {}),
      ...(process.env.ATTIO_ACCESS_TOKEN
        ? { ATTIO_ACCESS_TOKEN: process.env.ATTIO_ACCESS_TOKEN }
        : {}),
    },
  });
  async function assertToolCall(
    name: string,
    args: Record<string, unknown>,
    assertion: (result: CallToolResult) => void
  ) {
    const result = await client.request(
      { method: 'tools/call', params: { name, arguments: args } },
      CallToolResultSchema
    );
    assertion(result);
  }
  let tools: Tool[];

  beforeAll(async () => {
    await client.connect(transport);
    tools = (await client.listTools()).tools;
  });
  afterAll(async () => {
    await client.close();
    await transport.close();
  });

  function validateResult(name: string, result: CallToolResult) {
    const schema = tools.find((tool) => tool.name === name)?.outputSchema;
    expect(schema).toBeDefined();
    expect(
      new AjvJsonSchemaValidator().getValidator(schema!)(
        result.structuredContent
      ).valid
    ).toBe(true);
  }

  it('publishes representative schemas through real tools/list serialization', () => {
    for (const name of [
      'search_records',
      'get_record_details',
      'create_record',
      'update_record',
      'delete_record',
      'create_company',
      'update_company',
      'create_deal',
      'update_deal',
      'upsert_record',
      'merge_records',
      'create_note',
      'list_notes',
    ]) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool.outputSchema).toMatchObject({ type: 'object' });
      const validate = new AjvJsonSchemaValidator().getValidator(
        tool.outputSchema!
      );
      expect(
        validate({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check required arguments',
            retryable: false,
          },
        }).valid
      ).toBe(true);
      expect(
        validate({
          data: {},
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check arguments',
            retryable: false,
          },
        }).valid
      ).toBe(false);
    }
  });

  it.each([
    'search_records',
    'get_record_details',
    'create_record',
    'update_record',
    'delete_record',
    'create_company',
    'update_company',
    'create_deal',
    'update_deal',
    'upsert_record',
    'merge_records',
    'create_note',
    'list_notes',
  ])(
    'serializes %s execution errors against the advertised schema',
    async (name) => {
      await assertToolCall(name, {}, (result) => {
        expect(result).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: 'VALIDATION_ERROR', retryable: false },
          },
        });
        validateResult(name, result);
        expect(result.content[0].type).toBe('text');
        expect(
          JSON.parse((result.content[0] as { text: string }).text)
        ).toEqual(result.structuredContent);
      });
    }
  );

  it.each([
    'search_records_advanced',
    'search_records_by_relationship',
    'search_records_by_content',
    'search_records_by_timeframe',
    'get_record_attributes',
    'discover_record_attributes',
    'get_record_attribute_options',
    'get_record_info',
    'get_record_interactions',
    'batch_records',
    'batch_search_records',
  ])(
    'advertises and validates %s read/batch execution errors over stdio',
    async (name) => {
      expect(
        tools.find((tool) => tool.name === name)!.outputSchema
      ).toBeDefined();
      await assertToolCall(name, {}, (result) => {
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: { code: 'VALIDATION_ERROR', retryable: false },
        });
        validateResult(name, result);
        expect(JSON.parse(result.content[0].text as string)).toEqual(
          result.structuredContent
        );
      });
    }
  );

  it.skipIf(!process.env.ATTIO_API_KEY && !process.env.ATTIO_ACCESS_TOKEN)(
    'composes live read-only search and details using structured identifiers',
    async () => {
      let search: CallToolResult | undefined;
      await assertToolCall(
        'search_records',
        { resource_type: 'companies', limit: 1 },
        (result) => {
          search = result;
        }
      );
      expect(search?.isError).toBe(false);
      validateResult('search_records', search!);
      const data = search!.structuredContent!.data as Array<{
        id: { record_id: string };
      }>;
      expect(search!.structuredContent!.count).toBe(data.length);
      expect(search!.structuredContent!.next_cursor).toBeNull();
      expect(JSON.parse(search!.content[0].text as string)).toEqual(
        search!.structuredContent
      );
      expect(
        data.length,
        'Live acceptance requires at least one readable company'
      ).toBeGreaterThan(0);
      await assertToolCall(
        'get_record_details',
        { resource_type: 'companies', record_id: data[0].id.record_id },
        (result) => {
          expect(result.isError).toBe(false);
          validateResult('get_record_details', result);
          expect(result.structuredContent).toMatchObject({
            data: { id: { record_id: data[0].id.record_id } },
          });
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
        }
      );
      // Read-only U3 acceptance: no fixture mutation or cleanup is needed.
      for (const [name, args] of [
        [
          'get_record_info',
          {
            resource_type: 'companies',
            record_id: data[0].id.record_id,
            info_type: 'contact',
          },
        ],
        [
          'get_record_interactions',
          { resource_type: 'companies', record_id: data[0].id.record_id },
        ],
        [
          'get_record_attributes',
          { resource_type: 'companies', record_id: data[0].id.record_id },
        ],
        ['discover_record_attributes', { resource_type: 'tasks' }],
        [
          'batch_search_records',
          {
            resource_type: 'lists',
            queries: ['structured acceptance', 'structured acceptance'],
            limit: 1,
          },
        ],
        [
          'batch_records',
          {
            resource_type: 'companies',
            operation_type: 'get',
            record_ids: [data[0].id.record_id],
          },
        ],
      ] as const) {
        await assertToolCall(name, args, (result) => {
          expect(result.isError).toBe(false);
          validateResult(name, result);
          if (name === 'batch_records' || name === 'batch_search_records') {
            expect(
              (
                result.structuredContent!.data as Array<{ success: boolean }>
              ).every((item) => item.success)
            ).toBe(true);
          }
          expect(JSON.parse(result.content[0].text as string)).toEqual(
            result.structuredContent
          );
        });
      }
    }
  );
});
