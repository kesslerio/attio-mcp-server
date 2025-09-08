/**
 * Filter translation functionality for converting attribute names in filters
 */
import { getAttributeSlug } from './attribute-mappers.js';

  // Handle array of filters
  if (Array.isArray(filters)) {
    return filters.map((filter) =>
      translateAttributeNamesInFilters(filter, objectType)
    );
  }

  // Deep clone the filters object to avoid modifying the original

  // Handle direct filter objects with attribute.slug
  if (isDirectFilterObject(translatedFilters)) {
    return translateDirectFilter(translatedFilters, objectType);
  }

  // Handle nested filter structures
  if (hasNestedFilters(translatedFilters)) {
    translatedFilters.filters = translateNestedFilters(
      translatedFilters.filters,
      objectType
    );
  }

  // Process all other properties recursively
  return translateRemainingProperties(translatedFilters, objectType);
}

/**
 * Checks if an object is a direct filter with attribute.slug
 */
function isDirectFilterObject(filter: unknown): boolean {
  return filter.attribute && filter.attribute.slug;
}

/**
 * Translates a direct filter object
 */
function translateDirectFilter(filter: unknown, objectType?: string): unknown {
  // Determine the object type to use for translation
  // Priority: filter's own objectType > parent objectType

  // Create a new object with translated slug
  return {
    ...filter,
    attribute: {
      ...filter.attribute,
      slug: getAttributeSlug(filter.attribute.slug, typeToUse),
    },
  };
}

/**
 * Checks if an object has nested filters
 */
function hasNestedFilters(filter: unknown): boolean {
  return filter.filters && Array.isArray(filter.filters);
}

/**
 * Translates nested filters
 */
function translateNestedFilters(
  filters: unknown[],
  objectType?: string
): unknown[] {
  return filters.map((filter: unknown) => {
    if (isDirectFilterObject(filter)) {
      // Determine the object type to use for this specific filter

      // Translate the attribute slug if it's a human-readable name
      return translateDirectFilter(filter, typeToUse);
    }
    return translateAttributeNamesInFilters(filter, objectType);
  });
}

/**
 * Translates remaining properties in the filter object
 */
function translateRemainingProperties(filter: unknown, objectType?: string): unknown {
  for (const key of Object.keys(filter)) {
    if (typeof filter[key] === 'object' && filter[key] !== null) {
      // Special handling for object-specific sections

      filter[key] = translateAttributeNamesInFilters(filter[key], typeToUse);
    }
  }

  return filter;
}

/**
 * Determines the object type context for a property
 */
function determineObjectTypeContext(
  key: string,
  filter: unknown,
  parentObjectType?: string
): string | undefined {
  // If this key is an object type (companies, people), use it as the type context
  if (key === 'companies' || key === 'people') {
    return key;
  }

  // If this is a resource-specific section with explicit object type, use that
  if (filter.objectType) {
    return filter.objectType;
  }

  // Otherwise use the parent context
  return parentObjectType;
}
