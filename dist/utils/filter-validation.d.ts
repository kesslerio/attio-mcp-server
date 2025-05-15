/**
 * Validation utilities for filter inputs
 * Provides functions to validate and normalize filter parameters from user input
 */
import { DateRange, ActivityFilter, NumericRange, FilterConditionType } from "../types/attio.js";
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
//# sourceMappingURL=filter-validation.d.ts.map