/**
 * Field Validation Utility
 *
 * Provides secure field name validation to prevent parameter injection attacks
 * and ensure only valid fields are used in API requests.
 */

import { ResourceType } from '../../types/attio.js';
import {
  UniversalValidationError,
  ErrorType,
} from '../../handlers/tool-configs/universal/schemas.js';

/**
 * Valid category names for attribute filtering
 */
const VALID_CATEGORIES = [
  'basic',
  'business',
  'personal',
  'contact',
  'address',
  'social',
  'custom',
  'system',
  'metadata',
  'financial',
  'technical',
  'marketing',
  'sales',
];

/**
 * Common field patterns that are typically safe across most resource types
 */
const COMMON_SAFE_FIELDS = [
  // ID fields
  'id',
  'record_id',
  'object_id',
  'workspace_id',

  // Metadata fields
  'created_at',
  'updated_at',
  'created_by',

  // Common business fields
  'name',
  'title',
  'description',
  'notes',
  'status',
  'priority',
  'tags',

  // Contact fields
  'email',
  'email_address',
  'email_addresses',
  'phone',
  'phone_number',
  'phone_numbers',
  'website',
  'websites',
  'domains',

  // Address fields
  'address',
  'street_address',
  'city',
  'state',
  'country',
  'postal_code',

  // Date fields
  'due_date',
  'start_date',
  'end_date',
  'date_created',
  'last_modified',

  // Reference fields
  'assignee',
  'owner',
  'linked_records',
  'relationships',
];

/**
 * Resource-specific field mappings for enhanced validation
 */
const RESOURCE_SPECIFIC_FIELDS: Record<ResourceType, string[]> = {
  [ResourceType.PEOPLE]: [
    ...COMMON_SAFE_FIELDS,
    'first_name',
    'last_name',
    'full_name',
    'job_title',
    'company',
    'location',
    'linkedin',
    'twitter',
    'facebook',
    'mobile',
    'work_phone',
    'home_phone',
    'avatar_url',
    'bio',
    'department',
  ],

  [ResourceType.COMPANIES]: [
    ...COMMON_SAFE_FIELDS,
    'industry',
    'size',
    'revenue',
    'founded',
    'headquarters',
    'employees',
    'type',
    'linkedin_url',
    'crunchbase_url',
    'logo_url',
    'ticker_symbol',
  ],

  [ResourceType.TASKS]: [
    ...COMMON_SAFE_FIELDS,
    'content',
    'subject',
    'completed',
    'assigned_to',
    'project',
    'milestone',
    'estimated_hours',
    'actual_hours',
  ],

  [ResourceType.LISTS]: [
    ...COMMON_SAFE_FIELDS,
    'entry_count',
    'parent_object',
    'api_slug',
    'workspace',
  ],

  [ResourceType.RECORDS]: [
    ...COMMON_SAFE_FIELDS,
    'content',
    'subject',
    'format',
    'author',
    'visibility',
    'attachments',
    'value',
    'currency',
    'stage',
    'probability',
  ],
};

/**
 * Dangerous patterns that should never be allowed in field names
 */
