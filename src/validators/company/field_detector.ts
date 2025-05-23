/**
 * Field type detection utilities for company validation
 * 
 * Provides methods for detecting and inferring field types based on field names and API data
 */

import { ResourceType } from '../../types/attio.js';
import { detectFieldType } from '../../api/attribute-types.js';
import { TypeCache } from './type_cache.js';

/**
 * Additional boolean field name patterns for heuristic detection
 */
const BOOLEAN_FIELD_PATTERNS = [
  // Prefixes that strongly indicate boolean fields
  'is_',
  'has_',
  'can_',
  'should_',
  'will_',
  'was_',
  'does_',
  // Common terms that suggest boolean flags
  'enabled',
  'active',
  'verified',
  'published',
  'approved',
  'confirmed',
  'suspended',
  'locked',
  'flagged',
  'premium',
  'featured',
  'hidden',
  'allow',
  'accept',
  'available',
  'eligible',
  'complete',
  'valid',
];

/**
 * Determines if a field is likely to be a boolean based on its name
 *
 * @param fieldName - Name of the field to check
 * @returns True if the field name suggests it's a boolean
 */
export function isBooleanFieldByName(fieldName: string): boolean {
  const fieldNameLower = fieldName.toLowerCase();

  // Check prefixes (is_, has_, etc.)
  for (const pattern of BOOLEAN_FIELD_PATTERNS) {
    if (
      fieldNameLower.startsWith(pattern) ||
      fieldNameLower.includes('_' + pattern) ||
      fieldNameLower === pattern ||
      fieldNameLower.includes(pattern + '_')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Fallback field type inference based on field name patterns
 *
 * @param field - Field name
 * @returns Inferred field type
 */
export function inferFieldType(field: string): string {
  // Special case for services field - it's a text field in Attio
  if (field.toLowerCase() === 'services') {
    return 'string';
  }

  // Known array fields
  // Note: 'services' is a text field in Attio, not an array
  const arrayFieldPatterns = [
    'products',
    'categories',
    'keywords',
    'tags',
    'emails',
    'phones',
    'addresses',
    'social_profiles',
  ];

  // Known object fields
  const objectFieldPatterns = [
    'location',
    'address',
    'metadata',
    'settings',
    'preferences',
  ];

  // Known number fields
  const numberFieldPatterns = [
    'count',
    'amount',
    'size',
    'revenue',
    'employees',
    'funding',
    'valuation',
    'score',
    'rating',
  ];

  // Known boolean fields
  const booleanFieldPatterns = [
    'is_',
    'has_',
    'enabled',
    'active',
    'verified',
    'published',
  ];

  const lowerField = field.toLowerCase();

  // Check for array patterns
  if (arrayFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
    return 'array';
  }

  // Check for object patterns
  if (objectFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
    return 'object';
  }

  // Check for number patterns
  if (numberFieldPatterns.some((pattern) => lowerField.includes(pattern))) {
    return 'number';
  }

  // Check for boolean patterns
  if (
    booleanFieldPatterns.some(
      (pattern) =>
        lowerField.startsWith(pattern) || lowerField.includes(pattern)
    )
  ) {
    return 'boolean';
  }

  // Default to string
  return 'string';
}

/**
 * Gets field type with caching and fallback logic
 *
 * @param field - Field name
 * @returns Field type string
 */
export async function getFieldTypeWithCache(field: string): Promise<string> {
  try {
    // Check cache first
    const cached = TypeCache.getFieldType(field);
    if (cached) {
      return cached;
    }

    // Detect field type from API
    const fieldType = await detectFieldType(ResourceType.COMPANIES, field);
    TypeCache.setFieldType(field, fieldType);
    return fieldType;
  } catch (error) {
    // If API call fails, fall back to basic type inference
    console.warn(`Failed to detect field type for ${field}, using fallback`);
    const inferredType = inferFieldType(field);
    // Cache the inferred type to avoid repeated fallback logic
    TypeCache.setFieldType(field, inferredType);
    return inferredType;
  }
}