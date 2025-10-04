import {
  PhoneValidationError,
  toE164,
  validatePhoneNumber,
} from './PhoneNormalizer.js';
import {
  ErrorType,
  UniversalValidationError,
} from '@/handlers/tool-configs/universal/errors/validation-errors.js';

interface PhoneValidationIssue {
  fieldPath: string;
  error: PhoneValidationError;
}

function recordPhoneIssue(
  issues: PhoneValidationIssue[],
  fieldPath: string,
  error: PhoneValidationError
) {
  issues.push({ fieldPath, error });
}

function normalizeSinglePhoneValue(
  rawValue: unknown,
  fieldPath: string,
  issues: PhoneValidationIssue[]
): string | null {
  if (typeof rawValue !== 'string') {
    recordPhoneIssue(
      issues,
      fieldPath,
      new PhoneValidationError(
        'INVALID_TYPE',
        'Phone numbers must be provided as strings.',
        String(rawValue)
      )
    );
    return null;
  }

  const validation = validatePhoneNumber(rawValue);
  if (validation.valid && validation.e164) {
    return validation.e164;
  }

  if (validation.error) {
    recordPhoneIssue(issues, fieldPath, validation.error);
  } else {
    recordPhoneIssue(
      issues,
      fieldPath,
      new PhoneValidationError(
        'INVALID_FORMAT',
        'Phone number format is not recognized.',
        rawValue
      )
    );
  }

  return null;
}

/**
 * Normalize phone number structure and format
 * Transforms {phone_number: X} to {original_phone_number: X} and applies E.164 formatting
 */
function normalizePhoneNumbers(
  value: unknown,
  fieldPath: string,
  issues: PhoneValidationIssue[]
): unknown {
  if (!Array.isArray(value)) {
    if (typeof value === 'string') {
      const normalized = normalizeSinglePhoneValue(value, fieldPath, issues);
      return normalized ?? value;
    }

    if (value && typeof value === 'object') {
      // Normalize single phone object; reuse array flow for consistency
      const result = normalizePhoneNumbers([value], fieldPath, issues);
      const firstItem = Array.isArray(result)
        ? (result as Record<string, unknown>[])[0]
        : result;
      return firstItem ?? value;
    }

    // Non-string scalars (booleans, numbers) previously bypassed normalization; keep passthrough
    return value;
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
      const normalized = normalizeSinglePhoneValue(
        phone_number,
        `${fieldPath}.phone_number`,
        issues
      );
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
      const normalized = normalizeSinglePhoneValue(
        original_phone_number,
        `${fieldPath}.original_phone_number`,
        issues
      );
      return {
        ...otherFields,
        original_phone_number: normalized || original_phone_number,
      };
    }

    // Handle direct string format
    if (typeof item === 'string') {
      const normalized = normalizeSinglePhoneValue(
        item,
        `${fieldPath}[]`,
        issues
      );
      return { original_phone_number: normalized || item };
    }

    // Pass through other formats unchanged (e.g., booleans)
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
  const phoneIssues: PhoneValidationIssue[] = [];
  for (const [k, v] of Object.entries(values)) {
    const isPhoney = /phone/.test(k); // fast path if you don't want to fetch schemas
    if (isPhoney) {
      out[k] = normalizePhoneNumbers(v, k, phoneIssues);
    }
  }

  if (phoneIssues.length > 0) {
    const details = phoneIssues
      .map((issue) => {
        const sanitizedInput = issue.error.input.trim() || 'empty input';
        return `${issue.fieldPath}: ${issue.error.message} (received "${sanitizedInput}")`;
      })
      .join(' ');

    throw new UniversalValidationError(
      `Phone number validation failed: ${details}`,
      ErrorType.USER_ERROR,
      {
        field: phoneIssues[0]?.fieldPath,
        suggestion:
          'Provide phone numbers in E.164 format, for example +15551234567.',
        example: '+15551234567',
        cause: phoneIssues[0]?.error,
      }
    );
  }

  return out;
}
