/**
 * Offline end-to-end tests for the list 403/400 error chain (Issue #1148).
 *
 * Unlike list-config-handler.test.ts (which mocks createList/updateList),
 * these tests drive the REAL src/objects/lists/base.ts wrappers: only
 * @/api/lazy-client is mocked, so an axios-shaped rejection exercises the
 * full path AttioApiError -> categorizeError -> handleListToolError.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError } from 'axios';

vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: vi.fn(),
}));

import { getLazyAttioClient } from '@/api/lazy-client.js';
import { createList, updateList } from '@/objects/lists/base.js';
import { ListConfigurationValidator } from '@/services/lists/ListConfigurationValidator.js';
import { AttioApiError } from '@/errors/api-errors.js';
import { ListErrorCategory } from '@/services/lists/types.js';

function axiosErrorWith(
  status: number,
  data: Record<string, unknown>
): AxiosError {
  const err = new Error(
    `Request failed with status code ${status}`
  ) as AxiosError;
  err.isAxiosError = true;
  err.response = {
    status,
    statusText: 'Error',
    data,
    headers: {},
    config: {} as never,
  };
  return err;
}

function clientRejectingPost(err: unknown) {
  vi.mocked(getLazyAttioClient).mockReturnValue({
    get: vi.fn(),
    post: vi.fn().mockRejectedValue(err),
    patch: vi.fn(),
  } as never);
}

function clientRejectingPatch(err: unknown) {
  vi.mocked(getLazyAttioClient).mockReturnValue({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn().mockRejectedValue(err),
  } as never);
}

describe('createList 403 chain (real base.ts wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps a billing_error 403 as AttioApiError and categorizes as plan_gating', async () => {
    clientRejectingPost(
      axiosErrorWith(403, {
        status_code: 403,
        type: 'auth_error',
        code: 'billing_error',
        message: 'Your plan does not support member-level access',
      })
    );

    const err = await createList({
      name: 'x',
      parent_object: 'companies',
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AttioApiError);
    const apiErr = err as AttioApiError;
    expect(apiErr.statusCode).toBe(403);
    expect(apiErr.details?.code).toBe('billing_error');

    const categorized = ListConfigurationValidator.categorizeError(apiErr);
    expect(categorized.category).toBe(ListErrorCategory.PLAN_GATING);
    expect(categorized.api_error_status).toBe(403);
    expect(categorized.message).toContain(
      'Your plan does not support member-level access'
    );
  });

  it('wraps an insufficient_scopes 403 and categorizes as permission_failure', async () => {
    clientRejectingPost(
      axiosErrorWith(403, {
        status_code: 403,
        type: 'authorization_error',
        code: 'insufficient_scopes',
        message: 'missing list_configuration scope',
      })
    );

    const err = (await createList({
      name: 'x',
      parent_object: 'companies',
    }).catch((e: unknown) => e)) as AttioApiError;

    expect(err).toBeInstanceOf(AttioApiError);
    const categorized = ListConfigurationValidator.categorizeError(err);
    expect(categorized.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
    expect(categorized.api_error_status).toBe(403);
  });

  it('preserves the flattened message for a codeless 403 (no-regression fallback)', async () => {
    clientRejectingPost(axiosErrorWith(403, { status_code: 403 }));

    const err = (await createList({
      name: 'x',
      parent_object: 'companies',
    }).catch((e: unknown) => e)) as AttioApiError;

    expect(err).toBeInstanceOf(AttioApiError);
    expect(err.details?.code).toBeUndefined();
    const categorized = ListConfigurationValidator.categorizeError(err);
    expect(categorized.category).toBe(ListErrorCategory.PERMISSION_FAILURE);
  });

  it('never forwards the raw axios response body: details are allow-listed', async () => {
    clientRejectingPost(
      axiosErrorWith(403, {
        status_code: 403,
        type: 'auth_error',
        code: 'billing_error',
        message: 'nope',
        secret_request_echo: { workspace_member_id: 'leak-me' },
      })
    );

    const err = (await createList({
      name: 'x',
      parent_object: 'companies',
    }).catch((e: unknown) => e)) as AttioApiError;

    expect(err.details).toEqual({
      status_code: 403,
      type: 'auth_error',
      code: 'billing_error',
      message: 'nope',
    });
    expect(err.details).not.toHaveProperty('secret_request_echo');
    // cause carries only the message — never the axios response object
    const cause = err.cause as Error | undefined;
    expect(cause).toBeInstanceOf(Error);
    expect(cause).not.toHaveProperty('response');
  });

  it('wraps a 400 as AttioApiError(400) so a server 5xx-shaped message cannot misroute via string matching', async () => {
    clientRejectingPost(
      axiosErrorWith(400, {
        status_code: 400,
        type: 'invalid_request_error',
        code: 'invalid_value',
        message: 'parent_object must be a known object',
      })
    );

    const err = (await createList({
      name: 'x',
      parent_object: 'companies',
    }).catch((e: unknown) => e)) as AttioApiError;

    expect(err).toBeInstanceOf(AttioApiError);
    expect(err.statusCode).toBe(400);
    const categorized = ListConfigurationValidator.categorizeError(err);
    expect(categorized.category).toBe(ListErrorCategory.UNSUPPORTED_INPUT);
    expect(categorized.api_error_status).toBe(400);
  });

  it('passes unexpected errors (no response) through untouched', async () => {
    const netErr = new Error('socket hang up');
    clientRejectingPost(netErr);

    await expect(
      createList({ name: 'x', parent_object: 'companies' })
    ).rejects.toBe(netErr);
  });
});

describe('updateList 403/404 chain (real base.ts wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps a billing_error 403 with structured status/code', async () => {
    clientRejectingPatch(
      axiosErrorWith(403, {
        status_code: 403,
        type: 'auth_error',
        code: 'billing_error',
        message: 'upgrade required',
      })
    );

    const err = (await updateList('list-1', { name: 'x' }).catch(
      (e: unknown) => e
    )) as AttioApiError;

    expect(err).toBeInstanceOf(AttioApiError);
    expect(err.statusCode).toBe(403);
    expect(ListConfigurationValidator.categorizeError(err).category).toBe(
      ListErrorCategory.PLAN_GATING
    );
  });

  it('wraps a 404 as AttioApiError(404) categorized as unsupported_input with status', async () => {
    clientRejectingPatch(
      axiosErrorWith(404, { status_code: 404, message: 'not found' })
    );

    const err = (await updateList('list-1', { name: 'x' }).catch(
      (e: unknown) => e
    )) as AttioApiError;

    expect(err).toBeInstanceOf(AttioApiError);
    expect(err.statusCode).toBe(404);
    const categorized = ListConfigurationValidator.categorizeError(err);
    expect(categorized.api_error_status).toBe(404);
    expect(categorized.category).not.toBe(ListErrorCategory.API_FAILURE);
  });
});
