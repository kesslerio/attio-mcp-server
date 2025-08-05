import { detectFieldType } from '../../api/attribute-types.js';
import { ResourceType } from '../../types/attio.js';
import type {
  CompanyFieldValue,
  ProcessedFieldValue,
} from '../../types/tool-types.js';
import { convertToBoolean } from '../../utils/attribute-mapping/attribute-mappers.js';
import { TypeCache } from './type_cache.js';

export const booleanFieldPatterns = [
  'is_',
  'has_',
  'can_',
  'should_',
  'will_',
  'was_',
  'does_',
  'enabled',
  'active',
  'verified',
  'published',
  'approved',
  'confirmed',
  'suspended',
  'locked',
  'flagged',
  'premium',
  'featured',
  'hidden',
  'allow',
  'accept',
  'available',
  'eligible',
  'complete',
  'valid',
];

export function isBooleanFieldByName(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  for (const pattern of booleanFieldPatterns) {
    if (
      lower.startsWith(pattern) ||
      lower.includes('_' + pattern) ||
      lower === pattern ||
      lower.includes(pattern + '_')
    ) {
      return true;
    }
  }
  return false;
}

export async function processFieldValue(
  fieldName: string,
  value: CompanyFieldValue
): Promise<ProcessedFieldValue> {
  if (value === null || value === undefined) {
    return value;
  }

  try {
    let fieldType = TypeCache.getFieldType(fieldName);
    if (!fieldType) {
      fieldType = await detectFieldType(ResourceType.COMPANIES, fieldName);
      TypeCache.setFieldType(fieldName, fieldType);
    }

    if (
      fieldType === 'boolean' &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      return convertToBoolean(value);
    }

    if (fieldType === 'number' && typeof value === 'string') {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    if (fieldType === 'array' && typeof value === 'string') {
      return [value];
    }
  } catch {
    if (
      isBooleanFieldByName(fieldName) &&
      (typeof value === 'string' || typeof value === 'number')
    ) {
      try {
        return convertToBoolean(value);
      } catch {
        // swallow errors and fall through to return original value
      }
    }

    // Fallback for number fields based on field name patterns
    if (
      (fieldName.toLowerCase().includes('score') ||
        fieldName.toLowerCase().includes('count') ||
        fieldName.toLowerCase().includes('amount') ||
        fieldName.toLowerCase().includes('revenue') ||
        fieldName.toLowerCase().includes('employees') ||
        fieldName.toLowerCase().includes('funding') ||
        fieldName.toLowerCase().includes('rating')) &&
      typeof value === 'string'
    ) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    if (
      fieldName.toLowerCase().includes('categories') &&
      typeof value === 'string'
    ) {
      return [value];
    }
  }

  // Ensure we return a valid ProcessedFieldValue
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  // For arrays, ensure all elements are valid types
  if (Array.isArray(value)) {
    const processedArray = value.filter(
      (item) =>
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
    );
    return processedArray.length > 0 ? processedArray : undefined;
  }

  // For other types, convert to string or return undefined
  return typeof value === 'object' ? String(value) : undefined;
}
