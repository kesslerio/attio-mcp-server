import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DealMergePlan } from '@/services/merge/deal-merge-planner.js';

const { executeDealMerge, loadDealMergePlan } = vi.hoisted(() => ({
  executeDealMerge: vi.fn(),
  loadDealMergePlan: vi.fn(),
}));

vi.mock('@/services/merge/deal-merge-executor.js', () => ({
  executeDealMerge,
  loadDealMergePlan,
}));

import {
  mergeRecordsConfig,
  mergeRecordsDefinition,
} from '@/handlers/tool-configs/universal/core/merge-operations.js';

const PRIMARY_ID = '11111111-1111-4111-8111-111111111111';
const LEFTOVER_ID = '22222222-2222-4222-8222-222222222222';

const plan = {
  primary_record_id: PRIMARY_ID,
  leftover_record_id: LEFTOVER_ID,
  fills: [],
  conflicts: [],
  dangerous_fills: [],
  linked_mismatches: [],
  requires_linked_mismatch_override: false,
  flagged_attribute_slugs: [],
  fingerprint: 'fingerprint',
} as DealMergePlan;

describe('merge_records tool surface', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('defaults to dry-run and does not invoke execute', async () => {
    loadDealMergePlan.mockResolvedValueOnce(plan);

    const result = await mergeRecordsConfig.handler({
      resource_type: 'deals',
      record_id: PRIMARY_ID,
      secondary_record_id: LEFTOVER_ID,
    });

    expect(result).toMatchObject({ mode: 'dry_run', plan });
    expect(loadDealMergePlan).toHaveBeenCalledWith(PRIMARY_ID, LEFTOVER_ID);
    expect(executeDealMerge).not.toHaveBeenCalled();
    expect(mergeRecordsConfig.formatResult(result)).toEqual(expect.any(String));
  });

  it('requires confirm true when dry_run is false', async () => {
    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'deals',
        record_id: PRIMARY_ID,
        secondary_record_id: LEFTOVER_ID,
        dry_run: false,
      })
    ).rejects.toThrow('confirm');
    expect(loadDealMergePlan).not.toHaveBeenCalled();
    expect(executeDealMerge).not.toHaveBeenCalled();
  });

  it('rejects self-merge and malformed ids before loading records', async () => {
    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'deals',
        record_id: 'not-a-uuid',
        secondary_record_id: LEFTOVER_ID,
      })
    ).rejects.toThrow('valid UUID');

    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'deals',
        record_id: PRIMARY_ID,
        secondary_record_id: PRIMARY_ID,
      })
    ).rejects.toThrow('itself');
    expect(loadDealMergePlan).not.toHaveBeenCalled();
  });

  it('rejects type-mismatched flat arguments before loading records', async () => {
    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'deals',
        record_id: PRIMARY_ID,
        secondary_record_id: LEFTOVER_ID,
        dry_run: 'false' as unknown as boolean,
        confirm: true,
      })
    ).rejects.toThrow('dry_run must be a boolean');
    expect(loadDealMergePlan).not.toHaveBeenCalled();
  });

  it('refuses people and companies without calling the merge service', async () => {
    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'companies',
        record_id: PRIMARY_ID,
        secondary_record_id: LEFTOVER_ID,
      })
    ).rejects.toThrow('deals only');
    expect(loadDealMergePlan).not.toHaveBeenCalled();
    expect(executeDealMerge).not.toHaveBeenCalled();
  });

  it('requires plan_fingerprint to execute so freshness cannot be skipped', async () => {
    await expect(
      mergeRecordsConfig.handler({
        resource_type: 'deals',
        record_id: PRIMARY_ID,
        secondary_record_id: LEFTOVER_ID,
        dry_run: false,
        confirm: true,
      })
    ).rejects.toThrow('plan_fingerprint');
    expect(executeDealMerge).not.toHaveBeenCalled();
  });

  it('passes explicit execute choices through the dual gate', async () => {
    executeDealMerge.mockResolvedValueOnce({
      mode: 'complete',
      status: 200,
      new_record_id: '33333333-3333-4333-8333-333333333333',
      original_record_ids: [PRIMARY_ID, LEFTOVER_ID],
      warning: 'old ids are unreadable',
      plan,
    });

    const result = await mergeRecordsConfig.handler({
      resource_type: 'deals',
      record_id: PRIMARY_ID,
      secondary_record_id: LEFTOVER_ID,
      dry_run: false,
      confirm: true,
      keep_from_leftover: ['website'],
      skip_leftover_attributes: ['consent_to_contact'],
      override_linked_mismatch: true,
      plan_fingerprint: plan.fingerprint,
    });

    expect(result).toMatchObject({ mode: 'complete', status: 200 });
    expect(executeDealMerge).toHaveBeenCalledWith({
      primary_record_id: PRIMARY_ID,
      leftover_record_id: LEFTOVER_ID,
      keep_from_leftover: ['website'],
      skip_leftover_attributes: ['consent_to_contact'],
      override_linked_mismatch: true,
      plan_fingerprint: plan.fingerprint,
    });
  });

  it('marks the definition as statically destructive and avoids forbidden schema combinators', () => {
    expect(mergeRecordsDefinition.annotations).toMatchObject({
      destructiveHint: true,
    });
    expect(mergeRecordsDefinition.inputSchema).not.toHaveProperty('oneOf');
    expect(mergeRecordsDefinition.inputSchema).not.toHaveProperty('allOf');
    expect(mergeRecordsDefinition.inputSchema).not.toHaveProperty('anyOf');
  });

  it('formats a 202 result as a wait response without polling', () => {
    const result = {
      mode: 'wait' as const,
      status: 202 as const,
      new_record_id: '33333333-3333-4333-8333-333333333333',
      original_record_ids: [PRIMARY_ID, LEFTOVER_ID],
      warning: 'old ids are unreadable',
      message: 'Do not poll here',
      plan,
    };

    expect(mergeRecordsConfig.formatResult(result)).toContain(
      'Do not poll here'
    );
    expect(mergeRecordsConfig.formatResult(result)).toContain(
      '33333333-3333-4333-8333-333333333333'
    );
    expect(mergeRecordsConfig.formatResult(result).trim().startsWith('{')).toBe(
      false
    );
  });
});
