/** Offline workerd acceptance: real Worker, built core, mocked Attio HTTP only. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/CompanyMockFactory.js';
import {
  createWorkerHarness,
  postRpc,
  type WorkerHarness,
} from './worker-harness.js';

const company = CompanyMockFactory.create({ name: 'Worker fixture' });
const recordId = company.id.record_id;
const bearer = 'fixture-session';
const attioToken = 'fixture-attio-token';

type Rpc = {
  result?: CallToolResult & { tools: Tool[] };
  error?: { code: number };
};

describe('Worker serialized structured results', () => {
  let harness: WorkerHarness;
  let writes = 0;
  let requests = 0;
  let loseWriteResponse: false | 'invalid-json' | 'disconnect' = false;

  beforeAll(async () => {
    harness = await createWorkerHarness();
  }, 150_000);

  afterAll(async () => {
    await harness?.dispose();
  });

  function start(text = true, mode = 'full') {
    return harness.start({
      banner: `${text ? 'delete process.env.MCP_TEXT_RESULTS' : "process.env.MCP_TEXT_RESULTS = 'false'"}; process.env.ATTIO_MCP_TOOL_MODE = ${JSON.stringify(mode)}; process.env.LOG_LEVEL = 'error';`,
      sessions: { [bearer]: attioToken },
      outboundService: async (request) => {
        requests++;
        expect(request.headers.get('Authorization')).toBe(
          `Bearer ${attioToken}`
        );
        const url = new URL(request.url);
        expect(url.hostname).toBe('api.attio.com');
        if (
          request.method === 'POST' &&
          url.pathname === '/v2/objects/companies/records'
        ) {
          writes++;
          if (loseWriteResponse === 'invalid-json')
            return new Response('response lost after write', { status: 200 });
          if (loseWriteResponse === 'disconnect')
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.error(
                    new Error('Synthetic response disconnect after commit')
                  );
                },
              })
            );
          return Response.json({ data: company });
        }
        if (
          request.method === 'GET' &&
          url.pathname === `/v2/objects/companies/records/${recordId}`
        ) {
          return Response.json({ data: company });
        }
        if (url.pathname.endsWith('/attributes'))
          return Response.json({ data: [] });
        throw new Error(
          `Unexpected upstream request: ${request.method} ${url.pathname}`
        );
      },
    });
  }

  async function rpc(
    worker: Miniflare,
    method: string,
    params = {}
  ): Promise<Rpc> {
    // Use the listening HTTP socket, including real JSON encode/decode on both sides.
    const response = await postRpc(worker, bearer, method, params);
    expect(response.status).toBe(200);
    expect(response.headers.get('MCP-Protocol-Version')).toBe('2024-11-05');
    return response.json();
  }

  async function call(
    worker: Miniflare,
    name: string,
    args: Record<string, unknown>
  ) {
    const response = await rpc(worker, 'tools/call', { name, arguments: args });
    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    return response.result!;
  }

  async function validate(
    worker: Miniflare,
    name: string,
    result: CallToolResult
  ) {
    const discovery = await rpc(worker, 'tools/list');
    const tool = discovery.result!.tools.find((item) => item.name === name)!;
    expect(tool.outputSchema).toBeDefined();
    const validator = new AjvJsonSchemaValidator().getValidator(
      tool.outputSchema!
    );
    expect(validator(result.structuredContent)).toMatchObject({ valid: true });
  }

  it.each([true, false])(
    'preserves read/write machine data with prose enabled=%s',
    async (text) => {
      const worker = await start(text);
      const read = await call(worker, 'records_get_details', {
        resource_type: 'companies',
        record_id: recordId,
      });
      expect(read.isError).toBe(false);
      await validate(worker, 'records_get_details', read);
      expect(read.structuredContent).toMatchObject({
        data: {
          id: company.id,
          values: { ...company.values, name: 'Worker fixture' },
        },
      });
      expect(JSON.parse(read.content[0].text as string)).toEqual(
        read.structuredContent
      );
      expect(read.content.length).toBe(text ? 2 : 1);

      const before = writes;
      const write = await call(worker, 'records_create', {
        resource_type: 'companies',
        record_data: { name: 'Worker fixture' },
      });
      expect(write.isError).toBe(false);
      await validate(worker, 'records_create', write);
      expect(write.structuredContent).toMatchObject({ id: company.id });
      expect(writes).toBe(before + 1);
    }
  );

  it.each([true, false])(
    'preserves connector content with prose enabled=%s',
    async (text) => {
      const worker = await start(text);
      const result = await call(worker, 'fetch', {
        id: `companies:${recordId}`,
      });
      expect(result.isError).toBe(false);
      await validate(worker, 'fetch', result);
      expect(result.content.length).toBeGreaterThanOrEqual(1);
      if (!text) expect(result.content).toHaveLength(1);
      expect(JSON.parse(result.content[0].text as string)).toEqual(
        result.structuredContent!.data
      );
    }
  );

  it('keeps execution denial nonretryable and protocol failures separate', async () => {
    const worker = await start(false, 'search');
    const before = requests;
    const denied = await call(worker, 'records_create', {
      resource_type: 'companies',
      record_data: { name: 'Denied' },
    });
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent).toMatchObject({
      error: { code: 'PERMISSION_DENIED', retryable: false },
    });
    expect(requests).toBe(before);
    const malformed = await rpc(worker, 'tools/call');
    expect(malformed.result).toBeUndefined();
    expect(malformed.error?.code).toBe(-32602);
  });

  it.each(['invalid-json', 'disconnect'] as const)(
    'retains uncertain write errors without replay after %s',
    async (failure) => {
      const worker = await start(false);
      const before = writes;
      loseWriteResponse = failure;
      try {
        const result = await call(worker, 'records_create', {
          resource_type: 'companies',
          record_data: { name: 'Worker fixture' },
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: { code: 'UPSTREAM_UNAVAILABLE', retryable: false },
        });
        expect(JSON.stringify(result.structuredContent)).toContain('Read back');
        expect(writes).toBe(before + 1);
      } finally {
        loseWriteResponse = false;
      }
    }
  );
});
