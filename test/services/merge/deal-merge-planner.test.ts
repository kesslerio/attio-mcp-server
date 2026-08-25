import { describe, expect, it } from 'vitest';
import type { AttioRecord } from '@/types/attio.js';
import {
  assertDealMergePlanFresh,
  buildDealMergePlan,
  validateDealMergeChoices,
} from '@/services/merge/deal-merge-planner.js';

const PRIMARY_ID = '11111111-1111-4111-8111-111111111111';
const LEFTOVER_ID = '22222222-2222-4222-8222-222222222222';

function deal(recordId: string, values: Record<string, unknown>): AttioRecord {
  return { id: { record_id: recordId }, values };
}

describe('deal merge planner', () => {
  it('rejects invalid and self-merge record identities', () => {
    expect(() =>
      buildDealMergePlan(deal('not-a-uuid', {}), deal(LEFTOVER_ID, {}))
    ).toThrow('valid UUID');

    expect(() =>
      buildDealMergePlan(deal(PRIMARY_ID, {}), deal(PRIMARY_ID, {}))
    ).toThrow('cannot be merged with itself');
  });

  it('accepts two empty deals as an empty, side-effect-free plan', () => {
    const plan = buildDealMergePlan(
      deal(PRIMARY_ID, {}),
      deal(LEFTOVER_ID, {})
    );

    expect(plan.flagged_attribute_slugs).toEqual([]);
    expect(plan.fills).toEqual([]);
    expect(plan.conflicts).toEqual([]);
  });

  it('proposes leftover-only snapshot fields while keeping live sales fields', () => {
    const plan = buildDealMergePlan(
      deal(PRIMARY_ID, {
        name: [{ value: 'Won deal' }],
        stage: [{ status: 'won-status' }],
        website: [],
      }),
      deal(LEFTOVER_ID, {
        name: [{ value: 'Form submission' }],
        stage: [{ status: 'demo-status' }],
        website: [{ value: 'https://example.com' }],
        utm_campaign: [{ value: 'spring' }],
      })
    );

    expect(plan.fills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attribute: 'website', kind: 'fill' }),
        expect.objectContaining({ attribute: 'utm_campaign', kind: 'fill' }),
      ])
    );
    expect(plan.dangerous_fills).toEqual([]);
    expect(plan.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attribute: 'stage', kind: 'conflict' }),
      ])
    );
  });

  it('flags timestamp conflicts and dangerous empty-primary fills', () => {
    const plan = buildDealMergePlan(
      deal(PRIMARY_ID, {
        demo_request_at: [{ value: '2026-08-01T10:00:00Z' }],
        consent_to_contact: [],
        owner: [],
        value: [],
      }),
      deal(LEFTOVER_ID, {
        demo_request_at: [{ value: '2026-08-02T10:00:00Z' }],
        consent_to_contact: [{ value: false }],
        owner: [{ referenced_actor_id: 'member-id' }],
        value: [{ currency_value: '1000', currency_code: 'USD' }],
      })
    );

    expect(plan.conflicts).toEqual([
      expect.objectContaining({ attribute: 'demo_request_at' }),
    ]);
    expect(plan.dangerous_fills.map((fill) => fill.attribute)).toEqual(
      expect.arrayContaining(['consent_to_contact', 'owner', 'value'])
    );
    expect(() => validateDealMergeChoices(plan, [], [])).toThrow(
      'explicit keep or skip'
    );
  });

  it('blocks differing linked records unless override is enabled', () => {
    const plan = buildDealMergePlan(
      deal(PRIMARY_ID, {
        associated_company: [
          { target_object: 'companies', target_record_id: 'company-a' },
        ],
      }),
      deal(LEFTOVER_ID, {
        associated_company: [
          { target_object: 'companies', target_record_id: 'company-b' },
        ],
      })
    );

    expect(plan.linked_mismatches).toEqual([
      expect.objectContaining({ attribute: 'associated_company' }),
    ]);
    expect(plan.requires_linked_mismatch_override).toBe(true);
    expect(() => validateDealMergeChoices(plan, [], [])).toThrow(
      'override_linked_mismatch'
    );
    expect(() =>
      validateDealMergeChoices(plan, [], [], { override_linked_mismatch: true })
    ).not.toThrow();
  });

  it('rejects execute when a flagged field changed after the dry-run', () => {
    const originalPlan = buildDealMergePlan(
      deal(PRIMARY_ID, { website: [] }),
      deal(LEFTOVER_ID, { website: [{ value: 'https://before.example' }] })
    );
    const changedPlan = buildDealMergePlan(
      deal(PRIMARY_ID, { website: [] }),
      deal(LEFTOVER_ID, { website: [{ value: 'https://after.example' }] })
    );

    expect(() => assertDealMergePlanFresh(originalPlan, changedPlan)).toThrow(
      'changed'
    );
  });
});
