/**
 * Attribute Not Found Error Enhancer
 * Issue #1001 - Strategy Pattern for CRUD error handling
 *
 * Detects "Cannot find attribute with slug/ID" errors and provides
 * suggestions using Levenshtein distance algorithm.
 *
 * CRITICAL: This enhancer caused PR #1048 to fail due to missing
 * function signatures. All functions must have COMPLETE declarations.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import { UniversalResourceType } from '../../types.js';

/**
 * Calculate Levenshtein distance between two strings
 * Used for suggesting similar attribute names
 *
 * PR #1048 FAILURE POINT: Must include COMPLETE function signature
 * NOT: const matrix: number[][] = []
 * BUT: const levenshteinDistance = (a: string, b: string): number => { const matrix... }
 */
const levenshteinDistance = (a: string, b: string): number => {
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
};

/**
 * Find similar attribute names using Levenshtein distance
 */
const findSimilarAttributes = (
  target: string,
  candidates: string[],
  maxResults: number
): string[] => {
  const scored = candidates.map((c) => ({
    name: c,
    distance: levenshteinDistance(target.toLowerCase(), c.toLowerCase()),
  }));
  return scored
    .filter((s) => s.distance <= 3) // Max 3 edits
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults)
    .map((s) => s.name);
};

/**
 * Enhance error messages for attribute-not-found errors
 * Detects "Cannot find attribute with slug/ID" errors and provides suggestions
 */
const enhanceAttributeNotFoundError = async (
  error: unknown,
  resourceType: string
): Promise<string | null> => {
  const msg = error instanceof Error ? error.message : String(error);

  // Pattern: "Cannot find attribute with slug/ID "X"."
  const attrMatch = msg.match(/Cannot find attribute with slug\/ID "(.+?)"/);
  if (!attrMatch) return null;

  const invalidAttr = attrMatch[1];

  try {
    // Fetch valid attributes and find similar ones
    const { handleUniversalDiscoverAttributes } = await import(
      '../../shared-handlers.js'
    );
    const schema = await handleUniversalDiscoverAttributes(
      resourceType as UniversalResourceType
    );
    const allAttrs = ((schema as Record<string, unknown>).all || []) as Array<{
      name?: string;
      title?: string;
      api_slug?: string;
    }>;
    const attrNames = allAttrs
      .flatMap((a) => [a.name, a.title, a.api_slug])
      .filter(Boolean) as string[];

    // Find similar attribute names using Levenshtein distance
    const suggestions = findSimilarAttributes(invalidAttr, attrNames, 3);

    let message = `Attribute "${invalidAttr}" does not exist on ${resourceType}.\n\n`;

    if (suggestions.length > 0) {
      message += `Did you mean: ${suggestions.map((s) => `"${s}"`).join(', ')}?\n\n`;
    }

    message += `Next step: Call records_discover_attributes with\n`;
    message += `  resource_type: "${resourceType}"\n`;
    message += `to see all valid attributes.`;

    return message;
  } catch {
    return (
      `Attribute "${invalidAttr}" does not exist on ${resourceType}.\n\n` +
      `Next step: Use records_discover_attributes to see valid attributes.`
    );
  }
};

/**
 * Attribute Not Found Enhancer
 * Uses Levenshtein distance to suggest similar attribute names
 */
export const attributeNotFoundEnhancer: ErrorEnhancer = {
  name: 'attribute-not-found',
  errorName: 'attribute_not_found',

  matches: (error: unknown, _context: CrudErrorContext): boolean => {
    const msg = error instanceof Error ? error.message : String(error);
    return msg.includes('Cannot find attribute with slug/ID');
  },

  enhance: async (
    error: unknown,
    context: CrudErrorContext
  ): Promise<string | null> => {
    return enhanceAttributeNotFoundError(error, context.resourceType);
  },
};
