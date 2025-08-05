/**
 * Validation for Attio attribute types
 * Provides validation and type conversion for attribute values
 * to ensure they match Attio's expected types
 *
 * This module handles both validation and automatic type conversion
 * for common data format mismatches, which is particularly useful for
 * LLM-generated content where string representations of other data types
 * are common.
 */

/**
 * Supported attribute types in Attio
 */
export type AttributeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'select'
  | 'record-reference';

/**
 * Result of attribute validation
 */
export interface ValidationResult {
  /** Whether the validation was successful */
  valid: boolean;
  /** The converted value (may differ from input if type conversion was applied) */
  convertedValue?: any;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Validates an attribute value against the expected type
 *
 * This function validates that a value matches the expected attribute type,
 * and attempts to convert it when possible. It handles both strict validation
 * and auto-conversion for common type mismatches.
 *
 * @param attributeName - The name of the attribute being validated
 * @param value - The value to validate
 * @param expectedType - The expected attribute type
 * @returns Validation result with success status and optionally converted value
 *
 * @example
 * // Validate a string
 * validateAttributeValue('company_name', 'Acme Inc', 'string')
 * // Returns: { valid: true, convertedValue: 'Acme Inc' }
 *
 * @example
 * // Convert string to number
 * validateAttributeValue('employee_count', '250', 'number')
 * // Returns: { valid: true, convertedValue: 250 }
 *
 * @example
 * // Convert string to boolean
 * validateAttributeValue('is_active', 'yes', 'boolean')
 * // Returns: { valid: true, convertedValue: true }
 *
 * @example
 * // Handle invalid values
 * validateAttributeValue('revenue', 'not-a-number', 'number')
 * // Returns: { valid: false, error: 'Invalid number value...' }
 */
export function validateAttributeValue(
  attributeName: string,
  value: any,
  expectedType: AttributeType
): ValidationResult {
  // Handle null case first
  if (value === null || value === undefined) {
    return { valid: true, convertedValue: null };
  }

  // Validate based on expected type
  switch (expectedType) {
    case 'boolean':
      return validateBooleanValue(attributeName, value);
    case 'number':
      return validateNumberValue(attributeName, value);
    case 'string':
      return validateStringValue(attributeName, value);
    case 'date':
      return validateDateValue(attributeName, value);
    case 'array':
      return validateArrayValue(attributeName, value);
    case 'object':
      return validateObjectValue(attributeName, value);
    case 'select':
      return validateSelectValue(attributeName, value);
    case 'record-reference':
      return validateRecordReferenceValue(attributeName, value);
    default:
      // If the type doesn't match any known type, pass it through
      return { valid: true, convertedValue: value };
  }
}

/**
 * Validates a boolean value
 *
 * This function validates and converts values to boolean type.
 * It handles various string representations ('true', 'yes', 'on', '1')
 * and numeric values (1, 0) in addition to native boolean values.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Native boolean
 * validateBooleanValue('is_active', true)
 * // Returns: { valid: true, convertedValue: true }
 *
 * @example
 * // String conversion
 * validateBooleanValue('is_active', 'yes')
 * // Returns: { valid: true, convertedValue: true }
 *
 * @example
 * // Numeric conversion
 * validateBooleanValue('is_active', 1)
 * // Returns: { valid: true, convertedValue: true }
 */
function validateBooleanValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already a boolean - simple case
  if (typeof value === 'boolean') {
    return { valid: true, convertedValue: value };
  }

  // Auto-conversion cases
  if (typeof value === 'string') {
    const stringValue = value.toLowerCase().trim();

    // Reject empty strings explicitly
    if (stringValue === '') {
      return {
        valid: false,
        error: `Invalid boolean value for "${attributeName}". Empty strings cannot be converted to boolean.`,
      };
    }

    if (
      stringValue === 'true' ||
      stringValue === 'yes' ||
      stringValue === '1' ||
      stringValue === 'on'
    ) {
      return { valid: true, convertedValue: true };
    }
    if (
      stringValue === 'false' ||
      stringValue === 'no' ||
      stringValue === '0' ||
      stringValue === 'off'
    ) {
      return { valid: true, convertedValue: false };
    }
  }

