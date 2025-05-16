/**
 * Consolidated filter utilities for Attio API
 * Provides a central namespace for all filter-related functionality
 */
import { isValidFilterCondition, FilterConditionType, InteractionType, RelationshipType, ResourceType } from "../../types/attio.js";
import { FilterValidationError, RelationshipFilterError, ListRelationshipError } from "../../errors/api-errors.js";
import { resolveDateRange } from "../date-utils.js";
import { checkRelationshipQueryRateLimit } from "../rate-limiter.js";
import { getCachedRelationshipFilter, cacheRelationshipFilter, getCachedListFilter, cacheListFilter, hashFilters } from "./cache.js";
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
 * Error type for rate-limiting on relationship queries
 */
export class RelationshipRateLimitError extends Error {
    relationshipType;
    resetTime;
    msUntilReset;
    constructor(message, relationshipType, resetTime, msUntilReset) {
        super(message);
        this.relationshipType = relationshipType;
        this.resetTime = resetTime;
        this.msUntilReset = msUntilReset;
        this.name = 'RelationshipRateLimitError';
        // This line is needed to properly capture the stack trace
        Object.setPrototypeOf(this, RelationshipRateLimitError.prototype);
    }
}
/**
 * Basic filter validation and transformation
 */
export var Basic;
(function (Basic) {
    /**
     * Validates a filter structure for basic required properties
     *
     * @param filter - The filter to validate
     * @returns True if filter is valid, false otherwise
     */
    function validateFilterStructure(filter) {
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
    Basic.validateFilterStructure = validateFilterStructure;
    /**
     * Transforms list entry filters to the format expected by the Attio API
     * This function handles both simple filters and advanced filters with logical operators
     *
     * @param filters - Filter configuration from the MCP API
     * @param validateConditions - Whether to validate condition types (default: true)
     * @returns Transformed filter object for Attio API
     * @throws FilterValidationError if validation fails
     */
    function transformFiltersToApiFormat(filters, validateConditions = true) {
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
            const orConditions = [];
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
                    throw new FilterValidationError(`Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
                        `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`);
                }
                // Create a condition object for this individual filter
                const condition = {};
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
        const apiFilter = {};
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
                throw new FilterValidationError(`Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
                    `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`);
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
    Basic.transformFiltersToApiFormat = transformFiltersToApiFormat;
    /**
     * Creates a simple equals filter for any attribute
     *
     * @param attributeSlug - The attribute to filter on
     * @param value - The exact value to match
     * @returns Configured filter object
     */
    function createEqualsFilter(attributeSlug, value) {
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
    Basic.createEqualsFilter = createEqualsFilter;
    /**
     * Creates a simple contains filter for text attributes
     *
     * @param attributeSlug - The attribute to filter on
     * @param value - The text to search for
     * @returns Configured filter object
     */
    function createContainsFilter(attributeSlug, value) {
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
    Basic.createContainsFilter = createContainsFilter;
    /**
     * Combines multiple filters with AND logic
     *
     * @param filters - Array of filters to combine
     * @returns Combined filter with AND logic
     */
    function combineWithAnd(...filters) {
        const combinedFilters = [];
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
    Basic.combineWithAnd = combineWithAnd;
    /**
     * Combines multiple filters with OR logic
     *
     * @param filters - Array of filters to combine
     * @returns Combined filter with OR logic
     */
    function combineWithOr(...filters) {
        const combinedFilters = [];
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
    Basic.combineWithOr = combineWithOr;
})(Basic || (Basic = {}));
/**
 * Date and numeric range filtering utilities
 */
export var Range;
(function (Range) {
    /**
     * Creates a date range filter for a specific attribute
     *
     * @param attributeSlug - The attribute slug to filter on (e.g., 'created_at', 'modified_at')
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createDateRangeFilter(attributeSlug, dateRange) {
        try {
            // Resolve any relative dates to absolute ISO strings
            const resolvedRange = resolveDateRange(dateRange);
            const filters = [];
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create date range filter: ${errorMessage}`);
        }
    }
    Range.createDateRangeFilter = createDateRangeFilter;
    /**
     * Creates a filter for records based on their creation date
     *
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createCreatedDateFilter(dateRange) {
        return createDateRangeFilter(ATTRIBUTES.CREATED_AT, dateRange);
    }
    Range.createCreatedDateFilter = createCreatedDateFilter;
    /**
     * Creates a filter for records based on their last modification date
     *
     * @param dateRange - Date range specification
     * @returns Configured filter object
     */
    function createModifiedDateFilter(dateRange) {
        return createDateRangeFilter(ATTRIBUTES.UPDATED_AT, dateRange);
    }
    Range.createModifiedDateFilter = createModifiedDateFilter;
    /**
     * Creates a numeric filter for filtering by number values
     *
     * @param attributeSlug - The attribute slug to filter on (e.g., 'revenue', 'employee_count')
     * @param range - Numeric range specification with min, max, or equals
     * @returns Configured filter object
     */
    function createNumericFilter(attributeSlug, range) {
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
            const filters = [];
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create numeric filter for ${attributeSlug}: ${errorMessage}`);
        }
    }
    Range.createNumericFilter = createNumericFilter;
    /**
     * Creates a revenue filter for companies
     *
     * @param range - Revenue range in numeric form
     * @returns Configured filter object
     */
    function createRevenueFilter(range) {
        return createNumericFilter(ATTRIBUTES.REVENUE, range);
    }
    Range.createRevenueFilter = createRevenueFilter;
    /**
     * Creates an employee count filter for companies
     *
     * @param range - Employee count range in numeric form
     * @returns Configured filter object
     */
    function createEmployeeCountFilter(range) {
        return createNumericFilter(ATTRIBUTES.EMPLOYEE_COUNT, range);
    }
    Range.createEmployeeCountFilter = createEmployeeCountFilter;
})(Range || (Range = {}));
/**
 * Activity and interaction filtering utilities
 */
export var Activity;
(function (Activity) {
    /**
     * Creates a filter for records based on their last interaction date
     * Optionally filtered by interaction type (email, calendar, etc.)
     *
     * @param dateRange - Date range specification
     * @param interactionType - Optional type of interaction to filter by
     * @returns Configured filter object
     */
    function createLastInteractionFilter(dateRange, interactionType) {
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
    Activity.createLastInteractionFilter = createLastInteractionFilter;
    /**
     * Creates a combined activity filter including date range and interaction type
     *
     * @param activityFilter - Activity filter configuration
     * @returns Configured filter object
     */
    function createActivityFilter(activityFilter) {
        try {
            if (!activityFilter || !activityFilter.dateRange) {
                throw new Error('Activity filter must include a date range');
            }
            return createLastInteractionFilter(activityFilter.dateRange, activityFilter.interactionType);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create activity filter: ${errorMessage}`);
        }
    }
    Activity.createActivityFilter = createActivityFilter;
})(Activity || (Activity = {}));
/**
 * Relationship filtering utilities
 * These utilities help create filters based on relationships between records
 */
export var Relationship;
(function (Relationship) {
    /**
     * Applies rate limiting to relationship queries
     * Throws RelationshipRateLimitError if the rate limit is exceeded
     *
     * @param req - Request object
     * @param relationshipType - Type of relationship query
     * @param isNested - Whether this is a nested relationship query
     * @throws RelationshipRateLimitError if rate limit exceeded
     */
    function applyRateLimit(req, relationshipType, isNested = false) {
        // Check the rate limit
        const result = checkRelationshipQueryRateLimit(req, relationshipType, isNested);
        // If not allowed, throw rate limit error
        if (!result.allowed) {
            throw new RelationshipRateLimitError(`Rate limit exceeded for ${isNested ? 'nested ' : ''}relationship query of type '${relationshipType}'. Try again in ${Math.ceil(result.msUntilReset / 1000)} seconds.`, relationshipType, result.resetTime, result.msUntilReset);
        }
    }
    Relationship.applyRateLimit = applyRateLimit;
    /**
     * Core function to create relationship-based filters
     * This translates our internal representation to the format expected by the Attio API
     *
     * @param config - Relationship filter configuration
     * @returns Filter in the format expected by Attio API
     */
    function createRelationshipFilter(config) {
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
        const getObjectName = (type) => {
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
    function createPeopleByCompanyFilter(companyFilter, req) {
        try {
            // Apply rate limiting if request object is provided
            if (req) {
                applyRateLimit(req, RelationshipType.WORKS_AT, false);
            }
            // Validate company filters
            if (!companyFilter || !companyFilter.filters || companyFilter.filters.length === 0) {
                throw new RelationshipFilterError('Company filter must contain at least one valid filter condition', ResourceType.PEOPLE.toString(), ResourceType.COMPANIES.toString(), RelationshipType.WORKS_AT);
            }
            // Create a relationship filter configuration
            const relationshipConfig = {
                sourceType: ResourceType.PEOPLE,
                targetType: ResourceType.COMPANIES,
                relationshipType: RelationshipType.WORKS_AT,
                targetFilters: companyFilter
            };
            // Convert to an Attio API compatible filter
            return createRelationshipFilter(relationshipConfig);
        }
        catch (error) {
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
    Relationship.createPeopleByCompanyFilter = createPeopleByCompanyFilter;
    /**
     * Creates a filter for companies based on their associated people attributes
     * Includes rate limiting for this resource-intensive operation
     *
     * @param peopleFilter - Filters to apply to the related people
     * @param req - Optional request object for rate limiting (if not provided, rate limiting is skipped)
     * @returns Filter for finding companies based on people attributes
     * @throws RelationshipRateLimitError if rate limit exceeded
     */
    function createCompaniesByPeopleFilter(peopleFilter, req) {
        try {
            // Apply rate limiting if request object is provided
            if (req) {
                applyRateLimit(req, RelationshipType.EMPLOYS, false);
            }
            // Validate people filters
            if (!peopleFilter || !peopleFilter.filters || peopleFilter.filters.length === 0) {
                throw new RelationshipFilterError('People filter must contain at least one valid filter condition', ResourceType.COMPANIES.toString(), ResourceType.PEOPLE.toString(), RelationshipType.EMPLOYS);
            }
            // Create a relationship filter configuration
            const relationshipConfig = {
                sourceType: ResourceType.COMPANIES,
                targetType: ResourceType.PEOPLE,
                relationshipType: RelationshipType.EMPLOYS,
                targetFilters: peopleFilter
            };
            // Convert to an Attio API compatible filter
            return createRelationshipFilter(relationshipConfig);
        }
        catch (error) {
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
    Relationship.createCompaniesByPeopleFilter = createCompaniesByPeopleFilter;
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
    function createRecordsByListFilter(resourceType, listId, req, useCache = true) {
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
                throw new ListRelationshipError('Invalid list ID format. Expected format: list_[alphanumeric]', resourceType.toString(), listId);
            }
            // Create a relationship filter configuration
            const relationshipConfig = {
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
        }
        catch (error) {
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
    Relationship.createRecordsByListFilter = createRecordsByListFilter;
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
    function createPeopleByCompanyListFilter(listId, req, useCache = true) {
        try {
            // Create a cache key for this nested relationship
            const cacheKey = {
                relationshipType: RelationshipType.WORKS_AT,
                sourceType: ResourceType.PEOPLE,
                targetType: ResourceType.COMPANIES,
                targetFilterHash: "", // Will be set later
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
            const companiesInListFilter = createRecordsByListFilter(ResourceType.COMPANIES, listId, undefined, useCache);
            // Update cache key with the hash of the target filter
            cacheKey.targetFilterHash = hashFilters(companiesInListFilter);
            // Then, create a filter for people who work at those companies
            const result = createPeopleByCompanyFilter(companiesInListFilter);
            // Cache the result if caching is enabled
            if (useCache) {
                cacheRelationshipFilter(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            // Re-throw if it's already a rate limit error
            if (error instanceof RelationshipRateLimitError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create people-by-company-list filter: ${errorMessage}`);
        }
    }
    Relationship.createPeopleByCompanyListFilter = createPeopleByCompanyListFilter;
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
    function createCompaniesByPeopleListFilter(listId, req, useCache = true) {
        try {
            // Create a cache key for this nested relationship
            const cacheKey = {
                relationshipType: RelationshipType.EMPLOYS,
                sourceType: ResourceType.COMPANIES,
                targetType: ResourceType.PEOPLE,
                targetFilterHash: "", // Will be set later
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
            const peopleInListFilter = createRecordsByListFilter(ResourceType.PEOPLE, listId, undefined, useCache);
            // Update cache key with the hash of the target filter
            cacheKey.targetFilterHash = hashFilters(peopleInListFilter);
            // Then, create a filter for companies that have those people
            const result = createCompaniesByPeopleFilter(peopleInListFilter);
            // Cache the result if caching is enabled
            if (useCache) {
                cacheRelationshipFilter(cacheKey, result);
            }
            return result;
        }
        catch (error) {
            // Re-throw if it's already a rate limit error
            if (error instanceof RelationshipRateLimitError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create companies-by-people-list filter: ${errorMessage}`);
        }
    }
    Relationship.createCompaniesByPeopleListFilter = createCompaniesByPeopleListFilter;
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
    function createRecordsByNotesFilter(resourceType, textSearch, req) {
        try {
            // Apply rate limiting if request object is provided
            if (req) {
                applyRateLimit(req, RelationshipType.HAS_NOTE, false);
            }
            if (!textSearch || textSearch.trim() === '') {
                throw new Error('Text search query must be provided');
            }
            // Create a relationship filter configuration
            const relationshipConfig = {
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
        }
        catch (error) {
            // Re-throw if it's already a rate limit error
            if (error instanceof RelationshipRateLimitError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new FilterValidationError(`Failed to create records-by-notes filter: ${errorMessage}`);
        }
    }
    Relationship.createRecordsByNotesFilter = createRecordsByNotesFilter;
})(Relationship || (Relationship = {}));
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
//# sourceMappingURL=index.js.map