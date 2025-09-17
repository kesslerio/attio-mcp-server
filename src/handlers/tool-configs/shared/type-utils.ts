/**
 * Type-safe utility functions for extracting values from Attio API responses
 * Addresses repeated type assertion patterns across tool-config handlers
 */

/**
 * Represents an Attio value entry with typed structure
 */
export interface AttioValueEntry {
  value?: unknown;
  [key: string]: unknown;
}

/**
 * Represents an Attio name field entry with common properties
 */
export interface AttioNameEntry {
  value?: unknown;
  full_name?: unknown;
  formatted?: unknown;
  [key: string]: unknown;
}

/**
 * Type guard to check if a value is an array of Attio value entries
 */
export function isAttioValueArray(value: unknown): value is AttioValueEntry[] {
  return (
    Array.isArray(value) &&
    (value.length === 0 || (typeof value[0] === 'object' && value[0] !== null))
  );
}

/**
 * Safely extracts the first value from an Attio value array
 * @param fieldValue - The field value from Attio API response
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted value or fallback
 *
 * @example
 * const name = safeExtractFirstValue(person.values?.name, 'Unknown');
 */
export function safeExtractFirstValue(
  fieldValue: unknown,
  fallback: string = 'Unknown'
): string {
  if (!isAttioValueArray(fieldValue) || fieldValue.length === 0) {
    return fallback;
  }

  const firstEntry = fieldValue[0];
  if (firstEntry?.value !== undefined) {
    return String(firstEntry.value);
  }

  return fallback;
}

/**
 * Safely extracts a name from an Attio name field with multiple possible formats
 * @param nameField - The name field from Attio API response
 * @param fallback - Fallback value if extraction fails
 * @returns The extracted name or fallback
 *
 * @example
 * const fullName = safeExtractName(person.values?.name, 'Unknown Person');
 */
export function safeExtractName(
  nameField: unknown,
  fallback: string = 'Unknown'
): string {
  if (!Array.isArray(nameField) || nameField.length === 0) {
    return fallback;
  }

  const nameEntry = nameField[0] as AttioNameEntry;

  // Try different name properties in order of preference
  if (nameEntry?.full_name !== undefined) {
    return String(nameEntry.full_name);
  }

  if (nameEntry?.formatted !== undefined) {
    return String(nameEntry.formatted);
  }

  if (nameEntry?.value !== undefined) {
    return String(nameEntry.value);
  }

  return fallback;
}

/**
 * Safely extracts values from an Attio record's values object
 * @param record - The record object from Attio API
 * @returns Type-safe values object or empty object
 *
 * @example
 * const values = safeExtractRecordValues(record);
 * const name = safeExtractFirstValue(values.name);
 */
export function safeExtractRecordValues(
  record: unknown
): Record<string, unknown> {
  if (typeof record === 'object' && record !== null && 'values' in record) {
    const values = (record as { values?: unknown }).values;
    if (typeof values === 'object' && values !== null) {
      return values as Record<string, unknown>;
    }
  }
  return {};
}

/**
 * Type-safe error message extraction
 * @param error - Error object or unknown value
 * @returns Error message string
 *
 * @example
 * const message = safeExtractErrorMessage(error);
 */
export function safeExtractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

/**
 * Safely extracts timestamp values from various formats
 * @param timestampField - The timestamp field from Attio API
 * @param fallback - Fallback value if extraction fails
 * @returns ISO timestamp string or fallback
 *
 * @example
 * const createdAt = safeExtractTimestamp(record.created_at);
 */
