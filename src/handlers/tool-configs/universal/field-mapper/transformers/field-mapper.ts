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

  // If mapped to null, it means the field doesn't exist
  if (mappedField === null) {
    return fieldName; // Return original, will trigger proper error
  }

  // Only skip mapping if the original field is a valid API field (not just a display name)
  // This fixes Issue #687 where display names in availableAttributes prevented mapping
  if (
    availableAttributes &&
    mapping.validFields.includes(fieldName.toLowerCase()) &&
    attrHas(availableAttributes, fieldName)
  ) {
    // Field is in valid fields list AND exists in schema, don't map it
    return fieldName;
  }

  // If there's a mapping, verify the target exists in the schema
  if (
    mappedField &&
    availableAttributes &&
    !attrHas(availableAttributes, mappedField)
  ) {
    // Mapped field doesn't exist in schema, return original
    return fieldName;
  }

  return mappedField || fieldName;
}
