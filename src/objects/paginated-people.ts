/**
 * Enhanced people search functions with pagination support
 */
import { 
  searchPeopleByCreationDate,
  searchPeopleByModificationDate,
  searchPeopleByLastInteraction,
  searchPeopleByActivity,
  advancedSearchPeople
} from "./people.js";
import { 
  DateRange, 
  InteractionType,
  ActivityFilter, 
  Person
} from "../types/attio.js";
import { ListEntryFilters } from "../api/attio-operations.js";
import { 
  PaginatedResponse, 
  createPaginatedResponse,
  getPaginationParams
} from "../utils/pagination.js";
import { 
  validateDateRange,
  validateActivityFilter,
  validateNumericParam
} from "../utils/filter-validation.js";
import { FilterValidationError } from "../errors/api-errors.js";

/**
 * Advanced search for people with built-in pagination
 * 
 * @param filters - Filter configuration
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export async function paginatedSearchPeople(
  filters: ListEntryFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));
    
    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;
    
    // Perform the search
    const results = await advancedSearchPeople(filters, validPageSize, offset);
    
    // In a real implementation, we would get totalCount from the API
    // For now, we'll estimate it based on results and current page
    const hasMore = results.length === validPageSize;
    const totalCount = hasMore 
      ? validPage * validPageSize + validPageSize  // Estimate more records
      : ((validPage - 1) * validPageSize) + results.length; // Current count
    
    // Return paginated response
    return createPaginatedResponse(
      results,
      totalCount,
      validPage,
      validPageSize
    );
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(`Failed to search people with pagination: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for people by creation date with pagination
 * 
 * @param dateRange - Date range to filter by (when people were created)
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export async function paginatedSearchPeopleByCreationDate(
  dateRange: DateRange | string | any,
  page: number | string = 1,
  pageSize: number | string = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate and normalize inputs
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);
    
    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;
    
    // Perform the search
    const results = await searchPeopleByCreationDate(validatedDateRange, validPageSize, offset);
    
    // In a real implementation, we would get totalCount from the API
    // For now, we'll estimate it based on results and current page
    const hasMore = results.length === validPageSize;
    const totalCount = hasMore 
      ? validPage * validPageSize + validPageSize  // Estimate more records
      : ((validPage - 1) * validPageSize) + results.length; // Current count
    
    // Return paginated response
    return createPaginatedResponse(
      results,
      totalCount,
      validPage,
      validPageSize
    );
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(`Failed to search people by creation date: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for people by modification date with pagination
 * 
 * @param dateRange - Date range to filter by (when people were last modified)
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export async function paginatedSearchPeopleByModificationDate(
  dateRange: DateRange | string | any,
  page: number | string = 1,
  pageSize: number | string = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate and normalize inputs
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);
    
    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;
    
    // Perform the search
    const results = await searchPeopleByModificationDate(validatedDateRange, validPageSize, offset);
    
    // Create paginated response
    const hasMore = results.length === validPageSize;
    const totalCount = hasMore 
      ? validPage * validPageSize + validPageSize
      : ((validPage - 1) * validPageSize) + results.length;
    
    return createPaginatedResponse(
      results,
      totalCount,
      validPage,
      validPageSize
    );
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(`Failed to search people by modification date: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for people by last interaction with pagination
 * 
 * @param dateRange - Date range to filter by (when the last interaction occurred)
 * @param interactionType - Optional type of interaction to filter by
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export async function paginatedSearchPeopleByLastInteraction(
  dateRange: DateRange | string | any,
  interactionType?: InteractionType | string,
  page: number | string = 1,
  pageSize: number | string = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate and normalize inputs
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);
    
    // Validate interactionType if provided
    let validatedInteractionType: InteractionType | undefined = undefined;
    if (interactionType !== undefined) {
      // Convert to string if not already
      const typeString = String(interactionType).toLowerCase();
      
      // Validate against enum values
      const validTypes = Object.values(InteractionType);
      if (!validTypes.includes(typeString as InteractionType)) {
        throw new FilterValidationError(
          `Invalid interaction type: "${interactionType}". ` +
          `Valid types are: ${validTypes.join(', ')}`
        );
      }
      
      validatedInteractionType = typeString as InteractionType;
    }
    
    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;
    
    // Perform the search
    const results = await searchPeopleByLastInteraction(
      validatedDateRange, 
      validatedInteractionType,
      validPageSize,
      offset
    );
    
    // Create paginated response
    const hasMore = results.length === validPageSize;
    const totalCount = hasMore 
      ? validPage * validPageSize + validPageSize
      : ((validPage - 1) * validPageSize) + results.length;
    
    return createPaginatedResponse(
      results,
      totalCount,
      validPage,
      validPageSize
    );
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(`Failed to search people by last interaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search for people by activity with pagination
 * 
 * @param activityFilter - Activity filter configuration
 * @param page - Page number to return (default: 1)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Paginated response with matching people
 */
export async function paginatedSearchPeopleByActivity(
  activityFilter: ActivityFilter | string | any,
  page: number | string = 1,
  pageSize: number | string = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate and normalize inputs
    const validatedActivityFilter = validateActivityFilter(activityFilter);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);
    
    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;
    
    // Perform the search
    const results = await searchPeopleByActivity(
      validatedActivityFilter,
      validPageSize,
      offset
    );
    
    // Create paginated response
    const hasMore = results.length === validPageSize;
    const totalCount = hasMore 
      ? validPage * validPageSize + validPageSize
      : ((validPage - 1) * validPageSize) + results.length;
    
    return createPaginatedResponse(
      results,
      totalCount,
      validPage,
      validPageSize
    );
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(`Failed to search people by activity: ${error instanceof Error ? error.message : String(error)}`);
  }
}