/**
 * Field validation and suggestion functions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from '../constants/index.js';
import { strictModeFor } from '../config.js';
import { findSimilarStrings } from './similarity-utils.js';

/**
 * Gets field suggestions when a field name is not recognized
 * Provides context-aware error messages and suggestions
 */
export function getFieldSuggestions(
  resourceType: UniversalResourceType,
  fieldName: string
): string {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return `Unable to provide suggestions for resource type ${resourceType}`;
  }

  // Check if there's a known mistake
  const mistake = mapping.commonMistakes[fieldName.toLowerCase()];
  if (mistake) {
    return mistake;
  }

  // Check if it maps to null (invalid field)
  if (mapping.fieldMappings[fieldName.toLowerCase()] === null) {
    return (
      mapping.commonMistakes[fieldName.toLowerCase()] ||
      `Field "${fieldName}" is not available for ${resourceType}`
    );
  }

  // Find similar valid fields
  const suggestions = findSimilarStrings(fieldName, mapping.validFields);

  if (suggestions.length > 0) {
    return `Unknown field "${fieldName}". Did you mean: ${suggestions.join(' or ')}?`;
  }

  return `Unknown field "${fieldName}". Valid fields for ${resourceType}: ${mapping.validFields.join(', ')}`;
}

/**
 * Validates fields before API call and provides suggestions
 * Performs comprehensive field validation with error categorization
 */
export function validateFields(
  resourceType: UniversalResourceType,
  recordData: Record<string, unknown>
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return {
      valid: true,
      errors: [],
      warnings: [`No field validation available for ${resourceType}`],
      suggestions: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check required fields (simplified version without async mapping)
  if (mapping.requiredFields) {
    for (const required of mapping.requiredFields) {
      if (!(required in recordData)) {
        // Check if a mapped version exists by checking mappings
        const hasMappedVersion = Object.keys(recordData).some(
          (key) => mapping.fieldMappings[key.toLowerCase()] === required
        );

        if (!hasMappedVersion) {
          errors.push(`Required field "${required}" is missing`);
        }
      }
    }
  }

  // Check for unknown fields (simplified version without async mapping)
  for (const field of Object.keys(recordData)) {
    // If field maps to null, it's explicitly invalid
    const lower = field.toLowerCase();
    const invalidExplicit = mapping.fieldMappings[lower] === null;
    if (invalidExplicit) {
      const msg = getFieldSuggestions(resourceType, field);
      if (strictModeFor(resourceType)) errors.push(msg);
      else warnings.push(msg);
      continue;
    }

    // Check if field exists in valid fields or mappings
    const hasMapping = !!mapping.fieldMappings[lower];
    const isValidField =
      mapping.validFields.includes(field) ||
      mapping.validFields.includes(lower);

    // If field doesn't map and isn't in valid fields, it might be wrong
    if (!hasMapping && !isValidField) {
      const suggestion = getFieldSuggestions(resourceType, field);
      if (strictModeFor(resourceType))
        errors.push(`Unknown field "${field}". ${suggestion}`);
      else if (suggestion.includes('Did you mean'))
        suggestions.push(suggestion);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Get valid fields for a resource type
 * Used for error messages and validation
 */
export function getValidFields(resourceType: UniversalResourceType): string[] {
  return FIELD_MAPPINGS[resourceType]?.validFields || [];
}