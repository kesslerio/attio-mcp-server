import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyMockFactory } from '@test/utils/mock-factories/CompanyMockFactory.js';
import { ListMockFactory } from '@test/utils/mock-factories/ListMockFactory.js';
import { IntegrationFixtures } from '@test/utils/integration-fixtures.js';

const token = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';
const listId = '33333333-3333-4333-8333-333333333333';

function fakeApi() {
  const records = new Map<string, unknown>();
  return {
    records,
    get: vi.fn(async (path: string): Promise<{ data: unknown }> => {
      if (!records.has(path)) throw { response: { status: 404 } };
      return { data: { data: records.get(path) } };
    }),
    delete: vi.fn(async (path: string) => {
      records.delete(path);
    }),
  };
}

const company = (name: string, id = recordId) => ({
  ...CompanyMockFactory.create({ name }),
  id: { record_id: id },
  values: {
    name: [{ value: name }],
    created_by: [
      { referenced_actor_type: 'api-token', referenced_actor_id: token },
    ],
  },
});
const path = `/objects/companies/records/${recordId}`;

describe('IntegrationFixtures ownership contract', () => {
  beforeEach(() => {
    vi.stubEnv('ATTIO_API_KEY', 'fake-contract-key');
    vi.stubEnv('WORKSPACE_API_UUID', token);
    vi.stubEnv('SKIP_INTEGRATION_TESTS', 'false');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('deletes only tracked resources after reading their exact name and creator', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    await fixtures.create('company', async (name) => {
      expect(name).toContain(token);
      const record = company(name);
      api.records.set(path, record);
      return record;
    });
    api.records.set('/unowned', company('unowned'));
    await fixtures.cleanup();
    expect(api.get).toHaveBeenCalledWith(path);
    expect(api.delete.mock.calls).toEqual([[path]]);
    expect(api.records.has('/unowned')).toBe(true);
    await fixtures.cleanup();
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it.each(['creator', 'missing creator', 'name', 'id'])(
    'refuses deletion on changed %s',
    async (mismatch) => {
      const api = fakeApi();
      const fixtures = new IntegrationFixtures(api);
      const record = await fixtures.create('company', async (name) =>
        company(name)
      );
      if (mismatch === 'creator')
        record.values.created_by[0].referenced_actor_id = listId;
      if (mismatch === 'missing creator') record.values.created_by = [];
      if (mismatch === 'name') record.values.name[0].value += '-changed';
      if (mismatch === 'id') record.id.record_id = listId;
      api.records.set(path, record);
      await expect(fixtures.cleanup()).rejects.toThrow(/ownership/);
      expect(api.delete).not.toHaveBeenCalled();
    }
  );

  it.each(['creator', 'actor type', 'name', 'id'])(
    'refuses list deletion on changed %s',
    async (mismatch) => {
      const api = fakeApi();
      const fixtures = new IntegrationFixtures(api);
      const list = await fixtures.create('list', async (name) => ({
        ...ListMockFactory.create({ name }),
        id: { list_id: listId },
        name,
        created_by_actor: { type: 'api-token', id: token },
      }));
      if (mismatch === 'creator') list.created_by_actor.id = recordId;
      if (mismatch === 'actor type')
        list.created_by_actor.type = 'workspace-member';
      if (mismatch === 'name') list.name += '-changed';
      if (mismatch === 'id') list.id.list_id = recordId;
      api.records.set(`/lists/${listId}`, list);
      await expect(fixtures.cleanup()).rejects.toThrow(/ownership/);
      expect(api.delete).not.toHaveBeenCalled();
    }
  );

  it('rejects a malformed creation ID without constructing a deletion URL', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    await expect(
      fixtures.create('company', async (name) => company(name, '../unowned'))
    ).rejects.toThrow(/valid ID/);
    await fixtures.cleanup();
    expect(api.get).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('does not treat the last updater as the creator', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    await expect(
      fixtures.create('company', async (name) => ({
        ...company(name),
        values: {
          name: [
            { value: name, created_by_actor: { type: 'api-token', id: token } },
          ],
        },
      }))
    ).rejects.toThrow(/ownership/);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('cleans up partial setup and continues past a denied deletion', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    const record = await fixtures.create('company', async (name) =>
      company(name)
    );
    record.values.name[0].value = 'changed';
    api.records.set(path, record);
    await fixtures.create('list', async (name) => {
      const list = {
        ...ListMockFactory.create({ name }),
        id: { list_id: listId },
        name,
        created_by_actor: { type: 'api-token', id: token },
      };
      api.records.set(`/lists/${listId}`, list);
      return list;
    });
    await expect(
      fixtures.create('company', async () => {
        throw new Error('setup failed');
      })
    ).rejects.toThrow('setup failed');
    await expect(fixtures.cleanup()).rejects.toThrow(/ownership/);
    expect(api.delete.mock.calls).toEqual([[`/lists/${listId}`]]);
  });

  it('treats an already absent tracked fixture as cleaned', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    await fixtures.create('company', async (name) => company(name));
    await fixtures.cleanup();
    expect(api.delete).not.toHaveBeenCalled();
    await fixtures.cleanup();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('surfaces read and delete failures and retains ownership for retry', async () => {
    const api = fakeApi();
    const fixtures = new IntegrationFixtures(api);
    const record = await fixtures.create('company', async (name) =>
      company(name)
    );
    api.records.set(path, record);
    api.get.mockRejectedValueOnce(new Error('read failed'));
    await expect(fixtures.cleanup()).rejects.toThrow(/cleanup/);
    expect(api.delete).not.toHaveBeenCalled();
    api.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expect(fixtures.cleanup()).rejects.toThrow(/cleanup/);
    await fixtures.cleanup();
    expect(api.records.size).toBe(0);
  });

  it.each(['company', 'list'] as const)(
    'waits for pending %s creation and denies later writes during cleanup',
    async (kind) => {
      const api = fakeApi();
      const fixtures = new IntegrationFixtures(api);
      let finish!: () => void;
      const deferred = new Promise<void>((resolve) => { finish = resolve; });
      const creation = fixtures.create(kind, async (name) => {
        await deferred;
        const record = kind === 'company' ? company(name) : {
          ...ListMockFactory.create({ name }),
          id: { list_id: listId },
          name,
          created_by_actor: { type: 'api-token', id: token },
        };
        api.records.set(kind === 'company' ? path : `/lists/${listId}`, record);
        return record;
      });
      const cleanup = fixtures.cleanup();
      const laterWrite = vi.fn();
      await expect(fixtures.create(kind, laterWrite)).rejects.toThrow(/cleanup/);
      expect(api.delete).not.toHaveBeenCalled();
      finish();
      await creation;
      await cleanup;
      expect(api.records.size).toBe(0);
      await expect(fixtures.create(kind, laterWrite)).rejects.toThrow(/cleanup/);
      expect(laterWrite).not.toHaveBeenCalled();
    }
  );

  it('derives the workspace token actor before creation without another secret', async () => {
    vi.stubEnv('WORKSPACE_API_UUID', '');
    const api = fakeApi();
    api.records.set('/self', {
      active: true, token_level: 'workspace', client_id: token, aud: token,
      workspace_id: listId, authorized_by_workspace_member_id: recordId,
    });
    api.get.mockImplementation(async (request) => ({ data: request === '/self'
      ? api.records.get(request) : { data: api.records.get(request) } }));
    const fixtures = new IntegrationFixtures(api);
    await fixtures.create('company', async (name) => {
      expect(api.get).toHaveBeenCalledWith('/self');
      expect(name).toContain(token);
      const record = company(name);
      api.records.set(path, record);
      return record;
    });
    await fixtures.cleanup();
    expect(api.delete).toHaveBeenCalledWith(path);
  });

  it.each([
    { active: false },
    { active: true, token_level: 'workspace', client_id: 'invalid', aud: 'invalid' },
    { active: true, token_level: 'workspace', client_id: token, aud: listId },
    { active: true, token_level: 'app', client_id: token, aud: token },
  ])('denies writes for unresolvable identity %j', async (identity) => {
    vi.stubEnv('WORKSPACE_API_UUID', '');
    const api = fakeApi();
    api.get.mockResolvedValue({ data: identity });
    const fixtures = new IntegrationFixtures(api);
    const write = vi.fn();
    await expect(fixtures.create('company', write)).rejects.toThrow(/actor UUID/);
    await fixtures.cleanup();
    expect(write).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('denies creation when cleanup starts during identity resolution', async () => {
    vi.stubEnv('WORKSPACE_API_UUID', '');
    const api = fakeApi();
    let finish!: (value: { data: unknown }) => void;
    api.get.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const fixtures = new IntegrationFixtures(api);
    const write = vi.fn();
    const creation = fixtures.create('company', write);
    const denied = expect(creation).rejects.toThrow(/cleanup/);
    const cleanup = fixtures.cleanup();
    finish({ data: { active: true, token_level: 'workspace', client_id: token, aud: token } });
    await denied;
    await cleanup;
    expect(write).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('uses a unique run marker even with the same token', async () => {
    const first = new IntegrationFixtures(fakeApi());
    const second = new IntegrationFixtures(fakeApi());
    const a = await first.create('company', async (name) => company(name));
    const b = await second.create('company', async (name) => company(name));
    expect(a.values.name[0].value).not.toBe(b.values.name[0].value);
  });

  it.each([
    ['ATTIO_API_KEY', ''],
    ['ATTIO_API_KEY', ' '],
    ['WORKSPACE_API_UUID', 'invalid'],
    ['SKIP_INTEGRATION_TESTS', 'true'],
  ])('rejects %s=%s before any API operation', (key, value) => {
    vi.stubEnv(key, value);
    const api = fakeApi();
    expect(() => new IntegrationFixtures(api)).toThrow();
    expect(api.get).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
