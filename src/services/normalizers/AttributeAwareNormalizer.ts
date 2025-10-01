import { toE164 } from './PhoneNormalizer.js';

/**
 * Normalize phone number structure and format
 * Transforms {phone_number: X} to {original_phone_number: X} and applies E.164 formatting
 */
function normalizePhoneNumbers(value: unknown): unknown {
  if (!Array.isArray(value)) {
    // Handle single phone number string
    const e164 = toE164(value);
    return e164 || value;
  }

  return value.map((item) => {
    // Handle object with wrong key: {phone_number: "+1...", label: "work"} → {original_phone_number: "+1...", label: "work"}
    if (
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      'phone_number' in item
    ) {
      const itemObj = item as Record<string, unknown>;
      const { phone_number, ...otherFields } = itemObj;
      const normalized = toE164(phone_number);
      return {
        ...otherFields,
        original_phone_number: normalized || phone_number,
      };
    }

    // Handle object with correct key: {original_phone_number: "+1...", label: "work"}
    if (
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      'original_phone_number' in item
    ) {
      const itemObj = item as Record<string, unknown>;
      const { original_phone_number, ...otherFields } = itemObj;
      const normalized = toE164(original_phone_number);
      return {
        ...otherFields,
        original_phone_number: normalized || original_phone_number,
      };
    }

    // Handle direct string format
    if (typeof item === 'string') {
      const normalized = toE164(item);
      return { original_phone_number: normalized || item };
    }

    // Pass through other formats unchanged
    return item;
  });
}

export async function normalizeValues(
  resourceType: string,
  values: Record<string, unknown>,
  _attributes?: string[]
) {
  void _attributes;
  const out: Record<string, unknown> = { ...values };
  for (const [k, v] of Object.entries(values)) {
    const isPhoney = /phone/.test(k); // fast path if you don't want to fetch schemas
    if (isPhoney) {
      out[k] = normalizePhoneNumbers(v);
    }
  }
  return out;
}
