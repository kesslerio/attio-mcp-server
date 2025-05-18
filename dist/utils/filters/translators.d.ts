/**
 * @module translators
 *
 * Filter translation utilities for converting between formats
 * Handles transformation between MCP filter format and Attio API format
 *
 * This module provides:
 * - MCP to Attio API format transformation
 * - Support for AND/OR logical operators
 * - Operator conversion utilities
 * - Attribute name transformations
 * - Reverse transformation (API to MCP)
 */
import { ListEntryFilters, ListEntryFilter, AttioApiFilter, FilterConditionType } from "./types.js";
/**
 * Transforms list entry filters to the format expected by the Attio API
 * This function handles both simple filters and advanced filters with logical operators
 *
 * @param filters - Filter configuration from the MCP API
 * @param validateConditions - Whether to validate condition types (default: true)
 * @returns Transformed filter object for Attio API
 * @throws FilterValidationError if validation fails
 */
export declare function transformFiltersToApiFormat(filters: ListEntryFilters | undefined, validateConditions?: boolean): {
    filter?: AttioApiFilter;
};
/**
 * Converts a single filter operator to API format
 *
 * @param operator - The operator to convert (e.g., 'equals', 'contains')
 * @returns The operator in API format (e.g., '$equals', '$contains')
 */
export declare function convertOperatorToApiFormat(operator: string): string;
/**
 * Transforms attribute names if they require special handling
 *
 * @param attributeSlug - The attribute slug to transform
 * @returns The transformed attribute name
 */
export declare function transformAttributeName(attributeSlug: string): string;
/**
 * Processes a filter value for API submission
 * Handles any special value transformations needed
 *
 * @param value - The value to process
 * @param condition - The filter condition being used
 * @returns The processed value
 */
export declare function processFilterValue(value: any, condition: FilterConditionType): any;
/**
 * Transforms a simple filter to API format
 *
 * @param filter - The filter to transform
 * @returns API-formatted filter object
 */
export declare function transformSingleFilterToApi(filter: ListEntryFilter): AttioApiFilter;
/**
 * Converts API filter format back to MCP filter format
 * Useful for debugging and reverse transformation
 *
 * @param apiFilter - API format filter
 * @returns MCP format filters
 */
export declare function transformApiFormatToFilters(apiFilter: AttioApiFilter): ListEntryFilters;
//# sourceMappingURL=translators.d.ts.map