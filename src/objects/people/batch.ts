/**
 * Batch operations for People
 */
import { getAttioClient } from "../../api/attio-client.js";
import { 
  batchSearchObjects,
  batchGetObjectDetails,
  BatchConfig,
  BatchResponse
} from "../../api/operations/index.js";
import { ResourceType, Person } from "../../types/attio.js";
import { FilterValidationError } from "../../errors/api-errors.js";
import { isValidId } from "../../utils/validation.js";

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

    return await batchSearchObjects<Person>(
      ResourceType.PEOPLE,
      queries,
      config
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(`Batch search validation failed: ${errorMessage}`);
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

    return await batchGetObjectDetails<Person>(
      ResourceType.PEOPLE,
      personIds,
      config
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(`Batch get details validation failed: ${errorMessage}`);
    }
    throw new Error(`Failed to batch get people details: ${errorMessage}`);
  }
}