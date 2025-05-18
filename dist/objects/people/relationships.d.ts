import { Person } from "../../types/attio.js";
/**
 * Searches for people associated with a specific company
 *
 * @param companyId - ID of the company to search for
 * @returns Array of people associated with the company
 */
export declare function searchPeopleByCompany(companyId: string): Promise<Person[]>;
/**
 * Searches for people in specific company lists
 *
 * @param listIds - Array of list IDs to search within
 * @returns Array of people in the specified lists
 */
export declare function searchPeopleByCompanyList(listIds: string[]): Promise<Person[]>;
/**
 * Searches for people with notes containing specific text
 *
 * @param searchText - Text to search for in notes
 * @returns Array of people with matching notes
 */
export declare function searchPeopleByNotes(searchText: string): Promise<Person[]>;
//# sourceMappingURL=relationships.d.ts.map