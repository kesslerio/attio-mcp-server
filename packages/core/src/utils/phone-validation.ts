/**
 * Edge-compatible phone validation using libphonenumber-js/min
 *
 * Provides E.164 normalization and country code detection for phone numbers
 * before sending to Attio API. Works in Cloudflare Workers, Deno, and Node.js.
 */
import type { CountryCode } from 'libphonenumber-js/min';
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber as libIsValidPhoneNumber,
  isPossiblePhoneNumber as libIsPossiblePhoneNumber,
  validatePhoneNumberLength,
} from 'libphonenumber-js/min';

/**
 * Phone validation error codes
 */
export type PhoneValidationErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_COUNTRY_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NOT_A_NUMBER'
  | 'INVALID_TYPE'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for phone validation failures
 */
export class PhoneValidationError extends Error {
  readonly code: PhoneValidationErrorCode;
  readonly input: string;
  readonly country?: string;

  constructor(
    code: PhoneValidationErrorCode,
    message: string,
    input: string,
    country?: string
  ) {
    super(message);
    this.name = 'PhoneValidationError';
    this.code = code;
    this.input = input;
    this.country = country;
  }
}

/**
 * Result of phone number validation
 */
export interface PhoneValidationResult {
  valid: boolean;
  possible: boolean;
  e164?: string;
  national?: string;
  country?: string;
  error?: PhoneValidationError;
}

/**
 * Configuration for phone validation
 */
export interface PhoneValidationConfig {
  /** Default country code for numbers without international prefix (e.g., 'US', 'GB') */
  defaultCountry?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_COUNTRY: CountryCode = 'US';

/**
 * Resolve country code to valid CountryCode type
 */
function resolveCountry(country?: string): CountryCode {
  if (!country) {
    return DEFAULT_COUNTRY;
  }
  return country.toUpperCase() as CountryCode;
}

/**
 * Map phone number length validation issues to error objects
 */
function mapLengthError(
  issue: ReturnType<typeof validatePhoneNumberLength>,
  input: string,
  country?: string
): PhoneValidationError | undefined {
  switch (issue) {
    case 'INVALID_COUNTRY':
      return new PhoneValidationError(
        'INVALID_COUNTRY_CODE',
        'Invalid or unsupported country calling code provided for phone number.',
        input,
        country
      );
    case 'TOO_SHORT':
      return new PhoneValidationError(
        'TOO_SHORT',
        'Phone number is too short to be valid.',
        input,
        country
      );
    case 'TOO_LONG':
      return new PhoneValidationError(
        'TOO_LONG',
        'Phone number is too long to be valid.',
        input,
        country
      );
    case 'NOT_A_NUMBER':
      return new PhoneValidationError(
        'NOT_A_NUMBER',
        'Input does not appear to be a valid phone number.',
        input,
        country
      );
    default:
      return undefined;
  }
}

/**
 * Check if a phone number starts with a country code prefix (+)
 */
export function hasCountryCode(value: string): boolean {
  if (typeof value !== 'string') return false;
  return value.trim().startsWith('+');
}

/**
 * Check if a phone number format is possible (quick validation)
 */
export function isPossiblePhoneNumber(
  value: string,
  country?: string
): boolean {
  const candidate = value?.trim();
  if (!candidate) return false;
  const resolvedCountry = resolveCountry(country);
  try {
    return libIsPossiblePhoneNumber(candidate, resolvedCountry);
  } catch {
    return false;
  }
}

/**
 * Check if a phone number is valid for the specified country
 */
export function isValidPhoneNumber(value: string, country?: string): boolean {
  const candidate = value?.trim();
  if (!candidate) return false;
  const resolvedCountry = resolveCountry(country);
  try {
    return libIsValidPhoneNumber(candidate, resolvedCountry);
  } catch {
    return false;
  }
}

/**
 * Safely parse a phone number, returning undefined on failure
 */
function safeParse(value: string, country: CountryCode) {
  try {
    return parsePhoneNumberFromString(value, country) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validate a phone number and return structured result
 *
 * @param value - The phone number to validate
 * @param config - Optional configuration including default country
 * @returns PhoneValidationResult with validation status and normalized formats
 *
 * @example
 * // E.164 format (country detected from +1)
 * validatePhoneNumber('+1 555 123 4567')
 * // => { valid: true, e164: '+15551234567', country: 'US' }
 *
 * @example
 * // National format with default country
 * validatePhoneNumber('555 123 4567', { defaultCountry: 'US' })
 * // => { valid: true, e164: '+15551234567', country: 'US' }
 */
export function validatePhoneNumber(
  value: string,
  config?: PhoneValidationConfig
): PhoneValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      possible: false,
      error: new PhoneValidationError(
        'INVALID_TYPE',
        'Phone numbers must be provided as strings.',
        String(value)
      ),
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      valid: false,
      possible: false,
      error: new PhoneValidationError(
        'INVALID_FORMAT',
        'Phone number cannot be empty.',
        value
      ),
    };
  }

