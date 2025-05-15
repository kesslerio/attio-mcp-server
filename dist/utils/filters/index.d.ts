/**
 * Consolidated filter utilities for Attio API
 * Provides a central namespace for all filter-related functionality
 */
import { DateRange, NumericRange, InteractionType, ActivityFilter, RelationshipType, ResourceType } from "../../types/attio.js";
import { ListEntryFilter, ListEntryFilters } from "../../api/attio-operations.js";
/**
 * Attribute constants for better code readability and consistency
 */
export declare const ATTRIBUTES: {
    CREATED_AT: string;
    UPDATED_AT: string;
    LAST_INTERACTION: string;
    INTERACTION_TYPE: string;
    EMAIL: string;
    PHONE: string;
    NAME: string;
    WEBSITE: string;
    INDUSTRY: string;
    REVENUE: string;
    EMPLOYEE_COUNT: string;
    LIST_ID: string;
    NOTE_CONTENT: string;
    RELATIONSHIP: string;
};
/**
 * Type for the Attio API filter object format
 * Represents the structure expected by Attio API endpoints
 */
export type AttioApiFilter = {
    [attributeSlug: string]: {
        [condition: string]: any;
    };
};
/**
 * Error type for rate-limiting on relationship queries
 */
export declare class RelationshipRateLimitError extends Error {
    readonly relationshipType: string;
    readonly resetTime: number;
    readonly msUntilReset: number;
    constructor(message: string, relationshipType: string, resetTime: number, msUntilReset: number);
}
/**
 * Configuration for a relationship-based filter
 */
export interface RelationshipFilterConfig {
    sourceType: ResourceType;
    targetType: ResourceType;
    relationshipType: RelationshipType;
    targetFilters: ListEntryFilters;
}
/**
 * Basic filter validation and transformation
 */
export declare namespace Basic {
    /**
     * Validates a filter structure for basic required properties
     *
     * @param filter - The filter to validate
     * @returns True if filter is valid, false otherwise
     */
    function validateFilterStructure(filter: ListEntryFilter): boolean;
    /**
     * Transforms list entry filters to the format expected by the Attio API
     * This function handles both simple filters and advanced filters with logical operators
     *
     * @param filters - Filter configuration from the MCP API
     * @param validateConditions - Whether to validate condition types (default: true)
     * @returns Transformed filter object for Attio API
     * @throws FilterValidationError if validation fails
     */
    function transformFiltersToApiFormat(filters: ListEntryFilters | undefined, validateConditions?: boolean): {
        filter?: AttioApiFilter;
    };
    /**
     * Creates a simple equals filter for any attribute
     *
     * @param attributeSlug - The attribute to filter on
     * @param value - The exact value to match
     * @returns Configured filter object
     */
    function createEqualsFilter(attributeSlug: string, value: any): ListEntryFilters;
    /**
     * Creates a simple contains filter for text attributes
     *
     * @param attributeSlug - The attribute to filter on
     * @param value - The text to search for
     * @returns Configured filter object
     */
    function createContainsFilter(attributeSlug: string, value: string): ListEntryFilters;
    /**
     * Combines multiple filters with AND logic
     *
     * @param filters - Array of filters to combine
     * @returns Combined filter with AND logic
     */
    function combineWithAnd(...filters: ListEntryFilters[]): ListEntryFilters;
    /**
     * Combines multiple filters with OR logic
     *
     * @param filters - Array of filters to combine
     * @returns Combined filter with OR logic
     */
    function combineWithOr(...filters: ListEntryFilters[]): ListEntryFilters;
}
/**
 * Date and numeric range filtering utilities
 */
export declare namespace Range {
    /**
     * Creates a date range filter for a specific attribute
     *
     * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createDateRangeFilter(attributeSlug: string, dateRange: DateRange): ListEntryFilters;
    /**
     * Creates a filter for records based on their creation date
     *
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createCreatedDateFilter(dateRange: DateRange): ListEntryFilters;
    /**
     * Creates a filter for records based on their last modification date
     *
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createModifiedDateFilter(dateRange: DateRange): ListEntryFilters;
    /**
     * Creates a numeric filter for filtering by number values
     *
     * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
     * @param range - Numeric range specification with min, max, or equals
     * @returns Configured filter object
     */
    function createNumericFilter(attributeSlug: string, range: NumericRange): ListEntryFilters;
    /**
     * Creates a revenue filter for companies
     *
     * @param range - Revenue range in numeric form
     * @returns Configured filter object
     */
    function createRevenueFilter(range: NumericRange): ListEntryFilters;
    /**
     * Creates an employee count filter for companies
     *
     * @param range - Employee count range in numeric form
     * @returns Configured filter object
     */
    function createEmployeeCountFilter(range: NumericRange): ListEntryFilters;
}
/**
 * Activity and interaction filtering utilities
 */
