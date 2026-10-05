import { z } from 'zod';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import {
  executionErrorSchema,
  recordDataSchema,
} from '@/handlers/tools/result-schemas.js';
import { boundedPaginationMetadata } from '@/handlers/tools/result-cursor.js';

/** Only documented service-error shapes are failures, not CRM attribute keys. */
export function assertReadSuccess<T>(result: T): T {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const value = result as Record<string, unknown>;
    if (value.success === false && typeof value.error === 'string') {
      throw new Error(value.error);
    }
    if (
      typeof value.status === 'number' &&
      value.status >= 400 &&
      value.body &&
      typeof value.body === 'object'
    ) {
      const body = value.body as Record<string, unknown>;
      throw Object.assign(
        new Error(
          typeof body.message === 'string'
            ? body.message
            : 'Read operation failed'
        ),
        { status: value.status }
      );
    }
  }
  return result;
}

const recordsWrapper = z.strictObject({
  data: z.array(recordDataSchema),
  next_cursor: z.string().max(512).nullable().optional(),
  pagination: z
    .strictObject({ supported: z.boolean(), truncated: z.boolean() })
    .optional(),
});
/**
 * Collection adapter: bare arrays stay cursor-less legacy input; envelope
 * input preserves the continuation evidence issued by the query seam (U5).
 */
export function normalizeRecordCollection(
  result: unknown
): Record<string, unknown> {
  assertReadSuccess(result);
  if (Array.isArray(result)) {
    return {
      data: result,
      count: result.length,
      next_cursor: null,
      pagination: boundedPaginationMetadata((result as { truncated?: boolean }).truncated ?? true),
    };
  }
  const envelope = recordsWrapper.parse(result);
  return {
    data: envelope.data,
    count: envelope.data.length,
    ...(envelope.next_cursor !== undefined
      ? { next_cursor: envelope.next_cursor }
      : { next_cursor: null }),
    pagination: envelope.pagination ?? boundedPaginationMetadata(true),
  };
}

/**
 * Metadata collections are finite attribute inventories: the tool discloses
 * that continuation is unsupported while affirming no bounded results were
 * withheld (KTD6).
 */
export function normalizeMetadata(result: unknown): Record<string, unknown> {
  assertReadSuccess(result);
  if (Array.isArray(result)) {
    return {
      data: result,
      count: result.length,
      pagination: boundedPaginationMetadata(false),
    };
  }
  if (!result || typeof result !== 'object')
    throw new Error('Invalid metadata result');
  return { data: result, pagination: boundedPaginationMetadata(false) };
}

export function normalizeDiscoveryMetadata(
  result: unknown
): Record<string, unknown> {
  const normalized = normalizeMetadata(result);
  const value = normalized.data as Record<string, unknown>;
  if (!Array.isArray(value) && typeof value.note === 'string') {
    const { note: _note, ...data } = value;
    return { data, pagination: normalized.pagination };
  }
  return normalized;
}

const batchOutcome = z.object({
  success: z.boolean(),
  index: z.number().int().nonnegative().optional(),
  query: z.string().optional(),
  record_id: z.string().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  error_details: executionErrorSchema.shape.error.optional(),
});
const batchWrapper = z.strictObject({
  operations: z.array(batchOutcome),
  summary: z.strictObject({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
  }),
});

export function normalizeBatch(
  result: unknown,
  readOnly = false
): Record<string, unknown> {
  assertReadSuccess(result);
  const items = Array.isArray(result)
    ? z.array(batchOutcome).parse(result)
    : batchWrapper.parse(result).operations;
  const data = items.map((item, index) => ({
    index: item.index ?? index,
    ...(item.query !== undefined ? { query: item.query } : {}),
    ...(item.record_id !== undefined ? { record_id: item.record_id } : {}),
    success: item.success,
    ...(item.success
      ? { result: item.result }
      : {
          error:
            item.error_details ??
            createSecureToolErrorResult(
              new Error(item.error || 'Batch item failed'),
              {
                uncertainMutation: !readOnly,
              }
            ).structuredContent!.error,
        }),
  }));
  const successful = items.filter((item) => item.success).length;
  return {
    data,
    count: data.length,
    summary: {
      total: data.length,
      successful,
      failed: data.length - successful,
    },
  };
}
