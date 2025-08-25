/**
 * Type definitions for test utilities and mocks
 */
import type { MockedFunction } from 'vitest';
import { vi } from 'vitest';

export interface MockApiClient {
  post: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  get: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  put: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  patch: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  delete: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  // Additional AxiosInstance properties for compatibility
  defaults?: Record<string, unknown>;
  interceptors?: Record<string, unknown>;
  getUri?: MockedFunction<(...args: unknown[]) => string>;
  request?: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  head?: MockedFunction<(...args: unknown[]) => Promise<unknown>>;
}

export interface MockApiResponse<T = unknown> {
  data: {
    data: T[];
  };
}

export interface MockCompanyUpdate {
  industry?: string;
  categories?: string | string[];
  [key: string]: unknown;
}

export interface TestCompanyData {
  name: string;
  industry?: string;
  categories?: string | string[];
  [key: string]: unknown;
}

export interface TestMockRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export function createMockApiClient(): MockApiClient {
  // in-memory fake DB for lists
  const lists = new Map<string, any>();

  const shapeList = (raw: any = {}) => {
    const list_id =
      typeof raw?.id?.list_id === 'string'
        ? raw.id.list_id
        : typeof raw?.list_id === 'string'
          ? raw.list_id
          : (globalThis.crypto?.randomUUID?.() ?? `mock_${Date.now()}`);
    return {
      id: { list_id },
      name: raw.name ?? raw.title ?? 'Untitled List',
      description: raw.description ?? '',
      object_slug: raw.object_slug ?? 'companies',
      title: raw.name ?? raw.title ?? 'Untitled List',
      ...raw,
    };
  };

  // Pre-populate test list
  const testListId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  lists.set(
    testListId,
    shapeList({
      id: { list_id: testListId },
      name: 'Test List',
      title: 'Test List',
      description: 'Test list for API testing',
      object_slug: 'companies',
    })
  );

  return {
    get: vi.fn(async (path: string) => {
      // Handle "get list by id/slug"
      if (path.startsWith('/v2/lists/')) {
        const listId = path.split('/v2/lists/')[1].split('?')[0];
        const found = lists.get(listId);
        if (!found) {
          const err: any = new Error('Record not found');
          err.response = {
            status: 404,
            data: { error: { code: 'not_found' } },
          };
          throw err;
        }
        return { status: 200, data: { data: found } };
      }

      // Handle "list all lists" (with or without querystring)
      if (path.startsWith('/v2/lists')) {
        const allLists = Array.from(lists.values());
        return {
          status: 200,
          data: {
            data: [
              {
                id: {
                  list_id: '11111111-1111-4111-a111-111111111111',
                  workspace_id: 'ws-1',
                },
                name: 'Companies - All',
              },
              {
                id: {
                  list_id: '22222222-2222-4222-a222-222222222222',
                  workspace_id: 'ws-1',
                },
                name: 'People - Prospects',
              },
              ...allLists,
            ],
          },
        };
      }

      // Legacy list paths for backward compatibility
      if (path.startsWith('/lists/')) {
        const id = path.split('/')[2];
        const found = lists.get(id);
        if (!found) {
          const err: any = new Error('Record not found');
          err.response = {
            status: 404,
            data: { error: { code: 'not_found' } },
          };
          throw err;
        }
        return { status: 200, data: { data: found } };
      }

      // default ok
      return { status: 200, data: { data: {} } };
    }),

    post: vi.fn(async (path: string, payload?: any) => {
      // Handle company record creation
      if (path === '/v2/objects/companies/records') {
        const record_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        return {
          status: 201,
          data: {
            data: {
              id: { workspace_id: 'ws-1', object_id: 'companies', record_id },
              values: payload?.values || {},
            },
          },
        };
      }

      // Handle company record query/search
      if (path === '/v2/objects/companies/records/query') {
        return {
          status: 200,
          data: {
            data: [
              {
                id: {
                  workspace_id: 'ws-1',
                  object_id: 'companies',
                  record_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                },
                values: { name: [{ value: 'Test Company' }] },
              },
            ],
          },
        };
      }

      // Handle v2 lists creation
      if (path === '/v2/lists') {
        const shaped = shapeList(payload?.data ?? {});
        lists.set(shaped.id.list_id, shaped);
        return { status: 201, data: { data: shaped } };
      }

      // Legacy lists creation
      if (path === '/lists') {
        const shaped = shapeList(payload?.data ?? {});
        lists.set(shaped.id.list_id, shaped);
        return { status: 201, data: { data: shaped } };
      }

      return { status: 200, data: { data: {} } };
    }),

    put: vi.fn(),
    patch: vi.fn(),

    delete: vi.fn(async (path: string) => {
      if (path.startsWith('/lists/')) {
        const id = path.split('/')[2];
        if (!lists.has(id)) {
          const err: any = new Error('Record not found');
          err.response = {
            status: 404,
            data: { error: { code: 'not_found' } },
          };
          throw err;
        }
        lists.delete(id);
        return { status: 204, data: { data: null } };
      }
      return { status: 204, data: { data: null } };
    }),
  };
}

export function createMockResponse<T>(data: T[]): MockApiResponse<T> {
  return {
    data: {
      data,
    },
  };
}
