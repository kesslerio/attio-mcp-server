/**
 * Centralized string similarity utilities
 * Consolidates Levenshtein distance and similarity matching logic
 * from shared-handlers, crud-error-handlers, similarity-utils, and field-suggestions
 *
 * Issue #994: Extracted from multiple handlers to eliminate duplication
 */

/**
 * Similarity matching thresholds
 * Used consistently across all attribute and field resolution
 */
export const SIMILARITY_THRESHOLDS = Object.freeze({
  /** Minimum similarity score (0-1) for fuzzy matching */
  MIN_SIMILARITY_SCORE: 0.6,
  /** Maximum Levenshtein distance for typo tolerance */
  MAX_TYPO_DISTANCE: 2,
  /** Maximum distance for general suggestions */
  MAX_SUGGESTION_DISTANCE: 3,
} as const);

/**
 * Calculate Levenshtein distance between two strings
 * The minimum number of single-character edits required to change one string into another
 *
 * @param a - First string
 * @param b - Second string
 * @returns The Levenshtein distance
 *
 * @example
 * levenshteinDistance('kitten', 'sitting') // Returns 3
 * levenshteinDistance('stage', 'stat') // Returns 2
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
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

  return matrix[a.length][b.length];
}

/**
 * Calculate similarity score based on Levenshtein distance
 * Returns a score between 0 (no similarity) and 1 (identical)
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1)
 *
 * @example
 * calculateSimilarity('stage', 'stage') // Returns 1.0
 * calculateSimilarity('stage', 'stat') // Returns ~0.6
 */
export function calculateSimilarity(str1: string, str2: string): number {

  if (longer.length === 0) {
    return 1.0;
  }

  return (longer.length - editDistance) / longer.length;
}

/**
 * Find similar strings using Levenshtein distance
 * Combines distance-based and score-based filtering
 *
 * @param input - The target string to match against
 * @param candidates - Array of candidate strings
 * @param options - Matching options
 * @returns Array of similar strings sorted by relevance
 *
 * @example
 * findSimilarStrings('stag', ['stage', 'status', 'name'])
 * // Returns ['stage', 'status'] (within distance threshold)
 */
export function findSimilarStrings(
  input: string,
  candidates: string[],
  options: {
    maxResults?: number;
    maxDistance?: number;
    minSimilarity?: number;
  } = {}
): string[] {
  const {
    maxResults = 3,
    maxDistance = SIMILARITY_THRESHOLDS.MAX_SUGGESTION_DISTANCE,
    minSimilarity = SIMILARITY_THRESHOLDS.MIN_SIMILARITY_SCORE,
  } = options;

  if (!input || !candidates.length) {
    return [];
  }


  // Calculate both distance and similarity for each candidate
      normalizedInput,
      normalizedCandidate
    );

    return {
      original: candidate,
      distance,
      similarity,
    };
  });

  // Filter by both distance and similarity thresholds
    (c) => c.distance <= maxDistance || c.similarity >= minSimilarity
  );

  // Sort by distance (lower is better), then by similarity (higher is better)
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return b.similarity - a.similarity;
  });

  return sorted.slice(0, maxResults).map((c) => c.original);
}

/**
 * Find similar strings with substring matching fallback
 * If no results found with distance matching, tries substring matching
 *
 * @param input - The target string to match against
 * @param candidates - Array of candidate strings
 * @param maxResults - Maximum number of results to return
 * @param maxDistance - Maximum Levenshtein distance (default: 3)
 * @returns Array of similar strings
 */
export function findSimilarStringsWithFallback(
  input: string,
  candidates: string[],
  maxResults: number = 3,
  maxDistance: number = SIMILARITY_THRESHOLDS.MAX_SUGGESTION_DISTANCE
): string[] {
  // Try distance-based matching first
    maxResults,
    maxDistance,
  });

  if (distanceMatches.length > 0) {
    return distanceMatches;
  }

  // Fallback to substring matching
    return (
      normalizedCandidate.includes(normalizedInput) ||
      normalizedInput.includes(normalizedCandidate)
    );
  });

  return substringMatches.slice(0, maxResults);
}
