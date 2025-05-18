import { ListEntryFilters } from "../../api/operations/index.js";
import { Person, DateRange, InteractionType, ActivityFilter } from "../../types/attio.js";
import { PaginatedResponse } from "../../utils/pagination.js";
/**
 * Searches for people by name, email, or phone number
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export declare function searchPeople(query: string): Promise<Person[]>;
/**
 * Searches for people using query (alias for searchPeople)
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export declare function searchPeopleByQuery(query: string): Promise<Person[]>;
/**
 * Searches for people by email address
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export declare function searchPeopleByEmail(email: string): Promise<Person[]>;
/**
 * Searches for people by phone number
 *
 * @param phone - Phone number to search for
 * @returns Array of person results
 */
export declare function searchPeopleByPhone(phone: string): Promise<Person[]>;
/**
 * getPersonByEmail (alias for searchPeopleByEmail)
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export declare function getPersonByEmail(email: string): Promise<Person[]>;
/**
 * Searches people using advanced filter criteria
 *
 * @param filters - Filter criteria including attribute filters, date ranges, etc.
 * @param options - Optional search configuration including pagination
 * @returns Array of person results
 */
export declare function advancedSearchPeople(filters: ListEntryFilters, options?: {
    limit?: number;
    offset?: number;
    sorts?: {
        attribute: string;
        direction: 'asc' | 'desc';
    }[];
}): Promise<PaginatedResponse<Person>>;
/**
 * Searches for people created within a date range
 *
 * @param dateRange - Date range for creation date
 * @returns Array of people created within the specified range
 */
export declare function searchPeopleByCreationDate(dateRange: DateRange): Promise<Person[]>;
/**
 * Searches for people modified within a date range
 *
 * @param dateRange - Date range for modification date
 * @returns Array of people modified within the specified range
 */
export declare function searchPeopleByModificationDate(dateRange: DateRange): Promise<Person[]>;
/**
 * Searches for people by last interaction date
 *
 * @param dateRange - Date range for last interaction
 * @param interactionType - Optional type of interaction to filter by
 * @returns Array of people with interactions in the specified range
 */
export declare function searchPeopleByLastInteraction(dateRange: DateRange, interactionType?: InteractionType): Promise<Person[]>;
/**
 * Searches for people by activity (meetings, emails, calls)
 *
 * @param activityFilter - Activity type and optional date range
 * @returns Array of people with the specified activity
 */
export declare function searchPeopleByActivity(activityFilter: ActivityFilter): Promise<Person[]>;
//# sourceMappingURL=search.d.ts.map