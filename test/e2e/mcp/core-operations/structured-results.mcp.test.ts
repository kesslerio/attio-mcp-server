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
      'records_search',
      'records_get_details',
      'records_create',
      'records_update',
      'records_delete',
      'companies_create',
      'companies_update',
      'deals_create',
      'deals_update',
      'records_upsert',
      'records_merge',
      'notes_create',
      'notes_list',
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
    'records_search',
    'records_get_details',
    'records_create',
    'records_update',
    'records_delete',
    'companies_create',
    'companies_update',
    'deals_create',
    'deals_update',
    'records_upsert',
    'records_merge',
    'notes_create',
    'notes_list',
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
    'records_search_advanced',
    'records_search_by_relationship',
    'records_search_by_content',
    'records_search_by_timeframe',
    'records_get_attributes',
    'records_discover_attributes',
    'records_get_attribute_options',
    'records_get_info',
    'records_get_interactions',
    'records_batch',
    'records_batch_search',
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
        'records_search',
        { resource_type: 'companies', limit: 1 },
        (result) => {
          search = result;
        }
      );
      expect(search?.isError).toBe(false);
      validateResult('records_search', search!);
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
        'records_get_details',
        { resource_type: 'companies', record_id: data[0].id.record_id },
        (result) => {
          expect(result.isError).toBe(false);
          validateResult('records_get_details', result);
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
          'records_get_info',
          {
            resource_type: 'companies',
            record_id: data[0].id.record_id,
            info_type: 'contact',
          },
        ],
        [
          'records_get_interactions',
          { resource_type: 'companies', record_id: data[0].id.record_id },
        ],
        [
          'records_get_attributes',
          { resource_type: 'companies', record_id: data[0].id.record_id },
        ],
        ['records_discover_attributes', { resource_type: 'tasks' }],
        [
          'records_batch_search',
          {
            resource_type: 'lists',
            queries: ['structured acceptance', 'structured acceptance'],
            limit: 1,
          },
        ],
        [
          'records_batch',
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
          if (name === 'records_batch' || name === 'records_batch_search') {
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
