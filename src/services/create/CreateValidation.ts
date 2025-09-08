/**
 * CreateValidation - Shared validation utilities for creation strategies
 * 
 * Extracted from UniversalCreateService to reduce duplication
 */

import { validateRecordFields } from '../../utils/validation-utils.js';
import { mapRecordFields, validateFields } from '../../handlers/tool-configs/universal/field-mapper.js';
import { UniversalValidationError, ErrorType } from '../../handlers/tool-configs/universal/schemas.js';
import { UniversalResourceType } from '../../handlers/tool-configs/universal/types.js';

export class CreateValidation {
  /**
   * Common field mapping with collision detection
   */
  static async mapFields(
    data: Record<string, unknown>,
    resourceType: UniversalResourceType,
    availableAttributes?: string[]
  ): Promise<Record<string, unknown>> {
    return mapRecordFields(data, resourceType, availableAttributes);
  }

  /**
   * Validate field types and formats
   */
  static validateFieldTypes(
    data: Record<string, unknown>,
    schema: Record<string, any>
  ): void {
    const errors = validateRecordFields(data, schema);
    if (errors.length > 0) {
      throw new UniversalValidationError(
        'Field validation failed',
        ErrorType.USER_ERROR,
        { errors }
      );
    }
  }

  /**
   * Check for unknown fields and provide suggestions
   */
  static checkUnknownFields(
    data: Record<string, unknown>,
    knownFields: string[]
  ): string[] {
    const unknownFields = Object.keys(data).filter(
      field => !knownFields.includes(field)
    );
    return unknownFields;
  }

  /**
   * Create field type error
   */
  static createFieldTypeError(
    field: string,
    expectedType: string,
    receivedValue: unknown,
    resourceType?: string
  ): UniversalValidationError {
    const receivedType = typeof receivedValue;
    const message = `Invalid type for field "${field}": expected ${expectedType}, received ${receivedType}`;

    return new UniversalValidationError(message, ErrorType.USER_ERROR, {
      field,
      expectedType,
      receivedType,
      errorCode: 'FIELD_TYPE_MISMATCH',
      suggestion: `Convert ${field} to ${expectedType}`,
      remediation: [
        `Convert ${field} to ${expectedType}`,
        `Example: ${field}: ${CreateValidation.getExampleValue(expectedType)}`,
      ],
    });
  }

  /**
   * Get example value for a given type
   */
  static getExampleValue(type: string): string {
    switch (type) {
      case 'string':
        return '"example string"';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'array':
        return '["item1", "item2"]';
      case 'object':
        return '{ "key": "value" }';
      default:
        return `<${type}>`;
    }
  }

  /**
   * Enhance uniqueness error messages with helpful context
   */
  static async enhanceUniquenessError(
    resourceType: UniversalResourceType,
    errorMessage: string,
    mappedData: Record<string, unknown>
  ): Promise<string> {
    // Extract field name from error message if possible
    const fieldMatch =
      errorMessage.match(/field\s+["']([^"']+)["']/i) ||
      errorMessage.match(/attribute\s+["']([^"']+)["']/i) ||
      errorMessage.match(/column\s+["']([^"']+)["']/i);

    let enhancedMessage = `Uniqueness constraint violation for ${resourceType}`;

    if (fieldMatch && fieldMatch[1]) {
      const fieldName = fieldMatch[1];
      const fieldValue = mappedData[fieldName];
      enhancedMessage += `: The value "${fieldValue}" for field "${fieldName}" already exists.`;
    } else {
      enhancedMessage += `: A record with these values already exists.`;
    }

    enhancedMessage +=
      '\n\nPlease check existing records or use different values for unique fields.';

    return enhancedMessage;
  }
}