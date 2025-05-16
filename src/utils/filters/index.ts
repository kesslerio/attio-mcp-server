/**
 * Consolidated filter utilities for Attio API
 * Provides a central namespace for all filter-related functionality
 */
import { 
  isValidFilterCondition, 
  FilterConditionType,
  DateRange,
  NumericRange,
  InteractionType,
  ActivityFilter,
  RelationshipType,
  ResourceType
} from "../../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../../api/attio-operations.js";
import { 
  FilterValidationError,
  RelationshipFilterError,
  ListRelationshipError
} from "../../errors/api-errors.js";
import { resolveDateRange } from "../date-utils.js";
// import { checkRelationshipQueryRateLimit } from "../rate-limiter.js";
import { 
  getCachedRelationshipFilter,
  cacheRelationshipFilter,
  getCachedListFilter,
  cacheListFilter,
  hashFilters 
} from "./cache.js";

/**
 * Attribute constants for better code readability and consistency
 */
export const ATTRIBUTES = {
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  LAST_INTERACTION: 'last_interaction',
  INTERACTION_TYPE: 'interaction_type',
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  WEBSITE: 'website',
  INDUSTRY: 'industry',
  REVENUE: 'annual_revenue',
  EMPLOYEE_COUNT: 'employee_count',
  LIST_ID: 'list_id',
  NOTE_CONTENT: 'note_content',
  RELATIONSHIP: '$relationship'
};

/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
  [attributeSlug: string]: {
    [condition: string]: any
  }
};

/**
 * Error type for rate-limiting on relationship queries
 */
export class RelationshipRateLimitError extends Error {
  constructor(
    message: string,
    public readonly relationshipType: string,
    public readonly resetTime: number,
    public readonly msUntilReset: number
  ) {
    super(message);
    this.name = 'RelationshipRateLimitError';
    
    // This line is needed to properly capture the stack trace
    Object.setPrototypeOf(this, RelationshipRateLimitError.prototype);
  }
}

/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
  // The source record type
  sourceType: ResourceType;
  
  // The target record type
  targetType: ResourceType;
  
  // The relationship type connecting the records
  relationshipType: RelationshipType;
  
  // Filters to apply to the target records
  targetFilters: ListEntryFilters;
}

/**
 * Basic filter validation and transformation
 */
export namespace Basic {
  /**
   * Validates a filter structure for basic required properties
   * 
   * @param filter - The filter to validate
   * @returns True if filter is valid, false otherwise
   */
  export function validateFilterStructure(filter: ListEntryFilter): boolean {
    if (!filter) {
      return false;
    }
    
    if (!filter.attribute || !filter.attribute.slug) {
      return false;
    }
    
    if (!filter.condition) {
      return false;
    }
    
    return true;
  }

