/**
 * Validation for Attio attribute types
 * Provides validation and type conversion for attribute values 
 * to ensure they match Attio's expected types
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
  valid: boolean;
  convertedValue?: any;
  error?: string;
}

/**
 * Validates an attribute value against the expected type
 * 
 * @param attributeName - The name of the attribute being validated
 * @param value - The value to validate
 * @param expectedType - The expected attribute type
 * @returns Validation result with success status and optionally converted value
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
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateBooleanValue(attributeName: string, value: any): ValidationResult {
  // Already a boolean - simple case
  if (typeof value === 'boolean') {
    return { valid: true, convertedValue: value };
  }

  // Auto-conversion cases
  if (typeof value === 'string') {
    const stringValue = value.toLowerCase().trim();
    if (stringValue === 'true' || stringValue === 'yes' || stringValue === '1' || stringValue === 'on') {
      return { valid: true, convertedValue: true };
    }
    if (stringValue === 'false' || stringValue === 'no' || stringValue === '0' || stringValue === 'off') {
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
    error: `Invalid boolean value for "${attributeName}". Expected a boolean or a string like "true"/"false", but got ${typeof value}.`
  };
}

/**
 * Validates a numeric value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateNumberValue(attributeName: string, value: any): ValidationResult {
  // Already a number - simple case
  if (typeof value === 'number' && !isNaN(value)) {
    return { valid: true, convertedValue: value };
  }

  // Auto-conversion from string
  if (typeof value === 'string') {
    const trimmed = value.trim();
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
    error: `Invalid number value for "${attributeName}". Expected a number or a numeric string, but got ${typeof value}.`
  };
}

/**
 * Validates a string value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateStringValue(attributeName: string, value: any): ValidationResult {
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
    error: `Invalid string value for "${attributeName}". Expected a string or a value that can be converted to string, but got ${typeof value}.`
  };
}

/**
 * Validates a date value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateDateValue(attributeName: string, value: any): ValidationResult {
  // Already a date object - simple case
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return { valid: true, convertedValue: value.toISOString() };
    } else {
      return { valid: false, error: `Invalid date value for "${attributeName}". The date is invalid.` };
    }
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
    error: `Invalid date value for "${attributeName}". Expected a Date object, ISO date string, or timestamp, but got ${typeof value}.`
  };
}

/**
 * Validates an array value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateArrayValue(attributeName: string, value: any): ValidationResult {
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
    error: `Invalid array value for "${attributeName}". Expected an array, but got ${typeof value}.`
  };
}

/**
 * Validates an object value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateObjectValue(attributeName: string, value: any): ValidationResult {
  // Already an object - simple case
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { valid: true, convertedValue: value };
  }

  // Invalid object value
  return {
    valid: false,
    error: `Invalid object value for "${attributeName}". Expected an object, but got ${typeof value}.`
  };
}

/**
 * Validates a select value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateSelectValue(attributeName: string, value: any): ValidationResult {
  // For select values, we expect strings or arrays of strings
  // Since we don't have access to the valid options list here,
  // we'll just validate that it's a string or array of strings
  
  // Single string value
  if (typeof value === 'string') {
    return { valid: true, convertedValue: value };
  }
  
  // Array of strings
  if (Array.isArray(value)) {
    const allStrings = value.every(item => typeof item === 'string');
    if (allStrings) {
      return { valid: true, convertedValue: value };
    }
    
    // Try to convert all elements to strings
    const convertedArray = value.map(item => String(item));
    return { valid: true, convertedValue: convertedArray };
  }
  
  // Convert single value to string
  if (value !== null && value !== undefined) {
    return { valid: true, convertedValue: String(value) };
  }

  // Invalid select value
  return {
    valid: false,
    error: `Invalid select value for "${attributeName}". Expected a string or array of strings, but got ${typeof value}.`
  };
}

/**
 * Validates a record reference value
 * 
 * @param attributeName - The name of the attribute
 * @param value - The value to validate
 * @returns Validation result
 */
function validateRecordReferenceValue(attributeName: string, value: any): ValidationResult {
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
    const convertedIds = value.map(item => {
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
    }).filter(id => id !== null);
    
    if (convertedIds.length > 0) {
      return { valid: true, convertedValue: convertedIds };
    }
  }

  // Invalid record reference value
  return {
    valid: false,
    error: `Invalid record reference value for "${attributeName}". Expected a record ID string, object with record_id, or array of either, but got ${typeof value}.`
  };
}