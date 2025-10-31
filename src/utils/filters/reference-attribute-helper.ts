/**
 * Reference Attribute Helper
 *
 * Utilities for detecting and handling reference attributes in filter transformations.
 * Reference attributes (owner, assignee, company, person) require nested field specification
 * in Attio API filter syntax.
 */

import { getAttributeTypeInfo } from '@/api/attribute-types.js';
import {
  FilterValidationError,
  FilterErrorCategory,
} from '@/errors/api-errors.js';

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
 * Basic email pattern for validation
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Known reference attribute slugs that commonly require nested field specification
 * Used as fallback when resourceType is unavailable (e.g., list entries)
 */
const KNOWN_REFERENCE_SLUGS = new Set([
  'owner',
  'assignee',
  'company',
  'person',
  'primary_contact',
  'workspace_member',
  'created_by',
  'modified_by',
]);

/**
 * Check if an attribute is a reference type that requires nested field specification
 *
 * @param resourceType - The resource type (e.g., 'deals', 'companies'), or undefined for slug-based fallback
 * @param attributeSlug - The attribute slug (e.g., 'owner', 'assignee')
 * @returns True if the attribute is a reference type
 */
export async function isReferenceAttribute(
  resourceType: string | undefined,
  attributeSlug: string
): Promise<boolean> {
  // If resourceType is unavailable (e.g., list entries), use slug-based fallback
  if (!resourceType) {
    return KNOWN_REFERENCE_SLUGS.has(attributeSlug);
  }

  try {
    const typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);
    return REFERENCE_TYPES.includes(typeInfo.attioType);
  } catch {
    // If metadata lookup fails, fall back to slug-based detection
    return KNOWN_REFERENCE_SLUGS.has(attributeSlug);
  }
}

/**
 * Determine which field to use for a reference attribute based on the value
 *
 * @param value - The filter value (can be UUID or name)
 * @returns The field name to use ('record_id' or 'name')
 * @throws FilterValidationError if value is an array (not supported for reference attributes with equals)
 */
export function determineReferenceField(value: unknown): string {
  // Arrays are not supported for reference attribute filtering with equals
  if (Array.isArray(value)) {
    throw new FilterValidationError(
      'Array values are not supported for reference attribute filtering. ' +
        'Use a single UUID or name value.',
      FilterErrorCategory.VALUE
    );
  }

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
 * @param resourceType - The resource type, or undefined for slug-based fallback
 * @param attributeSlug - The attribute slug
 * @param value - The filter value
 * @returns The field name to use for filtering
 * @throws FilterValidationError if email validation fails for workspace-member fields
 */
export async function getReferenceFieldForAttribute(
  resourceType: string | undefined,
  attributeSlug: string,
  value: unknown
): Promise<string> {
  // Special case: workspace_member always uses email regardless of value format
  if (attributeSlug === 'workspace_member' || attributeSlug === 'assignee_id') {
    // Validate email format
    if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) {
      throw new FilterValidationError(
        `Invalid email format for ${attributeSlug}: "${value}". Expected valid email address.`,
        FilterErrorCategory.VALUE
      );
    }
    return 'email';
  }

  // If resourceType is unavailable, use heuristic detection
  if (!resourceType) {
    return determineReferenceField(value);
  }

  try {
    const typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);

    // Check for attribute-specific mapping (workspace-member type)
    if (REFERENCE_FIELD_MAPPING[typeInfo.attioType]) {
      const field = REFERENCE_FIELD_MAPPING[typeInfo.attioType];
      // Validate email if this is an email field
      if (field === 'email') {
        if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) {
          throw new FilterValidationError(
            `Invalid email format for ${attributeSlug}: "${value}". Expected valid email address.`,
            FilterErrorCategory.VALUE
          );
        }
      }
      return field;
    }

    // Fall back to UUID vs name detection
    return determineReferenceField(value);
  } catch (error) {
    // Re-throw FilterValidationError
    if (error instanceof FilterValidationError) {
      throw error;
    }
    // Default to heuristic detection if metadata lookup fails
    return determineReferenceField(value);
  }
}
