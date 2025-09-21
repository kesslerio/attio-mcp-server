/**
 * Type-safe utility functions for extracting nested values from complex object structures
 *
 * **Issue #679 Implementation:**
 * Addresses complex nested type assertions that appear throughout the services directory
 * and hurt code readability. Provides clean, type-safe alternatives to patterns like:
 * `((rec as Record<string, unknown>)?.id as Record<string, unknown>)?.record_id`
 */

/**
 * Safely extracts record_id from nested object structures
 * Handles the common pattern: obj?.id?.record_id with proper type safety
 *
 * @param obj - Object that may contain nested id.record_id structure
 * @returns The record_id string or undefined if not found
 *
 * @example
 * // Before (complex):
 * // const recordId = ((rec as Record<string, unknown>)?.id as Record<string, unknown>)?.record_id as string;
 *
 * // After (clean):
 * const recordId = safeExtractRecordId(rec);
 * if (recordId) {
 *   // Use recordId safely
 * }
 */
export function safeExtractRecordId(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const idField = record.id;

  if (typeof idField !== 'object' || idField === null) {
    return undefined;
  }

  const idObject = idField as Record<string, unknown>;
  const recordId = idObject.record_id;

  return typeof recordId === 'string' ? recordId : undefined;
}

/**
 * Safely extracts the id object from a record
 * Handles the pattern: obj?.id with proper type safety
 *
 * @param obj - Object that may contain an id field
 * @returns The id object or undefined if not found
 *
 * @example
 * // Before (complex):
 * // const idObj = (rec as Record<string, unknown>)?.id as Record<string, unknown>;
 *
 * // After (clean):
 * const idObj = safeExtractIdObject(rec);
 * if (idObj?.record_id) {
 *   // Use idObj safely
 * }
 */
export function safeExtractIdObject(
  obj: unknown
): Record<string, unknown> | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const idField = record.id;

  if (typeof idField !== 'object' || idField === null) {
    return undefined;
  }

  return idField as Record<string, unknown>;
}

/**
 * Safely extracts nested property values with type safety
 * Handles patterns like: obj?.values?.propertyName with multiple levels
 *
 * @param obj - Object to extract from
 * @param path - Array of property names to traverse
 * @returns The extracted value or undefined if path is invalid
 *
 * @example
 * // Before (complex):
 * // const name = ((rec as Record<string, unknown>)?.values as Record<string, unknown>)?.name;
 *
 * // After (clean):
 * const name = safeExtractNestedValue(rec, 'values', 'name');
 * const domains = safeExtractNestedValue(rec, 'values', 'domains');
 */
export function safeExtractNestedValue(
  obj: unknown,
  ...path: string[]
): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  let current = obj as Record<string, unknown>;

  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[key] as Record<string, unknown>;
  }

  return current;
}

/**
 * Safely extracts values object from a record
 * Handles the pattern: obj?.values with proper type safety
 *
 * @param obj - Object that may contain a values field
 * @returns The values object or undefined if not found
 *
 * @example
 * // Before (complex):
 * // const values = (rec as Record<string, unknown>)?.values as Record<string, unknown>;
 *
 * // After (clean):
 * const values = safeExtractValuesObject(rec);
 * if (values?.name) {
 *   // Use values safely
 * }
 */
export function safeExtractValuesObject(
  obj: unknown
): Record<string, unknown> | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const valuesField = record.values;

  if (typeof valuesField !== 'object' || valuesField === null) {
    return undefined;
  }

  return valuesField as Record<string, unknown>;
}

/**
 * Safely checks if a record has a valid record_id
 * Combines existence check with type safety for common validation pattern
 *
 * @param obj - Object to check
 * @returns True if object has a valid string record_id
 *
 * @example
 * // Before (complex):
 * // const isValid = !!(((record as Record<string, unknown>)?.id as Record<string, unknown>)?.record_id);
 *
 * // After (clean):
 * const isValid = hasValidRecordId(record);
 * if (!isValid) {
 *   // Handle missing record_id
 * }
 */
export function hasValidRecordId(obj: unknown): boolean {
  const recordId = safeExtractRecordId(obj);
  return typeof recordId === 'string' && recordId.length > 0;
}

/**
 * Type guard to check if an object looks like an Attio record
 * Provides runtime type checking for record-like structures
 *
 * @param obj - Object to check
 * @returns True if object has the expected record structure
 *
 * @example
 * if (isAttioRecordLike(response)) {
 *   const recordId = safeExtractRecordId(response);
 *   // TypeScript knows this is safe
 * }
 */
export function isAttioRecordLike(
  obj: unknown
): obj is Record<string, unknown> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as Record<string, unknown>).id === 'object'
  );
}
