import { detectFieldType } from '../../api/attribute-types.js';
import { ResourceType } from '../../types/attio.js';
import { convertToBoolean } from '../../utils/attribute-mapping/attribute-mappers.js';
import { CompanyFieldValue, ProcessedFieldValue } from '../../types/tool-types.js';
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
  'valid'
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

    if (fieldType === 'boolean' && (typeof value === 'string' || typeof value === 'number')) {
      return convertToBoolean(value);
    }

    if (fieldType === 'array' && typeof value === 'string') {
      return [value];
    }
  } catch {
    if (isBooleanFieldByName(fieldName) && (typeof value === 'string' || typeof value === 'number')) {
      try {
        return convertToBoolean(value);
      } catch {
        // swallow errors and fall through to return original value
      }
    }

    if (fieldName.toLowerCase().includes('categories') && typeof value === 'string') {
      return [value];
    }
  }

  return value;
}
