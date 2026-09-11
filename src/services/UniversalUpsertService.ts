/**
 * UniversalUpsertService - Idempotent create-or-update over universal services
 *
 * Issue #1191: Adds the matching + decision core behind the `upsert_record`
 * tool so enrichment and sync workflows can create-or-update in one call
 * instead of the slow search-then-create/update pattern that pollutes CRMs
 * with duplicates.
 *
 * Invariants:
 * - Exact match only: one `equals` filter on the caller-provided attribute.
 * - Ambiguous matches (>1 record, or a full page spilling into a second page)
 *   never write; the candidate ids are reported.
 * - A lookup that cannot be trusted (failed, truncated, or did not return the
 *   requested record) throws instead of falling through to create — a
 *   never-create-on-uncertain-lookup failure mode only, never a wrong write.
 * - `dry_run` performs the lookup and reports the planned action without any
 *   create or update call.
 * - A matched record whose target fields already equal the requested values
 *   short-circuits to `noop` without a write.
 * - Values are compared against the record's actual attribute values; the
 *   heuristic errs toward "changed" (include the field in the write) so no
 *   requested update is silently dropped.
 * - Create-vs-update is not atomic against concurrent writers (Attio offers no
 *   uniqueness constraint); post-create re-check reports duplicates when they
 *   appear.
 */

import {
  handleUniversalCreate,
  handleUniversalGetDetails,
  handleUniversalSearch,
  handleUniversalUpdate,
} from '@/handlers/tool-configs/universal/shared-handlers.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';

export interface UpsertMatch {
  attribute: string;
  value: string;
}

export interface UpsertParams {
  resource_type: string;
  match: UpsertMatch;
  values: Record<string, unknown>;
  record_id?: string;
  create_if_missing?: boolean;
  dry_run?: boolean;
}

export type UpsertAction = 'created' | 'updated' | 'noop' | 'dry_run';

export interface UpsertResult {
  action: UpsertAction;
  /** Action that would be taken when dry_run prevented the write. */
  planned_action?: Exclude<UpsertAction, 'dry_run'>;
  resource_type: string;
  record_id?: string;
  matched_on: UpsertMatch | { record_id: string };
  changed_fields: string[];
  message: string;
  /** Set when a post-create re-check found other records on the same key. */
  concurrent_duplicates?: string[];
}

/**
 * Thrown when more than one record matches the upsert match pair. Carries the
 * candidate ids so the caller can disambiguate without another search.
 */
export class AmbiguousUpsertMatchError extends Error {
  readonly recordIds: string[];

  constructor(resourceType: string, match: UpsertMatch, recordIds: string[]) {
    super(
      `Ambiguous match: ${recordIds.length} ${resourceType} records match ${match.attribute}="${match.value}" (${recordIds.join(', ')}). No record was written. Narrow the match or update a specific record with update_record.`
    );
    // ErrorService.createUniversalError wraps unknown errors and preserves
    // this error as the `cause`, so callers can recover the candidate ids
    // from either the error itself or its cause chain.
    this.name = 'AmbiguousUpsertMatchError';
    this.recordIds = recordIds;
  }
}

/**
 * Thrown when the existence lookup could not be trusted (search error,
 * truncated page, or by-id fetch that did not return the requested record).
 * Upsert refuses to create in this state so a flaky lookup can never produce
 * the duplicate the tool exists to prevent.
 */
export class UpsertLookupUncertainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpsertLookupUncertainError';
  }
}

const MATCH_SEARCH_PAGE_SIZE = 10;

function extractRecordId(record: Record<string, unknown>): string | undefined {
  const id = record.id as Record<string, unknown> | undefined;
  const fromId =
    (typeof id?.record_id === 'string' && id.record_id) ||
    (typeof id?.list_id === 'string' && id.list_id) ||
    undefined;
  if (fromId) return String(fromId);
  const direct = record.record_id;
  return typeof direct === 'string' && direct ? direct : undefined;
}

function recordFieldValue(
  record: Record<string, unknown>,
  attribute: string
): unknown {
  const values = record.values as Record<string, unknown> | undefined;
  return values && attribute in values ? values[attribute] : undefined;
}

/**
 * Normalize a value for equality comparison. Attio returns attribute values
 * as arrays of typed entries (e.g. `[{ value: "acme.com" }]`), while callers
 * pass plain values or Attio-shaped entry arrays. Flattening both sides to
 * sorted primitive sets lets a plain-value request compare correctly against
 * stored entries regardless of entry metadata or ordering.
 */
function normalizeForCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeForCompare(entry))
      .filter((entry) => entry !== undefined)
      .sort((a, b) => {
        const left = String(a);
        const right = String(b);
        return left < right ? -1 : left > right ? 1 : 0;
      });
  }
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const entry = value as Record<string, unknown>;
    if (entry.value !== undefined) return normalizeForCompare(entry.value);
    return undefined;
  }
  return value;
}

/**
 * Compare an existing record value with a requested upsert value.
 *
 * False positives here silently drop a requested field from the write, so
 * every uncertain shape returns false (include the field). Only structural
 * equality of the flattened primitive sets counts as "already matches".
 */
