/**
 * Resource type validation functions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { RESOURCE_TYPE_MAPPINGS, getValidResourceTypes } from './helpers.js';
import { findSimilarStrings } from './similarity-utils.js';

/**
 * Validates a resource type and provides corrections if invalid
 * Supports fuzzy matching for common typos and suggestions
 */
export function validateResourceType(resourceType: string): {
  valid: boolean;
  corrected?: UniversalResourceType;
  suggestion?: string;
} {
  // Check if it's already valid
  if (
    Object.values(UniversalResourceType).includes(
      resourceType as UniversalResourceType
    )
  ) {
    return { valid: true }; // No corrected field when valid
  }

  // Try to map it
  const mapped = RESOURCE_TYPE_MAPPINGS[resourceType.toLowerCase()];
  if (mapped) {
    return {
      valid: false,
      corrected: mapped,
      suggestion: `Did you mean "${mapped}"? The resource type "${resourceType}" was automatically corrected.`,
    };
  }

  // Generate suggestions using fuzzy matching
  const validTypes = Object.values(UniversalResourceType) as string[];
  const suggestions = findSimilarStrings(resourceType, validTypes);

  return {
    valid: false,
    suggestion: `Invalid resource type "${resourceType}". Valid types are: ${getValidResourceTypes()}${
      suggestions.length > 0
        ? `. Did you mean: ${suggestions.join(' or ')}?`
        : ''
    }`,
  };
}