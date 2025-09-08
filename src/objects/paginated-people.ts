/**
 * Enhanced people search functions with pagination support
 */
import { FilterValidationError } from '../errors/api-errors.js';
import { ListEntryFilters } from '../api/operations/index.js';

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

    // Calculate offset from page and page size

    // Perform the search
      limit: validPageSize,
      offset,
    });

    // advancedSearchPeople now returns a PaginatedResponse
    // So we can use its data directly
    return results;
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(
      `Failed to search people with pagination: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

    // Perform the search

    // Apply pagination to the results

    // Return paginated response
    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(
      `Failed to search people by creation date: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

    // Perform the search

    // Apply pagination to the results

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(
      `Failed to search people by modification date: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

    // Validate interactionType if provided
    let validatedInteractionType: InteractionType | undefined = undefined;
    if (interactionType !== undefined) {
      // Convert to string if not already

      // Validate against enum values
      if (!validTypes.includes(typeString as InteractionType)) {
        throw new FilterValidationError(
          `Invalid interaction type: "${interactionType}". ` +
            `Valid types are: ${validTypes.join(', ')}`
        );
      }

      validatedInteractionType = typeString as InteractionType;
    }

    // Perform the search
      validatedDateRange,
      validatedInteractionType
    );

    // Apply pagination to the results

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(
      `Failed to search people by last interaction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
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

    // Perform the search

    // Apply pagination to the results

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new Error(
      `Failed to search people by activity: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
