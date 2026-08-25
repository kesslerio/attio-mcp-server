import type { AttioRecord } from '@/types/attio.js';
import { isValidUUID } from '@/utils/validation/uuid-validation.js';

const OMITTED_ATTRIBUTES = new Set(['notes', 'tasks', 'list_memberships']);
const ALWAYS_DANGEROUS_ATTRIBUTES = new Set(['stage', 'owner', 'value']);
const LINKED_ATTRIBUTES = new Set(['associated_people', 'associated_company']);

export type DealMergeFieldKind = 'fill' | 'conflict' | 'dangerous_empty_fill';

export interface DealMergeField {
  attribute: string;
  slug: string;
  kind: DealMergeFieldKind;
  primary_value: unknown;
  leftover_value: unknown;
  reason?: string;
}

export interface DealLinkedMismatch {
  attribute: string;
  slug: string;
  primary_value: unknown;
  leftover_value: unknown;
}

export interface DealMergePlan {
  primary_record_id: string;
  live_record_id: string;
  secondary_record_id: string;
  leftover_record_id: string;
  fills: DealMergeField[];
  conflicts: DealMergeField[];
  dangerous_fills: DealMergeField[];
  linked_mismatches: DealLinkedMismatch[];
  requires_linked_mismatch_override: boolean;
  flagged_attribute_slugs: string[];
  fingerprint: string;
}

export interface DealMergeChoiceOptions {
  override_linked_mismatch?: boolean;
}

function asRecordValues(
  record: AttioRecord,
  label: string
): Record<string, unknown> {
  if (!record || typeof record !== 'object') {
    throw new Error(`${label} deal record is required`);
  }

  const recordId = record.id?.record_id;
  if (typeof recordId !== 'string' || !isValidUUID(recordId)) {
    throw new Error(`${label} deal record requires a valid UUID record_id`);
  }

  if (!record.values || typeof record.values !== 'object') {
    throw new Error(`${label} deal record values are required`);
  }

  return record.values as Record<string, unknown>;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value))
    return value.length === 0 || value.every(isEmptyValue);
  if (typeof value !== 'object') return false;

  const objectValue = value as Record<string, unknown>;
  const entries = Object.entries(objectValue);
  if (entries.length === 0) return true;
  return entries.every(([, entryValue]) => isEmptyValue(entryValue));
}

function isFalseValue(value: unknown): boolean {
  if (value === false) return true;
  if (Array.isArray(value)) return value.some(isFalseValue);
  if (value && typeof value === 'object') {
    return isFalseValue((value as Record<string, unknown>).value);
  }
  return false;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, stableValue(entryValue)])
    );
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value)) ?? 'undefined';
}

function referenceIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const reference = item as Record<string, unknown>;
      const id = reference.target_record_id ?? reference.record_id;
      return typeof id === 'string' ? [id] : [];
    })
    .sort();
}

function linkedValuesDiffer(primary: unknown, leftover: unknown): boolean {
  const primaryIds = referenceIds(primary);
  const leftoverIds = referenceIds(leftover);
  return (
    primaryIds.length > 0 &&
    leftoverIds.length > 0 &&
    stableStringify(primaryIds) !== stableStringify(leftoverIds)
  );
}

function makeField(
  attribute: string,
  kind: DealMergeFieldKind,
  primaryValue: unknown,
  leftoverValue: unknown,
  reason?: string
): DealMergeField {
  return {
    attribute,
    slug: attribute,
    kind,
    primary_value: primaryValue,
    leftover_value: leftoverValue,
    ...(reason ? { reason } : {}),
  };
}

function isDangerousFill(attribute: string, leftoverValue: unknown): boolean {
  if (ALWAYS_DANGEROUS_ATTRIBUTES.has(attribute)) return true;
  return attribute === 'consent_to_contact' && isFalseValue(leftoverValue);
}

function buildFingerprintPayload(plan: Omit<DealMergePlan, 'fingerprint'>) {
  return {
    primary_record_id: plan.primary_record_id,
    leftover_record_id: plan.leftover_record_id,
    fills: plan.fills,
    conflicts: plan.conflicts,
    dangerous_fills: plan.dangerous_fills,
    linked_mismatches: plan.linked_mismatches,
    flagged_attribute_slugs: plan.flagged_attribute_slugs,
  };
}

