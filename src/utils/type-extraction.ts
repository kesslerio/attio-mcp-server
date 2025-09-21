/**
 * Type-safe utility functions for extracting nested values from complex object structures
 *
 * **Issue #679 Implementation:**
 * Addresses complex nested type assertions that appear throughout the services directory
 * and hurt code readability. Provides clean, type-safe alternatives to patterns like:
 * `((rec as Record<string, unknown>)?.id as Record<string, unknown>)?.record_id`
 *
 * **Performance Notes:**
 * - Functions are optimized for readability over raw performance
 * - For hot paths with frequent access, consider caching results
 * - Debug logging only active in development mode for performance
 */

/**
 * Debug logger for type extraction operations
 * Only logs in development environment to avoid performance impact
 */
function debugTypeExtraction(
  operation: string,
  input: unknown,
  result: unknown,
  error?: string
): void {
  /* istanbul ignore next */
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.TYPE_EXTRACTION_DEBUG === 'true'
  ) {
    console.warn(`[TypeExtraction] ${operation}:`, {
      inputType: typeof input,
      resultType: typeof result,
      hasResult: result !== undefined,
      error,
      timestamp: Date.now(),
    });
  }
}

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
    debugTypeExtraction(
      'safeExtractRecordId',
      obj,
      undefined,
      'Input not an object'
    );
    return undefined;
  }

  const record = obj as Record<string, unknown>;
  const idField = record.id;

  if (typeof idField !== 'object' || idField === null) {
    debugTypeExtraction(
      'safeExtractRecordId',
      obj,
      undefined,
      'id field not an object'
    );
    return undefined;
  }

  const idObject = idField as Record<string, unknown>;
  const recordId = idObject.record_id;
  const result = typeof recordId === 'string' ? recordId : undefined;

  if (result === undefined && recordId !== undefined) {
    debugTypeExtraction(
      'safeExtractRecordId',
      obj,
      undefined,
      `record_id is ${typeof recordId}, not string`
    );
  } else {
    debugTypeExtraction('safeExtractRecordId', obj, result);
  }

  return result;
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
 * // After (clean with type inference):
 * const name = safeExtractNestedValue<string>(rec, 'values', 'name');
 * const domains = safeExtractNestedValue<string[]>(rec, 'values', 'domains');
 * const count = safeExtractNestedValue<number>(rec, 'data', 'count');
 *
 * // Generic type parameter provides better IntelliSense and type safety
 */
export function safeExtractNestedValue<T = unknown>(
  obj: unknown,
  ...path: string[]
): T | undefined {
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

  return current as T;
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
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  if (!('id' in record)) {
    return false;
  }

  const idField = record.id;
  return (
    typeof idField === 'object' && idField !== null && !Array.isArray(idField)
  );
}

/**
 * Safely extracts an array from a nested object path with type safety
 * Handles the common pattern: Array.isArray(obj?.values?.field) && obj.values.field
 *
 * @param obj - Object to extract from
 * @param path - Array of property names to traverse to the array field
 * @returns The array or undefined if path is invalid or not an array
 *
 * @example
 * // Before (complex):
 * // const domains = Array.isArray(record.values?.domains) ? record.values.domains : undefined;
 *
 * // After (clean):
 * const domains = safeExtractArray<string>(record, 'values', 'domains');
 * const tags = safeExtractArray<string>(record, 'data', 'tags');
 */
export function safeExtractArray<T = unknown>(
  obj: unknown,
  ...path: string[]
): T[] | undefined {
  const value = safeExtractNestedValue(obj, ...path);
  return Array.isArray(value) ? (value as T[]) : undefined;
}

/**
 * Type guard to check if a nested field is an array with optional type checking
 * Provides runtime validation for array fields in nested objects
 *
 * @param obj - Object to check
 * @param path - Array of property names to traverse to the field
 * @returns True if the nested field is an array
 *
 * @example
 * // Before (complex):
 * // if (Array.isArray(((record as Record<string, unknown>)?.values as Record<string, unknown>)?.domains)) {
 *
 * // After (clean):
 * if (safeIsArrayField(record, 'values', 'domains')) {
 *   // TypeScript knows domains is an array
 *   const domains = safeExtractArray<string>(record, 'values', 'domains');
 * }
 */
