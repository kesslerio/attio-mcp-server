/**
 * Uniqueness constraint error enhancement
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

import { getAttioClient } from '../../../../../api/attio-client.js';
import { RESOURCE_TYPE_MAPPINGS as FIELD_MAPPINGS } from '../constants/index.js';
import { UniversalResourceType } from '../types.js';

/**
 * Enhanced uniqueness constraint error message
 * Converts technical API errors into user-friendly explanations
 */
export async function enhanceUniquenessError(
  resourceType: UniversalResourceType,
  errorMessage: string,
  recordData: Record<string, unknown>
): Promise<string> {
  if (!mapping || !mapping.uniqueFields) {
    return errorMessage;
  }

  // Try to extract the attribute ID from the error message
  if (!attributeMatch) {
    return errorMessage;
  }


  // Try to map the attribute ID to a human-readable field name
  try {

      (attr: Record<string, unknown>) =>
        attr.id === attributeId || attr.api_slug === attributeId
    );

    if (attribute) {
        recordData[attribute.api_slug] ||
        recordData[fieldName] ||
        'unknown value';

      return (
        `Uniqueness constraint violation: A ${resourceType} record with ${fieldName} "${fieldValue}" already exists. ` +
        `Please use a different value or update the existing record instead.`
      );
    }
  } catch (error: unknown) {
    // Fall back to original message if we can't enhance it
    console.error('Failed to enhance uniqueness error:', error);
  }

  // Try to guess based on unique fields
  for (const uniqueField of mapping.uniqueFields) {
    if (recordData[uniqueField]) {
      return (
        `Uniqueness constraint violation: A ${resourceType} record with ${uniqueField} "${recordData[uniqueField]}" may already exist. ` +
        `Please use a different value or search for the existing record.`
      );
    }
  }

  return (
    errorMessage +
    ` (This typically means a record with the same unique identifier already exists)`
  );
}
