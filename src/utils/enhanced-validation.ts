/**
 * Enhanced validation utilities
 * Temporary implementation to resolve build issues
 */

import { ValidationResult } from './validation.js';

export interface EnhancedValidationResult extends ValidationResult {
  warnings: string[];
  readOnlyFields?: string[];
  missingFields?: string[];
  error?: string;
}

/**
 * Validate read-only fields (placeholder implementation)
 */
export function validateReadOnlyFields(
  data: any,
  readOnlyFields: string[]
): EnhancedValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    readOnlyFields: []
  };
}

/**
 * Validate field existence (placeholder implementation)
 */
export function validateFieldExistence(
  data: any,
  requiredFields: string[]
): EnhancedValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    missingFields: []
  };
}

/**
 * Create enhanced error response (placeholder implementation)
 */
export function createEnhancedErrorResponse(
  validation: EnhancedValidationResult,
  operation: string
): any {
  return {
    error: validation.errors.join(', '),
    warnings: validation.warnings,
    operation
  };
}

/**
 * Validate record fields (placeholder implementation)
 */
export async function validateRecordFields(
  resourceType: string,
  data: any,
  isUpdate: boolean
): Promise<EnhancedValidationResult> {
  return {
    isValid: true,
    errors: [],
    warnings: []
  };
}

/**
 * Validate select field (placeholder implementation)
 */
export function validateSelectField(
  value: any,
  options: string[]
): EnhancedValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: []
  };
}