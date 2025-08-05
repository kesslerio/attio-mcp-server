/**
 * Value matching utilities for fuzzy matching field values
 * Uses string-similarity for intelligent suggestions when exact matches fail
 */
import stringSimilarity from 'string-similarity';

export interface ValueMatch {
  value: string;
  similarity: number;
}

export interface ValueMatchResult {
  exactMatch?: string;
  suggestions: ValueMatch[];
  bestMatch?: ValueMatch;
}

/**
 * Configuration for value matching behavior
 */
export interface ValueMatchConfig {
  /** Minimum similarity score to consider a match (0-1) */
  minSimilarity?: number;
  /** Maximum number of suggestions to return */
  maxSuggestions?: number;
  /** Whether to use case-sensitive matching */
  caseSensitive?: boolean;
}

const DEFAULT_CONFIG: ValueMatchConfig = {
  minSimilarity: 0.4,
  maxSuggestions: 3,
  caseSensitive: false,
};

/**
 * Find the best matching values from a list of valid options
 *
 * @param searchValue - The value to search for
 * @param validValues - Array of valid values to match against
 * @param config - Optional configuration for matching behavior
 * @returns Match result with exact match or suggestions
 */
export function findBestValueMatch(
  searchValue: string,
  validValues: string[],
  config?: ValueMatchConfig
): ValueMatchResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Normalize for comparison if not case sensitive
  const normalizedSearch = mergedConfig.caseSensitive
    ? searchValue
    : searchValue.toLowerCase();

  // Check for exact match first
  const exactMatch = validValues.find((value) => {
    const normalizedValue = mergedConfig.caseSensitive
      ? value
      : value.toLowerCase();
    return normalizedValue === normalizedSearch;
  });

  if (exactMatch) {
    return {
      exactMatch,
      suggestions: [],
      bestMatch: { value: exactMatch, similarity: 1.0 },
    };
  }

  // No exact match, find similar values
  const matches = stringSimilarity.findBestMatch(searchValue, validValues);

  // Filter and sort suggestions by similarity
  const suggestions = matches.ratings
    .filter((rating) => rating.rating >= mergedConfig.minSimilarity!)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, mergedConfig.maxSuggestions)
    .map((rating) => ({
      value: rating.target,
      similarity: rating.rating,
    }));

  return {
    suggestions,
    bestMatch: suggestions[0],
  };
}

/**
 * Format a value match error message with suggestions
 *
 * @param fieldName - The field being searched
 * @param searchValue - The value that was searched for
 * @param matchResult - The match result with suggestions
 * @returns Formatted error message
 */
export function formatValueMatchError(
  fieldName: string,
  searchValue: string,
  matchResult: ValueMatchResult
): string {
  let message = `'${searchValue}' not found as '${fieldName}'.`;

  if (matchResult.bestMatch && matchResult.bestMatch.similarity >= 0.7) {
    message += ` Did you mean '${matchResult.bestMatch.value}'?`;
  } else if (matchResult.suggestions.length > 0) {
    message += ' Did you mean one of these?';
    matchResult.suggestions.forEach((suggestion) => {
      message += `\n  - ${suggestion.value} (${Math.round(
        suggestion.similarity * 100
      )}% match)`;
    });
  }

  return message;
}

/**
 * Check if a value contains a partial match
 * Useful for "contains" type searches
 *
 * @param searchValue - The partial value to search for
 * @param validValues - Array of valid values to check
 * @param caseSensitive - Whether to use case-sensitive matching
 * @returns Array of values that contain the search value
 */
export function findPartialMatches(
  searchValue: string,
  validValues: string[],
  caseSensitive = false
): string[] {
  const normalizedSearch = caseSensitive
    ? searchValue
    : searchValue.toLowerCase();

  return validValues.filter((value) => {
    const normalizedValue = caseSensitive ? value : value.toLowerCase();
    return normalizedValue.includes(normalizedSearch);
  });
}

/**
 * Get value suggestions for a field
 * This could be extended to cache or fetch valid values from Attio
 *
 * @param fieldSlug - The field slug (e.g., 'type_persona')
 * @param searchValue - The value being searched for
 * @returns Array of suggested values or null if no suggestions available
 */
export async function getValueSuggestions(
  fieldSlug: string,
  searchValue: string
): Promise<ValueMatch[] | null> {
  // This is where we could integrate with Attio API to fetch valid values
  // For now, we'll use known values from our documentation

  const knownValues: Record<string, string[]> = {
    type_persona: [
      'Plastic Surgeon',
      'Medical Spa/Aesthetics',
      'Dermatologist',
      'Medical Practice',
      'Wellness Center',
      'Cosmetic Surgery',
      'Aesthetic Medicine',
    ],
    industry: [
      'Healthcare',
      'Technology',
      'Finance',
      'Education',
      'Retail',
      'Manufacturing',
    ],
  };

  const validValues = knownValues[fieldSlug];
  if (!validValues) {
    return null;
  }

  const matchResult = findBestValueMatch(searchValue, validValues);
  return matchResult.suggestions;
}