  // Number conversion
  if (typeof value === 'number') {
    if (value === 1) {
      return { valid: true, convertedValue: true };
    }
    if (value === 0) {
      return { valid: true, convertedValue: false };
    }
  }

  // Invalid boolean value
  return {
    valid: false,
    error: `Invalid boolean value for "${attributeName}". Expected a boolean or a string like "true"/"false", but got ${typeof value}.`,
  };
}

/**
 * Validates a numeric value
 *
 * This function validates and converts values to number type.
 * It handles numeric strings and boolean values in addition to native numbers.
 * NaN values are considered invalid numbers.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Native number
 * validateNumberValue('revenue', 1000000)
 * // Returns: { valid: true, convertedValue: 1000000 }
 *
 * @example
 * // String conversion
 * validateNumberValue('employee_count', '250')
 * // Returns: { valid: true, convertedValue: 250 }
 *
 * @example
 * // Boolean conversion
 * validateNumberValue('binary_value', true)
 * // Returns: { valid: true, convertedValue: 1 }
 */
function validateNumberValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already a number - simple case
  if (typeof value === 'number' && !isNaN(value)) {
    return { valid: true, convertedValue: value };
  }

  // Auto-conversion from string
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Reject empty strings explicitly
    if (trimmed === '') {
      return {
        valid: false,
        error: `Invalid number value for "${attributeName}". Empty strings cannot be converted to numbers.`,
      };
    }

    const numericValue = Number(trimmed);

    if (!isNaN(numericValue)) {
      return { valid: true, convertedValue: numericValue };
    }
  }

  // Auto-conversion from boolean
  if (typeof value === 'boolean') {
    return { valid: true, convertedValue: value ? 1 : 0 };
  }

  // Invalid number value
  return {
    valid: false,
    error: `Invalid number value for "${attributeName}". Expected a number or a numeric string, but got ${typeof value}.`,
  };
}

/**
 * Validates a string value
 *
 * This function validates and converts values to string type.
 * It handles numbers, booleans, dates, and even attempts to stringify
 * objects in addition to native strings.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Native string
 * validateStringValue('name', 'Acme Corporation')
 * // Returns: { valid: true, convertedValue: 'Acme Corporation' }
 *
 * @example
 * // Number conversion
 * validateStringValue('id_text', 12345)
 * // Returns: { valid: true, convertedValue: '12345' }
 *
 * @example
 * // Date conversion
 * validateStringValue('date_text', new Date('2023-01-15'))
 * // Returns: { valid: true, convertedValue: '2023-01-15T00:00:00.000Z' }
 *
 * @example
 * // Object conversion
 * validateStringValue('metadata_text', { id: 123, type: 'customer' })
 * // Returns: { valid: true, convertedValue: '{"id":123,"type":"customer"}' }
 */
function validateStringValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already a string - simple case
  if (typeof value === 'string') {
    return { valid: true, convertedValue: value };
  }

  // Auto-conversion cases
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { valid: true, convertedValue: String(value) };
  }

  // Handle date objects
  if (value instanceof Date) {
    return { valid: true, convertedValue: value.toISOString() };
  }

  // Handle objects that can be stringified
  if (typeof value === 'object' && value !== null) {
    try {
      return { valid: true, convertedValue: JSON.stringify(value) };
    } catch (error) {
      // Failed to stringify
    }
  }

  // Invalid string value
  return {
    valid: false,
    error: `Invalid string value for "${attributeName}". Expected a string or a value that can be converted to string, but got ${typeof value}.`,
  };
}

