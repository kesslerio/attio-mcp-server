/**
 * Batch operations for People
 */
import { getAttioClient } from "../../api/attio-client.js";
import { batchSearchObjects, batchGetObjectDetails } from "../../api/operations/index.js";
import { ResourceType } from "../../types/attio.js";
import { FilterValidationError } from "../../errors/api-errors.js";
/**
 * Performs batch search operations on people
 * Searches for multiple people using different queries
 *
 * @param queries - Array of search queries
 * @param config - Optional batch configuration
 * @returns BatchResponse with results and errors for each query
 */
export async function batchSearchPeople(queries, config) {
    try {
        // Validate queries
        if (!Array.isArray(queries) || queries.length === 0) {
            throw new FilterValidationError('Must provide at least one search query');
        }
        const api = getAttioClient();
        for (const query of queries) {
            const error = api.validateQuery(query);
            if (error) {
                throw new FilterValidationError(`Invalid query '${query}': ${error}`);
            }
        }
        return await batchSearchObjects(ResourceType.PEOPLE, queries, config);
    }
    catch (error) {
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
export async function batchGetPeopleDetails(personIds, config) {
    try {
        // Validate person IDs
        if (!Array.isArray(personIds) || personIds.length === 0) {
            throw new FilterValidationError('Must provide at least one person ID');
        }
        const api = getAttioClient();
        for (const personId of personIds) {
            const error = await api.validateObjectId(ResourceType.PEOPLE, personId);
            if (error) {
                throw new FilterValidationError(`Invalid person ID '${personId}': ${error}`);
            }
        }
        return await batchGetObjectDetails(ResourceType.PEOPLE, personIds, config);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('validation')) {
            throw new FilterValidationError(`Batch get details validation failed: ${errorMessage}`);
        }
        throw new Error(`Failed to batch get people details: ${errorMessage}`);
    }
}
//# sourceMappingURL=batch.js.map