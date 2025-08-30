/**
 * Shared extraction and normalization utilities for create services
 * 
 * Extracted from MockService to be shared between AttioCreateService and MockCreateService
 * without coupling to environment-specific logic.
 */

import { extractRecordId } from '../../utils/validation/uuid-validation.js';
import type { AttioRecord } from '../../types/attio.js';

/**
 * Normalizes client responses and adapts id → { id: { record_id } }.
 * Handles various shapes: response | response.data | { data } | { record } | { id: string } | { record_id: string }
 */
export function extractAttioRecord(response: any): AttioRecord | null {
  const payload = (response && (response.data ?? response)) ?? null;
  const maybeData = (payload && (payload.data ?? payload)) ?? null;

  // Peel { record: {...} } if present
  let rec = maybeData && typeof maybeData === 'object' && 'record' in maybeData
    ? (maybeData as any).record
    : maybeData;

  // If empty object, try to salvage from headers (e.g., Location)
  const loc = response?.headers?.location || response?.headers?.Location;
  if (
    (!rec || (typeof rec === 'object' && Object.keys(rec).length === 0)) &&
    typeof loc === 'string'
  ) {
    const rid = extractRecordId(loc);
    if (rid) return { id: { record_id: rid } } as AttioRecord;
  }

  if (rec && typeof rec === 'object') {
    const r: any = rec;

    // id as string → adapt
    if (typeof r.id === 'string') return { ...r, id: { record_id: r.id } };

    // explicit record_id → adapt
    if (
      typeof r.record_id === 'string' &&
      (!r.id || typeof r.id !== 'object')
    ) {
      return { ...r, id: { record_id: r.record_id } };
    }
  }

  return rec;
}

/**
 * Validates if a record looks like a successfully created Attio record
 */
export function looksLikeCreatedRecord(record: any): boolean {
  return record &&
    typeof record === 'object' &&
    (('id' in record && (record as any).id?.record_id) ||
      'record_id' in record ||
      'web_url' in record ||
      'created_at' in record);
}

/**
 * Generates deterministic mock ID for consistency in testing
 */
export function generateMockId(prefix = '12345678-1234-4000'): string {
  const timestamp = Date.now().toString().slice(-12);
  return `${prefix}-${timestamp}`;
}

/**
 * Shared validation utilities
 */
export function assertLooksLikeCreated(record: any, context: string): void {
  if (!looksLikeCreatedRecord(record)) {
    throw new Error(`${context} returned an empty/invalid record payload`);
  }
}

/**
 * Debug utilities for development environments
 */
export function isTestRun(): boolean {
  return process.env.E2E_MODE === 'true' || process.env.NODE_ENV === 'test';
}

export function debugRecordShape(record: any): Record<string, any> {
  return {
    hasIdObj: !!(record as any)?.id?.record_id,
    idType: typeof (record as any)?.id,
    keys: Object.keys(record || {}),
  };
}