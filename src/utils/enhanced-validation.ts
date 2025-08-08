/**
 * Enhanced validation utilities for Attio API field validation
 * Provides comprehensive validation based on Attio attribute metadata
 */

import { ValidationResult } from './validation.js';
import { 
  getObjectAttributeMetadata, 
  getAttributeTypeInfo,
  getFieldValidationRules,
  AttioAttributeMetadata 
} from '../api/attribute-types.js';

/**
 * Enhanced validation result with detailed error information
 */
export interface EnhancedValidationResult extends ValidationResult {
  warnings: string[];
  readOnlyFields?: string[];
  missingFields?: string[];
  invalidFields?: string[];
  error?: string;
}

/**
 * Validation context for record data
 */
interface ValidationContext {
  resourceType: string;
  isUpdate: boolean;
  attributeMetadata: Map<string, AttioAttributeMetadata>;
}

/**
 * Enhanced error response with actionable information
 */
export interface EnhancedErrorResponse {
  error: string;
  warnings: string[];
  operation: string;
  suggestions?: string[];
  invalidFields?: string[];
  missingFields?: string[];
}

/**
 * Validate read-only fields against provided data
 */
export function validateReadOnlyFields(
  data: Record<string, unknown>,
  readOnlyFields: string[]
): EnhancedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const violatedFields: string[] = [];

  for (const field of readOnlyFields) {
    if (field in data && data[field] !== undefined) {
      errors.push(`Field '${field}' is read-only and cannot be modified`);
      violatedFields.push(field);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    readOnlyFields: violatedFields
  };
}

/**
 * Validate field existence for required fields
 */
export function validateFieldExistence(
  data: Record<string, unknown>,
  requiredFields: string[]
): EnhancedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      errors.push(`Required field '${field}' is missing or empty`);
      missing.push(field);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingFields: missing
  };
}

/**
 * Validate select field values against allowed options
 */
