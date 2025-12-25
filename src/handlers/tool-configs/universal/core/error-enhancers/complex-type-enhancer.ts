/**
 * Complex Type Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Enhances errors for complex type fields: location, phone-number, personal-name
 * Provides example structures and usage tips.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';

/**
 * Enhance complex type errors (location, personal-name, phone-number)
 */
const enhanceComplexTypeError = (
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {
  const locationExample =
    '{\n' +
    '  "line_1": "123 Main St",\n' +
    '  "locality": "City",\n' +
    '  "region": "State",\n' +
    '  "postcode": "12345",\n' +
    '  "country_code": "US",\n' +
    '  "latitude": null,\n' +
    '  "longitude": null,\n' +
    '  "line_2": null,\n' +
    '  "line_3": null,\n' +
    '  "line_4": null\n' +
    '}';

  const phoneExample =
    '{ "phone_number": "+15551234567", "country_code": "US" }';
  const nameExample = '{ "first_name": "Jane", "last_name": "Doe" }';

  const msg = error instanceof Error ? error.message : String(error);

  const validationErrors =
    (error as { response?: { data?: { validation_errors?: unknown } } })
      ?.response?.data?.validation_errors ?? null;

  const recordFields = recordData ? Object.keys(recordData) : [];

  const validationErrorsArray = Array.isArray(validationErrors)
    ? (validationErrors as unknown[])
    : null;

  const containsLocation =
    /location/i.test(msg) ||
    recordFields.some((f) => /location/i.test(f)) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /location/i.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsLocation) {
    return (
      `Invalid location value. Expected an object with all required fields.\n\n` +
      `Expected structure:\n${locationExample}\n\n` +
      `Tip: Missing fields are auto-filled with null; pass an object, not a string.`
    );
  }

  const containsPhone =
    /phone/.test(msg) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /phone/.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsPhone) {
    return (
      `Invalid phone-number value. Provide phone_number or original_phone_number strings.\n\n` +
      `Example: ${phoneExample}\n\n` +
      `Tip: Strings are normalized to E.164; keep label/type fields if needed.`
    );
  }

  const containsPersonalName =
    /personal-name/.test(msg) ||
    (validationErrorsArray &&
      validationErrorsArray.some((ve) =>
        /name/.test(
          String(
            (ve as Record<string, unknown>)?.field ||
              (ve as Record<string, unknown>)?.path ||
              (ve as Record<string, unknown>)?.message ||
              ''
          )
        )
      ));

  if (containsPersonalName) {
    return (
      `Invalid personal-name value. Provide first_name/last_name or full_name.\n\n` +
      `Example: ${nameExample}\n\n` +
      `Tip: Strings are parsed automatically; empty strings are rejected.`
    );
  }

  return null;
};

/**
 * Complex Type Enhancer
 * Handles location, phone-number, and personal-name field errors
 */
export const complexTypeEnhancer: ErrorEnhancer = {
  name: 'complex-type',
  errorName: 'validation_error',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = error instanceof Error ? error.message : String(error);
    return (
      /location/i.test(msg) ||
      /phone/.test(msg) ||
      /personal-name/.test(msg) ||
      msg.includes('Invalid value')
    );
  },

  enhance: async (
    error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    return enhanceComplexTypeError(error, context.recordData);
  },
};