export declare namespace Activity {
    /**
     * Creates a filter for records based on their last interaction date
     * Optionally filtered by interaction type (email, calendar, etc.)
     *
     * @param dateRange - Date range specification
     * @param interactionType - Optional type of interaction to filter by
     * @returns Configured filter object
     */
    function createLastInteractionFilter(dateRange: DateRange, interactionType?: InteractionType): ListEntryFilters;
    /**
     * Creates a combined activity filter including date range and interaction type
     *
     * @param activityFilter - Activity filter configuration
     * @returns Configured filter object
     */
    function createActivityFilter(activityFilter: ActivityFilter): ListEntryFilters;
}
/**
 * Relationship filtering utilities
 * These utilities help create filters based on relationships between records
 */
export declare namespace Relationship {
    /**
     * Applies rate limiting to relationship queries
     * Throws RelationshipRateLimitError if the rate limit is exceeded
     *
     * @param req - Request object
     * @param relationshipType - Type of relationship query
     * @param isNested - Whether this is a nested relationship query
     * @throws RelationshipRateLimitError if rate limit exceeded
     */
    function applyRateLimit(req: any, relationshipType: string, isNested?: boolean): void;
    /**
     * Creates a filter for people based on their associated company attributes
     * Includes rate limiting for this resource-intensive operation
     *
     * @param companyFilter - Filters to apply to the related companies
     * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
     * @returns Filter for finding people based on company attributes
     * @throws RelationshipRateLimitError if rate limit exceeded
     */
    function createPeopleByCompanyFilter(companyFilter: ListEntryFilters, req?: any): ListEntryFilters;
    /**
     * Creates a filter for companies based on their associated people attributes
     * Includes rate limiting for this resource-intensive operation
     *
     * @param peopleFilter - Filters to apply to the related people
     * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
     * @returns Filter for finding companies based on people attributes
     * @throws RelationshipRateLimitError if rate limit exceeded
     */
    function createCompaniesByPeopleFilter(peopleFilter: ListEntryFilters, req?: any): ListEntryFilters;
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
    function createRecordsByListFilter(resourceType: ResourceType, listId: string, req?: any, useCache?: boolean): ListEntryFilters;
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
    function createPeopleByCompanyListFilter(listId: string, req?: any, useCache?: boolean): ListEntryFilters;
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
    function createCompaniesByPeopleListFilter(listId: string, req?: any, useCache?: boolean): ListEntryFilters;
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
    function createRecordsByNotesFilter(resourceType: ResourceType, textSearch: string, req?: any): ListEntryFilters;
}
export declare const transformFiltersToApiFormat: typeof Basic.transformFiltersToApiFormat;
export declare const createEqualsFilter: typeof Basic.createEqualsFilter;
export declare const createContainsFilter: typeof Basic.createContainsFilter;
export declare const combineFiltersWithAnd: typeof Basic.combineWithAnd;
export declare const combineFiltersWithOr: typeof Basic.combineWithOr;
export declare const createDateRangeFilter: typeof Range.createDateRangeFilter;
export declare const createCreatedDateFilter: typeof Range.createCreatedDateFilter;
export declare const createModifiedDateFilter: typeof Range.createModifiedDateFilter;
export declare const createNumericFilter: typeof Range.createNumericFilter;
export declare const createRevenueFilter: typeof Range.createRevenueFilter;
export declare const createEmployeeCountFilter: typeof Range.createEmployeeCountFilter;
export declare const createLastInteractionFilter: typeof Activity.createLastInteractionFilter;
export declare const createActivityFilter: typeof Activity.createActivityFilter;
export declare const FILTER_ATTRIBUTES: {
    CREATED_AT: string;
    UPDATED_AT: string;
    LAST_INTERACTION: string;
    INTERACTION_TYPE: string;
    EMAIL: string;
    PHONE: string;
    NAME: string;
    WEBSITE: string;
    INDUSTRY: string;
    REVENUE: string;
    EMPLOYEE_COUNT: string;
    LIST_ID: string;
    NOTE_CONTENT: string;
    RELATIONSHIP: string;
};
export declare const createPeopleByCompanyFilter: typeof Relationship.createPeopleByCompanyFilter;
export declare const createCompaniesByPeopleFilter: typeof Relationship.createCompaniesByPeopleFilter;
export declare const createRecordsByListFilter: typeof Relationship.createRecordsByListFilter;
export declare const createPeopleByCompanyListFilter: typeof Relationship.createPeopleByCompanyListFilter;
export declare const createCompaniesByPeopleListFilter: typeof Relationship.createCompaniesByPeopleListFilter;
export declare const createRecordsByNotesFilter: typeof Relationship.createRecordsByNotesFilter;
//# sourceMappingURL=index.d.ts.map