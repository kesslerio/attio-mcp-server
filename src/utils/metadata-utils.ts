/**
 * Shared metadata utilities
 *
 * Consolidates duplicate convertToMetadataMap() implementations
 * from MetadataResolver and value-transformer.
 *
 * @see Issue #984 - PR #1006 Review Feedback (Phase 2.1)
 */

import type { AttributeMetadata } from '@/services/value-transformer/types.js';

/**
 * Type guard for attribute objects
 */
function isAttributeObject(
  obj: unknown
): obj is Record<string, unknown> & { api_slug?: string } {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Convert schema response to metadata map
 *
 * This function defensively checks both schema.attributes and schema.all
 * to handle variations in API responses across different resource types.
 *
 * @param schema - API response containing attribute definitions
 * @returns Map of attribute slug → metadata for field mapping and validation
 *
 * @example
 * ```typescript
 * const schema = await fetchAttributes('companies');
 * const metadataMap = convertToMetadataMap(schema);
 * const nameAttr = metadataMap.get('name');
 * ```
 */
export function convertToMetadataMap(
  schema: Record<string, unknown>
): Map<string, AttributeMetadata> {
  const map = new Map<string, AttributeMetadata>();

  // Defensive: check both schema.attributes and schema.all
  // Different resource types may return attributes in different keys
  const allAttrs = (schema.attributes || schema.all || []) as Array<unknown>;

  for (const attr of allAttrs) {
    if (!isAttributeObject(attr)) {
      continue;
    }

    // Extract slug with fallback
    const slug = (attr.api_slug || attr.slug || '') as string;
    if (!slug) {
      continue;
    }

    // Build metadata object with all relevant fields
    map.set(slug, {
      slug,
      type: (attr.type as string) || 'unknown',
      title: attr.title as string | undefined,
      api_slug: attr.api_slug as string | undefined,
      is_system_attribute: attr.is_system_attribute as boolean | undefined,
      is_writable: attr.is_writable as boolean | undefined,
      is_multiselect: attr.is_multiselect as boolean | undefined,
      relationship: attr.relationship as
        | { object?: string; cardinality?: string }
        | undefined,
    });
  }

  return map;
}