const DANGEROUS_PATTERNS = [
  // SQL injection attempts
  /['";]/,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b/i,

  // Script injection attempts
  /<script\b/i,
  /javascript:/i,
  /on\w+=/i,

  // Path traversal attempts
  /\.\./,
  /\/\.\./,

  // Command injection attempts
  /[;&|`$()]/,

  // URL manipulation attempts
  /[?&#]/,

  // Control characters
  // eslint-disable-next-line no-control-regex
  /[\x00-\x1f\x7f]/,
];

/**
 * Field name sanitization options
 */
export interface FieldSanitizationOptions {
  /** Whether to allow underscore characters (default: true) */
  allowUnderscores?: boolean;

  /** Whether to allow numeric characters (default: true) */
  allowNumbers?: boolean;

  /** Maximum field name length (default: 50) */
  maxLength?: number;

  /** Whether to convert to lowercase (default: false) */
  toLowerCase?: boolean;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  /** Whether the field is valid */
  valid: boolean;

  /** Sanitized field name (if valid) */
  sanitized?: string;

  /** Validation error message (if invalid) */
  error?: string;

  /** Security warnings */
  warnings: string[];
}

/**
 * Sanitize a field name to prevent injection attacks
 */
export function sanitizeFieldName(
  fieldName: string,
  options: FieldSanitizationOptions = {}
): string {
  const {
    allowUnderscores = true,
    allowNumbers = true,
    maxLength = 50,
    toLowerCase = false,
  } = options;

  let sanitized = fieldName.trim();

  // Convert to lowercase if requested
  if (toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  // Remove dangerous characters
  sanitized = sanitized.replace(/[^\w]/g, allowUnderscores ? '_' : '');

  // Remove numbers if not allowed
  if (!allowNumbers) {
    sanitized = sanitized.replace(/[0-9]/g, '');
  }

  // Trim to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Ensure starts with letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = 'field_' + sanitized;
  }

  return sanitized;
}

/**
 * Validate a single field name
 */
export function validateFieldName(
  fieldName: string,
  resourceType: ResourceType,
  options: FieldSanitizationOptions = {}
): FieldValidationResult {
  const warnings: string[] = [];

  // Basic validation
  if (!fieldName || typeof fieldName !== 'string') {
    return {
      valid: false,
      error: 'Field name must be a non-empty string',
      warnings,
    };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fieldName)) {
      return {
        valid: false,
        error: `Field name contains dangerous characters: "${fieldName}"`,
        warnings: [...warnings, 'Potential security risk detected'],
      };
    }
  }

  // Sanitize field name
  const sanitized = sanitizeFieldName(fieldName, options);

  // Check if sanitization changed the field significantly
  if (sanitized !== fieldName.trim()) {
    warnings.push(
      `Field name was sanitized from "${fieldName}" to "${sanitized}"`
    );
  }

  // Validate against known fields for this resource type
  const allowedFields =
    RESOURCE_SPECIFIC_FIELDS[resourceType] || COMMON_SAFE_FIELDS;

  if (!allowedFields.includes(sanitized)) {
    // Check if it's close to a known field (typo detection)
    const similarField = findSimilarField(sanitized, allowedFields);
    if (similarField) {
      warnings.push(
        `Did you mean "${similarField}" instead of "${sanitized}"?`
      );
    } else {
      warnings.push(
        `Field "${sanitized}" is not in the known safe fields list for ${resourceType}`
      );
    }
  }

  return {
    valid: true,
    sanitized,
    warnings,
  };
}

/**
 * Validate an array of field names
 */
export function validateFieldNames(
  fieldNames: string[],
  resourceType: ResourceType,
  options: FieldSanitizationOptions = {}
): {
  valid: boolean;
  sanitizedFields: string[];
  errors: string[];
  warnings: string[];
} {
  const sanitizedFields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const fieldName of fieldNames) {
    const result = validateFieldName(fieldName, resourceType, options);

    if (result.valid && result.sanitized) {
      sanitizedFields.push(result.sanitized);
      warnings.push(...result.warnings);
    } else {
      errors.push(result.error || `Invalid field: ${fieldName}`);
    }
  }

  return {
    valid: errors.length === 0,
    sanitizedFields,
    errors,
    warnings,
  };
}

/**
 * Find similar field name (simple Levenshtein distance)
 */
function findSimilarField(target: string, candidates: string[]): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(
      target.toLowerCase(),
      candidate.toLowerCase()
    );
    if (distance < bestDistance && distance <= 2) {
      // Allow 2 character differences
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Secure field validation for API requests
 * Throws an error if validation fails
 */
export function secureValidateFields(
  fieldNames: string[],
  resourceType: ResourceType,
  operation: string = 'field filtering'
): string[] {
  if (!Array.isArray(fieldNames)) {
    throw new UniversalValidationError(
      `Invalid field names for ${operation}: must be an array`,
      ErrorType.USER_ERROR,
      {
        field: 'fields',
        suggestion: 'Provide an array of field names',
      }
    );
  }

  if (fieldNames.length === 0) {
    return []; // Empty array is valid (no filtering)
  }

  if (fieldNames.length > 50) {
    throw new UniversalValidationError(
      `Too many fields specified for ${operation}: ${fieldNames.length} (maximum: 50)`,
      ErrorType.USER_ERROR,
      {
        field: 'fields',
        suggestion: 'Reduce the number of fields or use multiple requests',
      }
    );
  }

  const validation = validateFieldNames(fieldNames, resourceType);

  if (!validation.valid) {
    throw new UniversalValidationError(
      `Invalid field names for ${operation}: ${validation.errors.join(', ')}. Valid fields include: ${RESOURCE_SPECIFIC_FIELDS[resourceType]?.slice(0, 10).join(', ')}`,
      ErrorType.USER_ERROR,
      {
        field: 'fields',
        suggestion: 'Use only valid field names for this resource type',
      }
    );
  }

  // Log warnings but don't fail
  if (validation.warnings.length > 0) {
    console.warn(
      `Field validation warnings for ${operation}:`,
      validation.warnings
    );
  }

  return validation.sanitizedFields;
}

/**
 * Validate category names for attribute filtering
 */
export function validateCategoryName(
  categoryName: string
): FieldValidationResult {
  const warnings: string[] = [];

  // Basic validation
  if (!categoryName || typeof categoryName !== 'string') {
    return {
      valid: false,
      error: 'Category name must be a non-empty string',
      warnings,
    };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(categoryName)) {
      return {
        valid: false,
        error: `Category name contains dangerous characters: "${categoryName}"`,
        warnings: [...warnings, 'Potential security risk detected'],
      };
    }
  }

  // Sanitize category name
  const sanitized = sanitizeFieldName(categoryName, {
    allowUnderscores: true,
    allowNumbers: false,
    maxLength: 30,
    toLowerCase: true,
  });

  // Check if it's a valid category
  if (!VALID_CATEGORIES.includes(sanitized)) {
    const similarCategory = findSimilarField(sanitized, VALID_CATEGORIES);
    if (similarCategory) {
      warnings.push(
        `Did you mean "${similarCategory}" instead of "${sanitized}"?`
      );
    } else {
      warnings.push(
        `Category "${sanitized}" is not in the known categories list`
      );
    }
  }

  return {
    valid: true,
    sanitized,
    warnings,
  };
}

/**
 * Validate an array of category names
 */
export function validateCategoryNames(categoryNames: string[]): {
  valid: boolean;
  sanitizedCategories: string[];
  errors: string[];
  warnings: string[];
} {
  const sanitizedCategories: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const categoryName of categoryNames) {
    const result = validateCategoryName(categoryName);

    if (result.valid && result.sanitized) {
      sanitizedCategories.push(result.sanitized);
      warnings.push(...result.warnings);
    } else {
      errors.push(result.error || `Invalid category: ${categoryName}`);
    }
  }

  return {
    valid: errors.length === 0,
    sanitizedCategories,
    errors,
    warnings,
  };
}

/**
 * Secure category validation for API requests
 * Throws an error if validation fails
 */
export function secureValidateCategories(
  categoryNames: string[],
  operation: string = 'category filtering'
): string[] {
  if (!Array.isArray(categoryNames)) {
    throw new UniversalValidationError(
      `Invalid category names for ${operation}: must be an array`,
      ErrorType.USER_ERROR,
      {
        field: 'categories',
        suggestion: 'Provide an array of category names',
      }
    );
  }

  if (categoryNames.length === 0) {
    return []; // Empty array is valid (no filtering)
  }

  if (categoryNames.length > 10) {
    throw new UniversalValidationError(
      `Too many categories specified for ${operation}: ${categoryNames.length} (maximum: 10)`,
      ErrorType.USER_ERROR,
      {
        field: 'categories',
        suggestion: 'Reduce the number of categories',
      }
    );
  }

  const validation = validateCategoryNames(categoryNames);

  if (!validation.valid) {
    throw new UniversalValidationError(
      `Invalid category names for ${operation}: ${validation.errors.join(', ')}. Valid categories: ${VALID_CATEGORIES.join(', ')}`,
      ErrorType.USER_ERROR,
      {
        field: 'categories',
        suggestion: 'Use only valid category names',
      }
    );
  }

  // Log warnings but don't fail
  if (validation.warnings.length > 0) {
    console.warn(
      `Category validation warnings for ${operation}:`,
      validation.warnings
    );
  }

  return validation.sanitizedCategories;
}
