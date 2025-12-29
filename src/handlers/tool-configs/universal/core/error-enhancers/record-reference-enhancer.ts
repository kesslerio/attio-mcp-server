/**
 * Record Reference Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 * Issue #997 - Enhanced record-reference attribute error handling
 *
 * Detects "Missing target_object on record reference value" and similar errors
 * Provides format guidance for record-reference fields.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';

/**
 * Enhance error messages for record-reference attribute errors
 */
const enhanceRecordReferenceError = (
  error: unknown,
  recordData?: Record<string, unknown>
): string | null => {
  const msg = error instanceof Error ? error.message : String(error);

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
    const data = (error.response as Record<string, unknown>).data;
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
  const isRecordRefError =
    fullErrorText.includes('Missing target_object') ||
    fullErrorText.includes('record reference') ||
    fullErrorText.includes('target_record_id') ||
    (fullErrorText.includes('Invalid value was passed to attribute') &&
      (fullErrorText.includes('company') ||
        fullErrorText.includes('associated_people') ||
        fullErrorText.includes('associated_company') ||
        fullErrorText.includes('main_contact')));

  if (!isRecordRefError) return null;

  // Try to identify which field might be the issue
  const potentialRefFields = [
    'company',
    'associated_company',
    'associated_people',
    'main_contact',
    'person',
    'people',
  ];

  let affectedField: string | null = null;
  if (recordData) {
    for (const field of potentialRefFields) {
      if (field in recordData) {
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

  return message;
};

/**
 * Record Reference Enhancer
 * Handles record-reference field format errors (Issue #997)
 */
export const recordReferenceEnhancer: ErrorEnhancer = {
  name: 'record-reference',
  errorName: 'record_reference_error',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = error instanceof Error ? error.message : String(error);

    // Check for axios validation errors
    let fullText = msg;
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error.response as Record<string, unknown>)?.data
    ) {
      const data = (error.response as Record<string, unknown>).data;
      if (typeof data === 'object' && data) {
        if ('message' in data) {
          fullText += ' ' + String((data as Record<string, unknown>).message);
        }
        // CRITICAL: Also check validation_errors array for record-reference patterns
        if ('validation_errors' in data) {
          const validationErrors = (data as Record<string, unknown>)
            .validation_errors;
          if (Array.isArray(validationErrors)) {
            fullText +=
              ' ' +
              validationErrors
                .map((e: Record<string, unknown>) => String(e.message || e))
                .join(' ');
          }
        }
      }
    }

    return (
      fullText.includes('Missing target_object') ||
      fullText.includes('record reference') ||
      fullText.includes('target_record_id') ||
      // CRITICAL: Match "Invalid value was passed to attribute" pattern (from enhanceRecordReferenceError)
      (fullText.includes('Invalid value was passed to attribute') &&
        (fullText.includes('company') ||
          fullText.includes('associated_people') ||
          fullText.includes('associated_company') ||
          fullText.includes('main_contact')))
    );
  },

  enhance: async (
    error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    return enhanceRecordReferenceError(error, context.recordData);
  },
};
