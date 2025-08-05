/**
 * Enhances API errors with helpful suggestions for value mismatches
 */

import axios from 'axios';
import { ValueMatchError } from '../errors/value-match-error.js';
import {
  findBestValueMatch,
  type ValueMatchResult as ValueMatcherValueMatchResult,
} from './value-matcher.js';

// Known valid values for select fields - this should ideally come from Attio API
const KNOWN_FIELD_VALUES: Record<string, string[]> = {
  type_persona: [
    'Plastic Surgeon',
    'Medical Spa/Aesthetics',
    'Dermatologist',
    'Medical Practice',
    'Wellness Center',
    'Cosmetic Surgery',
    'Aesthetic Medicine',
    'Primary Care',
    'Specialist',
    'Hospital',
    'Clinic',
  ],
  industry: [
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
function parseApiError(error: any): ErrorContext {
  console.error('[enhancer-parseApiError] --- ENTERING parseApiError ---');
  console.error(
    `[enhancer-parseApiError] error type: ${typeof error}, constructor: ${
      error?.constructor?.name
    }`
  );

  if (error && typeof error === 'object') {
    console.error(
      `[enhancer-parseApiError] error keys: ${JSON.stringify(
        Object.keys(error)
      )}`
    );
    console.error(
      `[enhancer-parseApiError] error.message from input: ${error.message}`
    );
  }

  const isAxios = axios.isAxiosError(error);
  console.error(
    `[enhancer-parseApiError] Step 1: axios.isAxiosError(error) result: ${isAxios}`
  );

  let responseExists = false;
  let responseDataExists = false;
  let responseDataContent = 'N/A';

  if (isAxios && error.response) {
    responseExists = true;
    console.error(
      `[enhancer-parseApiError] Step 2: error.response exists. Keys: ${JSON.stringify(
        Object.keys(error.response)
      )}`
    );

    if (error.response.data) {
      responseDataExists = true;
      try {
        responseDataContent = JSON.stringify(error.response.data);
      } catch (e) {
        responseDataContent = 'Error stringifying response.data';
      }
      console.error(
        `[enhancer-parseApiError] Step 3: error.response.data exists. Type: ${typeof error
          .response.data}, Content: ${responseDataContent}`
      );
    } else {
      console.error(
        '[enhancer-parseApiError] Step 3: error.response.data is FALSY.'
      );
    }
  } else {
    console.error(
      '[enhancer-parseApiError] Step 2: error.response is FALSY or not an Axios error for this check.'
    );
    console.error(
      '[enhancer-parseApiError] Step 3: error.response.data is FALSY (because error.response was not available).'
    );
  }

  console.error(
    `[enhancer-parseApiError] FINAL CHECK BEFORE CONDITION: isAxios=${isAxios}, responseExists=${responseExists}, responseDataExists=${responseDataExists}`
  );

  if (
    isAxios &&
    responseExists &&
    responseDataExists &&
    error.response &&
    error.response.data
  ) {
    console.error(
      '[enhancer-parseApiError] --- CONDITION MET --- Processing error.response.data...'
    );
    const data = error.response.data;
    const message = typeof data.message === 'string' ? data.message : '';
    const pathArray =
      Array.isArray(data.path) && data.path.length > 0 ? data.path : [];
    const path = typeof pathArray[0] === 'string' ? pathArray[0] : undefined;

    console.error(
      `[enhancer-parseApiError] Extracted from data: message='${message}', path='${path}'`
    );

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
    console.error(
      `[enhancer-parseApiError] --- RETURNING Non-ValueMismatch Axios context: field='${path}' ---`
    );
    return { fieldSlug: path, errorMessage: message };
  }

  console.error('[enhancer-parseApiError] --- CONDITION NOT MET ---');
  const genericErrorMessage =
    error && typeof error.message === 'string'
      ? error.message
      : 'Unknown error';
  console.error(
    `[enhancer-parseApiError] Returning generic message: '${genericErrorMessage}'`
  );
  return { errorMessage: genericErrorMessage };
}

/**
 * Enhance an API error with value suggestions if applicable
 */
export function enhanceApiError(error: any): Error {
  console.error(
    '[enhancer] Called with error type:',
    error?.constructor?.name,
    '. Is Axios Error:',
    error?.isAxiosError
  );
  console.error(
    '[enhancer] Attempting to enhance error. Message property:',
    error?.message,
    '. ResponseData property:',
    JSON.stringify(error?.response?.data)
  );

  const mismatchCheck = isValueMismatchError(error);
  console.error(
    '[enhancer] Mismatch check result:',
    JSON.stringify(mismatchCheck)
  );

  if (
    mismatchCheck.isMismatch &&
    mismatchCheck.fieldSlug &&
    mismatchCheck.searchValue
  ) {
    const fieldSlug = mismatchCheck.fieldSlug;
    const searchValue = mismatchCheck.searchValue;
    const knownValues = KNOWN_FIELD_VALUES[fieldSlug]; // Already checked in isValueMismatchError, but good for clarity

    console.error(
      `[enhancer] Value mismatch confirmed for field: ${fieldSlug}, value: ${searchValue}.`
    );

    if (knownValues) {
      console.error(
        `[enhancer] Attempting to find best match for '${searchValue}' in known values for '${fieldSlug}'.`
      );
      const matchResult: ValueMatcherValueMatchResult = findBestValueMatch(
        searchValue,
        knownValues
      );
      console.error(
        '[enhancer] Match result from findBestValueMatch:',
        JSON.stringify(matchResult)
      );

      console.error('[enhancer] Returning NEW ValueMatchError');
      return new ValueMatchError(
        fieldSlug,
        searchValue,
        matchResult,
        error // Pass original Axios error for reference
      );
    }
  } else {
    console.error(
      '[enhancer] No value mismatch, or field/value not actionable. Error message from mismatchCheck:',
      mismatchCheck.errorMessage
    );
  }

  console.error(
    '[enhancer] No specific enhancement applied. Returning original error.'
  );
  return error; // Fallback: return original error if not enhanced
}

/**
 * Check if an error is a value mismatch that we can enhance
 */
export function isValueMismatchError(error: any): {
  isMismatch: boolean;
  fieldSlug?: string;
  searchValue?: string;
  errorMessage?: string;
} {
  const context = parseApiError(error);
  console.error(
    '[enhancer-isValueMismatchError] Context from parseApiError:',
    JSON.stringify(context)
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
      console.error(
        `[enhancer-isValueMismatchError] Mismatch found for field '${context.fieldSlug}', value '${context.searchValue}'.`
      );
      return {
        isMismatch: true,
        fieldSlug: context.fieldSlug,
        searchValue: context.searchValue,
        errorMessage: context.errorMessage,
      };
    }
  }
  console.error(
    '[enhancer-isValueMismatchError] No mismatch or field/value not in KNOWN_FIELD_VALUES.'
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
