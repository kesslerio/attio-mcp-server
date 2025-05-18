/**
 * Relationship utility functions for working with related records in Attio
 * Provides functions for creating filters based on relationships between records.
 */
import { ListEntryFilters } from "../api/operations/index.js";
import { ResourceType, RelationshipType } from "../types/attio.js";
/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
    sourceType: ResourceType;
    targetType: ResourceType;
    relationshipType: RelationshipType;
    targetFilters: ListEntryFilters;
}
/**
 * Creates a filter for people based on their associated company attributes
 *
 * @param companyFilter - Filters to apply to the related companies
 * @returns Filter for finding people based on company attributes
 */
export declare function createPeopleByCompanyFilter(companyFilter: ListEntryFilters): ListEntryFilters;
/**
 * Creates a filter for companies based on their associated people attributes
 *
 * @param peopleFilter - Filters to apply to the related people
 * @returns Filter for finding companies based on people attributes
 */
export declare function createCompaniesByPeopleFilter(peopleFilter: ListEntryFilters): ListEntryFilters;
/**
 * Creates a filter for records that belong to a specific list
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param listId - The ID of the list to filter by
 * @returns Filter for finding records that belong to the list
 */
export declare function createRecordsByListFilter(resourceType: ResourceType, listId: string): ListEntryFilters;
/**
 * Creates a filter for finding people who work at companies in a specific list
 *
 * @param listId - The ID of the list that contains companies
 * @returns Filter for finding people who work at companies in the specified list
 */
export declare function createPeopleByCompanyListFilter(listId: string): ListEntryFilters;
/**
 * Creates a filter for finding companies that have people in a specific list
 *
 * @param listId - The ID of the list that contains people
 * @returns Filter for finding companies that have people in the specified list
 */
export declare function createCompaniesByPeopleListFilter(listId: string): ListEntryFilters;
/**
 * Creates a filter for records that have associated notes matching criteria
 *
 * @param resourceType - The type of records to filter (people or companies)
 * @param textSearch - Text to search for in the notes
 * @returns Filter for finding records with matching notes
 */
export declare function createRecordsByNotesFilter(resourceType: ResourceType, textSearch: string): ListEntryFilters;
//# sourceMappingURL=relationship-utils.d.ts.map