export function safeExtractTimestamp(
  timestampField: unknown,
  fallback: string = new Date().toISOString()
): string {
  if (typeof timestampField === 'string') {
    return timestampField;
  }

  if (Array.isArray(timestampField) && timestampField.length > 0) {
    const firstEntry = timestampField[0];
    if (
      typeof firstEntry === 'object' &&
      firstEntry !== null &&
      'value' in firstEntry
    ) {
      const value = (firstEntry as { value?: unknown }).value;
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return fallback;
}

/**
 * Type assertion with runtime validation for Attio value arrays
 * Provides safer alternative to 'as unknown as Array<{ value: unknown }>'
 * @param value - Value to assert as Attio value array
 * @returns Type-asserted array or empty array if invalid
 *
 * @example
 * const valueArray = assertAttioValueArray(field.name);
 * const name = valueArray[0]?.value || 'Unknown';
 */
export function assertAttioValueArray(value: unknown): AttioValueEntry[] {
  if (isAttioValueArray(value)) {
    return value;
  }

  // Log warning in development for debugging
  if (
    process.env.NODE_ENV === 'development' &&
    value !== undefined &&
    value !== null
  ) {
    console.warn('Invalid Attio value array structure:', typeof value, value);
  }

  return [];
}

/**
 * Safely extracts note title from various possible locations in note objects
 * @param note - Note object from Attio API
 * @param fallback - Fallback value if extraction fails
 * @returns Extracted title or fallback
 *
 * @example
 * const title = safeExtractNoteTitle(note, 'Untitled');
 */
export function safeExtractNoteTitle(
  note: unknown,
  fallback: string = 'Untitled'
): string {
  if (typeof note !== 'object' || note === null) {
    return fallback;
  }

  const noteObj = note as Record<string, unknown>;

  // Try direct properties first
  if (typeof noteObj.title === 'string') {
    return noteObj.title;
  }

  // Try nested data properties
  if (typeof noteObj.data === 'object' && noteObj.data !== null) {
    const dataObj = noteObj.data as Record<string, unknown>;
    if (typeof dataObj.title === 'string') {
      return dataObj.title;
    }
  }

  // Try values properties
  if (typeof noteObj.values === 'object' && noteObj.values !== null) {
    const valuesObj = noteObj.values as Record<string, unknown>;
    if (typeof valuesObj.title === 'string') {
      return valuesObj.title;
    }
  }

  return fallback;
}

/**
 * Safely extracts note content from various possible locations in note objects
 * @param note - Note object from Attio API
 * @param fallback - Fallback value if extraction fails
 * @returns Extracted content or fallback
 *
 * @example
 * const content = safeExtractNoteContent(note, '');
 */
export function safeExtractNoteContent(
  note: unknown,
  fallback: string = ''
): string {
  if (typeof note !== 'object' || note === null) {
    return fallback;
  }

  const noteObj = note as Record<string, unknown>;

  // Try direct properties first
  if (typeof noteObj.content === 'string') {
    return noteObj.content;
  }

  // Try nested data properties
  if (typeof noteObj.data === 'object' && noteObj.data !== null) {
    const dataObj = noteObj.data as Record<string, unknown>;
    if (typeof dataObj.content === 'string') {
      return dataObj.content;
    }
  }

  // Try values properties
  if (typeof noteObj.values === 'object' && noteObj.values !== null) {
    const valuesObj = noteObj.values as Record<string, unknown>;
    if (typeof valuesObj.content === 'string') {
      return valuesObj.content;
    }
  }

  // Try alternative field names
  if (typeof noteObj.text === 'string') {
    return noteObj.text;
  }

  if (typeof noteObj.body === 'string') {
    return noteObj.body;
  }

  return fallback;
}

/**
 * Safely extracts note timestamp from various possible locations in note objects
 * @param note - Note object from Attio API
 * @param fallback - Fallback value if extraction fails
 * @returns Extracted timestamp or fallback
 *
 * @example
 * const timestamp = safeExtractNoteTimestamp(note, 'unknown');
 */
export function safeExtractNoteTimestamp(
  note: unknown,
  fallback: string = 'unknown'
): string {
  if (typeof note !== 'object' || note === null) {
    return fallback;
  }

  const noteObj = note as Record<string, unknown>;

  // Try direct properties first
  if (typeof noteObj.timestamp === 'string') {
    return noteObj.timestamp;
  }

  if (typeof noteObj.created_at === 'string') {
    return noteObj.created_at;
  }

  // Try nested data properties
  if (typeof noteObj.data === 'object' && noteObj.data !== null) {
    const dataObj = noteObj.data as Record<string, unknown>;
    if (typeof dataObj.created_at === 'string') {
      return dataObj.created_at;
    }
  }

  // Try values properties
  if (typeof noteObj.values === 'object' && noteObj.values !== null) {
    const valuesObj = noteObj.values as Record<string, unknown>;
    if (typeof valuesObj.created_at === 'string') {
      return valuesObj.created_at;
    }
  }

  return fallback;
}