export function fieldAlreadyMatches(
  existing: unknown,
  requested: unknown
): boolean {
  if (existing === undefined) return false;
  if (existing === requested) return true;
  const existingNormalized = normalizeForCompare(existing);
  const requestedNormalized = normalizeForCompare(requested);
  if (existingNormalized === undefined || requestedNormalized === undefined) {
    return false;
  }
  // Scalars and single-entry arrays must compare equal: normalize both sides
  // to arrays before the structural comparison.
  const asArray = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : [value];
  return (
    JSON.stringify(asArray(existingNormalized)) ===
    JSON.stringify(asArray(requestedNormalized))
  );
}

function buildNoopResult(
  params: UpsertParams,
  recordId: string,
  matchedOn: UpsertResult['matched_on']
): UpsertResult {
  return {
    action: 'noop',
    resource_type: params.resource_type,
    record_id: recordId,
    matched_on: matchedOn,
    changed_fields: [],
    message: `No write needed: record ${recordId} already has the requested values`,
  };
}

function buildPlannedResult(
  params: UpsertParams,
  plannedAction: Exclude<UpsertAction, 'dry_run'>,
  recordId: string | undefined,
  matchedOn: UpsertResult['matched_on'],
  changedFields: string[],
  messageOverride?: string
): UpsertResult {
  const target = recordId ? `record ${recordId}` : 'a new record';
  return {
    action: 'dry_run',
    planned_action: plannedAction,
    resource_type: params.resource_type,
    record_id: recordId,
    matched_on: matchedOn,
    changed_fields: changedFields,
    message:
      messageOverride ??
      `Dry run: would ${plannedAction} ${target}. No write performed.`,
  };
}

function buildMatchFilters(match: UpsertMatch): Record<string, unknown> {
  return {
    filters: [
      {
        attribute: { slug: match.attribute },
        condition: 'equals',
        value: match.value,
      },
    ],
  };
}

function collectRecordIds(records: Record<string, unknown>[]): string[] {
  return records
    .map((record) => extractRecordId(record))
    .filter((id): id is string => Boolean(id));
}

async function searchMatchPage(
  params: UpsertParams,
  offset: number
): Promise<Record<string, unknown>[]> {
  const results = await handleUniversalSearch({
    resource_type: params.resource_type as never,
    filters: buildMatchFilters(params.match) as never,
    limit: MATCH_SEARCH_PAGE_SIZE,
    offset,
  });
  return results as unknown as Record<string, unknown>[];
}

/**
 * Locate the single record matching the pair. Throws on ambiguity — including
 * a full first page spilling into a second page, which proves more matches
 * exist beyond the page window.
 */
async function resolveExistingByMatch(
  params: UpsertParams
): Promise<Record<string, unknown> | undefined> {
  const firstPage = await searchMatchPage(params, 0);

  if (firstPage.length > 1) {
    throw new AmbiguousUpsertMatchError(
      params.resource_type,
      params.match,
      collectRecordIds(firstPage)
    );
  }

  if (firstPage.length === MATCH_SEARCH_PAGE_SIZE) {
    const secondPage = await searchMatchPage(params, MATCH_SEARCH_PAGE_SIZE);
    if (secondPage.length > 0) {
      throw new UpsertLookupUncertainError(
        `More than ${MATCH_SEARCH_PAGE_SIZE} ${params.resource_type} records match ${params.match.attribute}="${params.match.value}". The match set is too large to disambiguate safely; no record was written.`
      );
    }
  }

  return firstPage[0];
}

async function searchMatchCount(
  params: UpsertParams
): Promise<Record<string, unknown>[]> {
  return searchMatchPage(params, 0);
}

async function resolveExistingByRecordId(
  params: UpsertParams
): Promise<Record<string, unknown>> {
  const details = await handleUniversalGetDetails({
    resource_type: params.resource_type,
    record_id: params.record_id as string,
  });
  const fetched = details as unknown as Record<string, unknown>;
  const fetchedId = extractRecordId(fetched);

  if (!fetched || Object.keys(fetched).length === 0) {
    throw new UpsertLookupUncertainError(
      `No ${params.resource_type} record found for record_id ${params.record_id}. upsert_record does not create records with a caller-provided id; omit record_id to match by attribute instead.`
    );
  }
  if (fetchedId && fetchedId !== params.record_id) {
    throw new UpsertLookupUncertainError(
      `Lookup for record_id ${params.record_id} returned a different record (${fetchedId}); refusing to write an unrelated record.`
    );
  }
  return fetched;
}

function buildUpdatePayload(
  existing: Record<string, unknown>,
  values: Record<string, unknown>
): { payload: Record<string, unknown>; changedFields: string[] } {
  const payload: Record<string, unknown> = {};
  const changedFields: string[] = [];
  for (const [attribute, requested] of Object.entries(values)) {
    if (fieldAlreadyMatches(recordFieldValue(existing, attribute), requested)) {
      continue;
    }
    payload[attribute] = requested;
    changedFields.push(attribute);
  }
  return { payload, changedFields };
}