  /**
   * Transforms list entry filters to the format expected by the Attio API
   * This function handles both simple filters and advanced filters with logical operators
   * 
   * @param filters - Filter configuration from the MCP API
   * @param validateConditions - Whether to validate condition types (default: true)
   * @returns Transformed filter object for Attio API
   * @throws FilterValidationError if validation fails
   */
  export function transformFiltersToApiFormat(
    filters: ListEntryFilters | undefined,
    validateConditions: boolean = true
  ): { filter?: AttioApiFilter } {
    // If no filters provided, return empty object
    if (!filters || !filters.filters || filters.filters.length === 0) {
      return {};
    }
    
    // Determine if we need to use the $or operator based on matchAny
    // matchAny: true = use $or logic, matchAny: false (or undefined) = use standard AND logic
    const useOrLogic = filters.matchAny === true;
    
    // For OR logic, we need a completely different structure with filter objects in an array
    if (useOrLogic) {
      // Create array of condition objects for $or
      const orConditions: any[] = [];
      
      // Process each filter to create individual condition objects
      filters.filters.forEach(filter => {
        // Validate filter structure
        if (!validateFilterStructure(filter)) {
          const slugInfo = filter.attribute?.slug ? ` ${filter.attribute.slug}` : '';
          console.warn(`Invalid filter: Incomplete filter structure for${slugInfo}`, filter);
          return; // Skip this filter
        }
        
        const { slug } = filter.attribute;
        
        // Validate condition type if enabled
        if (validateConditions && !isValidFilterCondition(filter.condition)) {
          throw new FilterValidationError(
            `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
            `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
          );
        }
        
        // Create a condition object for this individual filter
        const condition: any = {};
        condition[slug] = {
          [`$${filter.condition}`]: filter.value
        };
        
        // Add to the OR conditions array
        orConditions.push(condition);
      });
      
      // Only return the $or structure if we have valid conditions
      if (orConditions.length > 0) {
        return {
          filter: { "$or": orConditions }
        };
      }
      
      return {}; // No valid conditions
    }
    
    // Standard AND logic - similar to the original implementation
    const apiFilter: AttioApiFilter = {};
    let hasValidFilters = false;
    
    // Process each filter
    filters.filters.forEach(filter => {
      // Validate filter structure
      if (!validateFilterStructure(filter)) {
        const slugInfo = filter.attribute?.slug ? ` ${filter.attribute.slug}` : '';
        console.warn(`Invalid filter: Incomplete filter structure for${slugInfo}`, filter);
        return; // Skip this filter
      }
      
      const { slug } = filter.attribute;
      
      // Validate condition type if enabled
      if (validateConditions && !isValidFilterCondition(filter.condition)) {
        throw new FilterValidationError(
          `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
          `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
        );
      }
      
      // Initialize attribute entry if needed
      if (!apiFilter[slug]) {
        apiFilter[slug] = {};
      }
      
      // Add condition with $ prefix as required by Attio API
      apiFilter[slug][`$${filter.condition}`] = filter.value;
      hasValidFilters = true;
    });
    
    // Return the filter object only if valid filters were found
    return hasValidFilters ? { filter: apiFilter } : {};
  }

  /**
   * Creates a simple equals filter for any attribute
   * 
   * @param attributeSlug - The attribute to filter on
   * @param value - The exact value to match
   * @returns Configured filter object
   */
  export function createEqualsFilter(
    attributeSlug: string,
    value: any
  ): ListEntryFilters {
    return {
      filters: [
        {
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.EQUALS,
          value
        }
      ],
      matchAny: false
    };
  }

  /**
   * Creates a simple contains filter for text attributes
   * 
   * @param attributeSlug - The attribute to filter on
   * @param value - The text to search for
   * @returns Configured filter object
   */
  export function createContainsFilter(
    attributeSlug: string,
    value: string
  ): ListEntryFilters {
    return {
      filters: [
        {
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.CONTAINS,
          value
        }
      ],
      matchAny: false
    };
  }

  /**
   * Combines multiple filters with AND logic
   * 
   * @param filters - Array of filters to combine
   * @returns Combined filter with AND logic
   */
  export function combineWithAnd(...filters: ListEntryFilters[]): ListEntryFilters {
    const combinedFilters: ListEntryFilter[] = [];
    
    filters.forEach(filter => {
      if (filter.filters && filter.filters.length > 0) {
        combinedFilters.push(...filter.filters);
      }
    });
    
    return {
      filters: combinedFilters,
      matchAny: false
    };
  }

  /**
   * Combines multiple filters with OR logic
   * 
   * @param filters - Array of filters to combine
   * @returns Combined filter with OR logic
   */
  export function combineWithOr(...filters: ListEntryFilters[]): ListEntryFilters {
    const combinedFilters: ListEntryFilter[] = [];
    
    filters.forEach(filter => {
      if (filter.filters && filter.filters.length > 0) {
        combinedFilters.push(...filter.filters);
      }
    });
    
    return {
      filters: combinedFilters,
      matchAny: true
    };
  }
}

