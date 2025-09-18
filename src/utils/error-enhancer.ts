/**
 * Enhances API errors with helpful suggestions for value mismatches
 */
import { ValueMatchError } from '../errors/value-match-error.js';
import {
  findBestValueMatch,
  ValueMatchResult as ValueMatcherValueMatchResult,
} from './value-matcher.js';
import axios from 'axios';
import { createScopedLogger } from './logger.js';
import type { UnknownObject } from './types/common.js';

// Known valid values for select fields - this should ideally come from Attio API
const KNOWN_FIELD_VALUES: Record<string, string[]> = {
  // Note: type_persona removed as it doesn't exist in Attio API
  // Custom fields should be discovered via CLI or auto-discovery
  categories: [
    'B2B',
    'B2C',
    'SaaS',
    'Healthcare',
    'Technology',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Hospitality',
    'Real Estate',
    'Professional Services',
  ],
  stage: [
    'Lead',
    'Prospect',
    'Opportunity',
    'Customer',
    'Churned',
    'Qualified',
    'Engaged',
    'Negotiation',
  ],
};

/**
 * Extracts field and value information from an API error
 */
interface ErrorContext {
  fieldSlug?: string;
  searchValue?: string;
  errorMessage: string;
}

/**
 * Parse API error to extract context
 */
function parseApiError(error: UnknownObject): ErrorContext {
  // Use imported createScopedLogger
  const log = createScopedLogger('utils.error-enhancer', 'parseApiError');
  log.debug('ENTERING parseApiError');
  log.debug('Error type info', {
    type: typeof error,
    ctor: error?.constructor?.name,
  });

  if (error && typeof error === 'object') {
    log.debug('Error keys', { keys: Object.keys(error) });
    log.debug('Error message from input', { message: error.message });
  }

  const isAxios = axios.isAxiosError(error);
  log.debug('axios.isAxiosError result', { isAxios });

  let responseExists = false;
  let responseDataExists = false;
  let responseDataContent = 'N/A';

  if (isAxios && error.response) {
    responseExists = true;
    log.debug('Response exists. Keys', { keys: Object.keys(error.response) });

    if (error.response.data) {
      responseDataExists = true;
      try {
        responseDataContent = JSON.stringify(error.response.data);
      } catch {
        // Failed to stringify response data
        responseDataContent = 'Error stringifying response.data';
      }
      log.debug('Response data exists', {
        type: typeof error.response.data,
        content: responseDataContent,
      });
    } else {
      log.debug('Response data is falsy');
    }
  } else {
    log.debug('Response is falsy or not an Axios error for this check');
    log.debug('Response data is falsy (no response)');
  }

  log.debug('Final check before condition', {
    isAxios,
    responseExists,
    responseDataExists,
  });

  if (
    isAxios &&
    responseExists &&
    responseDataExists &&
    error.response &&
    error.response.data
  ) {
    // Use imported createScopedLogger
    const log = createScopedLogger('utils.error-enhancer', 'parseApiError');
    log.debug('Condition met: processing error.response.data');
    const data = error.response.data;
    const message = typeof data.message === 'string' ? data.message : '';
    const pathArray =
      Array.isArray(data.path) && data.path.length > 0 ? data.path : [];
    const path = typeof pathArray[0] === 'string' ? pathArray[0] : undefined;

    log.debug('Extracted from response.data', { message, path });

    if (
      message.includes('Unknown select option name') ||
      message.includes('Unknown multi-select option names')
    ) {
      const valueMatch = message.match(/constraint: (.*)/);
      const extractedValue =
        valueMatch && typeof valueMatch[1] === 'string'
          ? valueMatch[1].split(',')[0].trim()
          : undefined;
      console.error(
        `[enhancer-parseApiError] --- RETURNING ValueMismatch context: field='${path}', value='${extractedValue}' ---`
      );
      return {
        fieldSlug: path,
        searchValue: extractedValue,
        errorMessage: message,
      };
    }
    createScopedLogger('utils.error-enhancer', 'parseApiError').debug(
      'Returning Non-ValueMismatch Axios context',
      { field: path }
    );
    return { fieldSlug: path, errorMessage: message };
  }

  createScopedLogger('utils.error-enhancer', 'parseApiError').debug(
    'Condition not met'
  );
  const genericErrorMessage =
    error && typeof error.message === 'string'
      ? error.message
      : 'Unknown error';
  createScopedLogger('utils.error-enhancer', 'parseApiError').debug(
    'Returning generic message',
    { genericErrorMessage }
  );
  return { errorMessage: genericErrorMessage };
}

