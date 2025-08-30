/**
 * String similarity utilities for field and resource type suggestions
 * Extracted from field-mapper.ts during Issue #529 modular refactoring
 */

/**
 * Simple string similarity function for suggestions
 * Uses Levenshtein distance to find similar strings
 */
export function findSimilarStrings(
  input: string,
  candidates: string[],
  threshold: number = 0.6
): string[] {
  const similarities: Array<{ str: string; score: number }> = [];

  for (const candidate of candidates) {
    const score = calculateSimilarity(
      input.toLowerCase(),
      candidate.toLowerCase()
    );
    if (score >= threshold) {
      similarities.push({ str: candidate, score });
    }
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.str);
}

/**
 * Calculate Levenshtein distance-based similarity
 * Returns a score between 0 (no similarity) and 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * The minimum number of single-character edits required to change one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
