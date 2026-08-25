import { TOOL_NAMES } from '@/constants/tool-names.js';
import type {
  MergeRecordsParams,
  UniversalToolConfig,
} from '@/handlers/tool-configs/universal/types.js';
import {
  mergeRecordsSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { createErrorResult } from '@/utils/error-handler.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';
import {
  executeDealMerge,
  loadDealMergePlan,
  type DealMergeExecutionResult,
} from '@/services/merge/deal-merge-executor.js';
import type { DealMergePlan } from '@/services/merge/deal-merge-planner.js';

export interface DealMergeDryRunResult {
  mode: 'dry_run';
  plan: DealMergePlan;
  message: string;
}

export type MergeRecordsResult =
  | DealMergeDryRunResult
  | DealMergeExecutionResult;

const dryRunPlans = new Map<string, DealMergePlan>();
const MAX_CACHED_PLANS = 100;

function planCacheKey(params: MergeRecordsParams): string {
  return `${params.record_id}:${params.secondary_record_id}`;
}

function rememberPlan(params: MergeRecordsParams, plan: DealMergePlan): void {
  if (dryRunPlans.size >= MAX_CACHED_PLANS) {
    const oldestKey = dryRunPlans.keys().next().value;
    if (oldestKey) dryRunPlans.delete(oldestKey);
  }
  dryRunPlans.set(planCacheKey(params), plan);
}

function getCachedPlan(params: MergeRecordsParams): DealMergePlan | undefined {
  return dryRunPlans.get(planCacheKey(params));
}

function discardCachedPlan(params: MergeRecordsParams): void {
  dryRunPlans.delete(planCacheKey(params));
}

function isMergeRecordsResult(value: unknown): value is MergeRecordsResult {
  if (!value || typeof value !== 'object') return false;
  const mode = (value as { mode?: unknown }).mode;
  return mode === 'dry_run' || mode === 'complete' || mode === 'wait';
}

function formatFieldSlugs(
  fields: Array<{ slug?: string; attribute?: string }>
): string {
  if (fields.length === 0) return 'none';
  return fields
    .map((field) => field.slug || field.attribute || 'unknown')
    .join(', ');
}

function formatMergeRecordsResult(result: unknown): string {
  if (!isMergeRecordsResult(result)) {
    return 'No merge result';
  }

  if (result.mode === 'dry_run') {
    const plan = result.plan;
    return [
      result.message,
      `Primary: ${plan.primary_record_id}`,
      `Leftover: ${plan.leftover_record_id}`,
      `Fills: ${formatFieldSlugs(plan.fills)}`,
      `Conflicts: ${formatFieldSlugs(plan.conflicts)}`,
      `Dangerous empty-primary fills: ${formatFieldSlugs(plan.dangerous_fills)}`,
      `Linked mismatches: ${
        plan.linked_mismatches.length === 0
          ? 'none'
          : formatFieldSlugs(plan.linked_mismatches)
      }`,
    ].join('\n');
  }

  const headline =
    result.mode === 'wait'
      ? 'Deal merge is in progress. Do not poll here; retry get_record_details later.'
      : 'Deal merge complete.';

  return [
    headline,
    `New record ID: ${result.new_record_id}`,
    result.message,
    result.warning,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function normalizeParams(
  params: MergeRecordsParams
): Required<MergeRecordsParams> {
  for (const [name, value] of [
    ['dry_run', params.dry_run],
    ['confirm', params.confirm],
    ['override_linked_mismatch', params.override_linked_mismatch],
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Error(`${name} must be a boolean`);
    }
  }

  for (const [name, value] of [
    ['keep_from_leftover', params.keep_from_leftover],
    ['skip_leftover_attributes', params.skip_leftover_attributes],
  ] as const) {
    if (
      value !== undefined &&
      (!Array.isArray(value) ||
        value.some((entry) => typeof entry !== 'string'))
    ) {
      throw new Error(`${name} must be an array of attribute slugs`);
    }
  }

  return {
    resource_type: params.resource_type,
    record_id: params.record_id,
    secondary_record_id: params.secondary_record_id,
    dry_run: params.dry_run ?? true,
    confirm: params.confirm ?? false,
    keep_from_leftover: params.keep_from_leftover ?? [],
    skip_leftover_attributes: params.skip_leftover_attributes ?? [],
    override_linked_mismatch: params.override_linked_mismatch ?? false,
  };
}

function assertDealsOnly(params: MergeRecordsParams): void {
  if (params.resource_type !== 'deals') {
    throw new Error(
      'merge_records is currently available for deals only. People and companies remain on the Attio UI merge path until later coverage opens.'
    );
  }
}

function assertValidMergeIds(params: MergeRecordsParams): void {
  if (
    !isValidUUID(params.record_id) ||
    !isValidUUID(params.secondary_record_id)
  ) {
    throw new Error(
      'merge_records requires valid UUID record_id and secondary_record_id values'
    );
  }
  if (params.record_id === params.secondary_record_id) {
    throw new Error('A deal cannot be merged with itself');
  }
}

export const mergeRecordsConfig: UniversalToolConfig<
  MergeRecordsParams,
  MergeRecordsResult
> = {
  name: TOOL_NAMES.MERGE_RECORDS,
  handler: async (
    rawParams: MergeRecordsParams
  ): Promise<MergeRecordsResult> => {
    try {
      const params = normalizeParams(
        validateUniversalToolParams(
          TOOL_NAMES.MERGE_RECORDS,
          rawParams
        ) as MergeRecordsParams
      );
      assertDealsOnly(params);
      assertValidMergeIds(params);

      if (!params.dry_run && params.confirm !== true) {
        throw new Error(
          'Execute requires confirm: true in addition to dry_run: false'
        );
      }

      if (params.dry_run) {
        const plan = await loadDealMergePlan(
          params.record_id,
          params.secondary_record_id
        );
        rememberPlan(params, plan);
        return {
          mode: 'dry_run',
          plan,
          message:
            'Dry-run only: no deal was patched, cleared, or merged. Review dangerous fills and linked mismatches before confirming.',
        };
      }

      const expectedPlan = getCachedPlan(params);
      const result = await executeDealMerge(
        {
          primary_record_id: params.record_id,
          leftover_record_id: params.secondary_record_id,
          keep_from_leftover: params.keep_from_leftover,
          skip_leftover_attributes: params.skip_leftover_attributes,
          override_linked_mismatch: params.override_linked_mismatch,
        },
        expectedPlan
      );
      discardCachedPlan(params);
      return result;
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        TOOL_NAMES.MERGE_RECORDS,
        'deals',
        error
      );
    }
  },
  formatResult: (result: MergeRecordsResult): string => {
    try {
      return formatMergeRecordsResult(result);
    } catch (error: unknown) {
      const fallback = createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        `${TOOL_NAMES.MERGE_RECORDS}#format`,
        'FORMAT'
      ) as { content?: Array<{ text?: string }> };
      return fallback.content?.[0]?.text || 'Error formatting merge result';
    }
  },
  structuredOutput: (result: MergeRecordsResult): Record<string, unknown> =>
    result as unknown as Record<string, unknown>,
};

export const mergeRecordsDefinition = {
  name: TOOL_NAMES.MERGE_RECORDS,
  description: formatToolDescription({
    capability:
      'Preview and, after explicit confirmation, safely merge two Attio deal records using the native beta merge operation',
    boundaries:
      'merge people or companies, merge more than one pair, or retry an indeterminate native merge',
    constraints:
      'Dry-run defaults to true. Execute requires dry_run=false and confirm=true, returns a new record id, and is not idempotent',
    requiresApproval: true,
    recoveryHint:
      'For HTTP 202, wait and call get_record_details with new_record_id later; both original ids are unreadable after native merge',
  }),
  inputSchema: mergeRecordsSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
  },
};