export function validateSelectField(
  value: unknown,
  options: string[],
  fieldName?: string
): EnhancedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldLabel = fieldName || 'field';

  if (value === undefined || value === null) {
    return { isValid: true, errors, warnings };
  }

  // Handle array values (multiselect)
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && !options.includes(item)) {
        errors.push(`Invalid option '${item}' for ${fieldLabel}. Valid options: ${options.join(', ')}`);
      }
    }
  } else if (typeof value === 'string' && !options.includes(value)) {
    errors.push(`Invalid option '${value}' for ${fieldLabel}. Valid options: ${options.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate field type and format
 */
async function validateFieldType(
  fieldName: string,
  value: unknown,
  rules: Awaited<ReturnType<typeof getFieldValidationRules>>
): Promise<EnhancedValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (value === undefined || value === null) {
    if (rules.required) {
      errors.push(`Required field '${fieldName}' cannot be null or undefined`);
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Type validation
  switch (rules.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`Field '${fieldName}' must be a string, got ${typeof value}`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`Field '${fieldName}' must be a valid number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`Field '${fieldName}' must be a boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`Field '${fieldName}' must be an array`);
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`Field '${fieldName}' must be an object`);
      }
      break;
  }

  // Pattern validation (email, URL, phone)
  if (rules.pattern && typeof value === 'string') {
    const regex = new RegExp(rules.pattern);
    if (!regex.test(value)) {
      switch (rules.pattern) {
        case '^[^@]+@[^@]+\\.[^@]+$':
          errors.push(`Field '${fieldName}' must be a valid email address`);
          break;
        case '^https?://':
          errors.push(`Field '${fieldName}' must be a valid URL starting with http:// or https://`);
          break;
        case '^\\+?[0-9-()\\s]+$':
          errors.push(`Field '${fieldName}' must be a valid phone number`);
          break;
        default:
          errors.push(`Field '${fieldName}' does not match required format`);
      }
    }
  }

  // Enum validation for select fields
  if (rules.enum && rules.enum.length > 0) {
    const selectValidation = validateSelectField(value, rules.enum.map(String), fieldName);
    errors.push(...selectValidation.errors);
    warnings.push(...selectValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive record field validation using Attio metadata
 */
export async function validateRecordFields(
  resourceType: string,
  data: Record<string, unknown>,
  isUpdate: boolean
): Promise<EnhancedValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidFields: string[] = [];
  const missingFields: string[] = [];
  const readOnlyFields: string[] = [];

  try {
    // Get attribute metadata for the resource type
    const attributeMetadata = await getObjectAttributeMetadata(resourceType);
    
    if (attributeMetadata.size === 0) {
      warnings.push(`No attribute metadata found for resource type '${resourceType}'. Validation may be incomplete.`);
    }

    // Validate each field in the data
    for (const [fieldName, value] of Object.entries(data)) {
      const metadata = attributeMetadata.get(fieldName);
      
      if (!metadata) {
        warnings.push(`Field '${fieldName}' is not recognized for resource type '${resourceType}'`);
        continue;
      }

      // Check if field is writable
      if (metadata.is_writable === false) {
        errors.push(`Field '${fieldName}' is read-only and cannot be modified`);
        readOnlyFields.push(fieldName);
        invalidFields.push(fieldName);
        continue;
      }

      // Get validation rules for this field
      try {
        const validationRules = await getFieldValidationRules(resourceType, fieldName);
        
        // Validate field type and format
        const typeValidation = await validateFieldType(fieldName, value, validationRules);
        errors.push(...typeValidation.errors);
        warnings.push(...typeValidation.warnings);
        
        if (!typeValidation.isValid) {
          invalidFields.push(fieldName);
        }

      } catch (ruleError) {
        warnings.push(`Could not get validation rules for field '${fieldName}': ${ruleError instanceof Error ? ruleError.message : 'Unknown error'}`);
      }
    }

    // For create operations, check required fields
    if (!isUpdate) {
      const requiredFields: string[] = [];
      
      for (const [fieldName, metadata] of attributeMetadata) {
        if (metadata.is_required && metadata.is_writable !== false) {
          requiredFields.push(fieldName);
        }
      }
      
      const requiredFieldValidation = validateFieldExistence(data, requiredFields);
      errors.push(...requiredFieldValidation.errors);
      warnings.push(...requiredFieldValidation.warnings);
      missingFields.push(...(requiredFieldValidation.missingFields || []));
    }

  } catch (metadataError) {
    const errorMessage = metadataError instanceof Error ? metadataError.message : 'Unknown error';
    errors.push(`Failed to validate fields: ${errorMessage}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    readOnlyFields,
    missingFields,
    invalidFields
  };
}

/**
 * Create enhanced error response with actionable suggestions
 */
export function createEnhancedErrorResponse(
  validation: EnhancedValidationResult,
  operation: string
): EnhancedErrorResponse {
  const suggestions: string[] = [];
  
  // Generate helpful suggestions based on validation errors
  if (validation.missingFields && validation.missingFields.length > 0) {
    suggestions.push(`Add required fields: ${validation.missingFields.join(', ')}`);
  }
  
  if (validation.readOnlyFields && validation.readOnlyFields.length > 0) {
    suggestions.push(`Remove read-only fields: ${validation.readOnlyFields.join(', ')}`);
  }
  
  if (validation.invalidFields && validation.invalidFields.length > 0) {
    suggestions.push(`Fix invalid field values for: ${validation.invalidFields.join(', ')}`);
  }

  // Add operation-specific suggestions
  if (operation === 'create-record' && validation.missingFields?.length) {
    suggestions.push('Ensure all required fields have values before creating a record');
  }
  
  if (operation === 'update-record' && validation.readOnlyFields?.length) {
    suggestions.push('Use separate calls to update read-only fields if they support it, or remove them from the update');
  }

  return {
    error: validation.errors.join('; '),
    warnings: validation.warnings,
    operation,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    invalidFields: validation.invalidFields,
    missingFields: validation.missingFields
  };
}