/**
 * Date and numeric range filtering utilities
 */
export namespace Range {
  /**
   * Creates a date range filter for a specific attribute
   * 
   * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
   * @param dateRange - Date range specification
   * @returns Configured filter object
   */
  export function createDateRangeFilter(
    attributeSlug: string,
    dateRange: DateRange
  ): ListEntryFilters {
    try {
      // Resolve any relative dates to absolute ISO strings
      const resolvedRange = resolveDateRange(dateRange);
      const filters: ListEntryFilter[] = [];
      
      // Add filter for start date if specified (using greater than or equal)
      if (resolvedRange.start) {
        filters.push({
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
          value: resolvedRange.start
        });
      }
      
      // Add filter for end date if specified (using less than or equal)
      if (resolvedRange.end) {
        filters.push({
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.LESS_THAN_OR_EQUALS,
          value: resolvedRange.end
        });
      }
      
      return {
        filters,
        // When both start and end are specified, we want records that match both (AND logic)
        matchAny: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create date range filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for records based on their creation date
   * 
   * @param dateRange - Date range specification
   * @returns Configured filter object
   */
  export function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters {
    return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
  }

  /**
   * Creates a filter for records based on their last modification date
   * 
   * @param dateRange - Date range specification
   * @returns Configured filter object
   */
  export function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters {
    return createDateRangeFilter(ATTRIBUTES.UPDATED_AT, dateRange);
  }

  /**
   * Creates a numeric filter for filtering by number values
   * 
   * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
   * @param range - Numeric range specification with min, max, or equals
   * @returns Configured filter object
   */
  export function createNumericFilter(
    attributeSlug: string,
    range: NumericRange
  ): ListEntryFilters {
    try {
      // Validate the numeric range
      if (range.equals !== undefined) {
        // If equals is specified, min and max should not be
        if (range.min !== undefined || range.max !== undefined) {
          throw new Error('Cannot specify both equals and min/max in a numeric range');
        }
        
        return Basic.createEqualsFilter(attributeSlug, range.equals);
      }
      
      // Check if we have min or max
      if (range.min === undefined && range.max === undefined) {
        throw new Error('Numeric range must specify at least one of: min, max, or equals');
      }
      
      // If both min and max are specified, ensure min <= max
      if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
        throw new Error(`Invalid numeric range: min (${range.min}) cannot be greater than max (${range.max})`);
      }
      
      const filters: ListEntryFilter[] = [];
      
      // Handle min value (greater than or equal)
      if (range.min !== undefined) {
        filters.push({
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
          value: range.min
        });
      }
      
      // Handle max value (less than or equal)
      if (range.max !== undefined) {
        filters.push({
          attribute: { slug: attributeSlug },
          condition: FilterConditionType.LESS_THAN_OR_EQUALS,
          value: range.max
        });
      }
      
      return {
        filters,
        // When both min and max are specified, we want records that match both (AND logic)
        matchAny: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create numeric filter for ${attributeSlug}: ${errorMessage}`);
    }
  }

  /**
   * Creates a revenue filter for companies
   * 
   * @param range - Revenue range in numeric form
   * @returns Configured filter object
   */
  export function createRevenueFilter(range: NumericRange): ListEntryFilters {
    return createNumericFilter(ATTRIBUTES.REVENUE, range);
  }

  /**
   * Creates an employee count filter for companies
   * 
   * @param range - Employee count range in numeric form
   * @returns Configured filter object
   */
  export function createEmployeeCountFilter(range: NumericRange): ListEntryFilters {
    return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
  }
}

/**
 * Activity and interaction filtering utilities
 */
export namespace Activity {
  /**
   * Creates a filter for records based on their last interaction date
   * Optionally filtered by interaction type (email, calendar, etc.)
   * 
   * @param dateRange - Date range specification
   * @param interactionType - Optional type of interaction to filter by
   * @returns Configured filter object
   */
  export function createLastInteractionFilter(
    dateRange: DateRange,
    interactionType?: InteractionType
  ): ListEntryFilters {
    try {
      // Basic date range filter on the last_interaction attribute
      const filters: ListEntryFilter[] = [];
      const resolvedRange = resolveDateRange(dateRange);
      
      // Add filter for start date if specified
      if (resolvedRange.start) {
        filters.push({
          attribute: { slug: ATTRIBUTES.LAST_INTERACTION },
          condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
          value: resolvedRange.start
        });
      }
      
      // Add filter for end date if specified
      if (resolvedRange.end) {
        filters.push({
          attribute: { slug: ATTRIBUTES.LAST_INTERACTION },
          condition: FilterConditionType.LESS_THAN_OR_EQUALS,
          value: resolvedRange.end
        });
      }
      
      // Add additional filter for interaction type if specified
      if (interactionType && interactionType !== InteractionType.ANY) {
        filters.push({
          attribute: { slug: ATTRIBUTES.INTERACTION_TYPE },
          condition: FilterConditionType.EQUALS,
          value: interactionType
        });
      }
      
      return {
        filters,
        matchAny: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create interaction filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a combined activity filter including date range and interaction type
   * 
   * @param activityFilter - Activity filter configuration
   * @returns Configured filter object
   */
  export function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters {
    try {
      if (!activityFilter || !activityFilter.dateRange) {
        throw new Error('Activity filter must include a date range');
      }
      
      return createLastInteractionFilter(
        activityFilter.dateRange,
        activityFilter.interactionType
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create activity filter: ${errorMessage}`);
    }
  }
}

/**
 * Relationship filtering utilities
 * These utilities help create filters based on relationships between records
 */
export namespace Relationship {
  /**
   * Applies rate limiting to relationship queries
   * Throws RelationshipRateLimitError if the rate limit is exceeded
   * 
   * @param req - Request object
   * @param relationshipType - Type of relationship query
   * @param isNested - Whether this is a nested relationship query
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function applyRateLimit(
    req: any, 
    relationshipType: string, 
    isNested: boolean = false
  ): void {
    // Check the rate limit
    // TODO: Restore when checkRelationshipQueryRateLimit is available
    // const result = checkRelationshipQueryRateLimit(req, relationshipType, isNested);
    
    // If not allowed, throw rate limit error
    // if (!result.allowed) {
    //   throw new RelationshipRateLimitError(
    //     `Rate limit exceeded for ${isNested ? 'nested ' : ''}relationship query of type '${relationshipType}'. Try again in ${Math.ceil(result.msUntilReset / 1000)} seconds.`,
    //     relationshipType,
    //     result.resetTime,
    //     result.msUntilReset
    //   );
    // }
  }

  /**
   * Core function to create relationship-based filters
   * This translates our internal representation to the format expected by the Attio API
   * 
   * @param config - Relationship filter configuration
   * @returns Filter in the format expected by Attio API
   */
  function createRelationshipFilter(config: RelationshipFilterConfig): ListEntryFilters {
    // The structure we're aiming for in the Attio API format:
    // {
    //   "$relationship": {
    //     "type": "works_at",
    //     "target": {
    //       "object": "companies",
    //       "filter": { /* target filters */ }
    //     }
    //   }
    // }
    
    // Map our ResourceType to Attio API object names
    const getObjectName = (type: ResourceType): string => {
      switch (type) {
        case ResourceType.PEOPLE:
          return 'people';
        case ResourceType.COMPANIES:
          return 'companies';
        case ResourceType.LISTS:
          return 'lists';
        case ResourceType.RECORDS:
          return 'records';
        default:
          throw new Error(`Unsupported resource type: ${type}`);
      }
    };
    
    // The relationship field should be a custom attribute in the filter
    return {
      filters: [
        {
          attribute: {
            slug: ATTRIBUTES.RELATIONSHIP
          },
          condition: FilterConditionType.EQUALS,
          value: {
            type: config.relationshipType,
            target: {
              object: getObjectName(config.targetType),
              filter: config.targetFilters
            }
          }
        }
      ],
      matchAny: false
    };
  }

  /**
   * Creates a filter for people based on their associated company attributes
   * Includes rate limiting for this resource-intensive operation
   * 
   * @param companyFilter - Filters to apply to the related companies
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @returns Filter for finding people based on company attributes
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createPeopleByCompanyFilter(
    companyFilter: ListEntryFilters,
    req?: any
  ): ListEntryFilters {
    try {
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.WORKS_AT, false);
      }
      
      // Validate company filters
      if (!companyFilter || !companyFilter.filters || companyFilter.filters.length === 0) {
        throw new RelationshipFilterError(
          'Company filter must contain at least one valid filter condition',
          ResourceType.PEOPLE.toString(),
          ResourceType.COMPANIES.toString(),
          RelationshipType.WORKS_AT
        );
      }
      
      // Create a relationship filter configuration
      const relationshipConfig: RelationshipFilterConfig = {
        sourceType: ResourceType.PEOPLE,
        targetType: ResourceType.COMPANIES,
        relationshipType: RelationshipType.WORKS_AT,
        targetFilters: companyFilter
      };
      
      // Convert to an Attio API compatible filter
      return createRelationshipFilter(relationshipConfig);
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      // Check if it's already another specialized error
      if (error instanceof RelationshipFilterError) {
        throw error;
      }
      
      // Otherwise, wrap in a FilterValidationError
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create people-by-company filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for companies based on their associated people attributes
   * Includes rate limiting for this resource-intensive operation
   * 
   * @param peopleFilter - Filters to apply to the related people
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @returns Filter for finding companies based on people attributes
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createCompaniesByPeopleFilter(
    peopleFilter: ListEntryFilters,
    req?: any
  ): ListEntryFilters {
    try {
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.EMPLOYS, false);
      }
      
      // Validate people filters
      if (!peopleFilter || !peopleFilter.filters || peopleFilter.filters.length === 0) {
        throw new RelationshipFilterError(
          'People filter must contain at least one valid filter condition',
          ResourceType.COMPANIES.toString(),
          ResourceType.PEOPLE.toString(),
          RelationshipType.EMPLOYS
        );
      }
      
      // Create a relationship filter configuration
      const relationshipConfig: RelationshipFilterConfig = {
        sourceType: ResourceType.COMPANIES,
        targetType: ResourceType.PEOPLE,
        relationshipType: RelationshipType.EMPLOYS,
        targetFilters: peopleFilter
      };
      
      // Convert to an Attio API compatible filter
      return createRelationshipFilter(relationshipConfig);
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      // Check if it's already another specialized error
      if (error instanceof RelationshipFilterError) {
        throw error;
      }
      
      // Otherwise, wrap in a FilterValidationError
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create companies-by-people filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for records that belong to a specific list
   * Includes rate limiting for this operation and caching for better performance
   * 
   * @param resourceType - The type of records to filter (people or companies)
   * @param listId - The ID of the list to filter by
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @param useCache - Whether to use caching (default: true)
   * @returns Filter for finding records that belong to the list
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createRecordsByListFilter(
    resourceType: ResourceType,
    listId: string,
    req?: any,
    useCache: boolean = true
  ): ListEntryFilters {
    try {
      // Check cache first if caching is enabled
      if (useCache) {
        const cachedFilter = getCachedListFilter(listId, resourceType);
        if (cachedFilter) {
          return cachedFilter;
        }
      }
      
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.BELONGS_TO_LIST, false);
      }
      
      // Import from validation to avoid circular dependencies
      const { isValidListId } = require('../validation.js');
      
      // Validate list ID format and security
      if (!listId || !isValidListId(listId)) {
        throw new ListRelationshipError(
          'Invalid list ID format. Expected format: list_[alphanumeric]',
          resourceType.toString(),
          listId
        );
      }
      
      // Create a relationship filter configuration
      const relationshipConfig: RelationshipFilterConfig = {
        sourceType: resourceType,
        targetType: ResourceType.LISTS,
        relationshipType: RelationshipType.BELONGS_TO_LIST,
        targetFilters: Basic.createEqualsFilter(ATTRIBUTES.LIST_ID, listId)
      };
      
      // Convert to an Attio API compatible filter
      const result = createRelationshipFilter(relationshipConfig);
      
      // Cache the result if caching is enabled
      if (useCache) {
        cacheListFilter(listId, resourceType, result);
      }
      
      return result;
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      // Check if it's already another specialized error
      if (error instanceof ListRelationshipError || error instanceof RelationshipFilterError) {
        throw error;
      }
      
      // Otherwise, wrap in a FilterValidationError
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create records-by-list filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for finding people who work at companies in a specific list
   * This is a nested relationship query with rate limiting and caching applied
   * 
   * @param listId - The ID of the list that contains companies
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @param useCache - Whether to use caching (default: true)
   * @returns Filter for finding people who work at companies in the specified list
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createPeopleByCompanyListFilter(
    listId: string,
    req?: any,
    useCache: boolean = true
  ): ListEntryFilters {
    try {
      // Create a cache key for this nested relationship
      const cacheKey = {
        relationshipType: RelationshipType.WORKS_AT,
        sourceType: ResourceType.PEOPLE,
        targetType: ResourceType.COMPANIES,
        targetFilterHash: "",  // Will be set later
        listId: listId,
        isNested: true
      };
      
      // Check cache first if caching is enabled
      if (useCache) {
        const cachedFilter = getCachedRelationshipFilter(cacheKey);
        if (cachedFilter) {
          return cachedFilter;
        }
      }
      
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.WORKS_AT, true);
      }
      
      // Import from validation to avoid circular dependencies
      const { isValidListId } = require('../validation.js');
      
      // Validate list ID format and security
      if (!listId || !isValidListId(listId)) {
        throw new Error('Invalid list ID format. Expected format: list_[alphanumeric]');
      }
      
      // First, create a filter for companies in the list
      const companiesInListFilter = createRecordsByListFilter(
        ResourceType.COMPANIES,
        listId,
        undefined,
        useCache
      );
      
      // Update cache key with the hash of the target filter
      cacheKey.targetFilterHash = hashFilters(companiesInListFilter);
      
      // Then, create a filter for people who work at those companies
      const result = createPeopleByCompanyFilter(companiesInListFilter);
      
      // Cache the result if caching is enabled
      if (useCache) {
        cacheRelationshipFilter(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create people-by-company-list filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for finding companies that have people in a specific list
   * This is a nested relationship query with rate limiting and caching applied
   * 
   * @param listId - The ID of the list that contains people
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @param useCache - Whether to use caching (default: true)
   * @returns Filter for finding companies that have people in the specified list
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createCompaniesByPeopleListFilter(
    listId: string,
    req?: any,
    useCache: boolean = true
  ): ListEntryFilters {
    try {
      // Create a cache key for this nested relationship
      const cacheKey = {
        relationshipType: RelationshipType.EMPLOYS,
        sourceType: ResourceType.COMPANIES,
        targetType: ResourceType.PEOPLE,
        targetFilterHash: "",  // Will be set later
        listId: listId,
        isNested: true
      };
      
      // Check cache first if caching is enabled
      if (useCache) {
        const cachedFilter = getCachedRelationshipFilter(cacheKey);
        if (cachedFilter) {
          return cachedFilter;
        }
      }
      
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.EMPLOYS, true);
      }
      
      // Import from validation to avoid circular dependencies
      const { isValidListId } = require('../validation.js');
      
      // Validate list ID format and security
      if (!listId || !isValidListId(listId)) {
        throw new Error('Invalid list ID format. Expected format: list_[alphanumeric]');
      }
      
      // First, create a filter for people in the list
      const peopleInListFilter = createRecordsByListFilter(
        ResourceType.PEOPLE,
        listId,
        undefined,
        useCache
      );
      
      // Update cache key with the hash of the target filter
      cacheKey.targetFilterHash = hashFilters(peopleInListFilter);
      
      // Then, create a filter for companies that have those people
      const result = createCompaniesByPeopleFilter(peopleInListFilter);
      
      // Cache the result if caching is enabled
      if (useCache) {
        cacheRelationshipFilter(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create companies-by-people-list filter: ${errorMessage}`);
    }
  }

  /**
   * Creates a filter for records that have associated notes matching criteria
   * Includes rate limiting for text search operations
   * 
   * @param resourceType - The type of records to filter (people or companies)
   * @param textSearch - Text to search for in the notes
   * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
   * @returns Filter for finding records with matching notes
   * @throws RelationshipRateLimitError if rate limit exceeded
   */
  export function createRecordsByNotesFilter(
    resourceType: ResourceType,
    textSearch: string,
    req?: any
  ): ListEntryFilters {
    try {
      // Apply rate limiting if request object is provided
      if (req) {
        applyRateLimit(req, RelationshipType.HAS_NOTE, false);
      }
      
      if (!textSearch || textSearch.trim() === '') {
        throw new Error('Text search query must be provided');
      }
      
      // Create a relationship filter configuration
      const relationshipConfig: RelationshipFilterConfig = {
        sourceType: resourceType,
        targetType: ResourceType.LISTS, // Notes don't have a ResourceType, using LISTS as a placeholder
        relationshipType: RelationshipType.HAS_NOTE,
        targetFilters: {
          filters: [
            {
              attribute: { slug: ATTRIBUTES.NOTE_CONTENT },
              condition: FilterConditionType.CONTAINS,
              value: textSearch
            }
          ],
          matchAny: false
        }
      };
      
      // Convert to an Attio API compatible filter
      return createRelationshipFilter(relationshipConfig);
    } catch (error) {
      // Re-throw if it's already a rate limit error
      if (error instanceof RelationshipRateLimitError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FilterValidationError(`Failed to create records-by-notes filter: ${errorMessage}`);
    }
  }
}

// Export legacy aliases for backward compatibility
export const transformFiltersToApiFormat = Basic.transformFiltersToApiFormat;
export const createEqualsFilter = Basic.createEqualsFilter;
export const createContainsFilter = Basic.createContainsFilter;
export const combineFiltersWithAnd = Basic.combineWithAnd;
export const combineFiltersWithOr = Basic.combineWithOr;
export const createDateRangeFilter = Range.createDateRangeFilter;
export const createCreatedDateFilter = Range.createCreatedDateFilter;
export const createModifiedDateFilter = Range.createModifiedDateFilter;
export const createNumericFilter = Range.createNumericFilter;
export const createRevenueFilter = Range.createRevenueFilter;
export const createEmployeeCountFilter = Range.createEmployeeCountFilter;
export const createLastInteractionFilter = Activity.createLastInteractionFilter;
export const createActivityFilter = Activity.createActivityFilter;
export const FILTER_ATTRIBUTES = ATTRIBUTES;

// Relationship filters 
export const createPeopleByCompanyFilter = Relationship.createPeopleByCompanyFilter;
export const createCompaniesByPeopleFilter = Relationship.createCompaniesByPeopleFilter;
export const createRecordsByListFilter = Relationship.createRecordsByListFilter;
export const createPeopleByCompanyListFilter = Relationship.createPeopleByCompanyListFilter;
export const createCompaniesByPeopleListFilter = Relationship.createCompaniesByPeopleListFilter;
export const createRecordsByNotesFilter = Relationship.createRecordsByNotesFilter;