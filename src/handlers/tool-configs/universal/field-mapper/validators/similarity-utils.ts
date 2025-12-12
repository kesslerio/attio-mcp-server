/**
 * String similarity utilities for field and resource type suggestions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 * Issue #994: Refactored to use centralized string-similarity utilities
 */

import {
  findSimilarStrings as findSimilarStringsCore,
  calculateSimilarity as calculateSimilarityCore,
  levenshteinDistance as levenshteinDistanceCore,
  SIMILARITY_THRESHOLDS,
} from '@/utils/string-similarity.js';

/**
 * Simple string similarity function for suggestions
 * Uses Levenshtein distance to find similar strings
 * Re-exported from centralized utilities
 */
export function findSimilarStrings(
  input: string,
  candidates: string[],
  threshold: number = SIMILARITY_THRESHOLDS.MIN_SIMILARITY_SCORE
): string[] {
  return findSimilarStringsCore(input, candidates, {
    maxResults: 3,
    minSimilarity: threshold,
  });
}

/**
 * Calculate Levenshtein distance-based similarity
 * Returns a score between 0 (no similarity) and 1 (identical)
 * Re-exported from centralized utilities
 */
export function calculateSimilarity(str1: string, str2: string): number {
  return calculateSimilarityCore(str1, str2);
}

/**
 * Calculate Levenshtein distance between two strings
 * The minimum number of single-character edits required to change one string into another
 * Re-exported from centralized utilities
 */
export function levenshteinDistance(str1: string, str2: string): number {
  return levenshteinDistanceCore(str1, str2);
}
