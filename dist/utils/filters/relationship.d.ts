/**
 * Relationship filtering utilities
 * These utilities help create filters based on relationships between records
 */
import { ListEntryFilters, ResourceType } from "./types.js";
/**
 * Applies rate limiting to relationship queries
 * Throws RelationshipRateLimitError if the rate limit is exceeded
 *
 * @param req - Request object
 * @param relationshipType - Type of relationship query
 * @param isNested - Whether this is a nested relationship query
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function applyRateLimit(req: any, relationshipType: string, isNested?: boolean): void;
/**
 * Creates a filter for people based on their associated company attributes
 * Includes rate limiting for this resource-intensive operation
 *
 * @param companyFilter - Filters to apply to the related companies
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding people based on company attributes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createPeopleByCompanyFilter(companyFilter: ListEntryFilters, req?: any): ListEntryFilters;
/**
 * Creates a filter for companies based on their associated people attributes
 * Includes rate limiting for this resource-intensive operation
 *
 * @param peopleFilter - Filters to apply to the related people
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding companies based on people attributes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createCompaniesByPeopleFilter(peopleFilter: ListEntryFilters, req?: any): ListEntryFilters;
/**
 * Creates a filter for records that belong to a specific list
 * Includes rate limiting for this operation and caching for better performance
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param listId - The ID of the list to filter by
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding records that belong to the list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createRecordsByListFilter(resourceType: ResourceType, listId: string, req?: any, useCache?: boolean): ListEntryFilters;
/**
 * Creates a filter for finding people who work at companies in a specific list
 * This is a nested relationship query with rate limiting and caching applied
 *
 * @param listId - The ID of the list that contains companies
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding people who work at companies in the specified list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createPeopleByCompanyListFilter(listId: string, req?: any, useCache?: boolean): ListEntryFilters;
/**
 * Creates a filter for finding companies that have people in a specific list
 * This is a nested relationship query with rate limiting and caching applied
 *
 * @param listId - The ID of the list that contains people
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @param useCache - Whether to use caching (default: true)
 * @returns Filter for finding companies that have people in the specified list
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createCompaniesByPeopleListFilter(listId: string, req?: any, useCache?: boolean): ListEntryFilters;
/**
 * Creates a filter for records that have associated notes matching criteria
 * Includes rate limiting for text search operations
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param textSearch - Text to search for in the notes
 * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
 * @returns Filter for finding records with matching notes
 * @throws RelationshipRateLimitError if rate limit exceeded
 */
export declare function createRecordsByNotesFilter(resourceType: ResourceType, textSearch: string, req?: any): ListEntryFilters;
//# sourceMappingURL=relationship.d.ts.map