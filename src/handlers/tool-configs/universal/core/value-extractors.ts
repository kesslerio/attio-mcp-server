/**
 * Type-Safe Value Extraction Utilities
 *
 * Replaces the generic coercion functions with properly typed interfaces
 * and type guards to improve type safety and reduce any usage.
 */

import { UniversalResourceType } from '../types.js';

/**
 * Standard Attio field value structure
 */
export interface AttioFieldValue {
  value?: string;
  full_name?: string;
  formatted?: string;
  display_value?: string;
}

/**
 * Extended field value that may contain additional metadata
 */
export interface ExtendedAttioFieldValue extends AttioFieldValue {
  [key: string]: unknown;
}

/**
 * Type guard to check if a value is an AttioFieldValue
 */
export const isAttioFieldValue = (value: unknown): value is AttioFieldValue => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.value === 'string' ||
    typeof obj.full_name === 'string' ||
    typeof obj.formatted === 'string' ||
    typeof obj.display_value === 'string'
  );
};

/**
 * Type guard to check if a value is an array of AttioFieldValue objects
 */
export const isAttioFieldValueArray = (
  value: unknown
): value is AttioFieldValue[] => {
  return Array.isArray(value) && value.every(isAttioFieldValue);
};

/**
 * Ordered keys to attempt when extracting display values
 */
const DISPLAY_VALUE_KEYS: (keyof AttioFieldValue)[] = [
  'display_value',
  'formatted',
  'full_name',
  'value',
];

/**
 * Type-safe extraction of display value from an AttioFieldValue object
 */
export const extractFromAttioFieldValue = (
  fieldValue: AttioFieldValue
): string | undefined => {
  for (const key of DISPLAY_VALUE_KEYS) {
    const value = fieldValue[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

/**
 * Type-safe extraction of display value from an array of AttioFieldValue objects
 */
export const extractFromAttioFieldValueArray = (
  fieldValueArray: AttioFieldValue[]
): string | undefined => {
  if (fieldValueArray.length === 0) return undefined;

  // Try to extract from the first element
  const firstValue = extractFromAttioFieldValue(fieldValueArray[0]);
  if (firstValue) return firstValue;

  // If first element doesn't yield a value, try others
  for (let i = 1; i < fieldValueArray.length; i++) {
    const value = extractFromAttioFieldValue(fieldValueArray[i]);
    if (value) return value;
  }

  return undefined;
};

/**
 * Type-safe extraction that handles various value types
 */
export const extractDisplayValue = (value: unknown): string | undefined => {
  // Handle null/undefined
  if (value == null) return undefined;

  // Handle direct string values
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value.trim() : undefined;
  }

  // Handle arrays of AttioFieldValue objects
  if (isAttioFieldValueArray(value)) {
    return extractFromAttioFieldValueArray(value);
  }

  // Handle single AttioFieldValue objects
  if (isAttioFieldValue(value)) {
    return extractFromAttioFieldValue(value);
  }

  // Handle arrays that might contain strings or objects
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'string') {
      return first.trim().length > 0 ? first.trim() : undefined;
    }
    // Try to extract from first object-like element
    return extractDisplayValue(first);
  }

  // Handle objects with a value property
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj) {
      return extractDisplayValue(obj.value);
    }
  }

  return undefined;
};

/**
 * Resource-specific field prioritization for name extraction
 */
interface ResourceFieldPriority {
  primaryFields: string[];
  secondaryFields: string[];
  fallbackFields: string[];
}

const RESOURCE_FIELD_PRIORITIES: Record<
  UniversalResourceType,
  ResourceFieldPriority
> = {
  [UniversalResourceType.PEOPLE]: {
    primaryFields: ['name', 'full_name', 'display_name'],
    secondaryFields: ['first_name', 'last_name', 'email_address'],
    fallbackFields: ['title', 'company_name'],
  },
  [UniversalResourceType.COMPANIES]: {
    primaryFields: ['name', 'company_name', 'display_name'],
    secondaryFields: ['legal_name', 'trading_name'],
    fallbackFields: ['domain', 'website'],
  },
  [UniversalResourceType.DEALS]: {
    primaryFields: ['name', 'deal_name', 'title'],
    secondaryFields: ['description'],
    fallbackFields: ['stage', 'amount'],
  },
  [UniversalResourceType.TASKS]: {
    primaryFields: ['title', 'name', 'content'],
    secondaryFields: ['description', 'summary'],
    fallbackFields: ['assignee', 'status'],
  },
  [UniversalResourceType.NOTES]: {
    primaryFields: ['title', 'content', 'name'],
    secondaryFields: ['summary', 'description'],
    fallbackFields: ['author', 'created_at'],
  },
  [UniversalResourceType.LISTS]: {
    primaryFields: ['name', 'title', 'list_name'],
    secondaryFields: ['description'],
    fallbackFields: ['type', 'status'],
  },
  [UniversalResourceType.RECORDS]: {
    primaryFields: ['name', 'title'],
    secondaryFields: ['description', 'content'],
    fallbackFields: ['id', 'created_at'],
  },
};

/**
 * Extract display name with resource-type-specific field prioritization
 */
export const extractDisplayName = (
  values: Record<string, unknown> | undefined,
  resourceType?: UniversalResourceType
): string => {
  if (!values || typeof values !== 'object') return 'Unnamed';

  const priority = resourceType
    ? RESOURCE_FIELD_PRIORITIES[resourceType]
    : RESOURCE_FIELD_PRIORITIES[UniversalResourceType.RECORDS];

  // Try primary fields first
  for (const fieldName of priority.primaryFields) {
    const value = values[fieldName];
    const extracted = extractDisplayValue(value);
    if (extracted) return extracted;
  }

  // Try secondary fields
  for (const fieldName of priority.secondaryFields) {
    const value = values[fieldName];
    const extracted = extractDisplayValue(value);
    if (extracted) return extracted;
  }

  // Try fallback fields
  for (const fieldName of priority.fallbackFields) {
    const value = values[fieldName];
    const extracted = extractDisplayValue(value);
    if (extracted) return extracted;
  }

  // Final fallback - try any string-like field
  for (const [key, value] of Object.entries(values)) {
    if (
      key.toLowerCase().includes('name') ||
      key.toLowerCase().includes('title')
    ) {
      const extracted = extractDisplayValue(value);
      if (extracted) return extracted;
    }
  }

  return 'Unnamed';
};

/**
 * Extract multiple display values (useful for validation metadata)
 */
export const extractMultipleDisplayValues = (
  values: Record<string, unknown> | undefined,
  fieldNames: string[]
): Record<string, string> => {
  const result: Record<string, string> = {};

  if (!values || typeof values !== 'object') return result;

  for (const fieldName of fieldNames) {
    const value = values[fieldName];
    const extracted = extractDisplayValue(value);
    if (extracted) {
      result[fieldName] = extracted;
    }
  }

  return result;
};

/**
 * Legacy compatibility function
 * @deprecated Use extractDisplayValue instead
 */
export const coerceScalar = (value: unknown): string | undefined => {
  return extractDisplayValue(value);
};

/**
 * Legacy compatibility function
 * @deprecated Use extractFromAttioFieldValueArray instead
 */
export const coerceArrayValue = (value: unknown): string | undefined => {
  if (!Array.isArray(value)) return undefined;
  return extractDisplayValue(value);
};