function buildCreateData(params: UpsertParams): Record<string, unknown> {
  // values wins over the match pair for the same attribute so a caller's
  // richer Attio-shaped entry array is never clobbered by the bare match
  // string; the match pair only fills an attribute values does not set.
  return {
    ...(params.match
      ? { [params.match.attribute]: params.match.value }
      : undefined),
    ...params.values,
  };
}

async function updateMatchedRecord(
  params: UpsertParams,
  existing: Record<string, unknown>,
  dryRun: boolean
): Promise<UpsertResult> {
  const recordId = extractRecordId(existing);
  if (!recordId) {
    throw new UpsertLookupUncertainError(
      `The matched ${params.resource_type} record had no parseable record id; refusing to update an unidentified record.`
    );
  }
  const { payload, changedFields } = buildUpdatePayload(
    existing,
    params.values
  );

  if (changedFields.length === 0) {
    return dryRun
      ? buildPlannedResult(params, 'noop', recordId, params.match, [])
      : buildNoopResult(params, recordId, params.match);
  }
  if (dryRun) {
    return buildPlannedResult(
      params,
      'updated',
      recordId,
      params.match,
      changedFields
    );
  }
  await handleUniversalUpdate({
    resource_type: params.resource_type,
    record_id: recordId,
    record_data: payload,
  });
  return {
    action: 'updated',
    resource_type: params.resource_type,
    record_id: recordId,
    matched_on: params.match,
    changed_fields: changedFields,
    message: `Updated record ${recordId}: ${changedFields.join(', ')}`,
  };
}

export class UniversalUpsertService {
  /**
   * Idempotent create-or-update for any resource type the universal create /
   * update / search services support, including config-discovered custom
   * objects.
   */
  static async upsertRecord(params: UpsertParams): Promise<UpsertResult> {
    const dryRun = params.dry_run === true;
    const createIfMissing = params.create_if_missing !== false;

    if (params.record_id !== undefined) {
      if (!isValidUUID(params.record_id)) {
        throw new Error(
          'record_id must be a valid UUID when provided for upsert_record'
        );
      }
      const existing = await resolveExistingByRecordId(params);
      const recordId = extractRecordId(existing) ?? params.record_id;
      const matchedOn: UpsertResult['matched_on'] = {
        record_id: params.record_id,
      };
      // The match pair stays advisory on this path; the record must still end
      // up satisfying it so a later match-based upsert finds this record
      // instead of creating a duplicate.
      const values: Record<string, unknown> = {
        ...params.values,
        [params.match.attribute]: params.match.value,
      };
      const { payload, changedFields } = buildUpdatePayload(existing, values);

      if (changedFields.length === 0) {
        return dryRun
          ? buildPlannedResult(params, 'noop', recordId, matchedOn, [])
          : buildNoopResult(params, recordId, matchedOn);
      }
      if (dryRun) {
        return buildPlannedResult(
          params,
          'updated',
          recordId,
          matchedOn,
          changedFields
        );
      }
      await handleUniversalUpdate({
        resource_type: params.resource_type,
        record_id: recordId,
        record_data: payload,
      });
      return {
        action: 'updated',
        resource_type: params.resource_type,
        record_id: recordId,
        matched_on: matchedOn,
        changed_fields: changedFields,
        message: `Updated record ${recordId}: ${changedFields.join(', ')}`,
      };
    }

    const existing = await resolveExistingByMatch(params);

    if (existing) {
      return updateMatchedRecord(params, existing, dryRun);
    }

    if (!createIfMissing) {
      if (dryRun) {
        return buildPlannedResult(
          params,
          'noop',
          undefined,
          params.match,
          [],
          `Dry run: would fail — no ${params.resource_type} record matches ${params.match.attribute}="${params.match.value}" and create_if_missing is false. No write performed.`
        );
      }
      throw new Error(
        `No ${params.resource_type} record matches ${params.match.attribute}="${params.match.value}" and create_if_missing is false. No record was created.`
      );
    }

    const createData = buildCreateData(params);
    const createFields = Object.keys(createData);
    if (dryRun) {
      return buildPlannedResult(
        params,
        'created',
        undefined,
        params.match,
        createFields
      );
    }

    const created = (await handleUniversalCreate({
      resource_type: params.resource_type,
      record_data: createData,
    })) as unknown as Record<string, unknown>;
    const recordId = extractRecordId(created);

    const result: UpsertResult = {
      action: 'created',
      resource_type: params.resource_type,
      record_id: recordId,
      matched_on: params.match,
      changed_fields: createFields,
      message: `Created record${recordId ? ` ${recordId}` : ''} with ${params.match.attribute}="${params.match.value}"`,
    };

    // Post-create collision re-check: cheap detection of the create-vs-update
    // race (Attio has no uniqueness constraint). Detection only — never
    // automatic deletion.
    const postCreateMatches = await searchMatchCount(params);
    const duplicateIds = collectRecordIds(postCreateMatches).filter(
      (id) => id !== recordId
    );
    if (duplicateIds.length > 0) {
      result.concurrent_duplicates = duplicateIds;
      result.message += ` — duplicate records on the same match key detected: ${duplicateIds.join(', ')}. Review and merge with merge_records or delete_record.`;
    }

    return result;
  }
}
