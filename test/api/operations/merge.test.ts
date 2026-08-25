import { describe, expect, it, vi } from 'vitest';

const { post, put } = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
}));

vi.mock('@/api/lazy-client.js', () => ({
  getLazyAttioClient: () => ({ post, put }),
}));

import {
  mergeRecords,
  overwriteRecordAttributes,
} from '@/api/operations/merge.js';

describe('merge API operations', () => {
  it('merges records and returns the new record id for a 200 response', async () => {
    post.mockResolvedValueOnce({
      status: 200,
      data: {
        data: { id: { record_id: 'new-record-id' } },
      },
    });

    await expect(
      mergeRecords('deals', 'primary-id', 'secondary-id')
    ).resolves.toEqual({
      status: 200,
      new_record_id: 'new-record-id',
      data: { id: { record_id: 'new-record-id' } },
    });
    expect(post).toHaveBeenCalledWith('/objects/deals/records/merge', {
      data: {
        primary_record_id: 'primary-id',
        secondary_record_id: 'secondary-id',
      },
    });
  });

  it('returns a wait result for 202 without polling', async () => {
    post.mockResolvedValueOnce({
      status: 202,
      data: { data: { new_record_id: 'pending-record-id' } },
    });

    await expect(
      mergeRecords('deals', 'primary-id', 'secondary-id')
    ).resolves.toMatchObject({
      status: 202,
      new_record_id: 'pending-record-id',
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('retries a merge once for HTTP 429 and honors Retry-After', async () => {
    post
      .mockRejectedValueOnce({
        response: { status: 429, headers: { 'retry-after': '0' } },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { id: { record_id: 'new-record-id' } } },
      });

    await expect(
      mergeRecords('deals', 'primary-id', 'secondary-id')
    ).resolves.toMatchObject({ status: 200, new_record_id: 'new-record-id' });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 500 response', async () => {
    post.mockRejectedValueOnce({ response: { status: 500 } });

    await expect(
      mergeRecords('deals', 'primary-id', 'secondary-id')
    ).rejects.toMatchObject({ response: { status: 500 } });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('surfaces Attio self_merge errors clearly', async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { code: 'self_merge' } },
    });

    await expect(mergeRecords('deals', 'same-id', 'same-id')).rejects.toThrow(
      'self_merge'
    );
  });

  it('overwrites named attributes and sends empty arrays for clears', async () => {
    put.mockResolvedValueOnce({
      status: 200,
      data: { data: { id: { record_id: 'secondary-id' } } },
    });

    await expect(
      overwriteRecordAttributes('deals', 'secondary-id', {
        associated_people: [],
        consent_to_contact: [],
      })
    ).resolves.toMatchObject({
      status: 200,
      data: { id: { record_id: 'secondary-id' } },
    });
    expect(put).toHaveBeenCalledWith('/objects/deals/records/secondary-id', {
      data: {
        values: {
          associated_people: [],
          consent_to_contact: [],
        },
      },
    });
  });
});
