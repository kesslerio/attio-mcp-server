/**
 * Relationship queries for People
 */
import { FilterValidationError } from '../../errors/api-errors.js';
import { getAttioClient } from '../../api/attio-client.js';
import { isValidId, isValidListId } from '../../utils/validation.js';
import { ResourceType, Person } from '../../types/attio.js';

/**
 * Searches for people associated with a specific company
 *
 * @param companyId - ID of the company to search for
 * @returns Array of people associated with the company
 */
export async function searchPeopleByCompany(
  companyId: string
): Promise<Person[]> {
  try {
    if (!isValidId(companyId)) {
      throw new FilterValidationError(`Invalid company ID: ${companyId}`);
    }

    // Use direct API call with correct Attio filter structure for record references
    // Attio expects company.target_record_id.$eq format for filtering people by company

      company: {
        target_record_id: {
          $eq: companyId,
        },
      },
    };

      '/objects/people/records/query',
      {
        filter,
        limit: 50,
      }
    );

    return response.data.data || [];
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Company relationship validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by company: ${errorMessage}`);
  }
}

/**
 * Searches for people in specific company lists
 *
 * @param listIds - Array of list IDs to search within
 * @returns Array of people in the specified lists
 */
export async function searchPeopleByCompanyList(
  listIds: string[]
): Promise<Person[]> {
  try {
    if (!Array.isArray(listIds) || listIds.length === 0) {
      throw new FilterValidationError('Must provide at least one list ID');
    }

    // Validate list IDs
    for (const listId of listIds) {
      if (!isValidListId(listId)) {
        throw new FilterValidationError(`Invalid list ID '${listId}'`);
      }
    }

    // Handle multiple lists by combining filters
    let filters: ListEntryFilters;
    if (listIds.length === 1) {
      filters = createPeopleByCompanyListFilter(listIds[0]);
    } else {
      // Create OR filter for multiple lists
        createPeopleByCompanyListFilter(listId)
      );
      filters = {
        filters: [],
        matchAny: true,
        ...listFilters[0],
      };
      // Merge all filters
      for (const filter of listFilters) {
        if (filter.filters) {
          filters.filters!.push(...filter.filters);
        }
      }
    }
      ResourceType.PEOPLE,
      filters
    );

    return response;
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `List relationship validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by company list: ${errorMessage}`);
  }
}

/**
 * Searches for people with notes containing specific text
 *
 * @param searchText - Text to search for in notes
 * @returns Array of people with matching notes
 */
export async function searchPeopleByNotes(
  searchText: string
): Promise<Person[]> {
  try {
    if (!searchText || searchText.trim().length === 0) {
      throw new FilterValidationError('Search text cannot be empty');
    }

      ResourceType.PEOPLE,
      filters
    );

    return response;
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Notes search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by notes: ${errorMessage}`);
  }
}
