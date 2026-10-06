import { createServer } from 'node:http';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callWithRetry } from '@/api/operations/retry.js';
import * as taskOperations from '@/api/operations/tasks.js';
import * as listOperations from '@/objects/lists/entries.js';
import * as recordOperations from '@/objects/records/index.js';
import * as lazyClient from '@/api/lazy-client.js';
import * as attioClient from '@/api/attio-client.js';
import { clearAllCaches } from '@/api/client-cache.js';
import {
  NetworkError,
  createApiErrorFromAxiosError,
} from '@/errors/api-errors.js';
import { ResultEncodingError } from '@/handlers/tools/result-contract.js';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import {
  CompanyMockFactory,
  TaskMockFactory,
} from '@test/utils/mock-factories/index.js';

afterEach(() => {
  vi.restoreAllMocks();
  clearAllCaches();
});

describe('uncertain completion and transport retry policy', () => {
  const immediate = { maxRetries: 2, initialDelay: 0, maxDelay: 0 };

  it.each([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNABORTED',
    'EHOSTUNREACH',
    'ENETUNREACH',
  ])(
    'classifies raw and wrapped %s failures for reads and uncertain writes',
    (code) => {
      const original = Object.assign(new Error('Transport request failed'), {
        code,
      });
      const wrapped = createApiErrorFromAxiosError(
        original,
        '/objects/companies/records/query',
        'POST'
      );
      for (const error of [original, wrapped]) {
        expect(createSecureToolErrorResult(error)).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: 'UPSTREAM_UNAVAILABLE', retryable: true },
          },
        });
        expect(
          createSecureToolErrorResult(error, { uncertainMutation: true })
        ).toMatchObject({
          isError: true,
          structuredContent: {
            error: { code: 'UPSTREAM_UNAVAILABLE', retryable: false },
          },
        });
      }
    }
  );

  it('recognizes a NetworkError without a cause code', () => {
    const error = new NetworkError(
      'Disconnected',
      '/objects/funds/records/query',
      'POST'
    );
    expect(createSecureToolErrorResult(error)).toMatchObject({
      isError: true,
      structuredContent: {
        error: { code: 'UPSTREAM_UNAVAILABLE', retryable: true },
      },
    });
  });

  it.each(['ECONNABORTED', 'EHOSTUNREACH', 'ENETUNREACH'])(
    'retains native read retries for %s while writes stop after one attempt',
    async (code) => {
      clearAllCaches();
      const task = TaskMockFactory.create();
      const failure = Object.assign(new Error('Transport request failed'), {
        code,
      });
      const api = {
        defaults: {},
        get: vi
          .fn()
          .mockRejectedValueOnce(failure)
          .mockResolvedValue({ data: { data: [task] } }),
        post: vi.fn().mockRejectedValue(failure),
      };
      vi.spyOn(attioClient, 'createAttioClient').mockReturnValue(api as never);
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
      await expect(
        taskOperations.listTasks(undefined, undefined, 1, 25, immediate)
      ).resolves.toEqual([task]);
      expect(api.get).toHaveBeenCalledTimes(2);
      await expect(
        taskOperations.createTask('Uncertain write', {}, immediate)
      ).rejects.toBe(failure);
      expect(api.post).toHaveBeenCalledOnce();
    }
  );

  it.each(['no-response', 'encoding', 'server-response'])(
    'does not retry uncertain callbacks with %s failures',
    async (kind) => {
      const error =
        kind === 'encoding'
          ? new ResultEncodingError()
          : kind === 'server-response'
            ? { response: { status: 503 }, message: 'Unavailable' }
            : Object.assign(new Error('Response lost'), {
                code: 'ECONNABORTED',
              });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('duplicate');
      await expect(callWithRetry(operation, immediate)).rejects.toBe(error);
      expect(operation).toHaveBeenCalledOnce();
    }
  );

  it('never retries encoding failures even on an explicitly identified read', async () => {
    const error = new ResultEncodingError();
    const operation = vi.fn().mockRejectedValue(error);
    await expect(
      callWithRetry(operation, immediate, { uncertainMutation: false })
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
  });

  it.each([
    'list-add',
    'list-update',
    'list-remove',
    'record-create',
    'record-update',
    'record-delete',
    'record-batch-create',
    'record-batch-update',
  ] as const)(
    'blocks %s fallback writes after uncertain completion',
    async (operation) => {
      const id = CompanyMockFactory.create().id.record_id;
      for (const failure of [
        { code: 'ECONNABORTED', message: 'Response lost' },
        new ResultEncodingError(),
        { response: { status: 503 }, message: 'Unavailable' },
        { response: {}, message: 'Unknown completion' },
        { response: { status: 200 }, message: 'Invalid successful payload' },
      ]) {
        const api = {
          post: vi
            .fn()
            .mockRejectedValueOnce(failure)
            .mockResolvedValue({ data: {} }),
          patch: vi
            .fn()
            .mockRejectedValueOnce(failure)
            .mockResolvedValue({ data: {} }),
          delete: vi
            .fn()
            .mockRejectedValueOnce(failure)
            .mockResolvedValue({ data: {} }),
        };
        vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(
          api as never
        );
        const calls = {
          'list-add': () => listOperations.addRecordToList(id, id, 'companies'),
          'list-update': () =>
            listOperations.updateListEntry(id, id, { stage: 'New' }),
          'list-remove': () => listOperations.removeRecordFromList(id, id),
          'record-create': () =>
            recordOperations.createObjectRecord('companies', {
              name: 'Uncertain',
            }),
          'record-update': () =>
            recordOperations.updateObjectRecord('companies', id, {
              name: 'Uncertain',
            }),
          'record-delete': () =>
            recordOperations.deleteObjectRecord('companies', id),
          'record-batch-create': () =>
            recordOperations.batchCreateObjectRecords('companies', [
              { name: 'Uncertain' },
            ]),
          'record-batch-update': () =>
            recordOperations.batchUpdateObjectRecords('companies', [
              { id, attributes: { name: 'Uncertain' } },
            ]),
        };
        await expect(calls[operation]()).rejects.toBe(failure);
        expect(
          api.post.mock.calls.length +
            api.patch.mock.calls.length +
            api.delete.mock.calls.length
        ).toBe(1);
      }
    }
  );

  it.each(['lost-response', 'invalid-response'] as const)(
    'fires exactly one real HTTP POST after %s on a legacy record mutation',
    async (kind) => {
      let posts = 0;
      const server = createServer((request, response) => {
        if (request.method === 'POST') posts++;
        request.resume();
        request.on('end', () => {
          if (kind === 'lost-response') request.socket.destroy();
          else {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(
              JSON.stringify({ data: 'unusable completed response' })
            );
          }
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve)
      );
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('No test port');
      const api = axios.create({
        baseURL: `http://127.0.0.1:${address.port}`,
        timeout: 1000,
      });
      vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api);
      try {
        await expect(
          recordOperations.createObjectRecord('companies', {
            name: 'Uncertain',
          })
        ).rejects.toMatchObject({
          code:
            kind === 'lost-response' ? 'ECONNRESET' : 'RESULT_ENCODING_FAILED',
        });
        expect(posts).toBe(1);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
      }
    }
  );

  it('keeps the definite list rejection compatibility fallback reachable', async () => {
    const id = CompanyMockFactory.create().id.record_id;
    const entry = { id: { entry_id: id }, parent_record_id: id };
    const api = {
      post: vi
        .fn()
        .mockRejectedValueOnce({
          response: { status: 400 },
          message: 'Rejected payload',
        })
        .mockResolvedValueOnce({ data: { data: entry } }),
    };
    vi.spyOn(lazyClient, 'getLazyAttioClient').mockReturnValue(api as never);
    await expect(
      listOperations.addRecordToList(id, id, 'companies')
    ).resolves.toEqual(entry);
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
