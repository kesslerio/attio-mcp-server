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
describe('U1 structured results over MCP stdio', () => {
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
    for (const name of ['search_records', 'get_record_details']) {
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
    expect(
      tools.find((tool) => tool.name === 'create_record')?.outputSchema
    ).toBeUndefined();
  });

  it.each(['search_records', 'get_record_details'])(
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
          expect(JSON.parse(result.content.at(-1)!.text as string)).toEqual(
            result.structuredContent
          );
        }
      );
    }
  );
});
