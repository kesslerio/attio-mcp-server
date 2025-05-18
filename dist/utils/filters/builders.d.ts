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
import { FilterConditionType, ListEntryFilters, DateRange, NumericRange, ActivityFilter, InteractionType } from "./types.js";
/**
 * Creates a simple equals filter for any attribute
 *
 * @param attributeSlug - The attribute to filter on
 * @param value - The exact value to match
 * @returns Configured filter object
 */
export declare function createEqualsFilter(attributeSlug: string, value: any): ListEntryFilters;
/**
 * Creates a simple contains filter for text attributes
 *
 * @param attributeSlug - The attribute to filter on
 * @param value - The text to search for
 * @returns Configured filter object
 */
export declare function createContainsFilter(attributeSlug: string, value: string): ListEntryFilters;
/**
 * Creates a date range filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createDateRangeFilter(attributeSlug: string, dateRange: DateRange): ListEntryFilters;
/**
 * Creates a numeric filter for a specific attribute
 *
 * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
 * @param range - Numeric range specification
 * @returns Configured filter object
 * @throws Error when range is invalid
 */
export declare function createNumericFilter(attributeSlug: string, range: NumericRange): ListEntryFilters;
/**
 * Creates an activity filter for finding records with specific interaction types
 * within a date range
 *
 * @param activityFilter - Activity filter specification
 * @returns Configured filter object
 */
export declare function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters;
/**
 * Creates a phone number filter
 *
 * @param phoneCondition - Filter condition for phone number
 * @param phoneValue - Phone number value to filter on
 * @returns Configured filter object
 */
export declare function createPhoneFilter(phoneCondition: FilterConditionType, phoneValue?: string): ListEntryFilters;
/**
 * Creates an email filter
 *
 * @param emailCondition - Filter condition for email
 * @param emailValue - Email value to filter on
 * @returns Configured filter object
 */
export declare function createEmailFilter(emailCondition: FilterConditionType, emailValue?: string): ListEntryFilters;
/**
 * Creates a filter for a specific industry
 *
 * @param industry - Industry name to filter on
 * @param condition - Filter condition (defaults to EQUALS)
 * @returns Configured filter object
 */
export declare function createIndustryFilter(industry: string, condition?: FilterConditionType): ListEntryFilters;
/**
 * Creates a filter for employee count
 *
 * @param range - Numeric range specification
 * @returns Configured filter object
 */
export declare function createEmployeeCountFilter(range: NumericRange): ListEntryFilters;
/**
 * Creates a filter for annual revenue
 *
 * @param range - Numeric range specification
 * @returns Configured filter object
 */
export declare function createRevenueFilter(range: NumericRange): ListEntryFilters;
/**
 * Creates a filter for records based on their creation date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters;
/**
 * Creates a filter for records based on their last modification date
 *
 * @param dateRange - Date range specification
 * @returns Configured filter object
 */
export declare function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters;
/**
 * Creates a filter for records based on their last interaction date
 * Optionally filtered by interaction type (email, calendar, etc.)
 *
 * @param dateRange - Date range specification
 * @param interactionType - Optional type of interaction to filter by
 * @returns Configured filter object
 */
export declare function createLastInteractionFilter(dateRange: DateRange, interactionType?: InteractionType): ListEntryFilters;
/**
 * Creates a filter for objects in a specific list
 *
 * @param listId - The ID of the list to filter on
 * @returns Configured filter object
 */
export declare function createListFilter(listId: string): ListEntryFilters;
/**
 * Creates filters using special field handling rules
 *
 * @param attributeSlug - The attribute to filter on
 * @param operator - The operator to use
 * @param value - The value to filter on
 * @returns Configured filter object
 */
export declare function createFilterWithSpecialHandling(attributeSlug: string, operator: string, value: any): ListEntryFilters;
/**
 * Combines multiple filter sets using OR logic
 *
 * @param filterSets - Array of filter sets to combine
 * @returns Combined filter object with OR logic
 */
export declare function createOrFilter(...filterSets: ListEntryFilters[]): ListEntryFilters;
/**
 * Combines multiple filter sets using AND logic
 *
 * @param filterSets - Array of filter sets to combine
 * @returns Combined filter object with AND logic
 */
export declare function createAndFilter(...filterSets: ListEntryFilters[]): ListEntryFilters;
/**
 * Combines multiple filters with AND logic
 * Alias for backward compatibility
 *
 * @param filters - Array of filters to combine
 * @returns Combined filter with AND logic
 */
export declare function combineWithAnd(...filters: ListEntryFilters[]): ListEntryFilters;
/**
 * Combines multiple filters with OR logic
 * Alias for backward compatibility
 *
 * @param filters - Array of filters to combine
 * @returns Combined filter with OR logic
 */
export declare function combineWithOr(...filters: ListEntryFilters[]): ListEntryFilters;
/**
 * Alias for combineWithAnd for backward compatibility
 */
export declare const combineFiltersWithAnd: typeof combineWithAnd;
/**
 * Alias for combineWithOr for backward compatibility
 */
export declare const combineFiltersWithOr: typeof combineWithOr;
//# sourceMappingURL=builders.d.ts.map