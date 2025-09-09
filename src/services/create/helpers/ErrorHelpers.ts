import {
  UniversalValidationError,
  ErrorType,
} from '../../../handlers/tool-configs/universal/schemas.js';
import { ERROR_MESSAGES } from '../../../constants/universal.constants.js';

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  CONFIGURATION = 'CONFIGURATION',
}

export interface EnhancedErrorDetails {
  category?: ErrorCategory;
  field?: string;
  expectedType?: string;
  receivedType?: string;
  expectedValue?: unknown;
  receivedValue?: unknown;
  suggestion?: string;
  remediation?: string[];
  relatedFields?: string[];
  errorCode?: string;
}

export function createEnhancedValidationError(
  message: string,
  details: Partial<EnhancedErrorDetails>
): UniversalValidationError {
  return new UniversalValidationError(message, ErrorType.USER_ERROR, {
    ...details,
  });
}

export function createFieldTypeError(
  field: string,
  expectedType: string,
  receivedValue: unknown
): UniversalValidationError {
  const receivedType = typeof receivedValue;
  const message = ERROR_MESSAGES.INVALID_FIELD_TYPE(
    field,
    expectedType,
    receivedType
  );

  return createEnhancedValidationError(message, {
    field,
    expectedType,
    receivedType,
    errorCode: 'FIELD_TYPE_MISMATCH',
  });
}

export function createFieldCollisionError(
  collidingFields: string[],
  targetField: string
): UniversalValidationError {
  const message = ERROR_MESSAGES.FIELD_COLLISION(collidingFields, targetField);
  return createEnhancedValidationError(message, {
    field: targetField,
    errorCode: 'FIELD_COLLISION',
    relatedFields: collidingFields,
  });
}
