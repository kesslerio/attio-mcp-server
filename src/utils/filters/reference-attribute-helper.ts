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
import { warn } from '@/utils/logger.js';

// Re-export getAttributeTypeInfo for use in translators
export { getAttributeTypeInfo };

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
 *
 * NOTE: actor-reference fields (like deals.owner) can accept either email OR UUID
 * depending on the value format, so we use heuristic detection instead of forcing email.
 * Only workspace-member typed fields must use email.
 */
const REFERENCE_FIELD_MAPPING: Record<string, string> = {
  'workspace-member': 'email', // workspace members always filter by email
};

/**
 * UUID v4 pattern for detecting UUID values
 * Exported for use in filter translators (PR #904 Phase 2)
 */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email pattern for workspace member validation
 *
 * Uses permissive pattern to handle edge cases:
 * - Test environments may use simplified emails (e.g., test@local.dev)
 * - Some valid domains have short TLDs or special characters
 * - Attio API performs canonical validation, so false positives fail fast
 *
 * Pattern validates: non-whitespace + @ + non-whitespace + . + non-whitespace
 * Accepts: user@example.com, test@local.dev, admin@co.uk
 * Rejects: missing @, missing domain, whitespace, no TLD
 * Exported for use in filter translators (PR #904 Phase 2)
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Known reference attribute slugs that commonly require nested field specification
 * Used as fallback when resourceType is unavailable (e.g., list entries)
 */
const KNOWN_REFERENCE_SLUGS = new Set([
  'owner',
  'assignee',
  'assignee_id', // workspace-member type that requires email field
  'company',
  'person',
  'primary_contact',
  'workspace_member',
  'created_by',
  'modified_by',
]);

/**
 * Slugs that ALWAYS require email field (workspace-member type)
 * Note: actor-reference slugs like 'owner', 'assignee' use flexible detection (UUID vs email vs name)
 */
const WORKSPACE_MEMBER_SLUGS = new Set(['workspace_member', 'assignee_id']);

/**
 * Known actor-reference slugs that require special handling in list entry context
 * When resourceType is unavailable, these slugs with UUID values must use referenced_actor_id
 * (not record_id) to generate correct actor-reference filter structure
 * Exported for use in filter translators (PR #904 Phase 2)
 */
export const KNOWN_ACTOR_REFERENCE_SLUGS = new Set([
  'owner',
  'assignee',
  'created_by',
  'modified_by',
]);

/**
 * Per-request cache for attribute type info to avoid repeated lookups
 * Key format: `${resourceType}:${attributeSlug}`
 */
export type AttributeTypeCache = Map<
  string,
  Awaited<ReturnType<typeof getAttributeTypeInfo>>
>;

/**
 * Check if an attribute is a reference type that requires nested field specification
 *
 * @param resourceType - The resource type (e.g., 'deals', 'companies'), or undefined for slug-based fallback
 * @param attributeSlug - The attribute slug (e.g., 'owner', 'assignee')
 * @param cache - Optional per-request cache to avoid repeated getAttributeTypeInfo calls
 * @returns True if the attribute is a reference type
 */
export async function isReferenceAttribute(
  resourceType: string | undefined,
  attributeSlug: string,
  cache?: AttributeTypeCache
): Promise<boolean> {
  // If resourceType is unavailable (e.g., list entries), use slug-based fallback
  if (!resourceType) {
    return KNOWN_REFERENCE_SLUGS.has(attributeSlug);
  }

  try {
    // Check cache first
    const cacheKey = `${resourceType}:${attributeSlug}`;
    let typeInfo = cache?.get(cacheKey);

    if (!typeInfo) {
      typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);
      cache?.set(cacheKey, typeInfo);
    }

    return REFERENCE_TYPES.includes(typeInfo.attioType);
  } catch (error) {
    // If metadata lookup fails, fall back to slug-based detection
    warn(
      'filters/reference-attribute-helper',
      `Metadata lookup failed for ${resourceType}.${attributeSlug}, using slug-based fallback`,
      {
        resourceType,
        attributeSlug,
        reason: 'metadata_lookup_failed',
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return KNOWN_REFERENCE_SLUGS.has(attributeSlug);
  }
}

/**
 * Determine which field to use for a reference attribute based on the value and type
 *
 * @param value - The filter value (can be UUID, name, or array of UUIDs/names for in/not_in operators)
 * @param attioType - The Attio attribute type (optional)
 * @returns The field name to use ('record_id', 'name', or 'referenced_actor_id' for actor-reference)
 */
export function determineReferenceField(
  value: unknown,
  attioType?: string
): string {
  // Actor-reference attributes use referenced_actor_id (always UUID)
  if (attioType === 'actor-reference') {
    return 'referenced_actor_id';
  }

  // Handle array values (for in/not_in operators)
  if (Array.isArray(value)) {
    // Empty arrays default to name field
    if (value.length === 0) {
      return 'name';
    }

    // Check if all elements are UUID strings
    const allUUIDs = value.every(
      (v) => typeof v === 'string' && UUID_PATTERN.test(v)
    );
    const allNonUUIDs = value.every(
      (v) => typeof v === 'string' && !UUID_PATTERN.test(v)
    );

    // Reject mixed-type arrays (some UUIDs, some names)
    if (!allUUIDs && !allNonUUIDs) {
      throw new FilterValidationError(
        `Mixed UUID and non-UUID values not supported in array filters. ` +
          `Received array with both types. Use separate filters or ensure all values are the same type.`,
        FilterErrorCategory.VALUE
      );
    }

    return allUUIDs ? 'record_id' : 'name';
  }

  // Handle single values
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
 * @param cache - Optional per-request cache to avoid repeated getAttributeTypeInfo calls
 * @returns The field name to use for filtering
 * @throws FilterValidationError if email validation fails for workspace-member fields
 */
export async function getReferenceFieldForAttribute(
  resourceType: string | undefined,
  attributeSlug: string,
  value: unknown,
  cache?: AttributeTypeCache
): Promise<string> {
  // Special case: workspace_member and assignee_id slugs ALWAYS use email
  // regardless of metadata availability
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

  // If resourceType is available, use metadata to determine field
  if (resourceType) {
    try {
      // Check cache first
      const cacheKey = `${resourceType}:${attributeSlug}`;
      let typeInfo = cache?.get(cacheKey);

      if (!typeInfo) {
        typeInfo = await getAttributeTypeInfo(resourceType, attributeSlug);
        cache?.set(cacheKey, typeInfo);
      }

      // Check for attribute-specific mapping (only workspace-member type requires fixed email)
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

      // Actor-reference fields (e.g., owner, assignee) support flexible filtering:
      // - Email address → filter by email field
      // - UUID (workspace member ID) → filter by referenced_actor_id (requires referenced_actor_type)
      // - Name (plain text) → filter by name field
      if (typeInfo.attioType === 'actor-reference') {
        if (typeof value !== 'string') {
          throw new FilterValidationError(
            `Actor-reference attribute "${attributeSlug}" requires a string value (email, name, or UUID). Got: ${typeof value}`,
            FilterErrorCategory.VALUE
          );
        }

        // Detect value type and return appropriate field
        if (EMAIL_PATTERN.test(value)) {
          return 'email';
        } else if (UUID_PATTERN.test(value)) {
          return 'referenced_actor_id';
        } else {
          // Plain text name
          return 'name';
        }
      }

      // Fall back to UUID vs name detection for record-reference types
      return determineReferenceField(value, typeInfo.attioType);
    } catch (error) {
      // Re-throw FilterValidationError
      if (error instanceof FilterValidationError) {
        throw error;
      }
      // Fall through to slug-based detection if metadata lookup fails
      warn(
        'filters/reference-attribute-helper',
        `Metadata lookup failed in getReferenceFieldForAttribute for ${resourceType}.${attributeSlug}, using slug-based fallback`,
        {
          resourceType,
          attributeSlug,
          reason: 'metadata_lookup_failed',
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ResourceType unavailable or metadata lookup failed - use slug-based detection
  // Check if this is a known workspace member slug (requires email field)
  if (WORKSPACE_MEMBER_SLUGS.has(attributeSlug)) {
    // Validate email format
    if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) {
      throw new FilterValidationError(
        `Invalid email format for ${attributeSlug}: "${value}". Expected valid email address. Workspace member attributes (owner, assignee, etc.) require email addresses.`,
        FilterErrorCategory.VALUE
      );
    }
    return 'email';
  }

  // Special handling for known actor-reference slugs (owner, assignee, created_by, modified_by)
  // When resourceType unavailable (e.g., list entries), we can't query metadata but can use slug patterns
  if (KNOWN_ACTOR_REFERENCE_SLUGS.has(attributeSlug)) {
    // Actor-reference attributes support email, UUID, or name filtering
    if (typeof value !== 'string') {
      throw new FilterValidationError(
        `Actor-reference attribute "${attributeSlug}" requires a string value (email, name, or UUID). Got: ${typeof value}`,
        FilterErrorCategory.VALUE
      );
    }

    // Detect value type and return appropriate field
    if (EMAIL_PATTERN.test(value)) {
      return 'email';
    } else if (UUID_PATTERN.test(value)) {
      // UUID values must use referenced_actor_id for actor-reference structure
      return 'referenced_actor_id';
    } else {
      // Plain text name
      return 'name';
    }
  }

  // For other reference slugs (company, person, etc.), use basic heuristic detection (UUID vs name)
  return determineReferenceField(value);
}
