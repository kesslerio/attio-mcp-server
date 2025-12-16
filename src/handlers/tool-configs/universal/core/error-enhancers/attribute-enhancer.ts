/**
 * Attribute Not Found Error Enhancer
 *
 * Detects "Cannot find attribute with slug/ID" errors and provides suggestions
 * using Levenshtein distance to find similar attribute names.
 */

import type { ErrorEnhancer, CrudErrorContext } from './types.js';
import type { UniversalResourceType } from '../../types.js';

/**
 * Calculate Levenshtein distance between two strings
 * Used for suggesting similar attribute names
 */
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
  target: string,
  candidates: string[],
  maxResults: number
): string[] => {
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
 */
async function enhance(
  error: unknown,
  context: CrudErrorContext
): Promise<string | null> {

  // Pattern: "Cannot find attribute with slug/ID "X"."
  if (!attrMatch) return null;


  try {
    // Fetch valid attributes and find similar ones
    const { handleUniversalDiscoverAttributes } = await import(
      '../../shared-handlers.js'
    );
      context.resourceType as UniversalResourceType
    );
      name?: string;
      title?: string;
      api_slug?: string;
    }>;
      .flatMap((a) => [a.name, a.title, a.api_slug])
      .filter(Boolean) as string[];

    // Find similar attribute names using Levenshtein distance

    let message = `Attribute "${invalidAttr}" does not exist on ${context.resourceType}.\n\n`;

    if (suggestions.length > 0) {
      message += `Did you mean: ${suggestions.map((s) => `"${s}"`).join(', ')}?\n\n`;
    }

    message += `Next step: Call records_discover_attributes with\n`;
    message += `  resource_type: "${context.resourceType}"\n`;
    message += `to see all valid attributes.`;

    return message;
  } catch {
    return (
      `Attribute "${invalidAttr}" does not exist on ${context.resourceType}.\n\n` +
      `Next step: Use records_discover_attributes to see valid attributes.`
    );
  }
}

function matches(error: unknown, _context: CrudErrorContext): boolean {
  return /Cannot find attribute with slug\/ID/.test(msg);
}

export const attributeNotFoundEnhancer: ErrorEnhancer = {
  name: 'attribute-not-found',
  matches,
  enhance,
  errorName: 'attribute_not_found',
};