  const resolvedCountry = resolveCountry(config?.defaultCountry);
  const possible = isPossiblePhoneNumber(trimmed, resolvedCountry);
  const valid = isValidPhoneNumber(trimmed, resolvedCountry);

  let error: PhoneValidationError | undefined;

  if (!possible) {
    const lengthIssue = validatePhoneNumberLength(trimmed, resolvedCountry);
    error =
      mapLengthError(lengthIssue, value, resolvedCountry) ||
      new PhoneValidationError(
        'INVALID_FORMAT',
        'Phone number format is not recognized.',
        value,
        resolvedCountry
      );
  } else if (!valid) {
    error = new PhoneValidationError(
      'INVALID_FORMAT',
      'Phone number format is possible but not valid for the specified region.',
      value,
      resolvedCountry
    );
  }

  const parsed = safeParse(trimmed, resolvedCountry);
  if (parsed?.isValid()) {
    return {
      valid: true,
      possible,
      country: parsed.country,
      national: parsed.formatNational(),
      e164: parsed.number,
    };
  }

  return {
    valid,
    possible,
    error,
  };
}

/**
 * Convert a phone number to E.164 format
 *
 * @param value - The phone number to convert
 * @param defaultCountry - Default country code if not in international format
 * @returns E.164 formatted string or null if invalid
 *
 * @example
 * toE164('+1 (555) 123-4567') // => '+15551234567'
 * toE164('555-123-4567', 'US') // => '+15551234567'
 * toE164('invalid') // => null
 */
export function toE164(value: unknown, defaultCountry?: string): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const sanitized = value.trim();
  if (!sanitized) return null;
  const resolvedCountry = resolveCountry(defaultCountry);
  const parsed = safeParse(sanitized, resolvedCountry);
  return parsed && parsed.isValid() ? parsed.number : null;
}

/**
 * Normalize a phone number for Attio API
 *
 * Returns an object with original_phone_number in E.164 format,
 * preserving any additional metadata fields.
 *
 * @param phone - Phone string or object with phone_number field
 * @param config - Optional configuration including default country
 * @returns Normalized phone object for Attio API
 * @throws PhoneValidationError if phone number is invalid
 */
export function normalizePhoneForAttio(
  phone: string | Record<string, unknown>,
  config?: PhoneValidationConfig
): Record<string, unknown> {
  const phoneStr =
    typeof phone === 'string'
      ? phone
      : ((phone.original_phone_number ||
          phone.phone_number ||
          phone.phone) as string);

  if (!phoneStr || typeof phoneStr !== 'string') {
    throw new PhoneValidationError(
      'INVALID_FORMAT',
      'Phone number is required.',
      String(phoneStr)
    );
  }

  const validation = validatePhoneNumber(phoneStr, config);

  if (!validation.valid && !validation.possible) {
    const suggestion = hasCountryCode(phoneStr)
      ? 'Verify the number is correct.'
      : 'Provide in E.164 format (e.g., +1 555 123 4567) or ensure defaultCountry is configured.';

    throw new PhoneValidationError(
      validation.error?.code || 'INVALID_FORMAT',
      `Invalid phone number: ${phoneStr}. ${validation.error?.message || ''} ${suggestion}`,
      phoneStr,
      config?.defaultCountry
    );
  }

  // Use E.164 format if available, otherwise original
  const normalizedPhone = validation.e164 || phoneStr;

  // Preserve other fields (label, type, extension, etc.)
  const phoneObj: Record<string, unknown> =
    typeof phone === 'object' ? { ...phone } : {};

  // Remove user-friendly keys
  delete phoneObj.phone_number;
  delete phoneObj.phone;

  // Set the Attio-required key
  phoneObj.original_phone_number = normalizedPhone;

  return phoneObj;
}
