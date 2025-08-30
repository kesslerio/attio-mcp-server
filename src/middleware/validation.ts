/**
 * JSON Schema Validation Middleware
 *
 * Provides strict JSON-schema validation for all MCP tools
 * to prevent runtime type errors from reaching business logic.
 *
 * This middleware validates all tool parameters against their schemas
 * and returns proper 4xx ValidationError for schema violations.
 */

import {
  UniversalValidationError,
  ErrorType,
  HttpStatusCode,
  InputSanitizer,
  SanitizedValue,
  SanitizedObject,
} from '../handlers/tool-configs/universal/schemas.js';

/**
 * Schema validation result
 */
export interface ValidationResult {
  valid: boolean;
  sanitizedParams?: SanitizedObject;
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  expected?: string;
  suggestion?: string;
}

/**
 * Schema definition for validation
 */
export interface SchemaDefinition {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
}

/**
 * Validates a value against a JSON schema
 */
export class JsonSchemaValidator {
  /**
   * Validate parameters against a JSON schema
   */
  static validate(params: unknown, schema: SchemaDefinition): ValidationResult {
    // First sanitize the input

    if (
      !sanitized ||
      typeof sanitized !== 'object' ||
      Array.isArray(sanitized)
    ) {
      return {
        valid: false,
        errors: [
          {
            field: 'root',
            message: 'Parameters must be an object',
            value: params,
            expected: 'object',
          },
        ],
      };
    }


    // Validate against schema

    if (validationErrors.length > 0) {
      return {
        valid: false,
        errors: validationErrors,
      };
    }

    return {
      valid: true,
      sanitizedParams,
    };
  }

  /**
   * Validate an object against a schema
   */
  private static validateObject(
    obj: SanitizedObject,
    schema: SchemaDefinition,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check type
    if (schema.type === 'object') {
      // Check required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (
            !(field in obj) ||
            obj[field] === null ||
            obj[field] === undefined
          ) {
            errors.push({
              field: path ? `${path}.${field}` : field,
              message: `Missing required field: ${field}`,
              expected: 'required field to be present',
            });
          }
        }
      }

      // Check properties
      if (schema.properties) {
        for (const [key, value] of Object.entries(obj)) {
          if (schema.properties[key]) {
            errors.push(
              ...this.validateValue(
                value,
                schema.properties[key] as SchemaDefinition,
                fieldPath
              )
            );
          } else if (schema.additionalProperties === false) {
            errors.push({
              field: path ? `${path}.${key}` : key,
              message: `Unknown field: ${key}`,
              value,
              suggestion: 'Remove this field or check the field name',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate a single value against a schema
   */
  private static validateValue(
    value: SanitizedValue,
    schema: SchemaDefinition,
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Handle null/undefined
    if (value === null || value === undefined) {
      if (!schema.default) {
        return errors; // Allow null/undefined if no default specified
      }
    }

    // Check type

    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: path,
            message: `Expected string, got ${actualType}`,
            value,
            expected: 'string',
          });
        } else {
          // Check string constraints
          if (schema.minLength && value.length < schema.minLength) {
            errors.push({
              field: path,
              message: `String must be at least ${schema.minLength} characters`,
              value,
              expected: `minimum length: ${schema.minLength}`,
            });
          }
          if (schema.maxLength && value.length > schema.maxLength) {
            errors.push({
              field: path,
              message: `String must be at most ${schema.maxLength} characters`,
              value,
              expected: `maximum length: ${schema.maxLength}`,
            });
          }
          if (schema.pattern) {
            if (!regex.test(value)) {
              errors.push({
                field: path,
                message: `String does not match pattern: ${schema.pattern}`,
                value,
                expected: `pattern: ${schema.pattern}`,
              });
            }
          }
          if (schema.enum && !schema.enum.includes(value)) {
            errors.push({
              field: path,
              message: `Invalid value: ${value}`,
              value,
              expected: `one of: ${schema.enum.join(', ')}`,
            });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            field: path,
            message: `Expected number, got ${actualType}`,
            value,
            expected: 'number',
          });
        } else {
          // Check number constraints
          if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push({
              field: path,
              message: `Value must be at least ${schema.minimum}`,
              value,
              expected: `minimum: ${schema.minimum}`,
            });
          }
          if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push({
              field: path,
              message: `Value must be at most ${schema.maximum}`,
              value,
              expected: `maximum: ${schema.maximum}`,
            });
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: path,
            message: `Expected boolean, got ${actualType}`,
            value,
            expected: 'boolean',
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: path,
            message: `Expected array, got ${actualType}`,
            value,
            expected: 'array',
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({
            field: path,
            message: `Expected object, got ${actualType}`,
            value,
            expected: 'object',
          });
        } else if (value !== null) {
          // Recursively validate nested object
          errors.push(
            ...this.validateObject(value as SanitizedObject, schema, path)
          );
        }
        break;
    }

    return errors;
  }
}

/**
 * Parameter validation middleware
 */
