/**
 * Core field name mapping functionality
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { UniversalResourceType } from '../types.js';
import { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from '../constants/index.js';
import { attrHas } from '../validators/helpers.js';

/**
 * Maps an incorrect field name to the correct one for a resource type
 * Now attribute-aware to prevent incorrect mappings like typpe->type
 */
export async function mapFieldName(
  resourceType: UniversalResourceType,
  fieldName: string,
  availableAttributes?: string[]
): Promise<string> {
  const mapping = FIELD_MAPPINGS[resourceType];
  if (!mapping) {
    return fieldName;
  }

  // Check if there's a direct mapping first
  const mappedField = mapping.fieldMappings[fieldName.toLowerCase()] || null;

  // If we have a mapping, use it regardless of what's in availableAttributes
  // This fixes Issue #687 where display names in availableAttributes prevented mapping
  if (mappedField !== null && mappedField !== fieldName.toLowerCase()) {
    return mappedField;
  }

  // Only check availableAttributes if there's no explicit mapping
  // This prevents mapping when the field is actually a valid API field
  if (
    availableAttributes &&
    mapping.validFields.includes(fieldName.toLowerCase())
  ) {
    // Field is in valid fields list, don't map it
    return fieldName;
  }

  // If mapped to null, it means the field doesn't exist
  if (mappedField === null) {
    return fieldName; // Return original, will trigger proper error
  }

  // If there's a mapping, verify the target exists (if we have attributes, compare lowercase)
  if (
    mappedField &&
    availableAttributes &&
    !attrHas(availableAttributes, mappedField)
  ) {
    // Mapped field doesn't exist, return original
    return fieldName;
  }

  return mappedField || fieldName;
}
