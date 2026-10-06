import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '@/server/createServer.js';
import { clearAllCaches } from '@/api/client-cache.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

// Exercise native credential resolution and HTTP, without setup's API/domain mocks.
vi.hoisted(() => vi.resetModules());
vi.unmock('@/api/attio-client.js');
vi.unmock('@/objects/companies/index.js');

describe('native MCP tenant client ownership', () => {
  let upstream: Server;
  let host: Server;
  let denyB: boolean;
  let requests: string[];
  let clients: Client[];
  let servers: ReturnType<typeof createServer>[];
  let transports: StreamableHTTPServerTransport[];
  const record = CompanyMockFactory.create({ name: 'Tenant company' });
  const workspaceA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const workspaceB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  async function listen(server: Server): Promise<number> {
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    );
    return (server.address() as AddressInfo).port;
  }

  beforeEach(async () => {
    clearAllCaches();
    requests = [];
    clients = [];
    servers = [];
    transports = [];
    denyB = false;
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('USE_MOCK_DATA', 'false');
    vi.stubEnv('OFFLINE_MODE', 'false');
    vi.stubEnv('E2E_MODE', 'false');
    vi.stubEnv('ATTIO_API_KEY', '');
    vi.stubEnv('ATTIO_ACCESS_TOKEN', '');
    vi.stubEnv('MCP_LOG_LEVEL', 'ERROR');
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');

    upstream = createHttpServer((req, res) => {
      const owner =
        req.headers.authorization === 'Bearer disposable-tenant-a'
          ? 'a'
          : req.headers.authorization === 'Bearer disposable-tenant-b'
            ? 'b'
            : 'unknown';
      requests.push(owner);
      res.setHeader('Content-Type', 'application/json');
      if (owner === 'unknown' || (denyB && owner === 'b')) {
        res.writeHead(403);
        res.end(JSON.stringify({ message: 'Workspace access denied' }));
        return;
      }
      res.end(
        JSON.stringify({
          data: {
            ...record,
            id: {
              ...record.id,
              workspace_id: owner === 'a' ? workspaceA : workspaceB,
            },
          },
        })
      );
    });
    vi.stubEnv(
      'ATTIO_BASE_URL',
      `http://127.0.0.1:${await listen(upstream)}/v2`
    );

    for (const tenant of ['a', 'b']) {
      const server = createServer({
        getApiKey: () => `disposable-tenant-${tenant}`,
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        enableJsonResponse: true,
      });
      servers.push(server);
      transports.push(transport);
      await server.connect(transport);
    }
    host = createHttpServer(async (req, res) => {
      const index = req.url === '/a' ? 0 : 1;
      await transports[index].handleRequest(req, res);
    });
    const port = await listen(host);
    for (const tenant of ['a', 'b']) {
      const client = new Client({ name: `tenant-${tenant}`, version: '1' });
      clients.push(client);
      await client.connect(
        new StreamableHTTPClientTransport(
          new URL(`http://127.0.0.1:${port}/${tenant}`)
        )
      );
    }
  });

  afterEach(async () => {
    for (const client of clients) await client.close();
    for (const server of servers) await server.close();
    for (const server of [host, upstream]) {
      if (!server) continue;
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    clearAllCaches();
    vi.unstubAllEnvs();
  });

  it.each([false, true])(
    'honors tenant B access after A warms the cache (denied=%s)',
    async (denied) => {
      const args = {
        resource_type: 'companies',
        record_id: record.id.record_id,
      };
      const details = (client: Client) =>
        client.callTool({
          name: 'records_get_details',
          arguments: args,
        });
      const warm = await details(clients[0]);
      expect(warm.structuredContent?.data).toMatchObject({
        id: { workspace_id: workspaceA },
      });
      requests.length = 0;
      denyB = denied;

      const [resultA, resultB] = await Promise.all(clients.map(details));
      expect(requests.sort()).toEqual(['a', 'b']);
      expect(resultA.isError).toBe(false);
      expect(resultA.structuredContent?.data).toMatchObject({
        id: { workspace_id: workspaceA },
      });
      if (denied) {
        expect(resultB).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: 'PERMISSION_DENIED', retryable: false },
          },
        });
        expect(resultB.structuredContent).not.toHaveProperty('data');
      } else {
        expect(resultB.isError).toBe(false);
        expect(resultB.structuredContent?.data).toMatchObject({
          id: { workspace_id: workspaceB },
        });
      }
      expect(args).toEqual({
        resource_type: 'companies',
        record_id: record.id.record_id,
      });
    }
  );
});
