import { DateRange, InteractionType, ActivityFilter, Person } from "../types/attio.js";
import { ListEntryFilters } from "../api/operations/index.js";
import { PaginatedResponse } from "../utils/pagination.js";
/**
 * Advanced search for people with built-in pagination
 *
 * @param filters - Filter configuration
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export declare function paginatedSearchPeople(filters: ListEntryFilters, page?: number, pageSize?: number): Promise<PaginatedResponse<Person>>;
/**
 * Search for people by creation date with pagination
 *
 * @param dateRange - Date range to filter by (when people were created)
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export declare function paginatedSearchPeopleByCreationDate(dateRange: DateRange | string | any, page?: number | string, pageSize?: number | string): Promise<PaginatedResponse<Person>>;
/**
 * Search for people by modification date with pagination
 *
 * @param dateRange - Date range to filter by (when people were last modified)
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export declare function paginatedSearchPeopleByModificationDate(dateRange: DateRange | string | any, page?: number | string, pageSize?: number | string): Promise<PaginatedResponse<Person>>;
/**
 * Search for people by last interaction with pagination
 *
 * @param dateRange - Date range to filter by (when the last interaction occurred)
 * @param interactionType - Optional type of interaction to filter by
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export declare function paginatedSearchPeopleByLastInteraction(dateRange: DateRange | string | any, interactionType?: InteractionType | string, page?: number | string, pageSize?: number | string): Promise<PaginatedResponse<Person>>;
/**
 * Search for people by activity with pagination
 *
 * @param activityFilter - Activity filter configuration
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export declare function paginatedSearchPeopleByActivity(activityFilter: ActivityFilter | string | any, page?: number | string, pageSize?: number | string): Promise<PaginatedResponse<Person>>;
//# sourceMappingURL=paginated-people.d.ts.map