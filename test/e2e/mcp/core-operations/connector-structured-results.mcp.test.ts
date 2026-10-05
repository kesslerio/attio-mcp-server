import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';

/**
 * AE8: the connector pair keeps its documented JSON text shape while also
 * publishing the shared structured envelope. This starts the built server over
 * stdio, so the assertions observe real wire serialization.
 */
describe('connector structured results over MCP stdio', () => {
  const client = new Client({ name: 'connector-test', version: '1' });
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
  // A second session with prose disabled must keep the machine channels intact.
  const quietClient = new Client({ name: 'connector-quiet', version: '1' });
  const quietTransport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/cli.js'],
    env: {
      ...getDefaultEnvironment(),
      NODE_ENV: 'production',
      MCP_LOG_LEVEL: 'ERROR',
      ATTIO_MCP_TOOL_MODE: 'full',
      MCP_TEXT_RESULTS: 'false',
      ...(process.env.ATTIO_API_KEY
        ? { ATTIO_API_KEY: process.env.ATTIO_API_KEY }
        : {}),
      ...(process.env.ATTIO_ACCESS_TOKEN
        ? { ATTIO_ACCESS_TOKEN: process.env.ATTIO_ACCESS_TOKEN }
        : {}),
    },
  });

  let tools: Tool[];

  async function call(
    target: Client,
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    return target.request(
      { method: 'tools/call', params: { name, arguments: args } },
      CallToolResultSchema
    );
  }

  function validateResult(name: string, result: CallToolResult) {
    const schema = tools.find((tool) => tool.name === name)?.outputSchema;
    expect(schema).toBeDefined();
    expect(
      new AjvJsonSchemaValidator().getValidator(schema!)(
        result.structuredContent
      ).valid
    ).toBe(true);
  }

  beforeAll(async () => {
    await client.connect(transport);
    await quietClient.connect(quietTransport);
    tools = (await client.listTools()).tools;
  });

  afterAll(async () => {
    await client.close();
    await quietClient.close();
    await transport.close();
    await quietTransport.close();
  });

  it('advertises object-rooted envelopes for both connector tools', () => {
    for (const name of ['search', 'fetch']) {
      const tool = tools.find((item) => item.name === name)!;
      expect(tool.outputSchema).toMatchObject({ type: 'object' });
      expect(
        new AjvJsonSchemaValidator().getValidator(tool.outputSchema!)({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query is required',
            retryable: false,
          },
        }).valid
      ).toBe(true);
    }
  });

  it.each(['search', 'fetch'])(
    'serializes %s execution errors against the advertised schema under both prose settings',
    async (name) => {
      for (const target of [
        { label: 'default', client },
        { label: 'MCP_TEXT_RESULTS=false', client: quietClient },
      ]) {
        const result = await call(target.client, name, {});
        expect(result, target.label).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: 'VALIDATION_ERROR', retryable: false },
          },
        });
        validateResult(name, result);
        expect(JSON.parse(result.content[0].text as string)).toEqual(
          result.structuredContent
        );
      }
    }
  );

  it.skipIf(!process.env.ATTIO_API_KEY && !process.env.ATTIO_ACCESS_TOKEN)(
    'composes search then fetch, keeping the connector text shape and reference ids',
    async () => {
      for (const target of [
        { label: 'default', client },
        { label: 'quiet', client: quietClient },
      ]) {
        const search = await call(target.client, 'search', {
          query: 'acme',
          limit: 2,
        });
        expect(search.isError, target.label).toBe(false);
        validateResult('search', search);
        // The connector contract: content[0] stays a { results: [...] } document.
        const projection = JSON.parse(search.content[0].text as string) as {
          results: Array<{ id: string; title: string; url: string }>;
        };
        const data = search.structuredContent!.data as Array<{
          id: string;
          title: string;
        }>;
        expect(search.structuredContent!.count).toBe(data.length);
        expect(search.structuredContent!.next_cursor).toBeNull();
        expect(projection.results).toEqual(data);
        // The connector payload lives in the text document; prose never repeats it.
        expect(search.content).toHaveLength(1);

        if (data.length === 0) continue;
        const fetched = await call(target.client, 'fetch', {
          id: data[0].id,
        });
        expect(fetched.isError, target.label).toBe(false);
        validateResult('fetch', fetched);
        const document = JSON.parse(fetched.content[0].text as string) as {
          id: string;
          text: string;
        };
        expect(fetched.structuredContent).toEqual({ data: document });
        // Reference ids round-trip from the search projection into fetch.
        expect(document.id).toBe(data[0].id);
        expect(document.text.length).toBeGreaterThan(0);
      }
    }
  );
});
