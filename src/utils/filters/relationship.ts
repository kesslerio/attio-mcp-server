/**
 * Relationship filtering utilities
 * These utilities help create filters based on relationships between records
 */

// External dependencies
import {
  FilterValidationError,
  ListRelationshipError,
  RelationshipFilterError,
} from '../../errors/api-errors.js';
// import { isValidListId } from "../../validation.js";
import { createEqualsFilter } from './builders.js';
import {
  cacheListFilter,
  cacheRelationshipFilter,
  getCachedListFilter,
  getCachedRelationshipFilter,
  hashFilters,
} from './cache.js';
// Internal module dependencies
import {
  ATTRIBUTES,
  FilterConditionType,
  ListEntryFilters,
  RelationshipFilterConfig,
  RelationshipRateLimitError,
  RelationshipType,
  ResourceType,
} from './types.js';

/**
 * Applies rate limiting to relationship queries
 * Throws RelationshipRateLimitError if the rate limit is exceeded
 *
 * @param req - Request object
 * @param relationshipType - Type of relationship query
 * @param isNested - Whether this is a nested relationship query
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function applyRateLimit(
  req: any,
  relationshipType: string,
  _isNested: boolean = false
): void {
  // Check the rate limit
  // TODO: Restore when checkRelationshipQueryRateLimit is available
  // const result = checkRelationshipQueryRateLimit(req, relationshipType, isNested);
  // If not allowed, throw rate limit error
  // if (!result.allowed) {
  //   throw new RelationshipRateLimitError(
  //     `Rate limit exceeded for ${isNested ? 'nested ' : ''}relationship query of type '${relationshipType}'. Try again in ${Math.ceil(result.msUntilReset / 1000)} seconds.`,
  //     relationshipType,
  //     result.resetTime,
  //     result.msUntilReset
  //   );
  // }
}

/**
 * Core function to create relationship-based filters
 * This translates our internal representation to the format expected by the Attio API
 *
 * @param config - Relationship filter configuration
 * @returns Filter in the format expected by Attio API
 */
