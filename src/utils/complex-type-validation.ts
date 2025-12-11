import {
  UniversalValidationError,
  ErrorType,
} from '@/handlers/tool-configs/universal/errors/validation-errors.js';
import { normalizeLocation } from './location-normalizer.js';
import { parsePersonalName } from './personal-name-parser.js';

type UnknownRecord = Record<string, unknown>;

const LOCATION_EXAMPLE = {
  line_1: '123 Main St',
  line_2: null,
  line_3: null,
  line_4: null,
  locality: 'City',
  region: 'State',
  postcode: '12345',
  country_code: 'US',
  latitude: null,
  longitude: null,
};

/**
 * Validates and normalizes a location value. Ensures an object shape and adds all 10 fields.
 */
export function validateLocationValue(
  value: unknown,
  fieldName: string
): unknown {
  // Allow null/undefined to pass through for clears
  if (value === null || value === undefined) {
    return value;
  }

  const normalizeSingle = (input: unknown): UnknownRecord => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new UniversalValidationError(
        `"${fieldName}" must be an object with location fields (line_1, locality, region, postcode, country_code, latitude, longitude).`,
        ErrorType.USER_ERROR,
        {
          field: fieldName,
          example: JSON.stringify(LOCATION_EXAMPLE),
          suggestion:
            'Provide a location object; all missing fields will be set to null automatically.',
        }
      );
    }

    return normalizeLocation(input as UnknownRecord);
  };

  if (Array.isArray(value)) {
    return value.map((item, idx) => {
      try {
        if (item === null || item === undefined) {
          return null;
        }
        return normalizeSingle(item);
      } catch (err) {
        if (err instanceof UniversalValidationError) {
          throw new UniversalValidationError(
            `${err.message} (item ${idx})`,
            err.errorType,
            {
              field: fieldName,
              suggestion: err.suggestion,
              example: err.example,
              cause: err,
            }
          );
        }
        throw err;
      }
    });
  }

  return normalizeSingle(value);
}

/**
 * Validates and normalizes a personal-name value.
 * Accepts string or object with first_name/last_name/full_name.
 */
export function validatePersonalNameValue(
  value: unknown,
  fieldName: string
): UnknownRecord | null {
  if (value === null || value === undefined) {
    return null;
  }

  const ensureHasNameParts = (nameObj: UnknownRecord): void => {
    const hasName = ['first_name', 'last_name', 'full_name'].some((k) => {
      const v = nameObj[k];
      return typeof v === 'string' && v.trim().length > 0;
    });

    if (!hasName) {
      throw new UniversalValidationError(
        `"${fieldName}" must include at least one of first_name, last_name, or full_name.`,
        ErrorType.USER_ERROR,
        {
          field: fieldName,
          example: JSON.stringify({
            first_name: 'Jane',
            last_name: 'Doe',
            full_name: 'Jane Doe',
          }),
          suggestion: 'Provide first_name/last_name or a full_name string.',
        }
      );
    }
  };

  if (typeof value === 'string') {
    const parsed = parsePersonalName(value);
    if (parsed) {
      return parsed;
    }
    throw new UniversalValidationError(
      `"${fieldName}" cannot be an empty name string.`,
      ErrorType.USER_ERROR,
      {
        field: fieldName,
        suggestion: 'Provide a non-empty name such as "Jane Doe".',
      }
    );
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    ensureHasNameParts(value as UnknownRecord);
    return parsePersonalName(value);
  }

  throw new UniversalValidationError(
    `"${fieldName}" must be a string or object with name fields.`,
    ErrorType.USER_ERROR,
    {
      field: fieldName,
      example: JSON.stringify({ full_name: 'Jane Doe' }),
      suggestion:
        'Provide a string ("Jane Doe") or an object with first_name/last_name.',
    }
  );
}

/**
 * Validates phone-number values. Ensures each entry has phone_number or original_phone_number.
 */
export function validatePhoneNumberValue(
  value: unknown,
  fieldName: string
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizeSingle = (input: unknown): UnknownRecord => {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        throw new UniversalValidationError(
          `"${fieldName}" phone number cannot be empty.`,
          ErrorType.USER_ERROR,
          {
            field: fieldName,
            suggestion: 'Provide a phone number like +15551234567.',
            example: '+15551234567',
          }
        );
      }
      return { phone_number: trimmed };
    }

    if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
      const record = { ...(input as UnknownRecord) };
      const phone =
        typeof record.phone_number === 'string'
          ? record.phone_number
          : typeof record.original_phone_number === 'string'
            ? record.original_phone_number
            : undefined;

      if (!phone || phone.trim().length === 0) {
        throw new UniversalValidationError(
          `"${fieldName}" requires phone_number or original_phone_number.`,
          ErrorType.USER_ERROR,
          {
            field: fieldName,
            example: JSON.stringify({
              phone_number: '+15551234567',
              country_code: 'US',
            }),
            suggestion:
              'Add a phone_number string; optional country_code is ISO 2-letter.',
          }
        );
      }

      // Preserve other fields (label/type) while ensuring trimmed phone string
      if (record.phone_number) {
        record.phone_number = (record.phone_number as string).trim();
      }
      if (record.original_phone_number) {
        record.original_phone_number = (
          record.original_phone_number as string
        ).trim();
      }

      return record;
    }

    throw new UniversalValidationError(
      `"${fieldName}" must be a phone number string or object.`,
      ErrorType.USER_ERROR,
      {
        field: fieldName,
        example: '+15551234567',
        suggestion: 'Provide a string or { phone_number: "..." } object.',
      }
    );
  };

  if (Array.isArray(value)) {
    return value.map((item, idx) => {
      try {
        if (item === null || item === undefined) {
          return null;
        }
        return normalizeSingle(item);
      } catch (err) {
        if (err instanceof UniversalValidationError) {
          throw new UniversalValidationError(
            `${err.message} (item ${idx})`,
            err.errorType,
            {
              field: fieldName,
              suggestion: err.suggestion,
              example: err.example,
              cause: err,
            }
          );
        }
        throw err;
      }
    });
  }

  return normalizeSingle(value);
}
