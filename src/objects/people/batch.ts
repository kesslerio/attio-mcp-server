/**
 * Batch operations for People
 */
import { FilterValidationError } from '../../errors/api-errors.js';
import { getPersonDetails } from './basic.js';
import { isValidId } from '../../utils/validation.js';
import { ResourceType, Person } from '../../types/attio.js';
import { searchPeople } from './search.js';

/**
 * Performs batch search operations on people
 * Searches for multiple people using different queries
 *
 * @param queries - Array of search queries
 * @param config - Optional batch configuration
 * @returns BatchResponse with results and errors for each query
 */
export async function batchSearchPeople(
  queries: string[],
  config?: BatchConfig
): Promise<BatchResponse<Person[]>> {
  try {
    // Validate queries
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new FilterValidationError('Must provide at least one search query');
    }

    for (const query of queries) {
      if (!query || query.trim().length === 0) {
        throw new FilterValidationError(`Invalid query: cannot be empty`);
      }
      if (query.length > 1000) {
        throw new FilterValidationError(`Invalid query '${query}': too long`);
      }
    }

    try {
      return await batchSearchObjects<Person>(
        ResourceType.PEOPLE,
        queries,
        config
      );
    } catch (batchError) {
      // Fallback to individual searches
      let succeeded = 0;
      let failed = 0;

      for (const query of queries) {
        try {
          results.push({
            query,
            data: searchResults,
            success: true,
          });
          succeeded++;
        } catch (searchError) {
          results.push({
            query,
            error:
              searchError instanceof Error
                ? searchError
                : new Error(String(searchError)),
            success: false,
          });
          failed++;
        }
      }

      return {
        results,
        summary: {
          total: queries.length,
          succeeded,
          failed,
        },
      };
    }
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Batch search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to batch search people: ${errorMessage}`);
  }
}

/**
 * Performs batch detail retrieval for multiple people
 * Gets detailed information for multiple people by their IDs
 *
 * @param personIds - Array of person IDs
 * @param config - Optional batch configuration
 * @returns BatchResponse with details and errors for each person
 */
export async function batchGetPeopleDetails(
  personIds: string[],
  config?: BatchConfig
): Promise<BatchResponse<Person>> {
  try {
    // Validate person IDs
    if (!Array.isArray(personIds) || personIds.length === 0) {
      throw new FilterValidationError('Must provide at least one person ID');
    }

    for (const personId of personIds) {
      if (!isValidId(personId)) {
        throw new FilterValidationError(`Invalid person ID '${personId}'`);
      }
    }

    try {
      return await batchGetObjectDetails<Person>(
        ResourceType.PEOPLE,
        personIds,
        config
      );
    } catch (batchError) {
      // Fallback to individual detail retrieval
      let succeeded = 0;
      let failed = 0;

      for (const personId of personIds) {
        try {
          results.push({
            id: personId,
            data: personDetails,
            success: true,
          });
          succeeded++;
        } catch (detailError) {
          results.push({
            id: personId,
            error:
              detailError instanceof Error
                ? detailError
                : new Error(String(detailError)),
            success: false,
          });
          failed++;
        }
      }

      return {
        results,
        summary: {
          total: personIds.length,
          succeeded,
          failed,
        },
      };
    }
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Batch get details validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to batch get people details: ${errorMessage}`);
  }
}
