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
function resultContract(success: z.ZodType) {
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

// Mutation projections retain their existing JSON-text shape during phase one.
export const recordWriteResultContract = resultContract(recordDataSchema);
export const recordDeleteResultContract = resultContract(
  z.strictObject({ success: z.literal(true), record_id: identifier })
);
const upsertDataSchema = z.strictObject({
  action: z.enum(['created', 'updated', 'noop', 'dry_run']),
  planned_action: z.enum(['created', 'updated', 'noop']).optional(),
  resource_type: identifier,
  record_id: identifier.optional(),
  matched_on: z.union([
    z.strictObject({ attribute: identifier, value: identifier }),
    z.strictObject({ record_id: identifier }),
  ]),
  changed_fields: z.array(identifier),
  message: z.string(),
  concurrent_duplicates: z.array(identifier).optional(),
});
export const upsertResultContract = resultContract(
  z.union([
    upsertDataSchema.extend({
      action: z.enum(['created', 'updated', 'noop']),
      record_id: identifier,
    }),
    upsertDataSchema.extend({ action: z.literal('dry_run') }),
  ])
);
const mergeField = z.strictObject({
  attribute: identifier,
  kind: z.enum(['fill', 'conflict', 'dangerous_empty_fill']),
  primary_value: z.json().optional(),
  leftover_value: z.json().optional(),
  reason: z.string().optional(),
});
const mergePlan = z.strictObject({
  primary_record_id: identifier,
  leftover_record_id: identifier,
  fills: z.array(mergeField),
  conflicts: z.array(mergeField),
  dangerous_fills: z.array(mergeField),
  linked_mismatches: z.array(
    z.strictObject({
      attribute: identifier,
      primary_value: z.json().optional(),
      leftover_value: z.json().optional(),
    })
  ),
  requires_linked_mismatch_override: z.boolean(),
  flagged_attribute_slugs: z.array(identifier),
  fingerprint: identifier,
});
export const mergeResultContract = resultContract(
  z.union([
    z.strictObject({
      mode: z.literal('dry_run'),
      plan: mergePlan,
      message: z.string(),
    }),
    z.strictObject({
      mode: z.literal('complete'),
      status: z.literal(200),
      new_record_id: identifier,
      original_record_ids: z.array(identifier),
      warning: z.string(),
      plan: mergePlan,
      message: z.string().optional(),
    }),
    z.strictObject({
      mode: z.literal('wait'),
      status: z.literal(202),
      new_record_id: identifier,
      original_record_ids: z.array(identifier),
      warning: z.string(),
      plan: mergePlan,
      message: z.string().optional(),
    }),
  ])
);

// Universal read families preserve native maps/groups rather than guessing that
// any object with a `data` property is an API wrapper.
const attributeDataSchema = z
  .object({
    id: z.union([identifier, z.record(z.string(), z.json())]).optional(),
    api_slug: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
  })
  .catchall(z.json());
const metadataDataSchema = z
  .object({
    attributes: z.array(attributeDataSchema).optional(),
    all: z.array(attributeDataSchema).optional(),
    standard: z.array(z.union([z.string(), attributeDataSchema])).optional(),
    custom: z.array(z.union([z.string(), attributeDataSchema])).optional(),
    mappings: z.record(z.string(), z.string()).optional(),
    resource_type: z.string().optional(),
    count: z.number().int().nonnegative().optional(),
  })
  .catchall(z.json());
export const metadataResultContract = resultContract(
  z.union([
    z.strictObject({
      data: z.array(attributeDataSchema),
      count: z.number().int().nonnegative(),
    }),
    z.strictObject({
      data: z.union([metadataDataSchema, z.record(z.string(), z.json())]),
    }),
  ])
);
const optionDataSchema = z
  .object({
    id: z.union([identifier, z.record(z.string(), z.json())]).optional(),
    title: z.string(),
    value: z.string().optional(),
    is_archived: z.boolean().optional(),
    status_type: z.string().optional(),
  })
  .catchall(z.json());
export const attributeOptionsResultContract = resultContract(
  z.strictObject({
    data: z.array(optionDataSchema),
    count: z.number().int().nonnegative(),
    attribute_type: z.enum(['select', 'status']),
  })
);
export const detailedInfoResultContract = resultContract(
  z.strictObject({
    data: recordDataSchema,
  })
);
const interactionDataSchema = z.strictObject({
  date: z.string().nullable(),
  interaction_type: z.string().nullable(),
  owner_actor_type: z.string().nullable(),
  owner_actor_id: z.string().nullable(),
});
export const interactionsResultContract = resultContract(
  z.strictObject({
    data: z.strictObject({
      record_id: identifier,
      resource_type: identifier,
      record_name: z.string().nullable(),
      interactions: z.record(z.string(), interactionDataSchema.nullable()),
    }),
  })
);
const batchItemContext = {
  index: z.number().int().nonnegative(),
  query: z.string().optional(),
  record_id: identifier.optional(),
};
const batchItemSchema = z.union([
  z.strictObject({
    ...batchItemContext,
    success: z.literal(true),
    result: z.union([
      recordDataSchema,
      z.array(recordDataSchema),
      z.strictObject({
        success: z.literal(true),
        record_id: identifier,
      }),
    ]),
  }),
  z.strictObject({
    ...batchItemContext,
    success: z.literal(false),
    error: executionErrorSchema.shape.error,
  }),
]);
export const batchResultContract = resultContract(
  z.strictObject({
    data: z.array(batchItemSchema),
    count: z.number().int().nonnegative(),
    summary: z.strictObject({
      total: z.number().int().nonnegative(),
      successful: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    }),
  })
);
// Search successes always contain record arrays; writes/get/delete cannot pass
// as batch-search successes even though both families retain per-item errors.
export const batchSearchResultContract = resultContract(
  z.strictObject({
    data: z.array(
      z.union([
        z.strictObject({
          ...batchItemContext,
          query: z.string(),
          success: z.literal(true),
          result: z.array(recordDataSchema),
        }),
        z.strictObject({
          ...batchItemContext,
          query: z.string(),
          success: z.literal(false),
          error: executionErrorSchema.shape.error,
        }),
      ])
    ),
    count: z.number().int().nonnegative(),
    summary: z.strictObject({
      total: z.number().int().nonnegative(),
      successful: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    }),
  })
);