/**
 * Validates a date value
 *
 * This function validates and converts values to date format.
 * It handles Date objects, ISO date strings, and timestamps
 * (both in seconds and milliseconds).
 * The converted value is always returned as an ISO string.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Date object
 * validateDateValue('created_at', new Date('2023-01-15'))
 * // Returns: { valid: true, convertedValue: '2023-01-15T00:00:00.000Z' }
 *
 * @example
 * // ISO date string
 * validateDateValue('created_at', '2023-01-15T12:30:00Z')
 * // Returns: { valid: true, convertedValue: '2023-01-15T12:30:00.000Z' }
 *
 * @example
 * // Timestamp in milliseconds
 * validateDateValue('created_at', 1673784600000) // 2023-01-15T12:30:00.000Z
 * // Returns: { valid: true, convertedValue: '2023-01-15T12:30:00.000Z' }
 *
 * @example
 * // Timestamp in seconds
 * validateDateValue('created_at', 1673784600) // 2023-01-15T12:30:00.000Z
 * // Returns: { valid: true, convertedValue: '2023-01-15T12:30:00.000Z' }
 */
function validateDateValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already a date object - simple case
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return {
        valid: false,
        error: `Invalid date value for "${attributeName}". The date is invalid.`,
      };
    }
    return { valid: true, convertedValue: value.toISOString() };
  }

  // ISO date string
  if (typeof value === 'string') {
    // Try to create a date object from the string
    const dateObj = new Date(value);
    if (!isNaN(dateObj.getTime())) {
      return { valid: true, convertedValue: dateObj.toISOString() };
    }
  }

  // Unix timestamp (number)
  if (typeof value === 'number') {
    // Assume milliseconds if greater than 1e10 (Jan 26 1970), otherwise seconds
    const timestamp = value > 1e10 ? value : value * 1000;
    const dateObj = new Date(timestamp);
    if (!isNaN(dateObj.getTime())) {
      return { valid: true, convertedValue: dateObj.toISOString() };
    }
  }

  // Invalid date value
  return {
    valid: false,
    error: `Invalid date value for "${attributeName}". Expected a Date object, ISO date string, or timestamp, but got ${typeof value}.`,
  };
}

/**
 * Validates an array value
 *
 * This function validates and converts values to array format.
 * It handles native arrays and also converts single values to
 * single-element arrays when appropriate.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Native array
 * validateArrayValue('tags', ['software', 'tech'])
 * // Returns: { valid: true, convertedValue: ['software', 'tech'] }
 *
 * @example
 * // Single value conversion
 * validateArrayValue('tags', 'software')
 * // Returns: { valid: true, convertedValue: ['software'] }
 *
 * @example
 * // Empty array
 * validateArrayValue('tags', [])
 * // Returns: { valid: true, convertedValue: [] }
 */
function validateArrayValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already an array - simple case
  if (Array.isArray(value)) {
    return { valid: true, convertedValue: value };
  }

  // Convert single value to array
  if (value !== null && value !== undefined) {
    return { valid: true, convertedValue: [value] };
  }

  // Invalid array value
  return {
    valid: false,
    error: `Invalid array value for "${attributeName}". Expected an array, but got ${typeof value}.`,
  };
}

/**
 * Validates an object value
 *
 * This function validates that a value is a proper object (not null or array).
 * Unlike other validators, it does not attempt to convert non-object values
 * due to the ambiguity of what such a conversion should produce.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Valid object
 * validateObjectValue('metadata', { id: 123, type: 'customer' })
 * // Returns: { valid: true, convertedValue: { id: 123, type: 'customer' } }
 *
 * @example
 * // Empty object
 * validateObjectValue('settings', {})
 * // Returns: { valid: true, convertedValue: {} }
 *
 * @example
 * // Invalid (array)
 * validateObjectValue('metadata', ['item1', 'item2'])
 * // Returns: { valid: false, error: 'Invalid object value...' }
 */
function validateObjectValue(
  attributeName: string,
  value: any
): ValidationResult {
  // Already an object - simple case
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { valid: true, convertedValue: value };
  }

  // Invalid object value
  return {
    valid: false,
    error: `Invalid object value for "${attributeName}". Expected an object, but got ${typeof value}.`,
  };
}

