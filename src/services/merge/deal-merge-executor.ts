import type { AttioRecord } from '@/types/attio.js';
import {
  getRecord,
  mergeRecords,
  overwriteRecordAttributes,
} from '@/api/operations/index.js';
import { UniversalUpdateService } from '@/services/UniversalUpdateService.js';
import {
  assertDealMergePlanFresh,
  buildDealMergePlan,
  getDealMergeClears,
  getDealMergePatch,
  validateDealMergeChoices,
  type DealMergeChoiceOptions,
  type DealMergePlan,
} from '@/services/merge/deal-merge-planner.js';

export interface DealMergeExecutionParams extends DealMergeChoiceOptions {
  primary_record_id: string;
  leftover_record_id: string;
  keep_from_leftover: string[];
  skip_leftover_attributes: string[];
  plan_fingerprint: string;
}

export interface DealMergeExecutionResult {
  mode: 'complete' | 'wait';
  status: 200 | 202;
  new_record_id: string;
  original_record_ids: string[];
  warning: string;
  plan: DealMergePlan;
  message?: string;
}

export async function loadDealMergePlan(
  primaryRecordId: string,
  leftoverRecordId: string
): Promise<DealMergePlan> {
  const [primary, leftover] = await Promise.all([
    getRecord<AttioRecord>('deals', primaryRecordId),
    getRecord<AttioRecord>('deals', leftoverRecordId),
  ]);
  return buildDealMergePlan(primary, leftover);
}

/**
 * Re-diff and execute a deal merge. There is intentionally no spanning
 * transaction: once a PUT-clear succeeds, a later native merge failure is
 * surfaced as an indeterminate, already-cleared state.
 */
export async function executeDealMerge(
  params: DealMergeExecutionParams
): Promise<DealMergeExecutionResult> {
  const currentPlan = await loadDealMergePlan(
    params.primary_record_id,
    params.leftover_record_id
  );

  assertDealMergePlanFresh(
    { fingerprint: params.plan_fingerprint },
    currentPlan
  );

  validateDealMergeChoices(
    currentPlan,
    params.keep_from_leftover,
    params.skip_leftover_attributes,
    params
  );

  const patch = getDealMergePatch(currentPlan, params.keep_from_leftover);
  if (Object.keys(patch).length > 0) {
    await UniversalUpdateService.updateRecordWithValidation({
      resource_type: 'deals',
      record_id: params.primary_record_id,
      record_data: { values: patch },
      return_details: true,
    });
  }

  let leftoverCleared = false;
  const clears = getDealMergeClears(
    currentPlan,
    params.skip_leftover_attributes
  );
  try {
    if (Object.keys(clears).length > 0) {
      const clearResult = await overwriteRecordAttributes(
        'deals',
        params.leftover_record_id,
        clears
      );
      if (clearResult.status < 200 || clearResult.status >= 300) {
        throw new Error(
          `Attio leftover clear returned HTTP ${clearResult.status}`
        );
      }
      leftoverCleared = true;
    }

    const mergeResult = await mergeRecords(
      'deals',
      params.primary_record_id,
      params.leftover_record_id
    );
    const warning =
      'Both original deal ids are unreadable after native merge; use new_record_id for the survivor.';

    if (mergeResult.status === 202) {
      return {
        mode: 'wait',
        status: 202,
        new_record_id: mergeResult.new_record_id,
        original_record_ids: [
          params.primary_record_id,
          params.leftover_record_id,
        ],
        warning,
        plan: currentPlan,
        message:
          'Attio is still applying the merge. Do not poll here; retry get_record_details with new_record_id later.',
      };
    }

    return {
      mode: 'complete',
      status: 200,
      new_record_id: mergeResult.new_record_id,
      original_record_ids: [
        params.primary_record_id,
        params.leftover_record_id,
      ],
      warning,
      plan: currentPlan,
    };
  } catch (error: unknown) {
    if (leftoverCleared) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${message}. Leftover attributes were already cleared; do not retry the native merge automatically.`,
        { cause: error instanceof Error ? error : undefined }
      );
    }
    throw error;
  }
}
