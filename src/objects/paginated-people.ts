/**
 * Enhanced people search functions with pagination support
 */

import type { ListEntryFilters } from '../api/operations/index.js';
import { FilterValidationError } from '../errors/api-errors.js';
import {
  type ActivityFilter,
  type DateRange,
  InteractionType,
  type Person,
} from '../types/attio.js';
import {
  validateActivityFilter,
  validateDateRange,
  validateNumericParam,
} from '../utils/filters/index.js';
import {
  createPaginatedResponse,
  type PaginatedResponse,
} from '../utils/pagination.js';
import {
  advancedSearchPeople,
  searchPeopleByActivity,
  searchPeopleByCreationDate,
  searchPeopleByLastInteraction,
  searchPeopleByModificationDate,
} from './people/index.js';

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
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));

    // Calculate offset from page and page size
    const offset = (validPage - 1) * validPageSize;

    // Perform the search
    const results = await advancedSearchPeople(filters, {
      limit: validPageSize,
      offset,
    });

    // advancedSearchPeople now returns a PaginatedResponse
    // So we can use its data directly
    return results;
  } catch (error) {
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
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);

    // Perform the search
    const results = await searchPeopleByCreationDate(validatedDateRange);

    // Apply pagination to the results
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    // Return paginated response
    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error) {
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
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);

    // Perform the search
    const results = await searchPeopleByModificationDate(validatedDateRange);

    // Apply pagination to the results
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error) {
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
    const validatedDateRange = validateDateRange(dateRange);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);

    // Validate interactionType if provided
    let validatedInteractionType: InteractionType | undefined;
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

    // Perform the search
    const results = await searchPeopleByLastInteraction(
      validatedDateRange,
      validatedInteractionType
    );

    // Apply pagination to the results
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error) {
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
    const validatedActivityFilter = validateActivityFilter(activityFilter);
    const validPage = validateNumericParam(page, 'page', 1);
    const validPageSize = validateNumericParam(pageSize, 'pageSize', 20);

    // Perform the search
    const results = await searchPeopleByActivity(validatedActivityFilter);

    // Apply pagination to the results
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    const paginatedResults = results.slice(startIndex, endIndex);

    return createPaginatedResponse(
      paginatedResults,
      results.length,
      validPage,
      validPageSize
    );
  } catch (error) {
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
