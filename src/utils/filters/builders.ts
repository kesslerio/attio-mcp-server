/**
 * Filter builder functions for constructing filter objects
 * Provides utilities for creating various types of filters
 */

import {
  FilterConditionType,
  ListEntryFilters,
  ListEntryFilter,
  DateRange,
  NumericRange,
  ActivityFilter,
  InteractionType,
  ATTRIBUTES,
  FIELD_SPECIAL_HANDLING
} from "./types.js";
import { 
  validateDateRange,
  validateActivityFilter,
  validateNumericRange 
} from "./validators.js";
import { FilterValidationError } from "../../errors/api-errors.js";
import { resolveDateRange } from "../date-utils.js";

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
    const validatedDateRange = validateDateRange(dateRange);
    const resolvedDateRange = resolveDateRange(validatedDateRange);
    const filters: ListEntryFilter[] = [];
    
    // Add filter for start date if specified (using greater than or equal)
    if (resolvedDateRange.start) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: resolvedDateRange.start
      });
    }
    
    // Add filter for end date if specified (using less than or equal)
    if (resolvedDateRange.end) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: resolvedDateRange.end
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
 * Creates a numeric filter for a specific attribute
 * 
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export function createNumericFilter(
  attributeSlug: string,
  range: NumericRange
): ListEntryFilters {
  try {
    const validatedRange = validateNumericRange(range);
    
    // If equals is specified, use simple equals filter
    if (validatedRange.equals !== undefined) {
      return {
        filters: [
          {
            attribute: { slug: attributeSlug },
            condition: FilterConditionType.EQUALS,
            value: validatedRange.equals
          }
        ],
        matchAny: false
      };
    }
    
    const filters: ListEntryFilter[] = [];
    
    // Handle min value (greater than or equal)
    if (validatedRange.min !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.GREATER_THAN_OR_EQUALS,
        value: validatedRange.min
      });
    }
    
    // Handle max value (less than or equal)
    if (validatedRange.max !== undefined) {
      filters.push({
        attribute: { slug: attributeSlug },
        condition: FilterConditionType.LESS_THAN_OR_EQUALS,
        value: validatedRange.max
      });
    }
    
    return {
      filters,
      // When both min and max are specified, we want records that match both (AND logic)
      matchAny: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FilterValidationError(`Failed to create numeric filter: ${errorMessage}`);
  }
}

/**
 * Creates an activity filter for finding records with specific interaction types
 * within a date range
 * 
 * @param activityFilter - Activity filter specification
 * @returns Configured filter object
 */
export function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters {
  const validated = validateActivityFilter(activityFilter);
  const filters: ListEntryFilter[] = [];
  
  // Create date range filter for last_interaction
  const dateFilter = createDateRangeFilter(ATTRIBUTES.LAST_INTERACTION, validated.dateRange);
  if (dateFilter.filters) {
    filters.push(...dateFilter.filters);
  }
  
  // Add interaction type filter if specified
  if (validated.interactionType) {
    filters.push({
      attribute: { slug: ATTRIBUTES.INTERACTION_TYPE },
      condition: FilterConditionType.EQUALS,
      value: validated.interactionType
    });
  }
  
  return {
    filters,
    matchAny: false
  };
}

/**
 * Creates a phone number filter
 * 
 * @param phoneCondition - Filter condition for phone number
 * @param phoneValue - Phone number value to filter on
 * @returns Configured filter object
 */
export function createPhoneFilter(
  phoneCondition: FilterConditionType,
  phoneValue?: string
): ListEntryFilters {
  const filter: ListEntryFilter = {
    attribute: { slug: ATTRIBUTES.PHONE },
    condition: phoneCondition,
    value: phoneValue
  };
  
  // Remove value for empty/not_empty conditions
  if (phoneCondition === FilterConditionType.IS_EMPTY || 
      phoneCondition === FilterConditionType.IS_NOT_EMPTY) {
    delete filter.value;
  }
  
  return {
    filters: [filter],
    matchAny: false
  };
}

/**
 * Creates an email filter  
 * 
 * @param emailCondition - Filter condition for email
 * @param emailValue - Email value to filter on
 * @returns Configured filter object
 */
export function createEmailFilter(
  emailCondition: FilterConditionType,
  emailValue?: string
): ListEntryFilters {
  const filter: ListEntryFilter = {
    attribute: { slug: ATTRIBUTES.EMAIL },
    condition: emailCondition,
    value: emailValue
  };
  
  // Remove value for empty/not_empty conditions
  if (emailCondition === FilterConditionType.IS_EMPTY || 
      emailCondition === FilterConditionType.IS_NOT_EMPTY) {
    delete filter.value;
  }
  
  return {
    filters: [filter],
    matchAny: false
  };
}

