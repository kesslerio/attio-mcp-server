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
      return typeof value === 'string' ? '' : formatError(path, `Expected string, got ${typeof value}`);
    
    case 'number':
      return typeof value === 'number' ? '' : formatError(path, `Expected number, got ${typeof value}`);
    
    case 'boolean':
      return typeof value === 'boolean' ? '' : formatError(path, `Expected boolean, got ${typeof value}`);
    
    case 'array':
      return Array.isArray(value) ? '' : formatError(path, `Expected array, got ${typeof value}`);
    
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) ? '' : formatError(path, `Expected object, got ${typeof value}`);
    
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
function validateConstraints(value: any, schema: ValidationSchema, path: string): string[] {
  const errors: string[] = [];

  // Skip validation for null/undefined values
  if (value === null || value === undefined) {
    return errors;
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(formatError(path, `Value must be one of: ${schema.enum.join(', ')}`));
  }

  // String constraints
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(formatError(path, `String must be at least ${schema.minLength} characters long`));
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(formatError(path, `String must be at most ${schema.maxLength} characters long`));
    }
    
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(formatError(path, `String must match pattern: ${schema.pattern}`));
      }
    }
  }

  // Number constraints
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(formatError(path, `Number must be greater than or equal to ${schema.minimum}`));
    }
    
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(formatError(path, `Number must be less than or equal to ${schema.maximum}`));
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
      if ((itemSchema.type === 'object' || itemSchema.type === 'array') && item !== null && item !== undefined) {
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
function validateValue(value: any, schema: ValidationSchema, path: string = ''): string[] {
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
          errors.push(formatError(path ? `${path}.${requiredProp}` : requiredProp, 'Required property is missing'));
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
          if ((propValue === undefined || propValue === null) && (!schema.required || !schema.required.includes(propName))) {
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
export function validateInput(input: any, schema: ValidationSchema): ValidationResult {
  const errors = validateValue(input, schema);
  
  return {
    isValid: errors.length === 0,
    errors
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
      input
    });
  }
  
  return null;
}