/**
 * Valid filter condition types for Attio API
 */
export var FilterConditionType;
(function (FilterConditionType) {
    // Equality conditions
    FilterConditionType["EQUALS"] = "equals";
    FilterConditionType["NOT_EQUALS"] = "not_equals";
    // String conditions
    FilterConditionType["CONTAINS"] = "contains";
    FilterConditionType["NOT_CONTAINS"] = "not_contains";
    FilterConditionType["STARTS_WITH"] = "starts_with";
    FilterConditionType["ENDS_WITH"] = "ends_with";
    // Numeric/Date conditions
    FilterConditionType["GREATER_THAN"] = "greater_than";
    FilterConditionType["LESS_THAN"] = "less_than";
    FilterConditionType["GREATER_THAN_OR_EQUALS"] = "greater_than_or_equals";
    FilterConditionType["LESS_THAN_OR_EQUALS"] = "less_than_or_equals";
    // Date range specific conditions
    FilterConditionType["BEFORE"] = "before";
    FilterConditionType["AFTER"] = "after";
    FilterConditionType["BETWEEN"] = "between";
    // Existence conditions
    FilterConditionType["IS_EMPTY"] = "is_empty";
    FilterConditionType["IS_NOT_EMPTY"] = "is_not_empty";
    FilterConditionType["IS_SET"] = "is_set";
    FilterConditionType["IS_NOT_SET"] = "is_not_set";
})(FilterConditionType || (FilterConditionType = {}));
/**
 * Type guard to check if a string is a valid filter condition
 *
 * This function validates that a given string represents a valid filter condition
 * type as defined in the FilterConditionType enum. It provides type safety when
 * working with filter conditions from external input.
 *
 * @param condition - The string condition to check
 * @returns True if the condition is a valid FilterConditionType, false otherwise
 *
 * @example
 * ```typescript
 * const userCondition = "equals";
 *
 * if (isValidFilterCondition(userCondition)) {
 *   // TypeScript knows userCondition is a FilterConditionType here
 *   // Safe to use in filter operations
 * } else {
 *   // Handle invalid condition
 *   throw new FilterValidationError(`Invalid filter condition: ${userCondition}`);
 * }
 * ```
 */
export function isValidFilterCondition(condition) {
    return Object.values(FilterConditionType).includes(condition);
}
/**
 * Time units for relative date expressions
 */
export var RelativeDateUnit;
(function (RelativeDateUnit) {
    RelativeDateUnit["DAY"] = "day";
    RelativeDateUnit["WEEK"] = "week";
    RelativeDateUnit["MONTH"] = "month";
    RelativeDateUnit["QUARTER"] = "quarter";
    RelativeDateUnit["YEAR"] = "year";
})(RelativeDateUnit || (RelativeDateUnit = {}));
/**
 * Supported date range preset values
 */
export var DateRangePreset;
(function (DateRangePreset) {
    DateRangePreset["TODAY"] = "today";
    DateRangePreset["YESTERDAY"] = "yesterday";
    DateRangePreset["THIS_WEEK"] = "this_week";
    DateRangePreset["LAST_WEEK"] = "last_week";
    DateRangePreset["THIS_MONTH"] = "this_month";
    DateRangePreset["LAST_MONTH"] = "last_month";
    DateRangePreset["THIS_QUARTER"] = "this_quarter";
    DateRangePreset["LAST_QUARTER"] = "last_quarter";
    DateRangePreset["THIS_YEAR"] = "this_year";
    DateRangePreset["LAST_YEAR"] = "last_year";
})(DateRangePreset || (DateRangePreset = {}));
/**
 * Interaction types for activity filtering
 */
export var InteractionType;
(function (InteractionType) {
    InteractionType["ANY"] = "any";
    InteractionType["EMAIL"] = "email";
    InteractionType["CALENDAR"] = "calendar";
    InteractionType["PHONE"] = "phone";
    InteractionType["MEETING"] = "meeting";
    InteractionType["CUSTOM"] = "custom";
})(InteractionType || (InteractionType = {}));
/**
 * Resource type enum for better type safety
 */
export var ResourceType;
(function (ResourceType) {
    ResourceType["PEOPLE"] = "people";
    ResourceType["COMPANIES"] = "companies";
    ResourceType["LISTS"] = "lists";
    ResourceType["RECORDS"] = "records";
})(ResourceType || (ResourceType = {}));
//# sourceMappingURL=attio.js.map