import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { registerResourceHandlers } from '@/handlers/resources.js';
import { getLazyAttioClient } from '@/api/lazy-client.js';
import * as attioClient from '@/api/attio-client.js';
import { DEFAULT_RETRY_CONFIG } from '@/api/operations/retry.js';
import { resourceFailure } from '@/handlers/resource-errors.js';
import * as listOperations from '@/objects/lists.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/CompanyMockFactory.js';
import { PersonMockFactory } from '@test/utils/mock-factories/PersonMockFactory.js';
import { ListMockFactory } from '@test/utils/mock-factories/ListMockFactory.js';

// Keep the SDK, resource handlers, domain operations and response decoders real.
// The shared test setup supplies the HTTP client; no live CRM calls occur.
vi.hoisted(() => vi.resetModules());
vi.unmock('@/objects/companies/index.js');
vi.unmock('@/objects/people/index.js');

describe('resource protocol boundary', () => {
  let client: Client;
  let server: Server;
  let wire: unknown[];
  const company = CompanyMockFactory.create();
  const person = PersonMockFactory.create();
  const list = ListMockFactory.create();
  const retryDelay = DEFAULT_RETRY_CONFIG.initialDelay;

  beforeEach(async () => {
    const api = getLazyAttioClient();
    vi.spyOn(attioClient, 'createAttioClient').mockReturnValue(api);
    DEFAULT_RETRY_CONFIG.initialDelay = 0;
    server = new Server(
      { name: 'resource-test', version: '1' },
      { capabilities: { resources: {} } }
    );
    registerResourceHandlers(server);
    client = new Client({ name: 'resource-client', version: '1' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    wire = [];
    for (const transport of [clientTransport, serverTransport]) {
      const send = transport.send.bind(transport);
      vi.spyOn(transport, 'send').mockImplementation((message, options) => {
        const serialized = JSON.parse(JSON.stringify(message));
        if (transport === serverTransport) wire.push(serialized);
        return send(serialized, options);
      });
    }
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
    DEFAULT_RETRY_CONFIG.initialDelay = retryDelay;
  });

  function emptyCatalog() {
    const api = getLazyAttioClient();
    vi.spyOn(api, 'post').mockResolvedValue({ data: { data: [] } });
    vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
    return api;
  }

  async function protocolFailure(operation: Promise<unknown>, code: number) {
    await expect(operation).rejects.toMatchObject({ code });
    const response = wire.at(-1) as Record<string, unknown>;
    expect(response).toHaveProperty('error');
    expect(response).not.toHaveProperty('result');
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('private-upstream-detail');
    expect(serialized).not.toContain('isError');
    expect(serialized).not.toContain('secret-token');
  }

  it.each([
    ['companies', company.id.record_id, company],
    ['people', person.id.record_id, person],
    ['lists', list.id.list_id, list],
  ])(
    'preserves authorized %s resource URIs and JSON contents',
    async (type, id, record) => {
      vi.spyOn(getLazyAttioClient(), 'get').mockResolvedValue({
        data: { data: record },
      });
      const uri = `attio://${type}/${id}`;
      const result = await client.readResource({ uri });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri,
        mimeType: 'application/json',
      });
      expect(JSON.parse(result.contents[0].text as string)).toMatchObject({
        id: { [type === 'lists' ? 'list_id' : 'record_id']: id },
      });
    }
  );

  it.each([
    'invalid-private-upstream-detail',
    'attio://unknown/id',
    'attio://people/',
    'attio://people/../companies/id',
    'attio://people/id?secret-token',
    'attio://people/id#secret-token',
    'attio://people/%2e%2e',
    'attio://people/..',
    'attio://notes/id',
  ])(
    'rejects malformed or unsupported URI %s before upstream work',
    async (uri) => {
      const api = emptyCatalog();
      await protocolFailure(
        client.readResource({ uri }),
        ErrorCode.InvalidParams
      );
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    }
  );

  it.each(['companies', 'people', 'lists'])(
    'maps missing %s to a legacy resource protocol error',
    async (type) => {
      vi.spyOn(getLazyAttioClient(), 'get').mockRejectedValue({
        response: { status: 404, data: { message: 'private-upstream-detail' } },
      });
      await protocolFailure(
        client.readResource({ uri: `attio://${type}/${company.id.record_id}` }),
        -32002
      );
    }
  );

  it.each(['companies', 'people', 'lists'])(
    'sanitizes denied %s reads',
    async (type) => {
      vi.spyOn(getLazyAttioClient(), 'get').mockRejectedValue({
        response: { status: 403, data: { message: 'private-upstream-detail' } },
      });
      await protocolFailure(
        client.readResource({ uri: `attio://${type}/${company.id.record_id}` }),
        ErrorCode.InternalError
      );
    }
  );

  it('returns a successful genuinely empty catalog', async () => {
    emptyCatalog();
    expect(await client.listResources()).toEqual({ resources: [] });
  });

  it('lists a complete small catalog with usable existing URIs', async () => {
    const api = emptyCatalog();
    vi.mocked(api.post).mockImplementation(async (path) => ({
      data: { data: [String(path).includes('companies') ? company : person] },
    }));
    vi.mocked(api.get).mockResolvedValue({ data: { data: [list] } });
    const result = await client.listResources();
    expect(result.resources.map(({ uri }) => uri)).toEqual([
      `attio://companies/${company.id.record_id}`,
      `attio://people/${person.id.record_id}`,
      `attio://lists/${list.id.list_id}`,
    ]);
    expect(result).not.toHaveProperty('nextCursor');
  });

  it.each(['companies', 'people', 'lists'])(
    'fails catalog discovery on a %s outage',
    async (type) => {
      const api = emptyCatalog();
      const outage = {
        response: { status: 503, data: { message: 'private-upstream-detail' } },
      };
      vi.mocked(api.post).mockImplementation(async (path) => {
        if (String(path).includes(type)) throw outage;
        return { data: { data: [company] } };
      });
      if (type === 'lists') vi.mocked(api.get).mockRejectedValue(outage);
      await protocolFailure(client.listResources(), ErrorCode.InternalError);
    }
  );

  it.each(['companies', 'people', 'lists'])(
    'returns sanitized protocol errors for a %s read outage',
    async (type) => {
      vi.spyOn(getLazyAttioClient(), 'get').mockRejectedValue({
        response: { status: 503, data: { message: 'private-upstream-detail' } },
      });
      await protocolFailure(
        client.readResource({ uri: `attio://${type}/${company.id.record_id}` }),
        ErrorCode.InternalError
      );
    }
  );

  it.each(['', 'unsupported-cursor'])(
    'rejects unsupported cursor %j before upstream work',
    async (cursor) => {
      const api = emptyCatalog();
      await protocolFailure(
        client.listResources({ cursor }),
        ErrorCode.InvalidParams
      );
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    }
  );

  it.each([true, undefined])(
    'rejects list results without confirmed completeness (%s)',
    async (truncated) => {
      emptyCatalog();
      const lists = Object.assign([list], { truncated });
      vi.spyOn(listOperations, 'getLists').mockResolvedValue(lists);
      await protocolFailure(client.listResources(), ErrorCode.InternalError);
    }
  );

  it('accepts a confirmed complete lists response even when it exceeds the record page cap', async () => {
    const api = emptyCatalog();
    const lists = ListMockFactory.createMultiple(21);
    vi.mocked(api.get).mockResolvedValue({ data: { data: lists } });
    const result = await client.listResources();
    expect(result.resources).toHaveLength(21);
    expect(result).not.toHaveProperty('nextCursor');
  });

  it.each(['companies', 'people', 'lists'])(
    'fails the whole catalog when %s is denied',
    async (type) => {
      const api = emptyCatalog();
      const denied = {
        response: { status: 403, data: { message: 'private-upstream-detail' } },
      };
      vi.mocked(api.post).mockImplementation(async (path) => {
        if (String(path).includes(type)) throw denied;
        return { data: { data: [company] } };
      });
      if (type === 'lists') vi.mocked(api.get).mockRejectedValue(denied);
      await protocolFailure(client.listResources(), ErrorCode.InternalError);
    }
  );

  it.each(['companies', 'people'])(
    'does not claim exhaustion from a full %s page',
    async (type) => {
      const api = emptyCatalog();
      vi.mocked(api.post).mockImplementation(async (path, body) => ({
        data: {
          data: String(path).includes(type)
            ? Array.from({ length: body.limit }, () => company)
            : [],
        },
      }));
      await protocolFailure(client.listResources(), ErrorCode.InternalError);
    }
  );

  it('does not turn an invalid company response into an empty catalog', async () => {
    const api = emptyCatalog();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    await protocolFailure(client.listResources(), ErrorCode.InternalError);
  });

  it('sanitizes upstream protocol-shaped exceptions too', async () => {
    vi.spyOn(getLazyAttioClient(), 'get').mockRejectedValue(
      new McpError(ErrorCode.InvalidParams, 'private-upstream-detail', {
        token: 'secret-token',
      })
    );
    await protocolFailure(
      client.readResource({ uri: `attio://lists/${list.id.list_id}` }),
      ErrorCode.InternalError
    );
  });

  it('retains the internal cause without serializing it into protocol data', () => {
    const cause = new Error('private-upstream-detail');
    const error = resourceFailure(cause, 'read');
    expect(error).toBeInstanceOf(McpError);
    expect(error.cause).toBe(cause);
    expect(error.data).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('private-upstream-detail');
  });
});
