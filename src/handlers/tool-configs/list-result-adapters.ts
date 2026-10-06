/**
 * List family adapters (U4).
 *
 * Family configs own their normalizers (KTD2); these adapters only project the
 * domain outcomes already produced by the list services and dispatcher wrappers
 * into the shared envelope. Nothing here parses formatted prose.
 */
import { z } from 'zod';
import {
  listConfigDataSchema,
  listDataSchema,
  listEntryDataSchema,
  listMembershipDataSchema,
} from '@/handlers/tools/result-schemas.js';
import { boundedPaginationMetadata } from '@/handlers/tools/result-cursor.js';

function omitAbsentFields(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined)
  );
}

function normalizeEntry(entry: z.infer<typeof listEntryDataSchema>) {
  return omitAbsentFields({
    ...entry,
    ...(entry.id ? { id: omitAbsentFields(entry.id) } : {}),
  });
}

function requiredArg(
  args: Record<string, unknown> | undefined,
  field: string,
  surface: string
): string {
  const value = args?.[field];
  if (typeof value !== 'string' || !value.trim()) {
    // Status 400 keeps the boundary classification at VALIDATION_ERROR (KTD5).
    throw Object.assign(
      new Error(`${field} is required to report the outcome`),
      {
        status: 400,
        surface,
      }
    );
  }
  return value;
}

/** A list collection is always an array of list objects; empty stays an array. */
export function normalizeListCollection(
  result: unknown
): Record<string, unknown> {
  const data = z.array(listDataSchema).parse(result).map(omitAbsentFields);
  // Preserve the producer's completeness evidence; missing evidence cannot
  // establish that the directory inventory is complete.
  return {
    data,
    count: data.length,
    next_cursor: null,
    pagination: boundedPaginationMetadata(
      (result as { truncated?: boolean }).truncated ?? true
    ),
  };
}

export function normalizeListDetails(result: unknown): Record<string, unknown> {
  return { data: omitAbsentFields(listDataSchema.parse(result)) };
}

function entryCollectionEnvelope(
  data: ReturnType<typeof normalizeEntry>[],
  continuation: Record<string, unknown>
): Record<string, unknown> {
  return {
    data,
    count: data.length,
    next_cursor: null,
    ...continuation,
  };
}

export function normalizeListEntryCollection(
  result: unknown
): Record<string, unknown> {
  if (Array.isArray(result)) {
    return entryCollectionEnvelope(
      z.array(listEntryDataSchema).parse(result).map(normalizeEntry),
      {
        pagination: boundedPaginationMetadata(
          (result as { truncated?: boolean }).truncated ?? true
        ),
      }
    );
  }
  const envelope = z
    .strictObject({
      data: z.array(listEntryDataSchema),
      next_cursor: z.string().max(512).nullable(),
      pagination: z.strictObject({
        supported: z.boolean(),
        truncated: z.boolean(),
      }),
    })
    .parse(result);
  return entryCollectionEnvelope(envelope.data.map(normalizeEntry), {
    next_cursor: envelope.next_cursor,
    pagination: envelope.pagination,
  });
}

export function normalizeListEntry(
  result: unknown,
  _resourceType?: string,
  args?: Record<string, unknown>
): Record<string, unknown> {
  const entry = normalizeEntry(listEntryDataSchema.parse(result));
  // Entries created through the parent-record routes may omit list_id; keep the
  // requested identifier so the result stays composable into follow-up calls.
  const listId =
    typeof entry.list_id === 'string'
      ? entry.list_id
      : requiredArg(args, 'listId', 'list entry write');
  return { data: { ...entry, list_id: listId } };
}

/**
 * Removal reports the affected identifiers only (KTD3 delete shape). The
 * upstream service returns a boolean, so the identifiers come from the request.
 */
export function normalizeListEntryDelete(
  result: unknown,
  _resourceType?: string,
  args?: Record<string, unknown>
): Record<string, unknown> {
  if (result !== true) throw new Error('List entry removal did not complete');
  return {
    success: true,
    list_id: requiredArg(args, 'listId', 'list entry removal'),
    entry_id: requiredArg(args, 'entryId', 'list entry removal'),
  };
}

/** manage-list-entry reports either the written entry or the removal outcome. */
export function normalizeListEntryMutation(
  result: unknown,
  resourceType?: string,
  args?: Record<string, unknown>
): Record<string, unknown> {
  return typeof result === 'boolean'
    ? normalizeListEntryDelete(result, resourceType, args)
    : normalizeListEntry(result, resourceType, args);
}

export function normalizeListMemberships(
  result: unknown
): Record<string, unknown> {
  const data = z
    .array(listMembershipDataSchema)
    .parse(result)
    .map(omitAbsentFields);
  // Memberships derive from the record's list entries, a bounded per-record set.
  return {
    data,
    count: data.length,
    next_cursor: null,
    pagination: boundedPaginationMetadata(
      (result as { truncated?: boolean }).truncated ?? true
    ),
  };
}

/** List configuration writes publish the normalized flat projection. */
export function normalizeListConfig(result: unknown): Record<string, unknown> {
  return { data: omitAbsentFields(listConfigDataSchema.parse(result)) };
}