/** Build a side-effect-free plan from the current primary and leftover deals. */
export function buildDealMergePlan(
  primary: AttioRecord,
  leftover: AttioRecord
): DealMergePlan {
  const primaryValues = asRecordValues(primary, 'Primary');
  const leftoverValues = asRecordValues(leftover, 'Leftover');
  const primaryRecordId = primary.id.record_id;
  const leftoverRecordId = leftover.id.record_id;

  if (primaryRecordId === leftoverRecordId) {
    throw new Error('A deal cannot be merged with itself');
  }

  const fills: DealMergeField[] = [];
  const conflicts: DealMergeField[] = [];
  const dangerousFills: DealMergeField[] = [];
  const linkedMismatches: DealLinkedMismatch[] = [];
  const attributes = new Set([
    ...Object.keys(primaryValues),
    ...Object.keys(leftoverValues),
  ]);

  for (const attribute of [...attributes].sort()) {
    if (OMITTED_ATTRIBUTES.has(attribute)) continue;

    const primaryValue = primaryValues[attribute];
    const leftoverValue = leftoverValues[attribute];
    const primaryEmpty = isEmptyValue(primaryValue);
    const leftoverEmpty = isEmptyValue(leftoverValue);

    if (primaryEmpty && leftoverEmpty) continue;

    if (LINKED_ATTRIBUTES.has(attribute)) {
      if (linkedValuesDiffer(primaryValue, leftoverValue)) {
        linkedMismatches.push({
          attribute,
          slug: attribute,
          primary_value: primaryValue,
          leftover_value: leftoverValue,
        });
      }
      if (primaryEmpty && !leftoverEmpty) {
        fills.push(makeField(attribute, 'fill', primaryValue, leftoverValue));
      }
      continue;
    }

    if (primaryEmpty && !leftoverEmpty) {
      const dangerous = isDangerousFill(attribute, leftoverValue);
      const field = makeField(
        attribute,
        dangerous ? 'dangerous_empty_fill' : 'fill',
        primaryValue,
        leftoverValue,
        dangerous
          ? 'This empty-primary fill requires an explicit keep or skip'
          : undefined
      );
      if (dangerous) dangerousFills.push(field);
      else fills.push(field);
      continue;
    }

    if (
      !primaryEmpty &&
      !leftoverEmpty &&
      stableStringify(primaryValue) !== stableStringify(leftoverValue)
    ) {
      conflicts.push(
        makeField(attribute, 'conflict', primaryValue, leftoverValue)
      );
    }
  }

  const flaggedAttributeSlugs = [
    ...new Set([
      ...fills.map((field) => field.attribute),
      ...conflicts.map((field) => field.attribute),
      ...dangerousFills.map((field) => field.attribute),
      ...linkedMismatches.map((field) => field.attribute),
    ]),
  ].sort();

  const planWithoutFingerprint: Omit<DealMergePlan, 'fingerprint'> = {
    primary_record_id: primaryRecordId,
    live_record_id: primaryRecordId,
    secondary_record_id: leftoverRecordId,
    leftover_record_id: leftoverRecordId,
    fills,
    conflicts,
    dangerous_fills: dangerousFills,
    linked_mismatches: linkedMismatches,
    requires_linked_mismatch_override: linkedMismatches.length > 0,
    flagged_attribute_slugs: flaggedAttributeSlugs,
  };

  return {
    ...planWithoutFingerprint,
    fingerprint: stableStringify(
      buildFingerprintPayload(planWithoutFingerprint)
    ),
  };
}

export const planDealMerge = buildDealMergePlan;

/** Refuse to execute a resolution set against a changed flagged plan. */
export function assertDealMergePlanFresh(
  expectedPlan: DealMergePlan,
  currentPlan: DealMergePlan
): void {
  if (
    expectedPlan.primary_record_id !== currentPlan.primary_record_id ||
    expectedPlan.leftover_record_id !== currentPlan.leftover_record_id ||
    expectedPlan.fingerprint !== currentPlan.fingerprint
  ) {
    throw new Error(
      'The deal merge plan changed after dry-run; re-run dry-run before confirming'
    );
  }
}

function findFlaggedField(
  plan: DealMergePlan,
  attribute: string
): DealMergeField | undefined {
  return [...plan.fills, ...plan.conflicts, ...plan.dangerous_fills].find(
    (field) => field.attribute === attribute
  );
}

/** Validate keep/skip selections before any mutation begins. */
export function validateDealMergeChoices(
  plan: DealMergePlan,
  keepFromLeftover: string[],
  skipLeftoverAttributes: string[],
  options: DealMergeChoiceOptions = {}
): void {
  const keep = new Set(keepFromLeftover);
  const skip = new Set(skipLeftoverAttributes);

  if (
    keep.size !== keepFromLeftover.length ||
    skip.size !== skipLeftoverAttributes.length
  ) {
    throw new Error(
      'keep_from_leftover and skip_leftover_attributes cannot contain duplicates'
    );
  }

  for (const attribute of keep) {
    if (!findFlaggedField(plan, attribute)) {
      throw new Error(
        `keep_from_leftover contains an unflagged attribute: ${attribute}`
      );
    }
  }
  for (const attribute of skip) {
    const field = plan.dangerous_fills.find(
      (candidate) => candidate.attribute === attribute
    );
    if (!field) {
      throw new Error(
        `skip_leftover_attributes may only clear dangerous fills: ${attribute}`
      );
    }
  }
  for (const attribute of keep) {
    if (skip.has(attribute)) {
      throw new Error(
        `An attribute cannot be both kept and skipped: ${attribute}`
      );
    }
  }

  if (
    plan.requires_linked_mismatch_override &&
    !options.override_linked_mismatch
  ) {
    throw new Error(
      'Linked person or company mismatch requires override_linked_mismatch: true'
    );
  }

  const resolvedDangerous = plan.dangerous_fills.every(
    (field) => keep.has(field.attribute) || skip.has(field.attribute)
  );
  if (!resolvedDangerous) {
    throw new Error(
      'Every dangerous empty-primary fill requires an explicit keep or skip'
    );
  }
}

export function getDealMergePatch(
  plan: DealMergePlan,
  keepFromLeftover: string[]
): Record<string, unknown> {
  return Object.fromEntries(
    keepFromLeftover
      .map((attribute) => findFlaggedField(plan, attribute))
      .filter((field): field is DealMergeField => Boolean(field))
      .map((field) => [field.attribute, field.leftover_value])
  );
}

export function getDealMergeClears(
  plan: DealMergePlan,
  skipLeftoverAttributes: string[]
): Record<string, []> {
  return Object.fromEntries(
    skipLeftoverAttributes.map((attribute) => [attribute, []])
  ) as Record<string, []>;
}
