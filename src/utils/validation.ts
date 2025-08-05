/**
 * Validation utility for validating input data against schemas
 */
import { ErrorType } from './error-handler.js';

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Schema definition for validation
 */
export interface ValidationSchema {
  type: string;
  required?: string[];
  properties?: Record<string, any>;
  items?: ValidationSchema;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

/**
 * Create a validation error message for a schema violation
 *
 * @param path - Path to the property with an error
 * @param message - Error message for the violation
 * @returns Formatted error message
 */
function formatError(path: string, message: string): string {
  return path ? `${path}: ${message}` : message;
}

/**
 * Validates that a value is of the expected type
 *
 * @param value - Value to validate
 * @param expectedType - Expected type
 * @param path - Path to the property
 * @returns Error message if invalid, empty string if valid
 */
function validateType(value: any, expectedType: string, path: string): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  switch (expectedType) {
    case 'string':
      return typeof value === 'string'
        ? ''
        : formatError(path, `Expected string, got ${typeof value}`);

    case 'number':
      return typeof value === 'number'
        ? ''
        : formatError(path, `Expected number, got ${typeof value}`);

    case 'boolean':
      return typeof value === 'boolean'
        ? ''
        : formatError(path, `Expected boolean, got ${typeof value}`);

    case 'array':
      return Array.isArray(value)
        ? ''
        : formatError(path, `Expected array, got ${typeof value}`);

    case 'object':
      return typeof value === 'object' && !Array.isArray(value)
        ? ''
        : formatError(path, `Expected object, got ${typeof value}`);

    default:
      return formatError(path, `Unknown type ${expectedType}`);
  }
}

/**
 * Validates that a value matches the schema's constraints
 *
 * @param value - Value to validate
 * @param schema - Schema to validate against
 * @param path - Path to the property
 * @returns Array of error messages
 */
function validateConstraints(
  value: any,
  schema: ValidationSchema,
  path: string
): string[] {
  const errors: string[] = [];

  // Skip validation for null/undefined values
  if (value === null || value === undefined) {
    return errors;
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(
      formatError(path, `Value must be one of: ${schema.enum.join(', ')}`)
    );
  }

  // String constraints
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(
        formatError(
          path,
          `String must be at least ${schema.minLength} characters long`
        )
      );
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(
        formatError(
          path,
          `String must be at most ${schema.maxLength} characters long`
        )
      );
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(
          formatError(path, `String must match pattern: ${schema.pattern}`)
        );
      }
    }
  }

  // Number constraints
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(
        formatError(
          path,
          `Number must be greater than or equal to ${schema.minimum}`
        )
      );
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(
        formatError(
          path,
          `Number must be less than or equal to ${schema.maximum}`
        )
      );
    }
  }

  // Array constraints
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`;

      // Validate type
      const itemSchema = schema.items as ValidationSchema;
      const typeError = validateType(item, itemSchema.type, itemPath);
      if (typeError) {
        errors.push(typeError);
      }

      // Validate constraints recursively
      const constraintErrors = validateConstraints(item, itemSchema, itemPath);
      errors.push(...constraintErrors);

      // Validate nested object or array
      if (
        (itemSchema.type === 'object' || itemSchema.type === 'array') &&
        item !== null &&
        item !== undefined
      ) {
        const nestedErrors = validateValue(item, itemSchema, itemPath);
        errors.push(...nestedErrors);
      }
    });
  }

  return errors;
}

/**
 * Validates a value against a schema
 *
 * @param value - Value to validate
 * @param schema - Schema to validate against
 * @param path - Path to the property
 * @returns Array of error messages
 */
function validateValue(
  value: any,
  schema: ValidationSchema,
  path = ''
): string[] {
  const errors: string[] = [];

  // Type validation
  const typeError = validateType(value, schema.type, path);
  if (typeError) {
    errors.push(typeError);
    return errors; // Don't continue validation if type is wrong
  }

  // Validate constraints
  const constraintErrors = validateConstraints(value, schema, path);
  errors.push(...constraintErrors);

  // Object validation
  if (schema.type === 'object' && schema.properties && value) {
    // Required properties validation
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push(
            formatError(
              path ? `${path}.${requiredProp}` : requiredProp,
              'Required property is missing'
            )
          );
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          const propPath = path ? `${path}.${propName}` : propName;
          const propValue = value[propName];

          // Skip undefined/null for non-required fields
          if (
            (propValue === undefined || propValue === null) &&
            !(schema.required && schema.required.includes(propName))
          ) {
            continue;
          }

          const propErrors = validateValue(propValue, propSchema, propPath);
          errors.push(...propErrors);
        }
      }
    }
  }

  return errors;
}

/**
 * Validates input data against a schema and returns the validation result
 *
 * @param input - Input data to validate
 * @param schema - Schema to validate against
 * @returns Validation result
 */
export function validateInput(
  input: any,
  schema: ValidationSchema
): ValidationResult {
  const errors = validateValue(input, schema);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates request parameters against a schema and returns a formatted error response if invalid
 *
 * @param input - Input data to validate
 * @param schema - Schema to validate against
 * @param errorFormatter - Function to format error response
 * @returns Error response if invalid, null if valid
 */
export function validateRequest(
  input: any,
  schema: ValidationSchema,
  errorFormatter: (error: Error, type: ErrorType, details: any) => any
): any | null {
  const result = validateInput(input, schema);

  if (!result.isValid) {
    const error = new Error('Validation error: Invalid request parameters');
    return errorFormatter(error, ErrorType.VALIDATION_ERROR, {
      errors: result.errors,
      input,
    });
  }

  return null;
}

/**
 * Validates that an ID string is valid and secure to use
 *
 * @param id - The ID to validate
 * @returns True if the ID is valid, false otherwise
 */
export function isValidId(id: string): boolean {
  // Basic check for non-empty string
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return false;
  }

  // Check that the ID has a reasonable length
  if (id.length < 3 || id.length > 100) {
    return false;
  }

  // Check that the ID only contains valid characters
  // Allowing alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return false;
  }

  // Check for dangerous patterns that could be used for injection
  const dangerousPatterns = [
    /--/, // SQL comment marker
    /\/\*/, // SQL block comment start
    /\*\//, // SQL block comment end
    /\$\{/, // Template literal injection
    /\.\./, // Path traversal
    /\|\|/, // Command injection
    /<script/i, // XSS attempt
    /javascript:/i, // JavaScript protocol
    /data:/i, // Data URL
    /&#/, // HTML entities
    /=/, // Assignment/parameter pollution
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(id)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that a list ID is valid and safe to use
 * Contains additional validation specific to Attio list IDs
 *
 * @param listId - The list ID to validate
 * @returns True if the list ID is valid, false otherwise
 */
export function isValidListId(listId: string): boolean {
  // First apply general ID validation
  if (!isValidId(listId)) {
    return false;
  }

  // Additional validation specific to list IDs
  // Attio list IDs typically start with "list_" followed by alphanumeric characters
  if (!/^list_[a-zA-Z0-9]+$/.test(listId)) {
    return false;
  }

  // Ensure the ID isn't suspiciously long
  if (listId.length > 50) {
    return false;
  }

  return true;
}