function createRelationshipFilter(
  config: RelationshipFilterConfig
): ListEntryFilters {
  // Map our ResourceType to Attio API object names
  const getObjectName = (type: ResourceType): string => {
    switch (type) {
      case ResourceType.PEOPLE:
        return 'people';
      case ResourceType.COMPANIES:
        return 'companies';
      case ResourceType.LISTS:
        return 'lists';
      case ResourceType.RECORDS:
        return 'records';
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  };

  // The relationship field should be a custom attribute in the filter
  return {
    filters: [
      {
        attribute: {
          slug: ATTRIBUTES.RELATIONSHIP,
        },
        condition: FilterConditionType.EQUALS,
        value: {
          type: config.relationshipType,
          target: {
            object: getObjectName(config.targetType),
            filter: config.targetFilters,
          },
        },
      },
    ],
    matchAny: false,
  };
}

/**
 * Creates a filter for people based on their associated company attributes
 * Includes rate limiting for this resource-intensive operation
 *
 * @param companyFilter - Filters to apply to the related companies
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding people based on company attributes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createPeopleByCompanyFilter(
  companyFilter: ListEntryFilters,
  req?: any
): ListEntryFilters {
  try {
    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.WORKS_AT, false);
    }

    // Validate company filters
    if (
      !companyFilter ||
      !companyFilter.filters ||
      companyFilter.filters.length === 0
    ) {
      throw new RelationshipFilterError(
        'Company filter must contain at least one valid filter condition',
        ResourceType.PEOPLE.toString(),
        ResourceType.COMPANIES.toString(),
        RelationshipType.WORKS_AT
      );
    }

    // Create a relationship filter configuration
    const relationshipConfig: RelationshipFilterConfig = {
      sourceType: ResourceType.PEOPLE,
      targetType: ResourceType.COMPANIES,
      relationshipType: RelationshipType.WORKS_AT,
      targetFilters: companyFilter,
    };

    // Convert to an Attio API compatible filter
    return createRelationshipFilter(relationshipConfig);
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    // Check if it's already another specialized error
    if (error instanceof RelationshipFilterError) {
      throw error;
    }

    // Otherwise, wrap in a FilterValidationError
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create people-by-company filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for companies based on their associated people attributes
 * Includes rate limiting for this resource-intensive operation
 *
 * @param peopleFilter - Filters to apply to the related people
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding companies based on people attributes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createCompaniesByPeopleFilter(
  peopleFilter: ListEntryFilters,
  req?: any
): ListEntryFilters {
  try {
    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.EMPLOYS, false);
    }

    // Validate people filters
    if (
      !peopleFilter ||
      !peopleFilter.filters ||
      peopleFilter.filters.length === 0
    ) {
      throw new RelationshipFilterError(
        'People filter must contain at least one valid filter condition',
        ResourceType.COMPANIES.toString(),
        ResourceType.PEOPLE.toString(),
        RelationshipType.EMPLOYS
      );
    }

    // Create a relationship filter configuration
    const relationshipConfig: RelationshipFilterConfig = {
      sourceType: ResourceType.COMPANIES,
      targetType: ResourceType.PEOPLE,
      relationshipType: RelationshipType.EMPLOYS,
      targetFilters: peopleFilter,
    };

    // Convert to an Attio API compatible filter
    return createRelationshipFilter(relationshipConfig);
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    // Check if it's already another specialized error
    if (error instanceof RelationshipFilterError) {
      throw error;
    }

    // Otherwise, wrap in a FilterValidationError
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create companies-by-people filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for records that belong to a specific list
 * Includes rate limiting for this operation and caching for better performance
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param listId - The ID of the list to filter by
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding records that belong to the list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createRecordsByListFilter(
  resourceType: ResourceType,
  listId: string,
  req?: any,
  useCache: boolean = true
): ListEntryFilters {
  try {
    // Check cache first if caching is enabled
    if (useCache) {
      const cachedFilter = getCachedListFilter(listId, resourceType);
      if (cachedFilter) {
        return cachedFilter;
      }
    }

    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.BELONGS_TO_LIST, false);
    }

    // Validate list ID format and security using imported function

    // Validate list ID format and security
    // TODO: Fix import issue with validation.js
    if (!listId || !/^list_[a-zA-Z0-9]+$/.test(listId)) {
      throw new ListRelationshipError(
        'Invalid list ID format. Expected format: list_[alphanumeric]',
        resourceType.toString(),
        listId
      );
    }

    // Create a relationship filter configuration
    const relationshipConfig: RelationshipFilterConfig = {
      sourceType: resourceType,
      targetType: ResourceType.LISTS,
      relationshipType: RelationshipType.BELONGS_TO_LIST,
      targetFilters: createEqualsFilter(ATTRIBUTES.LIST_ID, listId),
    };

    // Convert to an Attio API compatible filter
    const result = createRelationshipFilter(relationshipConfig);

    // Cache the result if caching is enabled
    if (useCache) {
      cacheListFilter(listId, resourceType, result);
    }

    return result;
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    // Check if it's already another specialized error
    if (
      error instanceof ListRelationshipError ||
      error instanceof RelationshipFilterError
    ) {
      throw error;
    }

    // Otherwise, wrap in a FilterValidationError
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create records-by-list filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for finding people who work at companies in a specific list
 * This is a nested relationship query with rate limiting and caching applied
 *
 * @param listId - The ID of the list that contains companies
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding people who work at companies in the specified list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createPeopleByCompanyListFilter(
  listId: string,
  req?: any,
  useCache: boolean = true
): ListEntryFilters {
  try {
    // Create a cache key for this nested relationship
    const cacheKey = {
      relationshipType: RelationshipType.WORKS_AT,
      sourceType: ResourceType.PEOPLE,
      targetType: ResourceType.COMPANIES,
      targetFilterHash: '', // Will be set later
      listId: listId,
      isNested: true,
    };

    // Check cache first if caching is enabled
    if (useCache) {
      const cachedFilter = getCachedRelationshipFilter(cacheKey);
      if (cachedFilter) {
        return cachedFilter;
      }
    }

    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.WORKS_AT, true);
    }

    // Validate list ID format and security using imported function

    // Validate list ID format and security
    // TODO: Fix import issue with validation.js
    if (!listId || !/^list_[a-zA-Z0-9]+$/.test(listId)) {
      throw new Error(
        'Invalid list ID format. Expected format: list_[alphanumeric]'
      );
    }

    // First, create a filter for companies in the list
    const companiesInListFilter = createRecordsByListFilter(
      ResourceType.COMPANIES,
      listId,
      undefined,
      useCache
    );

    // Update cache key with the hash of the target filter
    cacheKey.targetFilterHash = hashFilters(companiesInListFilter);

    // Then, create a filter for people who work at those companies
    const result = createPeopleByCompanyFilter(companiesInListFilter);

    // Cache the result if caching is enabled
    if (useCache) {
      cacheRelationshipFilter(cacheKey, result);
    }

    return result;
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create people-by-company-list filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for finding companies that have people in a specific list
 * This is a nested relationship query with rate limiting and caching applied
 *
 * @param listId - The ID of the list that contains people
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding companies that have people in the specified list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createCompaniesByPeopleListFilter(
  listId: string,
  req?: any,
  useCache: boolean = true
): ListEntryFilters {
  try {
    // Create a cache key for this nested relationship
    const cacheKey = {
      relationshipType: RelationshipType.EMPLOYS,
      sourceType: ResourceType.COMPANIES,
      targetType: ResourceType.PEOPLE,
      targetFilterHash: '', // Will be set later
      listId: listId,
      isNested: true,
    };

    // Check cache first if caching is enabled
    if (useCache) {
      const cachedFilter = getCachedRelationshipFilter(cacheKey);
      if (cachedFilter) {
        return cachedFilter;
      }
    }

    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.EMPLOYS, true);
    }

    // Validate list ID format and security using imported function

    // Validate list ID format and security
    // TODO: Fix import issue with validation.js
    if (!listId || !/^list_[a-zA-Z0-9]+$/.test(listId)) {
      throw new Error(
        'Invalid list ID format. Expected format: list_[alphanumeric]'
      );
    }

    // First, create a filter for people in the list
    const peopleInListFilter = createRecordsByListFilter(
      ResourceType.PEOPLE,
      listId,
      undefined,
      useCache
    );

    // Update cache key with the hash of the target filter
    cacheKey.targetFilterHash = hashFilters(peopleInListFilter);

    // Then, create a filter for companies that have those people
    const result = createCompaniesByPeopleFilter(peopleInListFilter);

    // Cache the result if caching is enabled
    if (useCache) {
      cacheRelationshipFilter(cacheKey, result);
    }

    return result;
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create companies-by-people-list filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for records that have associated notes matching criteria
 * Includes rate limiting for text search operations
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param textSearch - Text to search for in the notes
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding records with matching notes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export function createRecordsByNotesFilter(
  resourceType: ResourceType,
  textSearch: string,
  req?: any
): ListEntryFilters {
  try {
    // Apply rate limiting if request object is provided
    if (req) {
      applyRateLimit(req, RelationshipType.HAS_NOTE, false);
    }

    if (!textSearch || textSearch.trim() === '') {
      throw new Error('Text search query must be provided');
    }

    // Create a relationship filter configuration
    const relationshipConfig: RelationshipFilterConfig = {
      sourceType: resourceType,
      targetType: ResourceType.LISTS, // Notes don't have a ResourceType, using LISTS as a placeholder
      relationshipType: RelationshipType.HAS_NOTE,
      targetFilters: {
        filters: [
          {
            attribute: { slug: ATTRIBUTES.NOTE_CONTENT },
            condition: FilterConditionType.CONTAINS,
            value: textSearch,
          },
        ],
        matchAny: false,
      },
    };

    // Convert to an Attio API compatible filter
    return createRelationshipFilter(relationshipConfig);
  } catch (error) {
    // Re-throw if it's already a rate limit error
    if (error instanceof RelationshipRateLimitError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create records-by-notes filter: ${errorMessage}`
    );
  }
}
