import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const executionErrorCodes = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'INVALID_CURSOR',
  'RESULT_ENCODING_FAILED',
  'INTERNAL_ERROR',
] as const;
const domainIdentifierKeys = [
  'record_id',
  'list_id',
  'task_id',
  'note_id',
] as const;

export type ExecutionErrorCode = (typeof executionErrorCodes)[number];

export const executionErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(executionErrorCodes),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
});

/** Runtime and discovery contracts are derived from the same field definitions. */
function resultContract(success: z.ZodObject) {
  const successJson = z.toJSONSchema(success, {
    target: 'draft-7',
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === recordIdSchema) {
        jsonSchema.anyOf = domainIdentifierKeys.map((key) => ({
          required: [key],
        }));
      }
    },
  });
  const errorJson = z.toJSONSchema(executionErrorSchema, { target: 'draft-7' });
  return {
    resultSchema: z.union([success, executionErrorSchema]),
    outputSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object' as const,
      ...(successJson.definitions
        ? { definitions: successJson.definitions }
        : {}),
      properties: { ...successJson.properties, ...errorJson.properties },
      // An object root works with the installed SDK. Each branch is exclusive.
      if: { required: ['error'] },
      then: errorJson,
      else: successJson,
    } as NonNullable<Tool['outputSchema']>,
  };
}

const identifier = z.string().min(1);
const recordIdSchema = z
  .object({
    workspace_id: identifier.optional(),
    object_id: identifier.optional(),
    record_id: identifier.optional(),
    list_id: identifier.optional(),
    task_id: identifier.optional(),
    note_id: identifier.optional(),
  })
  .catchall(z.json())
  .refine(
    (id) => domainIdentifierKeys.some((key) => Boolean(id[key])),
    'A record, list, task, or note identifier is required'
  );

// Keep extensible Attio attributes and list-native fields, including note bodies.
export const recordDataSchema = z
  .object({
    id: recordIdSchema,
    values: z.record(z.string(), z.json()).optional(),
    created_at: z.string().optional(),
    name: z.string().optional(),
    api_slug: z.string().optional(),
    object_slug: z.string().optional(),
  })
  .catchall(z.json());

export const recordDetailsResultContract = resultContract(
  z.strictObject({ data: recordDataSchema })
);
export const recordSearchResultContract = resultContract(
  z.strictObject({
    data: z.array(recordDataSchema),
    count: z.number().int().nonnegative(),
    next_cursor: z.null(),
  })
);
