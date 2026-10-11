import { defineOperationTool } from '@/handlers/tools/operation-descriptor.js';
import { upsertResultContract } from '@/handlers/tools/result-schemas.js';
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
      'records_upsert requires match: { attribute, value } with non-empty strings (e.g. { attribute: "email", value: "jane@acme.com" })'
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
      'records_upsert requires values: a non-empty object of attributes to set on create or update'
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
  name: 'records_upsert',
  ...upsertResultContract,
  handler: async (params: UniversalUpsertParams): Promise<UpsertResult> => {
    try {
      const sanitizedParams = validateUniversalToolParams(
        'records_upsert',
        params
      ) as UniversalUpsertParams;
      assertUpsertShape(sanitizedParams);
      return await UniversalUpsertService.upsertRecord(sanitizedParams);
    } catch (error: unknown) {
      throw ErrorService.createUniversalError(
        'records_upsert',
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
        'records_upsert#format',
        'FORMAT'
      ) as { content?: Array<{ text?: string }> };
      return fallback.content?.[0]?.text || 'Error formatting upsert result';
    }
  },
  structuredOutput: (result: UpsertResult): Record<string, unknown> =>
    result as unknown as Record<string, unknown>,
};

export const upsertRecordDefinition = defineOperationTool({
  name: 'records_upsert',
  facts: {
    operation: {
      authRequired: true,
      pagination: { kind: 'none', supported: false, cap: null },
      action: 'write',
      resourceTypes: ['people', 'companies', 'deals'],
      customObjectSlugs: true,
      readOnly: false,
      destructive: false,
      idempotent: true,
    },
    guidance: {
      capability:
        'Create or update one record by exact match on a unique attribute.',
      boundaries:
        'match fuzzily, touch more than one record, or accept a caller-supplied record_id as the match key.',
      constraints:
        'May require explicit user approval from the host. Requires resource_type, match {attribute,value} and values; multiple matches abort without writing; dry_run previews. Custom resource slugs must be configured in this server.',
      recovery:
        'On ambiguity, read the reported identifiers and update the intended one.',
      alternatives: ['records_create', 'records_update'],
    },
  },
  inputSchema: upsertRecordSchema,
});
