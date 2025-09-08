/**
 * Shared extraction and normalization utilities for create services
 *
 * Extracted from MockService to be shared between AttioCreateService and MockCreateService
 * without coupling to environment-specific logic.
 */

import { extractRecordId } from '../../utils/validation/uuid-validation.js';
import type { AttioRecord } from '../../types/attio.js';

function isRecordLike(x: unknown): x is AttioRecord {
  return (
    !!x && typeof x === 'object' && x.id && typeof x.id.record_id === 'string'
  );
}

function collectCandidates(src: unknown): unknown[] {
  const out: unknown[] = [];
  if (src == null) return out;

  // Common axios/Attio envelopes
  if (src.data) out.push(src.data);
  if (src.data?.data) out.push(src.data.data);
  if (src.data?.record) out.push(src.data.record);
  if (src.record) out.push(src.record);

  // Raw object as a candidate too
  out.push(src);

  // Arrays from bulk or list-like responses
    Array.isArray(src) ? src : null,
    Array.isArray(src?.data) ? src.data : null,
    Array.isArray(src?.data?.records) ? src.data.records : null,
    Array.isArray(src?.records) ? src.records : null,
  ].filter(Boolean) as any[][];
  for (const arr of arrayish) out.push(...arr);

  return out;
}

/**
 * Extract a single Attio record from any Attio/axios envelope.
 * Returns null if we cannot find a record-like shape.
 */
export function extractAttioRecord(src: unknown): AttioRecord | null {

  // First try to find a complete record-like object
  if (rec) return rec;

  // Fallback: try to adapt id formats for partial records
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const c: unknown = candidate;

      // id as string → adapt
      if (typeof c.id === 'string') {
        return { ...c, id: { record_id: c.id } };
      }

      // explicit record_id → adapt
      if (
        typeof c.record_id === 'string' &&
        (!c.id || typeof c.id !== 'object')
      ) {
        return { ...c, id: { record_id: c.record_id } };
      }
    }
  }

  // Last resort: try to salvage from headers (e.g., Location)
  if (typeof loc === 'string') {
    if (rid) return { id: { record_id: rid } } as AttioRecord;
  }

  return null;
}

/**
 * Validates if a record looks like a successfully created Attio record
 */
export function looksLikeCreatedRecord(record: unknown): boolean {
  return isRecordLike(record);
}

/**
 * Generates deterministic mock ID for consistency in testing
 */
export function generateMockId(prefix = '12345678-1234-4000'): string {
  return `${prefix}-${timestamp}`;
}

/**
 * Throws if the object does not look like a freshly created record.
 * Keeps error messages actionable for E2E.
 */
export function assertLooksLikeCreated(rec: unknown, where: string): asserts rec {
  if (!isRecordLike(rec)) {
      rec && typeof rec === 'object' ? Object.keys(rec) : typeof rec;
    // Keep as a normal Error to avoid extra wrapping here; creators add context
    throw new Error(
      `invalid create result at ${where}; expected { id.record_id, values }, got: ${shape}`
    );
  }
}

/**
 * Debug utilities for development environments
 */
export function isTestRun(): boolean {
  return process.env.E2E_MODE === 'true' || process.env.NODE_ENV === 'test';
}

export function debugRecordShape(record: unknown): Record<string, unknown> {
  return {
    hasIdObj: !!(record as any)?.id?.record_id,
    idType: typeof (record as any)?.id,
    keys: Object.keys(record || {}),
  };
}

// --- Output normalization: flatten Attio values into test-friendly shapes ---

  'name',
  'description',
  'record_id',
  'website',
  'google_business_name',
  'google_website',
  'logo_url',
]);

  // keep these as arrays of strings
  'domains',
  'categories',
  'regions',
  'team',
  'associated_deals',
  'associated_workspaces',
  'services',
  'notes',
]);

  'value',
  'text',
  'name',
  'email',
  'domain',
  'url',
  'label',
];

function extractScalarFromObject(key: string, obj: unknown) {
  if (!obj || typeof obj !== 'object') return obj;

  for (const k of prefer) {
    if (typeof v === 'string' || typeof v === 'number') return v;
  }
  return obj;
}

function normalizeField(key: string, val: unknown): unknown {
  if (Array.isArray(val)) {
      .map((x) => extractScalarFromObject(key, x))
      .filter((x) => x != null);

    if (MULTI_VALUE_FIELDS.has(key)) {
      // domains & co → array of strings
      return flat;
    }

    if (SINGLETON_FIELDS.has(key)) {
      // name/description/etc → single string
      return flat[0] ?? null;
    }

    // Generic rule: collapse singletons unless it's a known multi-value field
    return flat.length === 1 ? flat[0] : flat;
  }

  if (val && typeof val === 'object') {
    return extractScalarFromObject(key, val);
  }

  return val;
}

function normalizeValuesObject(
  values?: Record<string, unknown>,
  resourceType?: string
) {
  if (!values || typeof values !== 'object') return values;
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(values)) {
    // People records: keep `name` as Attio-style array entries
    if (resourceType === 'people' && (k === 'name' || k === 'names')) {
      // be defensive: guarantee array-of-objects shape
      out[k] = Array.isArray(v) ? v : v == null ? [] : [{ value: String(v) }];
      continue;
    }

    out[k] = normalizeField(k, v);
  }
  return out;
}

/** Public: normalize one Attio record to MCP/tool output (flatten values). */
export function normalizeRecordForOutput<
  T extends { values?: Record<string, unknown> },
>(rec: T, resourceType?: string): T {
  if (!rec || typeof rec !== 'object') return rec;
  const copy: unknown = { ...rec };
  copy.values = normalizeValuesObject(rec.values, resourceType);
  return copy as T;
}
