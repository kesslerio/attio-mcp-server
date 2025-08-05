/**
 * Error for when a field value doesn't match any valid options
 * Includes suggestions for similar values
 */

import type { ValueMatchResult } from '../utils/value-matcher.js';
import { AttioApiError } from './api-errors.js';

export class ValueMatchError extends AttioApiError {
  public readonly fieldName: string;
  public readonly searchValue: string;
  public readonly suggestions: string[];
  public readonly bestMatch?: string;
  public readonly originalError?: Error;

  constructor(
    fieldName: string,
    searchValue: string,
    matchResult: ValueMatchResult,
    originalErrorParam?: Error
  ) {
    let message = `'${searchValue}' is not a valid value for ${fieldName}.`;

    if (matchResult.bestMatch && matchResult.bestMatch.similarity >= 0.7) {
      message += ` Did you mean '${matchResult.bestMatch.value}'?`;
    } else if (matchResult.suggestions.length > 0) {
      message += '\n\nDid you mean one of these?';
      matchResult.suggestions.forEach((suggestion) => {
        message += `\n  • ${suggestion.value} (${Math.round(
          suggestion.similarity * 100
        )}% similar)`;
      });
    }

    super(
      message,
      400, // HTTP status code for bad request
      fieldName, // Use fieldName as endpoint
      'POST', // Typical method for searches
      {
        // Additional details
        searchValue,
        suggestions: matchResult.suggestions,
        bestMatch: matchResult.bestMatch,
        originalErrorMessage: originalErrorParam?.message,
      }
    );

    this.fieldName = fieldName;
    this.searchValue = searchValue;
    this.suggestions = matchResult.suggestions.map((s) => s.value);
    this.bestMatch = matchResult.bestMatch?.value;
    this.originalError = originalErrorParam;
  }
}
