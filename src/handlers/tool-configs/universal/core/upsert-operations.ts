import {
  UniversalToolConfig,
  UniversalUpsertParams,
} from '@/handlers/tool-configs/universal/types.js';
import {
  upsertRecordSchema,
  validateUniversalToolParams,
} from '@/handlers/tool-configs/universal/schemas.js';
import { ErrorService } from '@/services/ErrorService.js';
import { createErrorResult } from '@/utils/error-handler.js';
import { formatToolDescription } from '@/handlers/tools/standards/index.js';
import {
  UniversalUpsertService,
  type UpsertResult,
} from '@/services/UniversalUpsertService.js';

/**
 * Issue #1191: either/or validation (match vs record_id) lives in code, not
 * in the input schema — top-level oneOf/allOf/anyOf are banned by MCP client
 * limitations (see CLAUDE.md "MCP Tool Schema Constraints"). The validator
 * emits typed UniversalValidationErrors for these shapes; this is a defensive
 * re-check for direct service-level callers.
 */
function assertUpsertShape(params: UniversalUpsertParams): void {
  const hasMatch =
    params.match &&
    typeof params.match === 'object' &&
    !Array.isArray(params.match) &&
    typeof params.match.attribute === 'string' &&
    params.match.attribute.trim().length > 0 &&
    typeof params.match.value === 'string' &&
    params.match.value.trim().length > 0;

  if (!hasMatch) {
    throw new Error(
      'upsert_record requires match: { attribute, value } with non-empty strings (e.g. { attribute: "email", value: "jane@acme.com" })'
    );
  }

  if (
    params.values === undefined ||
    params.values === null ||
    typeof params.values !== 'object' ||
    Array.isArray(params.values) ||
    Object.keys(params.values).length === 0
  ) {
    throw new Error(
      'upsert_record requires values: a non-empty object of attributes to set on create or update'
    );
  }

  for (const [name, value] of [
    ['create_if_missing', params.create_if_missing],
    ['dry_run', params.dry_run],
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Error(`${name} must be a boolean`);
    }
  }
}

function formatUpsertResult(result: UpsertResult): string {
  if (!result || typeof result !== 'object') {
    return 'No upsert result';
  }

  const lines = [result.message];
  if (result.record_id) {
    lines.push(`Record ID: ${result.record_id}`);
  }
  if (result.changed_fields.length > 0) {
    lines.push(`Fields: ${result.changed_fields.join(', ')}`);
  }
  if (result.planned_action) {
    lines.push(`Planned action: ${result.planned_action}`);
  }
  return lines.join('\n');
}

export const upsertRecordConfig: UniversalToolConfig<
  UniversalUpsertParams,
  UpsertResult
> = {
  name: 'upsert_record',
  handler: async (params: UniversalUpsertParams): Promise<UpsertResult> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'upsert_record',
        params
      ) as UniversalUpsertParams;
      assertUpsertShape(sanitizedParams);
      return await UniversalUpsertService.upsertRecord(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'upsert_record',
        params?.resource_type ?? 'unknown',
        error
      );
    }
  },
  formatResult: (result: UpsertResult): string => {
    try {
      return formatUpsertResult(result);
    } catch (error: unknown) {
      const fallback = createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        'upsert_record#format',
        'FORMAT'
      ) as { content?: Array<{ text?: string }> };
      return fallback.content?.[0]?.text || 'Error formatting upsert result';
    }
  },
  structuredOutput: (result: UpsertResult): Record<string, unknown> =>
    result as unknown as Record<string, unknown>,
};

export const upsertRecordDefinition = {
  name: 'upsert_record',
  description: formatToolDescription({
    capability:
      'Idempotently create-or-update one Attio record by exact-matching a unique attribute (email for people, domains for companies, or any unique slug), preventing duplicate records during enrichment and sync',
    boundaries:
      'update more than one record, match on partial or fuzzy values, or create a record with a caller-provided record_id',
    constraints:
      'Requires resource_type, match { attribute, value }, and values; record_id optionally targets an existing record; multiple matches abort without writing; dry_run previews without writing',
    requiresApproval: true,
    recoveryHint:
      'On an ambiguous-match error, inspect the reported record ids with get_record_details and update the intended one with update_record; call discover_record_attributes if the match attribute slug is unknown.',
  }),
  inputSchema: upsertRecordSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
};
