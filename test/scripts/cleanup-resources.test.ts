/**
 * Unit tests for the cleanup script's first-class resource support (#620):
 * notes/lists must use dedicated endpoints, never /objects/{slug}/records.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';

import {
  fetchAllNotes,
  fetchNotesByCreator,
} from '../../scripts/cleanup/fetchers/notes.js';
import {
  fetchAllLists,
  fetchListsByCreator,
  normalizeListResponse,
} from '../../scripts/cleanup/fetchers/lists.js';
import { isCreatedOrUpdatedByApiToken } from '../../scripts/cleanup/filters/creator-filter.js';
import { batchDeleteRecords } from '../../scripts/cleanup/deleters/batch-deleter.js';
import { AttioRecord } from '../../scripts/cleanup/core/types.js';
import {
  ListMockFactory,
  CompanyMockFactory,
} from '../../test/utils/mock-factories/index.js';

const TOKEN = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function mockClient(overrides: Partial<AxiosInstance> = {}): AxiosInstance {
  return {
    get: vi.fn().mockResolvedValue({ status: 200, data: { data: [] } }),
    post: vi.fn().mockResolvedValue({ status: 200, data: { data: [] } }),
    delete: vi.fn().mockResolvedValue({ status: 204, data: {} }),
    ...overrides,
  } as unknown as AxiosInstance;
}

const deletionOptions = {
  parallel: 2,
  rateLimit: 0,
  dryRun: false,
  continueOnError: true,
};

describe('cleanup notes fetcher (#620)', () => {
  it('queries GET /notes with parent scope filters — never the objects endpoint', async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: { data: [{ id: { note_id: 'note_1' }, title: 'Test note' }] },
      }),
    });

    const result = await fetchAllNotes(client, {
      parent_object: 'companies',
      parent_record_id: 'rec_1',
    });

    const clientGet = client.get as ReturnType<typeof vi.fn>;
    expect(clientGet).toHaveBeenCalledTimes(1);
    const [path, config] = clientGet.mock.calls[0];
    expect(path).toBe('/notes');
    expect(config.params).toMatchObject({
      limit: 100,
      offset: 0,
      parent_object: 'companies',
      parent_record_id: 'rec_1',
    });
    expect(result.records).toHaveLength(1);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('paginates while full pages return, stopping at a short page', async () => {
    const fullPage = Array.from({ length: 2 }, (_, i) => ({
      id: { note_id: `note_${i}` },
    }));
    const client = mockClient({
      get: vi
        .fn()
        .mockResolvedValueOnce({ status: 200, data: { data: fullPage } })
        .mockResolvedValueOnce({
          status: 200,
          data: { data: [{ id: { note_id: 'note_last' } }] },
        }),
    });

    const result = await fetchAllNotes(
      client,
      { parent_object: 'companies', parent_record_id: 'rec_1' },
      { pageSize: 2, rateLimit: 0 }
    );

    const clientGet = client.get as ReturnType<typeof vi.fn>;
    expect(clientGet).toHaveBeenCalledTimes(2);
    expect(clientGet.mock.calls[1][1].params).toMatchObject({ offset: 2 });
    expect(result.records).toHaveLength(3);
    expect(result.hasMore).toBe(false);
  });

  it('filters fetched notes by api-token creator', async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: { note_id: 'note_mine' },
              creator: { id: TOKEN, type: 'api-token' },
            },
            {
              id: { note_id: 'note_theirs' },
              creator: { id: 'other', type: 'workspace-member' },
            },
            { id: { note_id: 'note_nocreator' } },
          ],
        },
      }),
    });

    const result = await fetchNotesByCreator(client, TOKEN, {
      parent_object: 'companies',
      parent_record_id: 'rec_1',
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].id.note_id).toBe('note_mine');
  });
});

describe('cleanup lists fetcher (#620)', () => {
  it('queries GET /lists — never /objects/lists/records/query', async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: { data: [ListMockFactory.create({ name: 'Test List' })] },
      }),
    });

    const result = await fetchAllLists(client);

    const clientGet = client.get as ReturnType<typeof vi.fn>;
    expect(clientGet).toHaveBeenCalledTimes(1);
    expect(clientGet.mock.calls[0][0]).toBe('/lists');
    expect(result.records).toHaveLength(1);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('normalizes list, items, and wrapped payloads', () => {
    const list = { id: { list_id: 'list_a' }, name: 'A' };
    expect(normalizeListResponse({ data: [list] })).toEqual([list]);
    expect(normalizeListResponse({ data: { data: [list] } })).toEqual([list]);
    expect(normalizeListResponse({ data: { lists: [list] } })).toEqual([list]);
    expect(normalizeListResponse({ data: { items: [list] } })).toEqual([list]);
    expect(normalizeListResponse(null)).toEqual([]);
    expect(normalizeListResponse({ data: { nope: true } })).toEqual([]);
  });

  it('excludes lists whose creator cannot be attributed to the api token', async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: {
          data: [
            {
              id: { list_id: 'list_mine' },
              created_by_actor: { type: 'api-token', id: TOKEN },
            },
            { id: { list_id: 'list_ui' } },
          ],
        },
      }),
    });

    const result = await fetchListsByCreator(client, TOKEN);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].id.list_id).toBe('list_mine');
  });
});

describe('creator filter shapes', () => {
  it('accepts root created_by_actor, values.created_by, and note creator shapes', () => {
    expect(
      isCreatedOrUpdatedByApiToken(
        { created_by_actor: { type: 'api-token', id: TOKEN } },
        TOKEN
      )
    ).toBe(true);
    expect(
      isCreatedOrUpdatedByApiToken(
        {
          values: {
            created_by: [
              {
                referenced_actor_type: 'api-token',
                referenced_actor_id: TOKEN,
              },
            ],
          },
        },
        TOKEN
      )
    ).toBe(true);
    expect(
      isCreatedOrUpdatedByApiToken(
        { creator: { type: 'api-token', id: TOKEN } },
        TOKEN
      )
    ).toBe(true);
    // SAFETY: no creator info → never match
    expect(isCreatedOrUpdatedByApiToken({}, TOKEN)).toBe(false);
    expect(
      isCreatedOrUpdatedByApiToken(
        { creator: { type: 'workspace-member', id: 'u1' } },
        TOKEN
      )
    ).toBe(false);
  });
});

describe('notes pipeline pagination (#620 review)', () => {
  it('a short final page reports hasMore false even when it lands on maxPages', async () => {
    const client = mockClient({
      get: vi.fn().mockResolvedValue({
        status: 200,
        data: { data: [{ id: { note_id: 'note_short' } }] },
      }),
    });

    const result = await fetchAllNotes(
      client,
      { parent_object: 'companies', parent_record_id: 'rec_1' },
      { pageSize: 100, maxPages: 1, rateLimit: 0 }
    );

    expect(result.hasMore).toBe(false);
    expect(result.records).toHaveLength(1);
  });

  it('offset-only pagination: no cursor param is ever sent', async () => {
    const full = [{ id: { note_id: 'n1' } }, { id: { note_id: 'n2' } }];
    const client = mockClient({
      get: vi
        .fn()
        .mockResolvedValueOnce({ status: 200, data: { data: full } })
        .mockResolvedValueOnce({
          status: 200,
          data: { data: [{ id: { note_id: 'n3' } }] },
        }),
    });

    await fetchAllNotes(
      client,
      { parent_object: 'companies', parent_record_id: 'rec_1' },
      { pageSize: 2, rateLimit: 0 }
    );

    const clientGet = client.get as ReturnType<typeof vi.fn>;
    for (const call of clientGet.mock.calls) {
      expect(call[1].params).not.toHaveProperty('cursor');
    }
    expect(clientGet.mock.calls[1][1].params.offset).toBe(2);
  });
});

describe('batch deleter endpoints (#620)', () => {
  it('deletes lists via DELETE /lists/{id}', async () => {
    const client = mockClient();
    const list = ListMockFactory.create({ name: 'Test List' });
    await batchDeleteRecords(
      client,
      [list as unknown as AttioRecord],
      'lists',
      deletionOptions
    );
    expect(client.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^\/lists\/[0-9a-f-]+$/)
    );
  });

  it('deletes notes via DELETE /notes/{id}', async () => {
    const client = mockClient();
    await batchDeleteRecords(
      client,
      [{ id: { note_id: 'note_1' }, title: 'Test note' }],
      'notes',
      deletionOptions
    );
    expect(client.delete).toHaveBeenCalledWith('/notes/note_1');
  });

  it('still deletes standard objects via the objects API', async () => {
    const client = mockClient();
    const company = CompanyMockFactory.create({ name: 'Test Co' });
    await batchDeleteRecords(
      client,
      [company as unknown as AttioRecord],
      'companies',
      deletionOptions
    );
    expect(client.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^\/objects\/companies\/records\/[0-9a-f-]+$/)
    );
  });

  it('does not call the API during dry runs', async () => {
    const client = mockClient();
    const result = await batchDeleteRecords(
      client,
      [{ id: { note_id: 'note_1' }, title: 'Test note' }],
      'notes',
      { ...deletionOptions, dryRun: true }
    );
    expect(client.delete).not.toHaveBeenCalled();
    expect(result.successful).toBe(1);
  });
});