export function safeIsArrayField(obj: unknown, ...path: string[]): boolean {
  const value = safeExtractNestedValue(obj, ...path);
  return Array.isArray(value);
}

/**
 * Safely extracts a string value from nested object with fallback
 * Common pattern for extracting string fields with default values
 *
 * @param obj - Object to extract from
 * @param fallback - Default value if extraction fails
 * @param path - Array of property names to traverse
 * @returns The string value or fallback
 *
 * @example
 * const name = safeExtractString(record, 'Unknown', 'values', 'name');
 * const title = safeExtractString(task, 'Untitled', 'data', 'title');
 */
export function safeExtractString(
  obj: unknown,
  fallback: string,
  ...path: string[]
): string {
  const value = safeExtractNestedValue<string>(obj, ...path);
  return typeof value === 'string' ? value : fallback;
}

/**
 * Safely extracts a number value from nested object with fallback
 * Common pattern for extracting numeric fields with default values
 *
 * @param obj - Object to extract from
 * @param fallback - Default value if extraction fails
 * @param path - Array of property names to traverse
 * @returns The number value or fallback
 *
 * @example
 * const count = safeExtractNumber(record, 0, 'data', 'count');
 * const priority = safeExtractNumber(task, 1, 'values', 'priority');
 */
export function safeExtractNumber(
  obj: unknown,
  fallback: number,
  ...path: string[]
): number {
  const value = safeExtractNestedValue<number>(obj, ...path);
  return typeof value === 'number' ? value : fallback;
}

/**
 * Enhanced type guard for validating object structure with specific properties
 * Provides runtime validation for complex object structures
 *
 * @param obj - Object to validate
 * @param requiredProps - Array of required property names
 * @returns True if object has all required properties
 *
 * @example
 * if (hasRequiredProperties(record, ['id', 'values'])) {
 *   // TypeScript knows record has id and values properties
 *   const recordId = safeExtractRecordId(record);
 * }
 */
export function hasRequiredProperties(
  obj: unknown,
  requiredProps: string[]
): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  return requiredProps.every((prop) => prop in record);
}

/**
 * Type guard to check if a value is a non-empty string
 * Useful for validating string fields that shouldn't be empty
 *
 * @param value - Value to check
 * @returns True if value is a non-empty string
 *
 * @example
 * const name = safeExtractString(record, '', 'values', 'name');
 * if (isNonEmptyString(name)) {
 *   // TypeScript knows name is a non-empty string
 *   console.log(name.toUpperCase());
 * }
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if a value is a valid array with minimum length
 * Provides runtime validation for arrays with length constraints
 *
 * @param value - Value to check
 * @param minLength - Minimum required length (default: 1)
 * @returns True if value is an array with at least minLength items
 *
 * @example
 * const domains = safeExtractArray<string>(record, 'values', 'domains');
 * if (isValidArray(domains, 1)) {
 *   // TypeScript knows domains is a non-empty array
 *   domains.forEach(domain => console.log(domain));
 * }
 */
export function isValidArray<T>(value: unknown, minLength = 1): value is T[] {
  return Array.isArray(value) && value.length >= minLength;
}

/**
 * Advanced type guard for Attio record validation with strict checking
 * Validates that an object has the complete Attio record structure
 *
 * @param obj - Object to validate
 * @returns True if object is a complete Attio record
 *
 * @example
 * if (isCompleteAttioRecord(response)) {
 *   // TypeScript knows this has id.record_id and values
 *   const recordId = safeExtractRecordId(response); // guaranteed to be string
 *   const values = safeExtractValuesObject(response); // guaranteed to be object
 * }
 */
export function isCompleteAttioRecord(obj: unknown): obj is {
  id: { record_id: string; [key: string]: unknown };
  values: Record<string, unknown>;
  [key: string]: unknown;
} {
  if (!isAttioRecordLike(obj)) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  const recordId = safeExtractRecordId(record);
  const values = safeExtractValuesObject(record);

  return (
    isNonEmptyString(recordId) && typeof values === 'object' && values !== null
  );
}
