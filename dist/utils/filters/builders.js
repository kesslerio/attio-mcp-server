/**
 * @module builders
 *
 * Filter builder functions for constructing filter objects
 * Provides utilities for creating various types of filters
 *
 * This module provides:
 * - Simple filter builders (equals, contains)
 * - Complex filter builders (date ranges, numeric ranges)
 * - Specialized builders (phone, email, industry)
 * - Activity and interaction filters
 * - Combination utilities (AND/OR filters)
 */
// External dependencies
import { FilterValidationError } from "../../errors/api-errors.js";
import { resolveDateRange } from "../date-utils.js";
// Internal module dependencies
import { FilterConditionType, InteractionType, ATTRIBUTES, FIELD_SPECIAL_HANDLING } from "./types.js";
import { validateDateRange, validateActivityFilter, validateNumericRange } from "./validators.js";
/**
 * Creates a simple equals filter for any attribute
 *
 * @param attributeSlug - The attribute to filter on
 * @param value - The exact value to match
 * @returns Configured filter object
 */
export function createEqualsFilter(attributeSlug, value) {
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
export function createContainsFilter(attributeSlug, value) {
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
export function createDateRangeFilter(attributeSlug, dateRange) {
    try {
        const validatedDateRange = validateDateRange(dateRange);
        const resolvedDateRange = resolveDateRange(validatedDateRange);
        const filters = [];
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
    }
    catch (error) {
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
export function createNumericFilter(attributeSlug, range) {
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
        const filters = [];
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
    }
    catch (error) {
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
export function createActivityFilter(activityFilter) {
    const validated = validateActivityFilter(activityFilter);
    const filters = [];
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
export function createPhoneFilter(phoneCondition, phoneValue) {
    const filter = {
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
export function createEmailFilter(emailCondition, emailValue) {
    const filter = {
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
export function createIndustryFilter(industry, condition = FilterConditionType.EQUALS) {
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
export function createEmployeeCountFilter(range) {
    return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
}
/**
 * Creates a filter for annual revenue
 *
 * @param range - Numeric range specification
 * @returns Configured filter object
 */
export function createRevenueFilter(range) {
    return createNumericFilter(ATTRIBUTES.REVENUE, range);
}
/**
 * Creates a filter for records based on their creation date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createCreatedDateFilter(dateRange) {
    return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
}
/**
 * Creates a filter for records based on their last modification date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export function createModifiedDateFilter(dateRange) {
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
export function createLastInteractionFilter(dateRange, interactionType) {
    try {
        // Basic date range filter on the last_interaction attribute
        const filters = [];
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
    }
    catch (error) {
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
export function createListFilter(listId) {
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
export function createFilterWithSpecialHandling(attributeSlug, operator, value) {
    const specialHandling = FIELD_SPECIAL_HANDLING[attributeSlug];
    if (!specialHandling) {
        // No special handling, create standard filter
        return {
            filters: [
                {
                    attribute: { slug: attributeSlug },
                    condition: operator,
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
                condition: mappedOperator,
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
export function createOrFilter(...filterSets) {
    const allFilters = [];
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
export function createAndFilter(...filterSets) {
    const allFilters = [];
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
export function combineWithAnd(...filters) {
    return createAndFilter(...filters);
}
/**
 * Combines multiple filters with OR logic
 * Alias for backward compatibility
 *
 * @param filters - Array of filters to combine
 * @returns Combined filter with OR logic
 */
export function combineWithOr(...filters) {
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
//# sourceMappingURL=builders.js.map