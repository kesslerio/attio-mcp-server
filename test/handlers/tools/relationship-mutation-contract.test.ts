import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/index.js';

describe('legacy relationship mutation contracts', () => {
  let registerToolHandlers: typeof import('@/handlers/tools/index.js')['registerToolHandlers'];
  let configs: typeof import('@/handlers/tool-configs/relationships/index.js')['relationshipToolConfigs'];
  let client: Client;
  let server: Server;

  beforeAll(async () => {
    vi.stubEnv('DISABLE_UNIVERSAL_TOOLS', 'true');
    vi.resetModules();
    ({ registerToolHandlers } = await import('@/handlers/tools/index.js'));
    ({ relationshipToolConfigs: configs } =
      await import('@/handlers/tool-configs/relationships/index.js'));
  });

  beforeEach(async () => {
    vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
    server = new Server(
      { name: 'legacy-relationships', version: '1' },
      { capabilities: { tools: {} } }
    );
    registerToolHandlers(server);
    client = new Client({ name: 'relationship-client', version: '1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(['linkPersonToCompany', 'unlinkPersonFromCompany'] as const)(
    'publishes %s as a write and reports uncertain failures as nonretryable',
    async (key) => {
      const config = configs[key];
      const { tools } = await client.listTools();
      expect(tools.find((tool) => tool.name === config.name)?.annotations)
        .toMatchObject({ readOnlyHint: false });
      const handler = vi.spyOn(config, 'handler').mockRejectedValue(
        Object.assign(new Error('Relationship update timeout'), { code: 'ECONNABORTED' })
      );
      const id = CompanyMockFactory.create().id.record_id;
      const result = await client.callTool({
        name: config.name,
        arguments: { personId: id, companyId: id },
      });
      expect(result).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'UPSTREAM_UNAVAILABLE',
            retryable: false,
            message: expect.stringContaining('Completion may be uncertain'),
          },
        },
      });
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  it.each(['linkPersonToCompany', 'unlinkPersonFromCompany'] as const)(
    'executes allowed %s calls and denies them after a mode change',
    async (key) => {
      const config = configs[key];
      const id = CompanyMockFactory.create().id.record_id;
      const handler = vi.spyOn(config, 'handler').mockResolvedValue({
        success: true, message: 'Relationship updated', personId: id, companyId: id,
      });
      const args = { personId: id, companyId: id };
      expect(await client.callTool({ name: config.name, arguments: args }))
        .toMatchObject({ isError: false });
      expect(handler).toHaveBeenCalledOnce();
      handler.mockClear();
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'search');
      expect((await client.listTools()).tools.map((tool) => tool.name))
        .not.toContain(config.name);
      expect(await client.callTool({ name: config.name, arguments: args }))
        .toMatchObject({
          isError: true,
          structuredContent: { error: { code: 'PERMISSION_DENIED', retryable: false } },
        });
      expect(handler).not.toHaveBeenCalled();
      vi.stubEnv('ATTIO_MCP_TOOL_MODE', 'full');
      expect(await client.callTool({ name: config.name, arguments: args }))
        .toMatchObject({ isError: false });
      expect(handler).toHaveBeenCalledOnce();
    }
  );

  it.each(['getPersonCompanies', 'getCompanyTeam'] as const)(
    'retains retryable read failures and successful %s calls',
    async (key) => {
      const config = configs[key];
      expect((await client.listTools()).tools.find((tool) => tool.name === config.name)?.annotations)
        .toMatchObject({ readOnlyHint: true });
      const handler = vi.spyOn(config, 'handler').mockRejectedValueOnce(
        Object.assign(new Error('Relationship read timeout'), { code: 'ECONNABORTED' })
      ).mockResolvedValueOnce([]);
      const id = CompanyMockFactory.create().id.record_id;
      const args = key === 'getPersonCompanies' ? { personId: id } : { companyId: id };
      expect(await client.callTool({ name: config.name, arguments: args }))
        .toMatchObject({
          isError: true,
          structuredContent: { error: { code: 'UPSTREAM_UNAVAILABLE', retryable: true } },
        });
      expect(await client.callTool({ name: config.name, arguments: args }))
        .toMatchObject({ isError: false });
      expect(handler).toHaveBeenCalledTimes(2);
    }
  );
});