/**
 * Creates a filter for a specific industry
 * 
 * @param industry - Industry name to filter on
 * @param condition - Filter condition (defaults to EQUALS)
 * @returns Configured filter object
 */
export function createIndustryFilter(
  industry: string,
  condition: FilterConditionType = FilterConditionType.EQUALS
): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: ATTRIBUTES.INDUSTRY },
        condition,
        value: industry
      }
    ],
    matchAny: false
  };
}

/**
 * Creates a filter for employee count
 * 
 * @param range - Numeric range specification
 * @returns Configured filter object
 */
export function createEmployeeCountFilter(
  range: NumericRange
): ListEntryFilters {
  return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
}

/**
 * Creates a filter for annual revenue
 * 
 * @param range - Numeric range specification
 * @returns Configured filter object
 */
export function createRevenueFilter(
  range: NumericRange
): ListEntryFilters {
  return createNumericFilter(ATTRIBUTES.REVENUE, range);
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
 * Creates a filter for objects in a specific list
 * 
 * @param listId - The ID of the list to filter on
 * @returns Configured filter object
 */
export function createListFilter(listId: string): ListEntryFilters {
  return {
    filters: [
      {
        attribute: { slug: ATTRIBUTES.LIST_ID },
        condition: FilterConditionType.EQUALS,
        value: listId
      }
    ],
    matchAny: false
  };
}

/**
 * Creates filters using special field handling rules
 * 
 * @param attributeSlug - The attribute to filter on
 * @param operator - The operator to use
 * @param value - The value to filter on
 * @returns Configured filter object
 */
export function createFilterWithSpecialHandling(
  attributeSlug: string,
  operator: string,
  value: any
): ListEntryFilters {
  const specialHandling = FIELD_SPECIAL_HANDLING[attributeSlug];
  
  if (!specialHandling) {
    // No special handling, create standard filter
    return {
      filters: [
        {
          attribute: { slug: attributeSlug },
          condition: operator as FilterConditionType,
          value
        }
      ],
      matchAny: false
    };
  }
  
  // Apply special handling rules
  const mappedOperator = specialHandling[operator] || operator;
  let processedValue = value;
  
  // Handle special value processing if needed
  if (specialHandling.allowStringValue && typeof value === 'string') {
    // Value is already a string, no conversion needed
    processedValue = value;
  }
  
  return {
    filters: [
      {
        attribute: { slug: attributeSlug },
        condition: mappedOperator as FilterConditionType,
        value: processedValue
      }
    ],
    matchAny: false
  };
}

/**
 * Combines multiple filter sets using OR logic
 * 
 * @param filterSets - Array of filter sets to combine
 * @returns Combined filter object with OR logic
 */
export function createOrFilter(...filterSets: ListEntryFilters[]): ListEntryFilters {
  const allFilters: ListEntryFilter[] = [];
  
  filterSets.forEach(filterSet => {
    if (filterSet.filters) {
      allFilters.push(...filterSet.filters);
    }
  });
  
  return {
    filters: allFilters,
    matchAny: true
  };
}

/**
 * Combines multiple filter sets using AND logic
 * 
 * @param filterSets - Array of filter sets to combine
 * @returns Combined filter object with AND logic
 */
export function createAndFilter(...filterSets: ListEntryFilters[]): ListEntryFilters {
  const allFilters: ListEntryFilter[] = [];
  
  filterSets.forEach(filterSet => {
    if (filterSet.filters) {
      allFilters.push(...filterSet.filters);
    }
  });
  
  return {
    filters: allFilters,
    matchAny: false
  };
}

/**
 * Combines multiple filters with AND logic
 * Alias for backward compatibility
 * 
 * @param filters - Array of filters to combine
 * @returns Combined filter with AND logic
 */
export function combineWithAnd(...filters: ListEntryFilters[]): ListEntryFilters {
  return createAndFilter(...filters);
}

/**
 * Combines multiple filters with OR logic
 * Alias for backward compatibility
 * 
 * @param filters - Array of filters to combine
 * @returns Combined filter with OR logic
 */
export function combineWithOr(...filters: ListEntryFilters[]): ListEntryFilters {
  return createOrFilter(...filters);
}

/**
 * Alias for combineWithAnd for backward compatibility
 */
export const combineFiltersWithAnd = combineWithAnd;

/**
 * Alias for combineWithOr for backward compatibility
 */
export const combineFiltersWithOr = combineWithOr;