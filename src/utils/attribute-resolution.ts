/**
 * Centralized attribute resolution utilities
 * Implements exact → partial → typo matching strategy for attribute lookup
 *
 * Issue #994: Extracted from shared-handlers to provide consistent
 * attribute resolution with documented thresholds
 */

import {
  levenshteinDistance,
  findSimilarStrings,
  SIMILARITY_THRESHOLDS,
} from './string-similarity.js';

/**
 * Attribute schema interface
 * Represents the structure of Attio attribute metadata
 */
export interface AttributeSchema {
  name?: string;
  title?: string;
  api_slug?: string;
}

/**
 * Normalize attribute value for comparison
 * Trims whitespace and converts to lowercase
 *
 * @param value - The value to normalize
 * @returns Normalized string
 */
export function normalizeAttributeValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Attribute resolution result
 */
export interface AttributeResolutionResult {
  /** The resolved API slug, or null if not found */
  slug: string | null;
  /** The matching strategy used: 'exact', 'partial', 'typo', or 'none' */
  matchType: 'exact' | 'partial' | 'typo' | 'none';
  /** Levenshtein distance for typo matches */
  distance?: number;
}

/**
 * Resolve attribute display name to API slug using three-stage strategy:
 * 1. Exact match: Check for exact match in title, name, or api_slug
 * 2. Partial match: Check for substring containment in either direction
 * 3. Typo tolerance: Use Levenshtein distance (≤ 2) to find close matches
 *
 * @param displayName - The display name or slug to resolve
 * @param attributeSchemas - Array of attribute schema objects
 * @returns Resolution result with slug and match type
 *
 * @example
 * resolveAttribute('Deal stage', schemas)
 * // Returns { slug: 'stage', matchType: 'exact' }
 *
 * resolveAttribute('stag', schemas)
 * // Returns { slug: 'stage', matchType: 'typo', distance: 1 }
 */
export function resolveAttribute(
  displayName: string,
  attributeSchemas: AttributeSchema[]
): AttributeResolutionResult {

  // Stage 1: Exact match
    return candidates.some(
      (candidate) =>
        normalizeAttributeValue(candidate as string) === normalizedInput
    );
  });

  if (exactMatch?.api_slug) {
    return {
      slug: exactMatch.api_slug,
      matchType: 'exact',
    };
  }

  // Stage 2: Partial match (substring containment)

    return (
      (title && title.includes(normalizedInput)) ||
      (slug && slug.includes(normalizedInput)) ||
      (title && normalizedInput.includes(title)) ||
      (slug && normalizedInput.includes(slug))
    );
  });

  if (partialMatch?.api_slug) {
    return {
      slug: partialMatch.api_slug,
      matchType: 'partial',
    };
  }

  // Stage 3: Typo tolerance (Levenshtein distance)
    .filter((attr) => attr.api_slug)
    .map((attr) => {

      // Calculate minimum distance between input and both slug and title
        levenshteinDistance(normalizedInput, normalizeAttributeValue(slug)),
        levenshteinDistance(
          normalizedInput,
          normalizeAttributeValue(title as string)
        )
      );

      return {
        slug,
        distance,
      };
    })
    .filter(
      (candidate) =>
        candidate.distance <= SIMILARITY_THRESHOLDS.MAX_TYPO_DISTANCE
    )
    .sort((a, b) => a.distance - b.distance);

  if (typoCandidates.length > 0) {
    return {
      slug: typoCandidates[0].slug,
      matchType: 'typo',
      distance: typoCandidates[0].distance,
    };
  }

  // No match found
  return {
    slug: null,
    matchType: 'none',
  };
}

/**
 * Get similar attribute slugs for suggestion purposes
 * Combines partial matching and distance-based similarity
 *
 * @param attribute - The attribute name to find suggestions for
 * @param attributeSchemas - Array of attribute schema objects
 * @param maxResults - Maximum number of suggestions to return (default: 3)
 * @returns Array of suggested attribute slugs
 *
 * @example
 * getSimilarAttributes('stag', schemas, 3)
 * // Returns ['stage', 'status', 'state']
 */
export function getSimilarAttributes(
  attribute: string,
  attributeSchemas: AttributeSchema[],
  maxResults: number = 3
): string[] {

  // Find partial matches first (substring containment)
    .filter((attr) => attr.api_slug)
    .filter((attr) => {

      return (
        title.includes(normalizedInput) ||
        slug.includes(normalizedInput) ||
        normalizedInput.includes(title) ||
        normalizedInput.includes(slug)
      );
    })
    .map((attr) => attr.api_slug as string);

  // Find distance-based matches
    .map((attr) => attr.api_slug)
    .filter(Boolean) as string[];

    .map((attr) => attr.title || attr.name)
    .filter(Boolean) as string[];

    attribute,
    [...allSlugs, ...allTitles],
    {
      maxResults,
      maxDistance: SIMILARITY_THRESHOLDS.MAX_SUGGESTION_DISTANCE,
    }
  );

  // Map titles back to slugs
    .map((match) => {
      // If it's already a slug, return it
      if (allSlugs.includes(match)) {
        return match;
      }
      // Otherwise, find the attribute with this title
        (a) => a.title === match || a.name === match
      );
      return attr?.api_slug || null;
    })
    .filter(Boolean) as string[];

  // Combine and deduplicate, preserving order (partials first)
  const unique: string[] = [];

  for (const slug of combined) {
    if (!unique.includes(slug)) {
      unique.push(slug);
    }
  }

  return unique.slice(0, maxResults);
}

/**
 * Next step hint template for consistent error messaging
 * Used when attribute is not found
 *
 * @param resourceType - The resource type (e.g., 'companies', 'deals')
 * @returns Formatted next step hint
 */
export function formatNextStepHint(resourceType: string): string {
  return (
    `Next step: Call records_discover_attributes with\n` +
    `  resource_type: "${resourceType}"\n` +
    `to see all valid attributes.`
  );
}

/**
 * Format attribute not found error with suggestions
 *
 * @param attribute - The invalid attribute
 * @param resourceType - The resource type
 * @param suggestions - Array of suggested attributes
 * @returns Formatted error message
 */
export function formatAttributeNotFoundError(
  attribute: string,
  resourceType: string,
  suggestions: string[]
): string {
  let message = `Attribute "${attribute}" does not exist on ${resourceType}.\n\n`;

  if (suggestions.length > 0) {
    message += `Did you mean: ${suggestions.map((s) => `"${s}"`).join(', ')}?\n\n`;
  }

  message += formatNextStepHint(resourceType);

  return message;
}
