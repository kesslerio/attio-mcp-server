/**
 * Search functionality for People
 */
import { FilterValidationError } from '../../errors/api-errors.js';
import { getAttioClient } from '../../api/attio-client.js';
import { isValidEmail } from '../../utils/validation/email-validation.js';

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

    // Search only by name and email, not phone
      $or: [
        { name: { $contains: query } },
        { email_addresses: { $contains: query } },
      ],
    };

      filter,
      limit: 50,
    });

    return response.data.data || [];
  } catch (error: unknown) {
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


    return response;
  } catch (error: unknown) {
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
    if (!isValidEmail(email)) {
      throw new FilterValidationError(`Invalid email format: ${email}`);
    }


    return response;
  } catch (error: unknown) {
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

    return response;
  } catch (error: unknown) {
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
        if (validatedLimit < 0 || validatedLimit > 500) {
          throw new FilterValidationError('limit must be between 0 and 500');
        }
      } catch (error: unknown) {
        if (error instanceof FilterValidationError) {
          throw error;
        }
        throw new FilterValidationError(`Invalid limit: ${error}`);
      }
    }

    if (options?.offset) {
      try {
        if (validatedOffset < 0) {
          throw new FilterValidationError('offset cannot be negative');
        }
      } catch (error: unknown) {
        if (error instanceof FilterValidationError) {
          throw error;
        }
        throw new FilterValidationError(`Invalid offset: ${error}`);
      }
    }

      ...filters,
      sorts: options?.sorts,
    };

      ResourceType.PEOPLE,
      searchParams,
      options?.limit || 100,
      options?.offset || 0
    );


    return createPaginatedResponse(response, response.length, page, limit);
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(`Invalid date range: ${error}`);
  }


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
  } catch (error: unknown) {
    if (error instanceof FilterValidationError) {
      throw error;
    }
    throw new FilterValidationError(`Invalid date range: ${error}`);
  }


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
    } catch (error: unknown) {
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw new FilterValidationError(`Invalid date range: ${error}`);
    }


    return response.results;
  } catch (error: unknown) {
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
    } catch (error: unknown) {
      if (error instanceof FilterValidationError) {
        throw error;
      }
      throw new FilterValidationError(`Invalid activity filter: ${error}`);
    }


    return response.results;
  } catch (error: unknown) {
    if (errorMessage.includes('validation')) {
      throw new FilterValidationError(
        `Activity search validation failed: ${errorMessage}`
      );
    }
    throw new Error(`Failed to search people by activity: ${errorMessage}`);
  }
}
