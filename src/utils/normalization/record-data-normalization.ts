/**
 * Record Data Input Normalization
 *
 * Handles normalization of record_data inputs for the update_record tool.
 * Converts legacy input shapes (data field, flat fields) to standard format.
 *
 * Note: JSON string parsing and validation is handled by UniversalUpdateService,
 * not here. This normalizer only handles structural transformations.
 *
 * @see Issue #1099 - SRP compliance: separates normalization from validation
 */

import type { SanitizedObject } from '@/handlers/tool-configs/universal/schemas/common/types.js';

/**
 * Keys that are standard params, not record data fields
 */
const STANDARD_KEYS = new Set([
  'resource_type',
  'record_id',
  'return_details',
  'data',
  'record_data',
]);

/**
 * Normalized update parameters - only contains standard fields
 */
export interface NormalizedParams {
  resource_type?: string;
  record_id?: string;
  record_data?: SanitizedObject;
  return_details?: boolean;
}

/**
 * RecordDataNormalizer provides input normalization for update operations.
 *
 * Handles two legacy input patterns:
 * 1. { data: {...} } - Maps to record_data
 * 2. { name: "...", status: "..." } - Collects flat fields into record_data
 *
 * Design: Returns clean normalized object without leftover fields.
 */
export class RecordDataNormalizer {
  /**
   * Check if parameters need normalization.
   *
   * Returns true only when record_data is missing AND there's
   * either a `data` field or extra flat fields to collect.
   */
  static needsNormalization(params: unknown): boolean {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return false;
    }

    const p = params as Record<string, unknown>;

    // Already has record_data - no normalization needed
    if (p.record_data !== undefined) {
      return false;
    }

    // Has `data` field that should be mapped to record_data
    if (p.data !== undefined) {
      return true;
    }

    // Check for extra fields that could be record data
    const extraFields = Object.keys(p).filter((key) => !STANDARD_KEYS.has(key));
    return extraFields.length > 0;
  }

  /**
   * Normalize parameters into standard format.
   *
   * Returns a clean object with ONLY standard fields - no leftover
   * flat fields that were collected into record_data.
   */
  static normalize(params: unknown): NormalizedParams {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return {};
    }

    const p = params as Record<string, unknown>;

    // Build result with only standard fields
    const result: NormalizedParams = {};

    if (p.resource_type !== undefined) {
      result.resource_type = p.resource_type as string;
    }
    if (p.record_id !== undefined) {
      result.record_id = p.record_id as string;
    }
    if (p.return_details !== undefined) {
      result.return_details = p.return_details as boolean;
    }

    // Determine record_data source
    if (p.data !== undefined && typeof p.data === 'object' && p.data !== null) {
      // Legacy `data` field - use it as record_data
      result.record_data = p.data as SanitizedObject;
    } else {
      // Collect extra fields as record_data
      const recordData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(p)) {
        if (!STANDARD_KEYS.has(key)) {
          recordData[key] = value;
        }
      }
      if (Object.keys(recordData).length > 0) {
        result.record_data = recordData as SanitizedObject;
      }
    }

    return result;
  }
}
