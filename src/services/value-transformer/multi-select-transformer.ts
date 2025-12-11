/**
 * Multi-select transformer - wraps single values in arrays for multi-select fields
 *
 * Problem: LLMs commonly pass multi-select values as single strings (e.g., "Inbound")
 * but Attio API requires array format (e.g., ["Inbound"]).
 *
 * Solution: Auto-detect multi-select attributes and wrap single values in arrays.
 */

import {
  TransformContext,
  TransformResult,
  AttributeMetadata,
} from './types.js';
import { debug, OperationType } from '@/utils/logger.js';

/**
 * Multi-select attribute types that require array values (legacy type names)
 */
const MULTI_SELECT_TYPES = ['multi_select', 'multi-select', 'multiselect'];

/**
 * Check if an attribute type name indicates multi-select (legacy check)
 * @internal Use isMultiSelectAttribute() for proper detection
 */
export function isMultiSelectTypeName(type: string): boolean {
  return MULTI_SELECT_TYPES.includes(type.toLowerCase().replace(/[_-]/g, ''));
}

/**
 * Check if an attribute is multi-select based on metadata
 *
 * CRITICAL: Attio's actual API format for multi-select attributes is:
 *   { type: "select", is_multiselect: true }
 *
 * NOT { type: "multi_select" } as one might expect.
 *
 * This function checks the is_multiselect flag FIRST because:
 * 1. Custom workspace attributes (e.g., lead_type, inbound_outbound) use type="select"
 * 2. The is_multiselect flag is the authoritative source from Attio's API
 * 3. Type name matching is only for backward compatibility with older schemas
 *
 * Issue #992: Without flag-first detection, custom multi-select attributes were
 * not being auto-wrapped to arrays, causing API errors.
 *
 * @param meta - Attribute metadata from Attio API
 * @returns true if the attribute accepts multiple values
 */
export function isMultiSelectAttribute(meta: AttributeMetadata): boolean {
  // IMPORTANT: Check is_multiselect flag first - this is Attio's authoritative format
  // Custom workspace attributes have type="select" but is_multiselect=true
  if (meta.is_multiselect === true) {
    return true;
  }
  // Fallback to type name matching for backward compatibility only
  // (handles edge cases where schema lacks the is_multiselect field)
  return isMultiSelectTypeName(meta.type);
}

/**
 * Check if an attribute type is multi-select
 * @deprecated Use isMultiSelectAttribute() instead for proper detection with metadata
 */
export function isMultiSelectType(type: string): boolean {
  return isMultiSelectTypeName(type);
}

/**
 * Check if a value is already an array
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Transform a multi-select value from single string to array format
 *
 * @param value - The value to transform
 * @param attributeSlug - The attribute slug
 * @param context - Transformation context
 * @param attributeMeta - Attribute metadata
 * @returns Transform result
 */
export async function transformMultiSelectValue(
  value: unknown,
  attributeSlug: string,
  context: TransformContext,
  attributeMeta: AttributeMetadata
): Promise<TransformResult> {
  // Only transform multi-select attributes (check is_multiselect flag OR type name)
  if (!isMultiSelectAttribute(attributeMeta)) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Skip if already an array
  if (isArray(value)) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Skip null/undefined values
  if (value === null || value === undefined) {
    return {
      transformed: false,
      originalValue: value,
      transformedValue: value,
    };
  }

  // Wrap single value in array
  const transformedValue = [value];

  debug(
    'multi-select-transformer',
    `Wrapped single value in array for multi-select`,
    {
      attribute: attributeSlug,
      from: value,
      to: transformedValue,
      resourceType: context.resourceType,
      detectedVia: attributeMeta.is_multiselect
        ? 'is_multiselect flag'
        : 'type name',
    },
    'transformMultiSelectValue',
    OperationType.DATA_PROCESSING
  );

  return {
    transformed: true,
    originalValue: value,
    transformedValue,
    description: `Wrapped single value "${value}" in array for multi-select field ${attributeSlug}`,
  };
}

/**
 * Check if a value needs to be wrapped for multi-select
 * (Useful for validation without transformation)
 * @deprecated Use needsArrayWrappingForAttribute() instead for proper detection
 */
export function needsArrayWrapping(
  value: unknown,
  attributeType: string
): boolean {
  if (!isMultiSelectTypeName(attributeType)) return false;
  if (isArray(value)) return false;
  if (value === null || value === undefined) return false;
  return true;
}

/**
 * Check if a value needs to be wrapped for multi-select based on attribute metadata
 * @param value - The value to check
 * @param attributeMeta - Attribute metadata
 * @returns true if the value needs to be wrapped in an array
 */
export function needsArrayWrappingForAttribute(
  value: unknown,
  attributeMeta: AttributeMetadata
): boolean {
  if (!isMultiSelectAttribute(attributeMeta)) return false;
  if (isArray(value)) return false;
  if (value === null || value === undefined) return false;
  return true;
}
