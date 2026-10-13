/**
 * Offline workerd acceptance for request-local credentials: overlapping tool
 * calls from different tenants run concurrently in one Worker isolate, each
 * reaching Attio only with its own session credential. Sequential mocks cannot
 * prove this; these calls genuinely interleave inside the Worker runtime.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Miniflare } from 'miniflare';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CompanyMockFactory } from '@test/utils/mock-factories/CompanyMockFactory.js';
import { ListMockFactory } from '@test/utils/mock-factories/ListMockFactory.js';
import {
  createWorkerHarness,
  postRpc,
  type WorkerHarness,
} from './worker-harness.js';

const tenants = {
  a: { bearer: 'session-a', token: 'attio-token-tenant-a' },
  b: { bearer: 'session-b', token: 'attio-token-tenant-b' },
  c: { bearer: 'session-c', token: 'attio-token-tenant-c' },
} as const;
type Tenant = keyof typeof tenants;
const tenantByToken = new Map(
  Object.entries(tenants).map(([name, { token }]) => [
    `Bearer ${token}`,
    name as Tenant,
  ])
);
const records = {
  a: CompanyMockFactory.create({ name: 'Tenant A company' }),
  b: CompanyMockFactory.create({ name: 'Tenant B company' }),
  c: CompanyMockFactory.create({ name: 'Tenant C company' }),
};
const ownerByRecord = new Map(
  Object.entries(records).map(([name, record]) => [
    record.id.record_id,
    name as Tenant,
  ])
);
const listId = ListMockFactory.create().id.list_id;

// Any write or delete of the process-wide credential slots throws inside the
// Worker, so a swapped environment fails the call instead of passing silently.
const environmentTrap = `
delete process.env.ATTIO_API_KEY;
delete process.env.ATTIO_ACCESS_TOKEN;
process.env.LOG_LEVEL = 'error';
const credentialSlots = new Set(['ATTIO_API_KEY', 'ATTIO_ACCESS_TOKEN']);
process.env = new Proxy(process.env, {
  set(target, name, value) {
    if (credentialSlots.has(name))
      throw new Error('process.env.' + String(name) + ' was written');
    return Reflect.set(target, name, value);
  },
  deleteProperty(target, name) {
    if (credentialSlots.has(name))
      throw new Error('process.env.' + String(name) + ' was deleted');
    return Reflect.deleteProperty(target, name);
  },
});
`;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('Worker request-local credentials under overlapping calls', () => {
  let harness: WorkerHarness;
  let worker: Miniflare;
  /** Every upstream request, attributed to the tenant whose credential it carried. */
  let upstream: Array<{ tenant: Tenant; method: string; path: string }>;
  /** Tenant whose record reads are held until the test releases them. */
  let held: { tenant: Tenant; release: ReturnType<typeof deferred> } | null;
  let failHeldRead = false;
  let heldReached = deferred();

  beforeAll(async () => {
    harness = await createWorkerHarness();
    worker = await harness.start({
      banner: environmentTrap,
      sessions: Object.fromEntries(
        Object.values(tenants).map(({ bearer, token }) => [bearer, token])
      ),
      outboundService: async (request) => {
        const url = new URL(request.url);
        expect(url.hostname).toBe('api.attio.com');
        const tenant = tenantByToken.get(
          request.headers.get('Authorization') ?? ''
        );
        if (!tenant)
          throw new Error(`Unattributed upstream credential: ${url.pathname}`);
        upstream.push({ tenant, method: request.method, path: url.pathname });

        if (url.pathname.endsWith('/attributes'))
          return Response.json({ data: [] });
        const recordMatch = url.pathname.match(
          /^\/v2\/objects\/companies\/records\/([^/]+)$/
        );
        if (request.method === 'GET' && recordMatch) {
          const owner = ownerByRecord.get(recordMatch[1]);
          // A tenant may only ever be reached with its own credential.
          expect(owner).toBe(tenant);
          if (held?.tenant === tenant) {
            heldReached.resolve();
            await held.release.promise;
            if (failHeldRead) throw new Error('Synthetic tenant A failure');
          }
          return Response.json({ data: records[owner!] });
        }
        if (
          request.method === 'POST' &&
          url.pathname === '/v2/objects/companies/records'
        ) {
          return Response.json({ data: records[tenant] });
        }
        if (
          request.method === 'POST' &&
          url.pathname === `/v2/lists/${listId}/entries/query`
        ) {
          const body = (await request.json()) as { limit?: number };
          const entries = Array.from({ length: body.limit ?? 1 }, () =>
            ListMockFactory.createListEntry(
              listId,
              records[tenant].id.record_id
            )
          );
          return Response.json({ data: entries });
        }
        throw new Error(
          `Unexpected upstream request: ${request.method} ${url.pathname}`
        );
      },
    });
  }, 150_000);

  afterAll(async () => {
    await harness?.dispose();
  });

  function reset() {
    upstream = [];
    held = null;
    failHeldRead = false;
    heldReached = deferred();
  }

  async function call(
    tenant: Tenant,
    name: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    const response = await postRpc(
      worker,
      tenants[tenant].bearer,
      'tools/call',
      {
        name,
        arguments: args,
      }
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result?: CallToolResult;
      error?: { message: string };
    };
    expect(body.error).toBeUndefined();
    return body.result!;
  }

  const readRecord = (tenant: Tenant) =>
    call(tenant, 'records_get_details', {
      resource_type: 'companies',
      record_id: records[tenant].id.record_id,
    });

  function within<T>(promise: Promise<T>, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} waited on another call`)),
          15_000
        )
      ),
    ]);
  }

  it('lets a fast tenant finish while a slow tenant is still in flight', async () => {
    reset();
    held = { tenant: 'a', release: deferred() };
    const slowA = readRecord('a');
    await within(heldReached.promise, 'tenant A upstream read');

    // Tenant A is now parked inside its Attio call. Under a global lock B
    // would queue behind it; here B's read and write must complete first.
    const fastB = await within(readRecord('b'), 'tenant B read');
    const writeB = await within(
      call('b', 'records_create', {
        resource_type: 'companies',
        record_data: { name: 'Tenant B company' },
      }),
      'tenant B write'
    );
    expect(fastB.isError).toBe(false);
    expect(fastB.structuredContent).toMatchObject({
      data: { id: records.b.id },
    });
    expect(writeB.isError).toBe(false);
    expect(writeB.structuredContent).toMatchObject({ id: records.b.id });

    held.release.resolve();
    const resultA = await slowA;
    expect(resultA.isError).toBe(false);
    expect(resultA.structuredContent).toMatchObject({
      data: { id: records.a.id },
    });
    expect(new Set(upstream.map((r) => r.tenant))).toEqual(new Set(['a', 'b']));
  });

  it('isolates a failing tenant from concurrent and later principals', async () => {
    reset();
    held = { tenant: 'a', release: deferred() };
    failHeldRead = true;
    const failingA = readRecord('a');
    await within(heldReached.promise, 'tenant A upstream read');

    const fastB = await within(readRecord('b'), 'tenant B read');
    held.release.resolve();
    const resultA = await failingA;
    expect(resultA.isError).toBe(true);
    expect(fastB.isError).toBe(false);

    // A third principal after A's failure: its own credential, never A's
    // client or a leftover process-wide credential.
    upstream = [];
    const resultC = await readRecord('c');
    expect(resultC.isError).toBe(false);
    expect(resultC.structuredContent).toMatchObject({
      data: { id: records.c.id },
    });
    expect(upstream.length).toBeGreaterThan(0);
    expect(upstream.every((r) => r.tenant === 'c')).toBe(true);
  });

  it('binds continuation cursors to the principal that was active when issued', async () => {
    reset();
    const [pageA, pageB] = await Promise.all([
      call('a', 'list_entries_list', { listId, limit: 2 }),
      call('b', 'list_entries_list', { listId, limit: 2 }),
    ]);
    const cursorA = (pageA.structuredContent as { next_cursor: string })
      .next_cursor;
    const cursorB = (pageB.structuredContent as { next_cursor: string })
      .next_cursor;
    expect(cursorA).toEqual(expect.any(String));
    expect(cursorB).toEqual(expect.any(String));

    // Concurrent replay: each tenant's own cursor continues, the other
    // tenant's cursor is refused before any upstream request.
    upstream = [];
    const [continueA, stolenByB] = await Promise.all([
      call('a', 'list_entries_list', {
        listId,
        limit: 2,
        cursor: cursorA,
      }),
      call('b', 'list_entries_list', {
        listId,
        limit: 2,
        cursor: cursorA,
      }),
    ]);
    expect(continueA.isError).toBe(false);
    expect(stolenByB.isError).toBe(true);
    expect(
      upstream.some((r) => r.tenant === 'b' && r.path.includes('/lists/'))
    ).toBe(false);
  });
});
