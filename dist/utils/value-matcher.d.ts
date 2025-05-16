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
/**
 * Find the best matching values from a list of valid options
 *
 * @param searchValue - The value to search for
 * @param validValues - Array of valid values to match against
 * @param config - Optional configuration for matching behavior
 * @returns Match result with exact match or suggestions
 */
export declare function findBestValueMatch(searchValue: string, validValues: string[], config?: ValueMatchConfig): ValueMatchResult;
/**
 * Format a value match error message with suggestions
 *
 * @param fieldName - The field being searched
 * @param searchValue - The value that was searched for
 * @param matchResult - The match result with suggestions
 * @returns Formatted error message
 */
export declare function formatValueMatchError(fieldName: string, searchValue: string, matchResult: ValueMatchResult): string;
/**
 * Check if a value contains a partial match
 * Useful for "contains" type searches
 *
 * @param searchValue - The partial value to search for
 * @param validValues - Array of valid values to check
 * @param caseSensitive - Whether to use case-sensitive matching
 * @returns Array of values that contain the search value
 */
export declare function findPartialMatches(searchValue: string, validValues: string[], caseSensitive?: boolean): string[];
/**
 * Get value suggestions for a field
 * This could be extended to cache or fetch valid values from Attio
 *
 * @param fieldSlug - The field slug (e.g., 'type_persona')
 * @param searchValue - The value being searched for
 * @returns Array of suggested values or null if no suggestions available
 */
export declare function getValueSuggestions(fieldSlug: string, searchValue: string): Promise<ValueMatch[] | null>;
//# sourceMappingURL=value-matcher.d.ts.map