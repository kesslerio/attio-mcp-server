import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer as createHttpServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

// These tests load the shipped build, not Vitest's source aliases or API mocks.
const cli = path.resolve('dist/cli.js');
const record = CompanyMockFactory.create({ name: 'SDK fixture company' });

afterEach(() => vi.unstubAllEnvs());

describe.each([
  ['v1', LegacyClient, LegacyTransport],
  ['v2', Client, StdioClientTransport],
] as const)(
  'built stdio with %s client',
  (_version, ClientType, TransportType) => {
    it('retains discovery, results, connector content, and nonreplayed uncertain writes', async () => {
      let writes = 0;
      const upstream = createHttpServer((request, response) => {
        request.resume();
        if (request.method === 'DELETE') {
          writes++;
          request.socket.destroy();
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        const single = request.url?.includes(`/records/${record.id.record_id}`);
        response.end(JSON.stringify({ data: single ? record : [] }));
      });
      await new Promise<void>((resolve) =>
        upstream.listen(0, '127.0.0.1', resolve)
      );
      const address = upstream.address();
      if (!address || typeof address === 'string')
        throw new Error('No fixture port');
      const cwd = await mkdtemp(path.join(tmpdir(), 'attio-sdk-'));
      const transport = new TransportType({
        command: 'node',
        args: [cli],
        cwd,
        env: {
          PATH: process.env.PATH ?? '',
          ATTIO_API_KEY: 'sdk-offline-fixture',
          ATTIO_BASE_URL: `http://127.0.0.1:${address.port}`,
          ATTIO_MCP_TOOL_MODE: 'full',
          MCP_LOG_LEVEL: 'ERROR',
        },
        stderr: 'ignore',
      });
      const client = new ClientType({
        name: 'sdk-compatibility',
        version: '1',
      });
      try {
        await client.connect(transport);
        const { tools } = await client.listTools();
        const detailsTool = tools.find(
          (tool) => tool.name === 'records_get_details'
        );
        expect(detailsTool?.outputSchema).toBeDefined();
        const result = await client.callTool({
          name: 'records_get_details',
          arguments: {
            resource_type: 'companies',
            record_id: record.id.record_id,
          },
        });
        expect(result).toMatchObject({
          isError: false,
          structuredContent: { data: { id: record.id } },
        });
        expect(
          new AjvJsonSchemaValidator().getValidator(detailsTool!.outputSchema!)(
            result.structuredContent
          ).valid
        ).toBe(true);
        expect(JSON.parse(result.content[0].text as string)).toEqual(
          result.structuredContent
        );
        const connector = await client.callTool({
          name: 'fetch',
          arguments: { id: `companies:${record.id.record_id}` },
        });
        expect(connector.isError).not.toBe(true);
        expect(connector.content[0]).toMatchObject({ type: 'text' });
        expect((await client.listPrompts()).prompts.length).toBeGreaterThan(0);
        expect((await client.listResources()).resources).toEqual([]);
        await expect(
          client.callTool({ name: 'unknown-tool' })
        ).rejects.toMatchObject({ code: -32602 });
        const uncertain = await client.callTool({
          name: 'records_delete',
          arguments: {
            resource_type: 'companies',
            record_id: record.id.record_id,
          },
        });
        expect(uncertain).toMatchObject({
          isError: true,
          structuredContent: { error: { retryable: false } },
        });
        expect(JSON.stringify(uncertain.structuredContent)).toMatch(
          /read back/i
        );
        expect(writes).toBe(1);
        // The old Worker transports JSON content; structuredContent restoration is
        // a separate unit. Exercise its real dist imports without changing that wire.
        vi.stubEnv('ATTIO_BASE_URL', `http://127.0.0.1:${address.port}`);
        const { createMcpHandler } =
          await import('../../examples/cloudflare-mcp-server/src/mcp-handler.js');
        const worker = createMcpHandler({ attioToken: 'sdk-offline-fixture' });
        const reply = await worker.handleHttpRequest(
          new Request('https://worker.test/mcp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'records_delete',
                arguments: {
                  resource_type: 'companies',
                  record_id: record.id.record_id,
                },
              },
            }),
          })
        );
        const workerResult = (await reply.json()).result;
        expect(workerResult.isError).toBe(true);
        expect(JSON.parse(workerResult.content[0].text)).toMatchObject({
          error: { retryable: false },
        });
        expect(workerResult.content[0].text).toMatch(/read back/i);
        expect(writes).toBe(2);
      } finally {
        await client.close();
        await transport.close();
        upstream.closeAllConnections();
        await new Promise<void>((resolve) => upstream.close(() => resolve()));
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }
);

it('loads public build exports and the legacy Worker against the shared SDK boundary', async () => {
  const { createServer } = await import('attio-mcp/lib');
  const { Server } = await import('@modelcontextprotocol/server');
  const server = createServer({ getApiKey: () => 'sdk-offline-fixture' });
  expect(server).toBeInstanceOf(Server);
  await server.close();
  const { createMcpHandler } =
    await import('../../examples/cloudflare-mcp-server/src/mcp-handler.js');
  const handler = createMcpHandler({ attioToken: 'sdk-offline-fixture' });
  const response = await handler.handleHttpRequest(
    new Request('https://worker.test/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
  );
  const { result } = await response.json();
  const { getToolsListPayload } =
    await import('../../dist/utils/mcp-discovery.js');
  expect(result).toEqual(getToolsListPayload());
  expect(
    result.tools.find(
      (tool: { name: string }) => tool.name === 'records_get_details'
    ).outputSchema
  ).toBeDefined();
});