/**
 * Enhance an API error with value suggestions if applicable
 */
export function enhanceApiError(error: UnknownObject): Error {
  // Use imported createScopedLogger
  const log = createScopedLogger('utils.error-enhancer', 'enhanceApiError');
  log.debug('Called with error', {
    type: error?.constructor?.name,
    isAxiosError: !!error?.isAxiosError,
  });
  log.debug('Attempting to enhance error', {
    message: (error as UnknownObject)?.message,
    responseData: ((error as UnknownObject)?.response as UnknownObject)?.data,
  });

  const mismatchCheck = isValueMismatchError(error);
  log.debug('Mismatch check result', mismatchCheck);

  if (
    mismatchCheck.isMismatch &&
    mismatchCheck.fieldSlug &&
    mismatchCheck.searchValue
  ) {
    const fieldSlug = mismatchCheck.fieldSlug;
    const searchValue = mismatchCheck.searchValue;
    const knownValues = KNOWN_FIELD_VALUES[fieldSlug]; // Already checked in isValueMismatchError, but good for clarity

    log.debug('Value mismatch confirmed', { fieldSlug, searchValue });

    if (knownValues) {
      log.debug('Attempting to find best match', { fieldSlug, searchValue });
      const matchResult: ValueMatcherValueMatchResult = findBestValueMatch(
        searchValue,
        knownValues
      );
      log.debug(
        'Match result from findBestValueMatch',
        matchResult as unknown as UnknownObject
      );

      log.debug('Returning NEW ValueMatchError');
      return new ValueMatchError(
        fieldSlug,
        searchValue,
        matchResult,
        error as unknown as Error // Pass original Axios error for reference
      );
    }
  } else {
    log.debug('No actionable mismatch', {
      errorMessage: mismatchCheck.errorMessage,
    });
  }

  log.debug('No specific enhancement applied; returning original error');
  return error as unknown as Error; // Fallback: return original error if not enhanced
}

/**
 * Check if an error is a value mismatch that we can enhance
 */
export function isValueMismatchError(error: UnknownObject): {
  isMismatch: boolean;
  fieldSlug?: string;
  searchValue?: string;
  errorMessage?: string;
} {
  const context = parseApiError(error);
  createScopedLogger('utils.error-enhancer', 'isValueMismatchError').debug(
    'Context from parseApiError',
    context as unknown as UnknownObject
  );
  if (
    context.fieldSlug &&
    context.searchValue &&
    KNOWN_FIELD_VALUES[context.fieldSlug]
  ) {
    const knownValues = KNOWN_FIELD_VALUES[context.fieldSlug];
    if (
      knownValues &&
      !knownValues.some(
        (v) => v.toLowerCase() === context.searchValue?.toLowerCase()
      )
    ) {
      createScopedLogger('utils.error-enhancer', 'isValueMismatchError').debug(
        'Mismatch found',
        { fieldSlug: context.fieldSlug, searchValue: context.searchValue }
      );
      return {
        isMismatch: true,
        fieldSlug: context.fieldSlug,
        searchValue: context.searchValue,
        errorMessage: context.errorMessage,
      };
    }
  }
  createScopedLogger('utils.error-enhancer', 'isValueMismatchError').debug(
    'No mismatch or field/value not in KNOWN_FIELD_VALUES'
  );
  return { isMismatch: false, errorMessage: context.errorMessage };
}

/**
 * Get valid values for a field (if known)
 */
export function getKnownFieldValues(fieldSlug: string): string[] | null {
  return KNOWN_FIELD_VALUES[fieldSlug] || null;
}

/**
 * Add or update known field values
 * This could be populated from Attio API discovery
 */
export function updateKnownFieldValues(
  fieldSlug: string,
  values: string[]
): void {
  KNOWN_FIELD_VALUES[fieldSlug] = values;
}

// Remove locally defined ValueMatchResult and similarity functions if they were causing issues
// interface ValueMatchResult { ... }
// function similarity(...) { ... }
// function editDistance(...) { ... }
