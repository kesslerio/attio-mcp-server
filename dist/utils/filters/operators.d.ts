/**
 * Filter operator implementations and utilities
 * Provides functionality for working with logical and comparison operators
 */
import { ListEntryFilters, FilterConditionType } from "./types.js";
/**
 * Checks if an operator is supported for a specific field
 *
 * @param fieldSlug - The field slug to check
 * @param operator - The operator to validate
 * @returns True if the operator is supported for the field
 */
export declare function isOperatorSupportedForField(fieldSlug: string, operator: string): boolean;
/**
 * Maps a generic operator to a field-specific operator
 *
 * @param fieldSlug - The field slug
 * @param operator - The generic operator
 * @returns The mapped operator for the specific field
 */
export declare function mapOperatorForField(fieldSlug: string, operator: string): string;
/**
 * Inverts a filter condition (returns the opposite condition)
 *
 * @param condition - The condition to invert
 * @returns The inverted condition
 */
export declare function invertCondition(condition: FilterConditionType): FilterConditionType;
/**
 * Creates a NOT filter by inverting all conditions in the given filters
 *
 * @param filters - The filters to negate
 * @returns Negated filter set
 */
export declare function createNotFilter(filters: ListEntryFilters): ListEntryFilters;
/**
 * Checks if a condition requires a value
 *
 * @param condition - The condition to check
 * @returns True if the condition requires a value
 */
export declare function conditionRequiresValue(condition: FilterConditionType): boolean;
/**
 * Gets the comparison type for a filter condition
 *
 * @param condition - The filter condition
 * @returns The comparison type (equality, range, text, etc.)
 */
export declare function getComparisonType(condition: FilterConditionType): string;
/**
 * Determines if two filter conditions are compatible for combination
 *
 * @param condition1 - First condition
 * @param condition2 - Second condition
 * @returns True if conditions can be combined
 */
export declare function areConditionsCompatible(condition1: FilterConditionType, condition2: FilterConditionType): boolean;
/**
 * Simplifies a filter by combining compatible conditions
 *
 * @param filters - The filters to simplify
 * @returns Simplified filter set
 */
export declare function simplifyFilters(filters: ListEntryFilters): ListEntryFilters;
//# sourceMappingURL=operators.d.ts.map