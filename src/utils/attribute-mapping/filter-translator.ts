/**
 * Filter translation functionality for converting attribute names in filters
 */
import { getAttributeSlug } from './attribute-mappers.js';

/**
 * Processes a filter structure to translate any human-readable attribute names to their slug equivalents
 *
 * @param filters - The filters object possibly containing human-readable attribute names
 * @param objectType - Optional object type for more specific attribute mapping
 * @returns A new filters object with attribute names translated to slugs where applicable
 */
export function translateAttributeNamesInFilters(
  filters: any,
  objectType?: string
): any {
  // Handle null, undefined, or non-object filters
  if (!filters || typeof filters !== 'object') {
    return filters;
  }

  // Handle array of filters
  if (Array.isArray(filters)) {
    return filters.map((filter) =>
      translateAttributeNamesInFilters(filter, objectType)
    );
  }

  // Deep clone the filters object to avoid modifying the original
  const translatedFilters = { ...filters };

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
function isDirectFilterObject(filter: any): boolean {
  return filter.attribute && filter.attribute.slug;
}

/**
 * Translates a direct filter object
 */
function translateDirectFilter(filter: any, objectType?: string): any {
  // Determine the object type to use for translation
  // Priority: filter's own objectType > passed objectType > parent objectType
  const typeToUse = filter.objectType || objectType;

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
function hasNestedFilters(filter: any): boolean {
  return filter.filters && Array.isArray(filter.filters);
}

/**
 * Translates nested filters
 */
function translateNestedFilters(filters: any[], objectType?: string): any[] {
  return filters.map((filter: any) => {
    if (isDirectFilterObject(filter)) {
      // Determine the object type to use for this specific filter
      const typeToUse = filter.objectType || objectType;

      // Translate the attribute slug if it's a human-readable name
      return translateDirectFilter(filter, typeToUse);
    }
    return translateAttributeNamesInFilters(filter, objectType);
  });
}

/**
 * Translates remaining properties in the filter object
 */
function translateRemainingProperties(filter: any, objectType?: string): any {
  for (const key of Object.keys(filter)) {
    if (typeof filter[key] === 'object' && filter[key] !== null) {
      // Special handling for object-specific sections
      const typeToUse = determineObjectTypeContext(key, filter, objectType);

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
  filter: any,
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
