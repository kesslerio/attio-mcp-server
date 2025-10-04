import type { CountryCode, ParseError, PhoneNumber } from 'libphonenumber-js';

export const PHONE_METADATA_SOURCE =
  process.env.ATTIO_PHONE_METADATA === 'min' ? 'min' : 'default';

const libModule = await (PHONE_METADATA_SOURCE === 'min'
  ? import('libphonenumber-js/min')
  : import('libphonenumber-js'));

const {
  parsePhoneNumberFromString,
  isValidPhoneNumber: libIsValidPhoneNumber,
  isPossiblePhoneNumber: libIsPossiblePhoneNumber,
  validatePhoneNumberLength,
} = libModule as typeof import('libphonenumber-js');

const DEFAULT_COUNTRY = (process.env.DEFAULT_PHONE_COUNTRY ||
  'US') as CountryCode;

type PhoneValidationErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_COUNTRY_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NOT_A_NUMBER'
  | 'INVALID_TYPE'
  | 'UNKNOWN_ERROR';

export class PhoneValidationError extends Error {
  readonly code: PhoneValidationErrorCode;
  readonly input: string;
  readonly country?: CountryCode;
  readonly cause?: ParseError | Error;

  constructor(
    code: PhoneValidationErrorCode,
    message: string,
    input: string,
    country?: CountryCode,
    cause?: ParseError | Error
  ) {
    super(message);
    this.name = 'PhoneValidationError';
    this.code = code;
    this.input = input;
    this.country = country;
    this.cause = cause;
  }
}

export interface PhoneValidationResult {
  valid: boolean;
  possible: boolean;
  e164?: string;
  national?: string;
  country?: CountryCode;
  error?: PhoneValidationError;
}

function resolveCountry(country?: string): CountryCode {
  if (!country) {
    return DEFAULT_COUNTRY;
  }
  return country.toUpperCase() as CountryCode;
}

function mapLengthError(
  issue: ReturnType<typeof validatePhoneNumberLength>,
  input: string,
  country?: CountryCode
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

function safeParse(
  value: string,
  country: CountryCode
): PhoneNumber | undefined {
  try {
    return parsePhoneNumberFromString(value, country) || undefined;
  } catch (error) {
    return undefined;
  }
}

export function validatePhoneNumber(
  value: string,
  country?: string
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

  const resolvedCountry = resolveCountry(country);
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

export function toE164OrNull(
  value: unknown,
  defaultCountry?: string
): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const sanitized = value.trim();
  if (!sanitized) return null;
  const resolvedCountry = resolveCountry(defaultCountry);
  const parsed = safeParse(sanitized, resolvedCountry);
  return parsed && parsed.isValid() ? parsed.number : null;
}
