/**
 * Record formatting utilities
 */
import { RecordAttributes } from '../../types/attio.js';

  if (
    typeof value === 'number' &&
    (key.includes('price') || key.includes('revenue') || key.includes('cost'))
  ) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (key.includes('address') || key.includes('location'))
  ) {
    if ('street' in value || 'city' in value || 'country' in value) {
      return value;
    }
  }

  if (typeof value === 'string' && value.match(/^record_[a-z0-9]+$/)) {
    return {
      record_id: value,
    };
  }

  return value;
}

/**
 * Formats a full set of record attributes for API requests
 *
 * @param attributes - Raw attribute key-value pairs
 * @returns Formatted attributes object ready for API submission
 */
export function formatRecordAttributes(
  attributes: Record<string, unknown>
): RecordAttributes {
  const formattedAttributes: RecordAttributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    formattedAttributes[key] = formatRecordAttribute(key, value);
  }

  return formattedAttributes;
}
