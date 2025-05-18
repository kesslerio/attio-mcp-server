/**
 * @module validators
 *
 * Consolidated filter validation utilities
 * Provides functions to validate and normalize filter parameters
 *
 * This module provides:
 * - Structure validation for filter objects
 * - Date range validation and normalization
 * - Numeric range validation
 * - Activity filter validation
 * - Filter condition validation
 * - Parameter type validation and conversion
 */
import { DateRange, ActivityFilter, NumericRange, FilterConditionType, ListEntryFilter } from "./types.js";
/**
 * Validates a filter structure for basic required properties
 *
 * @param filter - The filter to validate
 * @returns True if filter is valid, false otherwise
 */
export declare function validateFilterStructure(filter: ListEntryFilter): boolean;
/**
 * Validates a date range object
 *
 * @param dateRange - The date range to validate
 * @returns Validated and normalized date range
 * @throws FilterValidationError if validation fails
 */
export declare function validateDateRange(dateRange: any): DateRange;
/**
 * Validates an activity filter object
 *
 * @param activityFilter - The activity filter to validate
 * @returns Validated and normalized activity filter
 * @throws FilterValidationError if validation fails
 */
export declare function validateActivityFilter(activityFilter: any): ActivityFilter;
/**
 * Validates a numeric range object
 *
 * @param range - The numeric range to validate
 * @returns Validated and normalized numeric range
 * @throws FilterValidationError if validation fails
 */
export declare function validateNumericRange(range: any): NumericRange;
/**
 * Validates a filter condition string
 *
 * @param condition - The condition to validate
 * @returns The validated condition
 * @throws FilterValidationError if validation fails
 */
export declare function validateFilterCondition(condition: string): FilterConditionType;
/**
 * Ensures a value is a number, converting if necessary
 *
 * @param value - The value to validate and convert
 * @param paramName - Name of the parameter (for error messages)
 * @param defaultValue - Optional default value if undefined
 * @returns The validated number
 * @throws FilterValidationError if validation fails
 */
export declare function validateNumericParam(value: any, paramName: string, defaultValue?: number): number;
/**
 * Validates filter structure and conditions
 *
 * @param filter - The filter to validate
 * @param validateConditions - Whether to validate condition types (default: true)
 * @throws FilterValidationError if validation fails
 */
export declare function validateFilterWithConditions(filter: ListEntryFilter, validateConditions?: boolean): void;
//# sourceMappingURL=validators.d.ts.map