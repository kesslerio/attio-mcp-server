/**
 * Relationship utility functions for working with related records in Attio
 * Provides functions for creating filters based on relationships between records.
 */
import { ListEntryFilters } from '../api/operations/index.js';
import {
  FilterConditionType,
  RelationshipType,
  ResourceType,
} from '../types/attio.js';

// Re-export RelationshipType for convenience
export { RelationshipType };

import {
  FilterValidationError,
  ListRelationshipError,
  RelationshipFilterError,
} from '../errors/api-errors.js';
import { createEqualsFilter } from './filters/index.js';
import { isValidListId } from './validation.js';

/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
  // The source record type
  sourceType: ResourceType;

  // The target record type
  targetType: ResourceType;

  // The relationship type connecting the records
  relationshipType: RelationshipType;

  // Filters to apply to the target records
  targetFilters: ListEntryFilters;
}

/**
 * Creates a filter for people based on their associated company attributes
 *
 * @param companyFilter - Filters to apply to the related companies
 * @returns Filter for finding people based on company attributes
 */
export function createPeopleByCompanyFilter(
  companyFilter: ListEntryFilters
): ListEntryFilters {
  try {
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
    // Check if it's already a specialized error
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
 *
 * @param peopleFilter - Filters to apply to the related people
 * @returns Filter for finding companies based on people attributes
 */
export function createCompaniesByPeopleFilter(
  peopleFilter: ListEntryFilters
): ListEntryFilters {
  try {
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
    // Check if it's already a specialized error
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
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param listId - The ID of the list to filter by
 * @returns Filter for finding records that belong to the list
 */
export function createRecordsByListFilter(
  resourceType: ResourceType,
  listId: string
): ListEntryFilters {
  try {
    // Validate list ID format and security
    if (!listId || !isValidListId(listId)) {
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
      targetFilters: createEqualsFilter('list_id', listId),
    };

    // Convert to an Attio API compatible filter
    return createRelationshipFilter(relationshipConfig);
  } catch (error) {
    // Check if it's already a specialized error
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
 *
 * @param listId - The ID of the list that contains companies
 * @returns Filter for finding people who work at companies in the specified list
 */
export function createPeopleByCompanyListFilter(
  listId: string
): ListEntryFilters {
  try {
    // Validate list ID format and security
    if (!listId || !isValidListId(listId)) {
      throw new Error(
        'Invalid list ID format. Expected format: list_[alphanumeric]'
      );
    }

    // First, create a filter for companies in the list
    const companiesInListFilter = createRecordsByListFilter(
      ResourceType.COMPANIES,
      listId
    );

    // Then, create a filter for people who work at those companies
    return createPeopleByCompanyFilter(companiesInListFilter);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create people-by-company-list filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for finding companies that have people in a specific list
 *
 * @param listId - The ID of the list that contains people
 * @returns Filter for finding companies that have people in the specified list
 */
export function createCompaniesByPeopleListFilter(
  listId: string
): ListEntryFilters {
  try {
    // Validate list ID format and security
    if (!listId || !isValidListId(listId)) {
      throw new Error(
        'Invalid list ID format. Expected format: list_[alphanumeric]'
      );
    }

    // First, create a filter for people in the list
    const peopleInListFilter = createRecordsByListFilter(
      ResourceType.PEOPLE,
      listId
    );

    // Then, create a filter for companies that have those people
    return createCompaniesByPeopleFilter(peopleInListFilter);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create companies-by-people-list filter: ${errorMessage}`
    );
  }
}

/**
 * Creates a filter for records that have associated notes matching criteria
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param textSearch - Text to search for in the notes
 * @returns Filter for finding records with matching notes
 */
export function createRecordsByNotesFilter(
  resourceType: ResourceType,
  textSearch: string
): ListEntryFilters {
  try {
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
            attribute: { slug: 'note_content' },
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(
      `Failed to create records-by-notes filter: ${errorMessage}`
    );
  }
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
  // The structure we're aiming for in the Attio API format:
  // {
  //   "$relationship": {
  //     "type": "works_at",
  //     "target": {
  //       "object": "companies",
  //       "filter": { /* target filters */ }
  //     }
  //   }
  // }

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
          slug: '$relationship',
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
