/**
 * Record Data Input Normalization
 *
 * Handles normalization of record_data inputs for the update_record tool.
 * Converts various input shapes to the standard format without mutating the original input.
 *
 * @see Issue #1099 - SRP compliance: separates normalization from validation
 */

import type { SanitizedObject } from '../../handlers/tool-configs/universal/schemas/common/types.js';

/**
 * Parameters that may need normalization
 */
interface NormalizableParams {
  resource_type?: string;
  record_id?: string;
  record_data?: unknown;
  return_details?: boolean;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Normalized update parameters
 */
export interface NormalizedUpdateParams {
  resource_type: string;
  record_id: string;
  record_data: SanitizedObject;
  return_details?: boolean;
}

/**
 * Keys that should not be treated as record data fields
 */
const IGNORED_KEYS = new Set([
  'resource_type',
  'record_id',
  'return_details',
  'data',
]);

/**
 * RecordDataNormalizer provides immutable input normalization for update operations.
 *
 * Design principles:
 * - Never mutates input objects - always returns new copies
 * - Follows PeopleDataNormalizer pattern for consistency
 * - Separated from validation logic (SRP compliance)
 */
export class RecordDataNormalizer {
  /**
   * Check if parameters need normalization.
   *
   * Returns true if:
   * - record_data is missing but `data` field is present
   * - record_data is missing but there are extra fields that could be record data
   */
  static needsNormalization(params: unknown): boolean {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return false;
    }

    const p = params as NormalizableParams;

    // Already has record_data - no normalization needed
    if (p.record_data !== undefined) {
      return false;
    }

    // Has `data` field that should be mapped to record_data
    if (p.data !== undefined) {
      return true;
    }

    // Check for extra fields that could be record data
    const extraFields = Object.keys(p).filter((key) => !IGNORED_KEYS.has(key));
    return extraFields.length > 0;
  }

  /**
   * Normalize parameters into standard format.
   *
   * Handles three input patterns:
   * 1. { record_data: {...} } - Already normalized, returns copy
   * 2. { data: {...} } - Legacy format, maps to record_data
   * 3. { name: "...", status: "..." } - Flat fields, collects into record_data
   *
   * @returns New object with normalized record_data (never mutates input)
   */
  static normalize(params: unknown): NormalizableParams {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return { record_data: {} } as NormalizableParams;
    }

    const p = params as NormalizableParams;

    // Start with a shallow copy of all standard fields
    const result: NormalizableParams = {
      resource_type: p.resource_type,
      record_id: p.record_id,
      return_details: p.return_details,
    };

    // If record_data exists, copy it
    if (p.record_data !== undefined) {
      result.record_data = this.copyRecordData(p.record_data);
      return result;
    }

    // Handle legacy `data` field
    if (p.data !== undefined) {
      result.record_data = this.copyRecordData(p.data);
      return result;
    }

    // Collect extra fields as record data
    const recordData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(p)) {
      if (!IGNORED_KEYS.has(key)) {
        recordData[key] = value;
      }
    }

    if (Object.keys(recordData).length > 0) {
      result.record_data = recordData as SanitizedObject;
    }

    return result;
  }

  /**
   * Create a deep copy of record data to prevent mutation
   */
  private static copyRecordData(data: unknown): SanitizedObject {
    if (data === null || data === undefined) {
      return {} as SanitizedObject;
    }

    if (typeof data === 'string') {
      // JSON string - parse it (validation happens elsewhere)
      try {
        return JSON.parse(data) as SanitizedObject;
      } catch {
        // Return as-is, let validation catch the error
        return {} as SanitizedObject;
      }
    }

    if (typeof data !== 'object' || Array.isArray(data)) {
      return {} as SanitizedObject;
    }

    // Deep copy the object
    return JSON.parse(JSON.stringify(data)) as SanitizedObject;
  }

  /**
   * Extract the values to update from record_data.
   *
   * Handles both:
   * - { values: {...} } - Wrapped format
   * - { field: value, ... } - Direct format
   *
   * @returns Copy of the values object (never mutates input)
   */
  static extractValues(recordData: unknown): Record<string, unknown> {
    if (
      !recordData ||
      typeof recordData !== 'object' ||
      Array.isArray(recordData)
    ) {
      return {};
    }

    const data = recordData as Record<string, unknown>;

    // If there's a `values` wrapper, use that
    if (
      data.values &&
      typeof data.values === 'object' &&
      !Array.isArray(data.values)
    ) {
      return JSON.parse(JSON.stringify(data.values));
    }

    // Otherwise, return a copy of the whole object
    return JSON.parse(JSON.stringify(data));
  }
}
