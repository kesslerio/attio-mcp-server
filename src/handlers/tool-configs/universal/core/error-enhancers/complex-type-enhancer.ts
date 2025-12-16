/**
 * Complex Type Error Enhancer
 *
 * Handles errors for complex attribute types:
 * - location
 * - phone-number
 * - personal-name
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';


/**
 * Enhance complex type errors (location, personal-name, phone-number)
 */
function enhance(
  error: unknown,
  context: CrudErrorContext
): Promise<string | null> {
  const msg = error instanceof Error ? error.message : String(error);

  const validationErrors =
    (error as { response?: { data?: { validation_errors?: unknown } } })
      ?.response?.data?.validation_errors ?? null;

  const recordFields = context.recordData ? Object.keys(context.recordData) : [];

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
    return Promise.resolve(
      `Invalid location value. Expected an object with all required fields.\n\n` +
        `Expected structure:\n${locationExample}\n\n` +
        `Tip: Missing fields are auto-filled with null; pass an object, not a string.`
    );
  }

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
    return Promise.resolve(
      `Invalid phone-number value. Provide phone_number or original_phone_number strings.\n\n` +
        `Example: ${phoneExample}\n\n` +
        `Tip: Strings are normalized to E.164; keep label/type fields if needed.`
    );
  }

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
    return Promise.resolve(
      `Invalid personal-name value. Provide first_name/last_name or full_name.\n\n` +
        `Example: ${nameExample}\n\n` +
        `Tip: Strings are parsed automatically; empty strings are rejected.`
    );
  }

  return Promise.resolve(null);
}

function matches(error: unknown, context: CrudErrorContext): boolean {

    (error as { response?: { data?: { validation_errors?: unknown } } })
      ?.response?.data?.validation_errors ?? null;

    ? Object.keys(context.recordData)
    : [];

    ? (validationErrors as unknown[])
    : null;

  // Check for location
  if (
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
      ))
  ) {
    return true;
  }

  // Check for phone
  if (
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
      ))
  ) {
    return true;
  }

  // Check for personal-name
  if (
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
      ))
  ) {
    return true;
  }

  return false;
}

export const complexTypeEnhancer: ErrorEnhancer = {
  name: 'complex-type',
  matches,
  enhance,
  errorName: 'validation_error',
};
