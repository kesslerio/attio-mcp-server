/**
 * Search functionality for companies
 */
import { getAttioClient } from "../../api/attio-client.js";
import { 
  searchObject,
  advancedSearchObject,
  ListEntryFilters,
  ListEntryFilter
} from "../../api/operations/index.js";
import {
  ResourceType, 
  Company,
  FilterConditionType
} from "../../types/attio.js";
import { FilterValidationError } from "../../errors/api-errors.js";

/**
 * Searches for companies by name using a simple text search
 * 
 * @param query - Search query string to match against company names
 * @returns Array of matching company objects
 * @example
 * ```typescript
 * const companies = await searchCompanies("acme");
 * // Returns all companies with names containing "acme"
 * ```
 */
export async function searchCompanies(query: string): Promise<Company[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await searchObject<Company>(ResourceType.COMPANIES, query);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = "/objects/companies/records/query";
    
    const response = await api.post(path, {
      filter: {
        name: { "$contains": query },
      }
    });
    return response.data.data || [];
  }
}

/**
 * Performs advanced search with custom filters
 * 
 * @param filters - List of filters to apply
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0) 
 * @returns Array of company results
 * @throws Error if the search encounters any issues
 * @example
 * ```typescript
 * // Search for companies with names containing "Tech"
 * const filters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     }
 *   ]
 * };
 * const companies = await advancedSearchCompanies(filters);
 * 
 * // Search with multiple conditions using OR logic
 * const orFilters = {
 *   filters: [
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ],
 *   matchAny: true // Use OR logic between conditions
 * };
 * 
 * // Complex search with nested conditions
 * const complexFilters = {
 *   filters: [
 *     // Company name condition
 *     {
 *       attribute: { slug: 'name' },
 *       condition: 'contains',
 *       value: 'Tech'
 *     },
 *     // Revenue condition - find companies with annual revenue > $10M
 *     {
 *       attribute: { slug: 'annual_revenue' },
 *       condition: 'greater_than',
 *       value: 10000000
 *     },
 *     // Industry condition
 *     {
 *       attribute: { slug: 'industry' },
 *       condition: 'equals',
 *       value: 'Software'
 *     }
 *   ]
 * };
 * ```
 */
export async function advancedSearchCompanies(
  filters: ListEntryFilters,
  limit?: number,
  offset?: number
): Promise<Company[]> {
  try {
    // Import validation utilities only when needed to avoid circular dependencies
    // This is a dynamic import that won't affect the module dependency graph
    const { validateFilters, ERROR_MESSAGES } = await import('../../utils/filters/validation-utils.js');
    
    // Use standardized validation with consistent error messages
    validateFilters(filters);
    
    // Proceed with the search operation
    return await advancedSearchObject<Company>(
      ResourceType.COMPANIES,
      filters,
      limit,
      offset
    );
  } catch (error) {
    // For FilterValidationError, add more context specific to companies
    if (error instanceof FilterValidationError) {
      // Enhance with company-specific context but keep the original message and category
      throw new FilterValidationError(
        `Advanced company search filter invalid: ${error.message}`,
        error.category
      );
    }
    
    // For other errors, provide clear context
    if (error instanceof Error) {
      // Log the error in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('[advancedSearchCompanies] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      
      // Throw with enhanced context
      throw new Error(`Error in advanced company search: ${error.message}`);
    }
    
    // If we reach here, it's an unexpected error
    throw new Error(`Failed to search companies with advanced filters: ${String(error)}`);
  }
}

/**
 * Helper function to create filters for searching companies by name
 * 
 * @param name - Name to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for name search
 */
export function createNameFilter(
  name: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'name' },
        condition: condition,
        value: name
      }
    ]
  };
}

/**
 * Helper function to create filters for searching companies by website
 * 
 * @param website - Website to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for website search
 */
export function createWebsiteFilter(
  website: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'website' },
        condition: condition,
        value: website
      }
    ]
  };
}

/**
 * Helper function to create filters for searching companies by industry
 * 
 * @param industry - Industry to search for
 * @param condition - Condition type (default: CONTAINS)
 * @returns ListEntryFilters object configured for industry search
 */
export function createIndustryFilter(
  industry: string, 
  condition: FilterConditionType = FilterConditionType.CONTAINS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: 'industry' },
        condition: condition,
        value: industry
      }
    ]
  };
}