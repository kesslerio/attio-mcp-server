import { BatchConfig, BatchResponse } from "../api/attio-operations.js";
import { Person, AttioNote } from "../types/attio.js";
/**
 * Searches for people by name, email, or phone number
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export declare function searchPeople(query: string): Promise<Person[]>;
/**
 * Searches for people by name, email, or phone number using an OR filter
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export declare function searchPeopleByQuery(query: string): Promise<Person[]>;
/**
 * Searches specifically for people by email
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export declare function searchPeopleByEmail(email: string): Promise<Person[]>;
/**
 * Searches specifically for people by phone number
 *
 * @param phone - Phone number to search for
 * @returns Array of person results
 */
export declare function searchPeopleByPhone(phone: string): Promise<Person[]>;
/**
 * Lists people sorted by most recent interaction
 *
 * @param limit - Maximum number of people to return (default: 20)
 * @returns Array of person results
 */
export declare function listPeople(limit?: number): Promise<Person[]>;
/**
 * Gets details for a specific person
 *
 * @param personId - The ID of the person
 * @returns Person details
 */
export declare function getPersonDetails(personId: string): Promise<Person>;
/**
 * Gets notes for a specific person
 *
 * @param personId - The ID of the person
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export declare function getPersonNotes(personId: string, limit?: number, offset?: number): Promise<AttioNote[]>;
/**
 * Creates a note for a specific person
 *
 * @param personId - The ID of the person
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export declare function createPersonNote(personId: string, title: string, content: string): Promise<AttioNote>;
/**
 * Performs batch searches for people by name, email, or phone
 *
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export declare function batchSearchPeople(queries: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Person[]>>;
/**
 * Gets details for multiple people in batch
 *
 * @param personIds - Array of person IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with person details for each ID
 */
export declare function batchGetPeopleDetails(personIds: string[], batchConfig?: Partial<BatchConfig>): Promise<BatchResponse<Person>>;
//# sourceMappingURL=people.d.ts.map