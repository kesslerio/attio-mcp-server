/**
 * Search functionality for People
 */
import { getAttioClient } from '../../api/attio-client.js';
import {
  advancedSearchObject,
  type ListEntryFilters,
  searchObject,
} from '../../api/operations/index.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import {
  type ActivityFilter,
  type DateRange,
  type InteractionType,
  type Person,
  ResourceType,
} from '../../types/attio.js';
import {
  createActivityFilter,
  createCreatedDateFilter,
  createLastInteractionFilter,
  createModifiedDateFilter,
  validateActivityFilter,
  validateDateRange,
  validateNumericParam,
} from '../../utils/filters/index.js';
import {
  createPaginatedResponse,
  type PaginatedResponse,
} from '../../utils/pagination.js';

/**
 * Searches for people by name, email, or phone number
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeople(query: string): Promise<Person[]> {
  try {
    if (!query || query.trim().length === 0) {
      throw new FilterValidationError('Search query cannot be empty');
    }
    if (query.length > 1000) {
      throw new FilterValidationError('Search query too long');
    }

    // Use the API directly to avoid the phone field issue
    const api = getAttioClient();
    const path = '/objects/people/records/query';

    // Search only by name and email, not phone
    const filter = {
      $or: [
        { name: { $contains: query } },
        { email_addresses: { $contains: query } },
      ],
    };

    const response = await api.post(path, {
      filter,
      limit: 50,
    });

    return response.data.data || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people: ${errorMessage}`);
  }
}

/**
 * Searches for people using query (alias for searchPeople)
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeopleByQuery(query: string): Promise<Person[]> {
  try {
    if (!query || query.trim().length === 0) {
      throw new FilterValidationError('Search query cannot be empty');
    }
    if (query.length > 1000) {
      throw new FilterValidationError('Search query too long');
    }

    const response = await searchObject<Person>(ResourceType.PEOPLE, query);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by query: ${errorMessage}`);
  }
}

/**
 * Searches for people by email address
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export async function searchPeopleByEmail(email: string): Promise<Person[]> {
  try {
    if (!email || email.trim().length === 0) {
      throw new FilterValidationError('Email cannot be empty');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new FilterValidationError(`Invalid email format: ${email}`);
    }

    const response = await searchObject<Person>(ResourceType.PEOPLE, email);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Email search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by email: ${errorMessage}`);
  }
}

/**
 * Searches for people by phone number
 *
 * @param phone - Phone number to search for
 * @returns Array of person results
 */
export async function searchPeopleByPhone(phone: string): Promise<Person[]> {
  try {
    // Format the phone number for search
    const _cleanedPhone = phone.replace(/\D/g, '');

    const response = await searchObject<Person>(ResourceType.PEOPLE, phone);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to search people by phone: ${errorMessage}`);
  }
}

/**
 * getPersonByEmail (alias for searchPeopleByEmail)
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export async function getPersonByEmail(email: string): Promise<Person[]> {
  return searchPeopleByEmail(email);
}

/**
 * Searches people using advanced filter criteria
 *
 * @param filters - Filter criteria including attribute filters, date ranges, etc.
 * @param options - Optional search configuration including pagination
 * @returns Array of person results
 */
export async function advancedSearchPeople(
  filters: ListEntryFilters,
  options?: {
    limit?: number;
    offset?: number;
    sorts?: { attribute: string; direction: 'asc' | 'desc' }[];
  }
): Promise<PaginatedResponse<Person>> {
  try {
    // Validate pagination parameters
    if (options?.limit) {
      try {
        const validatedLimit = validateNumericParam(options.limit, 'limit');
        if (validatedLimit < 0 || validatedLimit > 500) {
          throw new FilterValidationError('limit must be between 0 and 500');
        }
      } catch (error) {
        if (error instanceof FilterValidationError) {
          throw error;
        }
        throw new FilterValidationError(`Invalid limit: ${error}`);
      }
    }

    if (options?.offset) {
      try {
        const validatedOffset = validateNumericParam(options.offset, 'offset');
        if (validatedOffset < 0) {
          throw new FilterValidationError('offset cannot be negative');
        }
      } catch (error) {
        if (error instanceof FilterValidationError) {
          throw error;
        }
        throw new FilterValidationError(`Invalid offset: ${error}`);
      }
    }

    const searchParams = {
      ...filters,
      sorts: options?.sorts,
    };

    const response = await advancedSearchObject<Person>(
      ResourceType.PEOPLE,
      searchParams,
      options?.limit || 100,
      options?.offset || 0
    );

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    const page = Math.floor(offset / limit) + 1;

    return createPaginatedResponse(response, response.length, page, limit);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Advanced search validation failed: ${errorMessage}`
      );
    }
    throw new Error(
      `Failed to perform advanced people search: ${errorMessage}`
    );
  }
}

/**
 * Searches for people created within a date range
 *
 * @param dateRange - Date range for creation date
 * @returns Array of people created within the specified range
 */
export async function searchPeopleByCreationDate(
  dateRange: DateRange
): Promise<Person[]> {
  try {
    validateDateRange(dateRange);
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(`Invalid date range: ${error}`);
  }

  const filters = createCreatedDateFilter(dateRange);
  const response = await advancedSearchPeople(filters);

  return response.results;
}

/**
 * Searches for people modified within a date range
 *
 * @param dateRange - Date range for modification date
 * @returns Array of people modified within the specified range
 */
export async function searchPeopleByModificationDate(
  dateRange: DateRange
): Promise<Person[]> {
  try {
    validateDateRange(dateRange);
  } catch (error) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(`Invalid date range: ${error}`);
  }

  const filters = createModifiedDateFilter(dateRange);
  const response = await advancedSearchPeople(filters);

  return response.results;
}

/**
 * Searches for people by last interaction date
 *
 * @param dateRange - Date range for last interaction
 * @param interactionType - Optional type of interaction to filter by
 * @returns Array of people with interactions in the specified range
 */
export async function searchPeopleByLastInteraction(
  dateRange: DateRange,
  interactionType?: InteractionType
): Promise<Person[]> {
  try {
    try {
      validateDateRange(dateRange);
    } catch (error) {
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw new FilterValidationError(`Invalid date range: ${error}`);
    }

    const filters = createLastInteractionFilter(dateRange, interactionType);
    const response = await advancedSearchPeople(filters);

    return response.results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Last interaction search validation failed: ${errorMessage}`
      );
    }
    throw new Error(
      `Failed to search people by last interaction: ${errorMessage}`
    );
  }
}

/**
 * Searches for people by activity (meetings, emails, calls)
 *
 * @param activityFilter - Activity type and optional date range
 * @returns Array of people with the specified activity
 */
export async function searchPeopleByActivity(
  activityFilter: ActivityFilter
): Promise<Person[]> {
  try {
    try {
      validateActivityFilter(activityFilter);
    } catch (error) {
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw new FilterValidationError(`Invalid activity filter: ${error}`);
    }

    const filters = createActivityFilter(activityFilter);
    const response = await advancedSearchPeople(filters);

    return response.results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Activity search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by activity: ${errorMessage}`);
  }
}
