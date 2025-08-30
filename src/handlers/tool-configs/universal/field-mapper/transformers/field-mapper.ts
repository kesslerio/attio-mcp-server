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

  // If we have available attributes, check if the original field exists (compare lowercase)
  if (availableAttributes && attrHas(availableAttributes, fieldName)) {
    // Original field exists, don't map it
    return fieldName;
  }

  // Check if there's a direct mapping
  const mappedField = mapping.fieldMappings[fieldName.toLowerCase()] || null;

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
