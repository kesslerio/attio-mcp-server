import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttioRecord } from '@/types/attio.js';

const { getRecord, mergeRecords, overwriteRecordAttributes } = vi.hoisted(
  () => ({
    getRecord: vi.fn(),
    mergeRecords: vi.fn(),
    overwriteRecordAttributes: vi.fn(),
  })
);
const { updateRecordWithValidation } = vi.hoisted(() => ({
  updateRecordWithValidation: vi.fn(),
}));

vi.mock('@/api/operations/index.js', () => ({
  getRecord,
  mergeRecords,
  overwriteRecordAttributes,
}));
vi.mock('@/services/UniversalUpdateService.js', () => ({
  UniversalUpdateService: { updateRecordWithValidation },
}));

import { buildDealMergePlan } from '@/services/merge/deal-merge-planner.js';
import { executeDealMerge } from '@/services/merge/deal-merge-executor.js';

const PRIMARY_ID = '11111111-1111-4111-8111-111111111111';
const LEFTOVER_ID = '22222222-2222-4222-8222-222222222222';
const NEW_ID = '33333333-3333-4333-8333-333333333333';

function deal(recordId: string, values: Record<string, unknown>): AttioRecord {
  return { id: { record_id: recordId }, values };
}

function fingerprintFor(
  primaryValues: Record<string, unknown> = {},
  includeConsent = true
): string {
  const secondaryValues: Record<string, unknown> = {
    website: [{ value: 'https://example.com' }],
  };
  if (includeConsent) {
    secondaryValues.consent_to_contact = [{ value: false }];
  }
  return buildDealMergePlan(
    deal(PRIMARY_ID, { website: [], ...primaryValues }),
    deal(LEFTOVER_ID, secondaryValues)
  ).fingerprint;
}

function arrangeDeals(
  primaryValues: Record<string, unknown> = {},
  includeConsent = true
) {
  const secondaryValues: Record<string, unknown> = {
    website: [{ value: 'https://example.com' }],
  };
  if (includeConsent) {
    secondaryValues.consent_to_contact = [{ value: false }];
  }
  getRecord
    .mockResolvedValueOnce(deal(PRIMARY_ID, { website: [], ...primaryValues }))
    .mockResolvedValueOnce(deal(LEFTOVER_ID, secondaryValues));
}

describe('deal merge executor', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('patches keeps, clears skips with PUT, then merges once', async () => {
    arrangeDeals();
    updateRecordWithValidation.mockResolvedValueOnce({ record: {} });
    overwriteRecordAttributes.mockResolvedValueOnce({ status: 200, data: {} });
    mergeRecords.mockResolvedValueOnce({
      status: 200,
      new_record_id: NEW_ID,
      data: { id: { record_id: NEW_ID } },
    });

    const result = await executeDealMerge({
      primary_record_id: PRIMARY_ID,
      leftover_record_id: LEFTOVER_ID,
      keep_from_leftover: ['website'],
      skip_leftover_attributes: ['consent_to_contact'],
      plan_fingerprint: fingerprintFor(),
    });

    expect(updateRecordWithValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: 'deals',
        record_id: PRIMARY_ID,
        record_data: {
          values: { website: [{ value: 'https://example.com' }] },
        },
      })
    );
    expect(overwriteRecordAttributes).toHaveBeenCalledWith(
      'deals',
      LEFTOVER_ID,
      { consent_to_contact: [] }
    );
    expect(mergeRecords).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      mode: 'complete',
      status: 200,
      new_record_id: NEW_ID,
    });
  });

  it('returns a 202 wait state and does not poll', async () => {
    arrangeDeals({}, false);
    mergeRecords.mockResolvedValueOnce({
      status: 202,
      new_record_id: NEW_ID,
      data: { new_record_id: NEW_ID },
    });

    const result = await executeDealMerge({
      primary_record_id: PRIMARY_ID,
      leftover_record_id: LEFTOVER_ID,
      keep_from_leftover: [],
      skip_leftover_attributes: [],
      plan_fingerprint: fingerprintFor({}, false),
    });

    expect(result).toMatchObject({
      mode: 'wait',
      status: 202,
      new_record_id: NEW_ID,
    });
    expect(getRecord).toHaveBeenCalledTimes(2);
    expect(mergeRecords).toHaveBeenCalledTimes(1);
  });

  it('reports that leftover data was already cleared and does not retry merge', async () => {
    arrangeDeals();
    overwriteRecordAttributes.mockResolvedValueOnce({ status: 200, data: {} });
    mergeRecords.mockRejectedValueOnce({ response: { status: 500 } });

    await expect(
      executeDealMerge({
        primary_record_id: PRIMARY_ID,
        leftover_record_id: LEFTOVER_ID,
        keep_from_leftover: [],
        skip_leftover_attributes: ['consent_to_contact'],
        plan_fingerprint: fingerprintFor(),
      })
    ).rejects.toThrow('already cleared');
    expect(mergeRecords).toHaveBeenCalledTimes(1);
  });

  it('refuses a stale expected plan before any patch, clear, or merge', async () => {
    getRecord
      .mockResolvedValueOnce(deal(PRIMARY_ID, { website: [] }))
      .mockResolvedValueOnce(
        deal(LEFTOVER_ID, {
          website: [{ value: 'https://changed.example' }],
          consent_to_contact: [{ value: false }],
        })
      );

    await expect(
      executeDealMerge({
        primary_record_id: PRIMARY_ID,
        leftover_record_id: LEFTOVER_ID,
        keep_from_leftover: [],
        skip_leftover_attributes: ['consent_to_contact'],
        plan_fingerprint: fingerprintFor(),
      })
    ).rejects.toThrow('changed');
    expect(updateRecordWithValidation).not.toHaveBeenCalled();
    expect(overwriteRecordAttributes).not.toHaveBeenCalled();
    expect(mergeRecords).not.toHaveBeenCalled();
  });
});