export class ParameterValidationMiddleware {
  /**
   * Validate parameters for universal tools
   */
  static validateUniversalParams(
    toolName: string,
    params: unknown,
    schema: SchemaDefinition
  ): SanitizedObject {
    // First validate against JSON schema

    if (!result.valid) {
        (e) =>
          `${e.field}: ${e.message}${e.suggestion ? ` (${e.suggestion})` : ''}`
      );

      throw new UniversalValidationError(
        `Validation failed for ${toolName}:\n${errorMessages.join('\n')}`,
        ErrorType.USER_ERROR,
        {
          httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
          suggestion: 'Fix the validation errors and try again',
        }
      );
    }


    // Additional specific validations for universal tools
    this.validatePaginationParams(sanitizedParams);
    this.validateIdFormat(sanitizedParams);

    return sanitizedParams;
  }

  /**
   * Validate pagination parameters (limit, offset)
   */
  private static validatePaginationParams(params: SanitizedObject): void {
    // Validate limit
    if (
      'limit' in params &&
      params.limit !== null &&
      params.limit !== undefined
    ) {

      if (isNaN(limit) || !Number.isInteger(limit)) {
        throw new UniversalValidationError(
          'Parameter "limit" must be an integer',
          ErrorType.USER_ERROR,
          {
            field: 'limit',
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: 'Provide a valid integer for limit',
            example: 'limit: 10',
          }
        );
      }

      if (limit < 1) {
        throw new UniversalValidationError(
          'Parameter "limit" must be at least 1',
          ErrorType.USER_ERROR,
          {
            field: 'limit',
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: 'Use a positive integer for limit',
            example: 'limit: 10',
          }
        );
      }

      if (limit > 100) {
        throw new UniversalValidationError(
          'Parameter "limit" must not exceed 100',
          ErrorType.USER_ERROR,
          {
            field: 'limit',
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: 'Use a value between 1 and 100',
            example: 'limit: 50',
          }
        );
      }
    }

    // Validate offset
    if (
      'offset' in params &&
      params.offset !== null &&
      params.offset !== undefined
    ) {

      if (isNaN(offset) || !Number.isInteger(offset)) {
        throw new UniversalValidationError(
          'Parameter "offset" must be an integer',
          ErrorType.USER_ERROR,
          {
            field: 'offset',
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: 'Provide a valid integer for offset',
            example: 'offset: 0',
          }
        );
      }

      if (offset < 0) {
        throw new UniversalValidationError(
          'Parameter "offset" must be non-negative',
          ErrorType.USER_ERROR,
          {
            field: 'offset',
            httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
            suggestion: 'Use a non-negative integer for offset',
            example: 'offset: 0',
          }
        );
      }
    }
  }

  /**
   * Validate ID format for record_id and similar fields
   */
  private static validateIdFormat(params: SanitizedObject): void {
      'record_id',
      'source_id',
      'target_id',
      'company_id',
      'person_id',
    ];

    for (const field of idFields) {
      if (
        field in params &&
        params[field] !== null &&
        params[field] !== undefined
      ) {

        // Basic ID format validation (alphanumeric with underscores and hyphens)

        if (!idRegex.test(id)) {
          throw new UniversalValidationError(
            `Invalid ${field} format: "${id}"`,
            ErrorType.USER_ERROR,
            {
              field,
              httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
              suggestion: `The ${field} should contain only letters, numbers, underscores, and hyphens`,
              example: `${field}: 'comp_abc123' or 'person_xyz789'`,
            }
          );
        }

        // Check for reasonable length
        if (id.length < 3 || id.length > 100) {
          throw new UniversalValidationError(
            `Invalid ${field} length: ${id.length} characters`,
            ErrorType.USER_ERROR,
            {
              field,
              httpStatusCode: HttpStatusCode.UNPROCESSABLE_ENTITY,
              suggestion: `The ${field} should be between 3 and 100 characters`,
              example: `${field}: 'comp_abc123'`,
            }
          );
        }
      }
    }
  }
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  error: UniversalValidationError
): unknown {
  return {
    error: error.toErrorResponse().error,
    status: 'error',
    code: error.httpStatusCode,
  };
}

/**
 * Wrap a handler with validation middleware
 */
export function withValidation<T extends (...args: unknown[]) => any>(
  handler: T,
  schema: SchemaDefinition,
  toolName: string
): T {
  return (async (...args: unknown[]) => {
    try {
      // Validate parameters if provided
      if (args[0]) {
          ParameterValidationMiddleware.validateUniversalParams(
            toolName,
            args[0],
            schema
          );
        // Replace original params with validated ones
        args[0] = validatedParams;
      }

      // Call the original handler
      return await handler(...args);
    } catch (error: unknown) {
      // If it's already a validation error, re-throw
      if (error instanceof UniversalValidationError) {
        throw error;
      }

      // Otherwise wrap in a system error
      throw new UniversalValidationError(
        `Unexpected error in ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.SYSTEM_ERROR,
        {
          httpStatusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }) as T;
}