/**
 * Validates a select value
 *
 * This function validates and converts values for select/option fields.
 * It handles string values, arrays of strings, and attempts to convert
 * other types to strings. Since we don't have access to the valid options list,
 * we only validate that the format is correct, not that the values are valid options.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // Single option
 * validateSelectValue('status', 'active')
 * // Returns: { valid: true, convertedValue: 'active' }
 *
 * @example
 * // Multiple options
 * validateSelectValue('categories', ['software', 'tech'])
 * // Returns: { valid: true, convertedValue: ['software', 'tech'] }
 *
 * @example
 * // Converting non-string values in array
 * validateSelectValue('categories', ['software', 123, true])
 * // Returns: { valid: true, convertedValue: ['software', '123', 'true'] }
 */
function validateSelectValue(
  attributeName: string,
  value: any
): ValidationResult {
  // For select values, we expect strings or arrays of strings
  // Since we don't have access to the valid options list here,
  // we'll just validate that it's a string or array of strings

  // Single string value
  if (typeof value === 'string') {
    return { valid: true, convertedValue: value };
  }

  // Array of strings
  if (Array.isArray(value)) {
    const allStrings = value.every((item) => typeof item === 'string');
    if (allStrings) {
      return { valid: true, convertedValue: value };
    }

    // Try to convert all elements to strings
    const convertedArray = value.map((item) => String(item));
    return { valid: true, convertedValue: convertedArray };
  }

  // Convert single value to string
  if (value !== null && value !== undefined) {
    return { valid: true, convertedValue: String(value) };
  }

  // Invalid select value
  return {
    valid: false,
    error: `Invalid select value for "${attributeName}". Expected a string or array of strings, but got ${typeof value}.`,
  };
}

/**
 * Validates a record reference value
 *
 * This function validates and normalizes record reference values.
 * It handles string IDs, objects with record_id or id properties,
 * and arrays of these types. The result is always normalized to a
 * string ID or array of string IDs.
 *
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 *
 * @example
 * // String ID
 * validateRecordReferenceValue('parent_company', 'rec_123456')
 * // Returns: { valid: true, convertedValue: 'rec_123456' }
 *
 * @example
 * // Object with record_id
 * validateRecordReferenceValue('parent_company', { record_id: 'rec_123456' })
 * // Returns: { valid: true, convertedValue: 'rec_123456' }
 *
 * @example
 * // Array of mixed references
 * validateRecordReferenceValue('related_companies', [
 *   'rec_123',
 *   { record_id: 'rec_456' },
 *   { id: 'rec_789' }
 * ])
 * // Returns: { valid: true, convertedValue: ['rec_123', 'rec_456', 'rec_789'] }
 */
function validateRecordReferenceValue(
  attributeName: string,
  value: any
): ValidationResult {
  // For record references, we need IDs
  // Could be a string ID, an object with record_id, or an array of either

  // String ID
  if (typeof value === 'string') {
    return { valid: true, convertedValue: value };
  }

  // Object with record_id
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if ('record_id' in value && typeof value.record_id === 'string') {
      return { valid: true, convertedValue: value.record_id };
    }

    if ('id' in value && typeof value.id === 'string') {
      return { valid: true, convertedValue: value.id };
    }
  }

  // Array of IDs or objects
  if (Array.isArray(value)) {
    const convertedIds = value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (typeof item === 'object' && item !== null) {
          if ('record_id' in item && typeof item.record_id === 'string') {
            return item.record_id;
          }

          if ('id' in item && typeof item.id === 'string') {
            return item.id;
          }
        }

        return null;
      })
      .filter((id) => id !== null);

    if (convertedIds.length > 0) {
      return { valid: true, convertedValue: convertedIds };
    }
  }

  // Invalid record reference value
  return {
    valid: false,
    error: `Invalid record reference value for "${attributeName}". Expected a record ID string, object with record_id, or array of either, but got ${typeof value}.`,
  };
}
