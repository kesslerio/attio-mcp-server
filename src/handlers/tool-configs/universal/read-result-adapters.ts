import { z } from 'zod';
import { createSecureToolErrorResult } from '@/utils/secure-error-handler.js';
import {
  executionErrorSchema,
  recordDataSchema,
} from '@/handlers/tools/result-schemas.js';

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

const recordsWrapper = z.strictObject({ data: z.array(recordDataSchema) });
export function normalizeRecordCollection(
  result: unknown
): Record<string, unknown> {
  assertReadSuccess(result);
  const data = Array.isArray(result)
    ? result
    : recordsWrapper.parse(result).data;
  return { data, count: data.length, next_cursor: null };
}

export function normalizeMetadata(result: unknown): Record<string, unknown> {
  assertReadSuccess(result);
  if (Array.isArray(result)) return { data: result, count: result.length };
  if (!result || typeof result !== 'object')
    throw new Error('Invalid metadata result');
  // `note` is service-generated usage guidance on grouped discovery. A record
  // attribute named note remains intact in record-value maps.
  const value = result as Record<string, unknown>;
  if (Array.isArray(value.attributes) && typeof value.mappings === 'object') {
    const { note, ...data } = value;
    return { data };
  }
  return { data: result };
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
