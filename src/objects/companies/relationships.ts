/**
 * Relationship-based queries for companies
 */
import {
  ResourceType,
  Company,
  AttioList,
  AttioListEntry
} from "../../types/attio.js";
import { ListEntryFilters } from "../../api/operations/index.js";
import { FilterValidationError } from "../../errors/api-errors.js";
import { validateNumericParam } from "../../utils/filters/index.js";
import {
  getAttioClient
} from "../../api/attio-client.js";
import { getListDetails } from "../lists.js";
import {
  createCompaniesByPeopleFilter,
  createCompaniesByPeopleListFilter,
  createRecordsByNotesFilter
} from "../../utils/relationship-utils.js";
import { advancedSearchCompanies } from "./search.js";

/**
 * Search for companies based on attributes of their associated people
 * 
 * @param peopleFilter - Filter to apply to people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export async function searchCompaniesByPeople(
  peopleFilter: ListEntryFilters | string | any,
  limit: number | string = 20,
  offset: number | string = 0
): Promise<Company[]> {
  try {
    // Ensure peopleFilter is a properly structured filter object
    if (typeof peopleFilter !== 'object' || !peopleFilter || !peopleFilter.filters) {
      throw new FilterValidationError(
        'People filter must be a valid ListEntryFilters object with at least one filter'
      );
    }
    
    // Validate and normalize limit and offset parameters
    const validatedLimit = validateNumericParam(limit, 'limit', 20);
    const validatedOffset = validateNumericParam(offset, 'offset', 0);
    
    // Create the relationship-based filter and perform the search
    const filters = createCompaniesByPeopleFilter(peopleFilter);
    const results = await advancedSearchCompanies(filters, validatedLimit, validatedOffset);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    // Convert all errors to FilterValidationErrors for consistent handling
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(
      `Failed to search companies by people: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Search for companies that have employees in a specific list
 * 
 * @param listId - ID of the list containing people
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export async function searchCompaniesByPeopleList(
  listId: string,
  limit: number | string = 20,
  offset: number | string = 0
): Promise<Company[]> {
  try {
    // Validate listId
    if (!listId || typeof listId !== 'string' || listId.trim() === '') {
      throw new FilterValidationError('List ID must be a non-empty string');
    }
    
    // Validate and normalize limit and offset parameters
    const validatedLimit = validateNumericParam(limit, 'limit', 20);
    const validatedOffset = validateNumericParam(offset, 'offset', 0);
    
    // Create the relationship-based filter and perform the search
    const filters = createCompaniesByPeopleListFilter(listId);
    const results = await advancedSearchCompanies(filters, validatedLimit, validatedOffset);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    // Convert all errors to FilterValidationErrors for consistent handling
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(
      `Failed to search companies by people list: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Search for companies that have notes containing specific text
 * 
 * @param searchText - Text to search for in notes
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching companies
 */
export async function searchCompaniesByNotes(
  searchText: string,
  limit: number | string = 20,
  offset: number | string = 0
): Promise<Company[]> {
  try {
    // Validate searchText
    if (!searchText || typeof searchText !== 'string' || searchText.trim() === '') {
      throw new FilterValidationError('Search text must be a non-empty string');
    }
    
    // Validate and normalize limit and offset parameters
    const validatedLimit = validateNumericParam(limit, 'limit', 20);
    const validatedOffset = validateNumericParam(offset, 'offset', 0);
    
    // Create the relationship-based filter and perform the search
    const filters = createRecordsByNotesFilter(ResourceType.COMPANIES, searchText);
    const results = await advancedSearchCompanies(filters, validatedLimit, validatedOffset);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    // Convert all errors to FilterValidationErrors for consistent handling
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(
      `Failed to search companies by notes: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
/**
 * Gets lists that a company belongs to
 *
 * @param companyId - ID of the company
 * @param limit - Maximum number of list entries to check (default: 50)
 * @returns Array of unique lists containing the company
 */
export async function getCompanyLists(
  companyId: string,
  limit: number = 50
): Promise<AttioList[]> {
  const api = getAttioClient();

  const response = await api.post<{ data: AttioListEntry[] }>(
    '/lists-entries/query',
    {
      filter: { record_id: { '$equals': companyId } },
      expand: ['list'],
      limit
    }
  );

  const entries = response.data.data || [];
  const lists: AttioList[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const listId = (entry as any).list?.id?.list_id || entry.list_id;
    if (!listId || seen.has(listId)) continue;
    seen.add(listId);

    if ((entry as any).list) {
      lists.push((entry as any).list as AttioList);
    } else {
      try {
        const detail = await getListDetails(listId);
        lists.push(detail);
      } catch {
        // ignore retrieval errors
      }
    }
  }

  return lists;
}

