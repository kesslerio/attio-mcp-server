import { BatchConfig, BatchResponse, ListEntryFilters } from "../api/attio-operations.js";
import { Person, AttioNote, DateRange, InteractionType, ActivityFilter } from "../types/attio.js";
import { PaginatedResponse } from "../utils/pagination.js";
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
/**
 * Advanced search for people with filter capabilities
 *
 * @param filters - Filters to apply to the search
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @param returnPaginated - Whether to return paginated results (default: false)
 * @param page - Current page number, used when returnPaginated is true (default: 1)
 * @returns Array of matching people or paginated response
 */
export declare function advancedSearchPeople(filters?: ListEntryFilters, limit?: number, offset?: number, returnPaginated?: boolean, page?: number): Promise<Person[] | PaginatedResponse<Person>>;
/**
 * Search for people by creation date
 *
 * @param dateRange - Date range to filter by (when people were created)
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByCreationDate(dateRange: DateRange | string | any, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people by last modification date
 *
 * @param dateRange - Date range to filter by (when people were last modified)
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByModificationDate(dateRange: DateRange | string | any, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people by last interaction date
 *
 * @param dateRange - Date range to filter by (when the last interaction occurred)
 * @param interactionType - Optional type of interaction to filter by
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByLastInteraction(dateRange: DateRange | string | any, interactionType?: InteractionType | string, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people by activity history
 * Combines date range and interaction type filters
 *
 * @param activityFilter - Activity filter configuration
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByActivity(activityFilter: ActivityFilter | string | any, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people based on attributes of their associated companies
 *
 * @param companyFilter - Filter to apply to companies
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByCompany(companyFilter: ListEntryFilters | string | any, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people who work at companies in a specific list
 *
 * @param listId - ID of the list containing companies
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByCompanyList(listId: string, limit?: number | string, offset?: number | string): Promise<Person[]>;
/**
 * Search for people that have notes containing specific text
 *
 * @param searchText - Text to search for in notes
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export declare function searchPeopleByNotes(searchText: string, limit?: number | string, offset?: number | string): Promise<Person[]>;
//# sourceMappingURL=people.d.ts.map