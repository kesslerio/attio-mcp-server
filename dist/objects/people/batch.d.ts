import { BatchConfig, BatchResponse } from "../../api/operations/index.js";
import { Person } from "../../types/attio.js";
/**
 * Performs batch search operations on people
 * Searches for multiple people using different queries
 *
 * @param queries - Array of search queries
 * @param config - Optional batch configuration
 * @returns BatchResponse with results and errors for each query
 */
export declare function batchSearchPeople(queries: string[], config?: BatchConfig): Promise<BatchResponse<Person[]>>;
/**
 * Performs batch detail retrieval for multiple people
 * Gets detailed information for multiple people by their IDs
 *
 * @param personIds - Array of person IDs
 * @param config - Optional batch configuration
 * @returns BatchResponse with details and errors for each person
 */
export declare function batchGetPeopleDetails(personIds: string[], config?: BatchConfig): Promise<BatchResponse<Person>>;
//# sourceMappingURL=batch.d.ts.map