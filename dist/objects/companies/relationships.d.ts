/**
 * Relationship-based queries for companies
 */
import { Company } from "../../types/attio.js";
import { ListEntryFilters } from "../../api/operations/index.js";
/**
 * Search for companies based on attributes of their associated people
 *
 * @param peopleFilter - Filter to apply to people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByPeople(peopleFilter: ListEntryFilters | string | any, limit?: number | string, offset?: number | string): Promise<Company[]>;
/**
 * Search for companies that have employees in a specific list
 *
 * @param listId - ID of the list containing people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByPeopleList(listId: string, limit?: number | string, offset?: number | string): Promise<Company[]>;
/**
 * Search for companies that have notes containing specific text
 *
 * @param searchText - Text to search for in notes
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export declare function searchCompaniesByNotes(searchText: string, limit?: number | string, offset?: number | string): Promise<Company[]>;
//# sourceMappingURL=relationships.d.ts.map