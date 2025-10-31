/**
 * Reference Attribute Helper
 *
 * Utilities for detecting and handling reference attributes in filter transformations.
 * Reference attributes (owner, assignee, company, person) require nested field specification
 * in Attio API filter syntax.
 */

import { getAttributeTypeInfo } from '@/api/attribute-types.js';

/**
 * Attio attribute types that require reference field nesting
 */
const REFERENCE_TYPES = [
  'record-reference',
  'actor-reference',
  'workspace-member',
];

/**
 * Field to use for specific attribute types that require fixed field names
 * Only include types that ALWAYS use the same field regardless of value
 */
const REFERENCE_FIELD_MAPPING: Record<string, string> = {
  'workspace-member': 'email', // workspace members always filter by email
};

/**
 * UUID v4 pattern for detecting UUID values
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if an attribute is a reference type that requires nested field specification
 *
 * @param resourceType - The resource type (e.g., 'deals', 'companies')
 * @param attributeSlug - The attribute slug (e.g., 'owner', 'assignee')
 * @returns True if the attribute is a reference type
 */
export async function isReferenceAttribute(
  resourceType: string,
  attributeSlug: string
): Promise<boolean> {
  try {
    const typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);
    return REFERENCE_TYPES.includes(typeInfo.attioType);
  } catch {
    // If we can't determine the type, assume it's not a reference
    return false;
  }
}

/**
 * Determine which field to use for a reference attribute based on the value
 *
 * @param value - The filter value (can be UUID or name)
 * @returns The field name to use ('record_id' or 'name')
 */
export function determineReferenceField(value: unknown): string {
  // If value is UUID, use record_id field
  if (typeof value === 'string' && UUID_PATTERN.test(value)) {
    return 'record_id';
  }
  // Otherwise use name field
  return 'name';
}

/**
 * Get the appropriate reference field for an attribute, considering type-specific mappings
 *
 * @param resourceType - The resource type
 * @param attributeSlug - The attribute slug
 * @param value - The filter value
 * @returns The field name to use for filtering
 */
export async function getReferenceFieldForAttribute(
  resourceType: string,
  attributeSlug: string,
  value: unknown
): Promise<string> {
  try {
    const typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);

    // Check for attribute-specific mapping
    if (REFERENCE_FIELD_MAPPING[typeInfo.attioType]) {
      return REFERENCE_FIELD_MAPPING[typeInfo.attioType];
    }

    // Fall back to UUID vs name detection
    return determineReferenceField(value);
  } catch {
    // Default to name-based filtering if we can't determine the type
    return determineReferenceField(value);
  }
}
