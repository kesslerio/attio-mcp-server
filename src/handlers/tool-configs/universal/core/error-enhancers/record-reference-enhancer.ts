/**
 * Record Reference Error Enhancer
 *
 * Issue #997: Enhance error messages for record-reference attribute errors
 * Detects "Missing target_object on record reference value" and similar errors.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';

  // Also check for validation_errors in axios response
  let fullErrorText = msg;
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    if (data && typeof data === 'object') {
      if ('message' in data) {
        fullErrorText +=
          ' ' + String((data as Record<string, unknown>).message);
      }
      if ('validation_errors' in data) {
        const validationErrors = (data as Record<string, unknown>)
          .validation_errors;
        if (Array.isArray(validationErrors)) {
          fullErrorText +=
            ' ' +
            validationErrors
              .map((e: Record<string, unknown>) => String(e.message || e))
              .join(' ');
        }
      }
    }
  }

  // Pattern detection for record-reference errors
    fullErrorText.includes('Missing target_object') ||
    fullErrorText.includes('record reference') ||
    fullErrorText.includes('target_record_id') ||
    (fullErrorText.includes('Invalid value was passed to attribute') &&
      (fullErrorText.includes('company') ||
        fullErrorText.includes('associated_people') ||
        fullErrorText.includes('associated_company') ||
        fullErrorText.includes('main_contact')));

  if (!isRecordRefError) return Promise.resolve(null);

  // Try to identify which field might be the issue
    'company',
    'associated_company',
    'associated_people',
    'main_contact',
    'person',
    'people',
  ];

  let affectedField: string | null = null;
  if (context.recordData) {
    for (const field of potentialRefFields) {
      if (field in context.recordData) {
        affectedField = field;
        break;
      }
    }
  }

  let message = `Record reference format error`;
  if (affectedField) {
    message += ` on field "${affectedField}"`;
  }
  message += `.\n\n`;

  message += `The Attio API expects record-reference fields in this format:\n`;
  message += `  [{ "target_object": "object_type", "target_record_id": "uuid" }]\n\n`;

  message += `Simplified formats (auto-transformed by this server):\n`;
  message += `  • String: "company": "record-uuid"\n`;
  message += `  • Legacy object: "company": {"record_id": "uuid"}\n\n`;

  message += `If you're seeing this error, the auto-transformation may have failed.\n`;
  message += `Ensure the record ID is valid and the field name is correct.`;

  return Promise.resolve(message);
}

function matches(error: unknown, _context: CrudErrorContext): boolean {

  // Also check for validation_errors in axios response
  let fullErrorText = msg;
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    if (data && typeof data === 'object') {
      if ('message' in data) {
        fullErrorText +=
          ' ' + String((data as Record<string, unknown>).message);
      }
      if ('validation_errors' in data) {
        const validationErrors = (data as Record<string, unknown>)
          .validation_errors;
        if (Array.isArray(validationErrors)) {
          fullErrorText +=
            ' ' +
            validationErrors
              .map((e: Record<string, unknown>) => String(e.message || e))
              .join(' ');
        }
      }
    }
  }

  // Pattern detection for record-reference errors
  return (
    fullErrorText.includes('Missing target_object') ||
    fullErrorText.includes('record reference') ||
    fullErrorText.includes('target_record_id') ||
    (fullErrorText.includes('Invalid value was passed to attribute') &&
      (fullErrorText.includes('company') ||
        fullErrorText.includes('associated_people') ||
        fullErrorText.includes('associated_company') ||
        fullErrorText.includes('main_contact')))
  );
}

export const recordReferenceEnhancer: ErrorEnhancer = {
  name: 'record-reference',
  matches,
  enhance,
  errorName: 'record_reference_error',
};
