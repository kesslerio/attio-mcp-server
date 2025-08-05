/**
 * Filter operator implementations and utilities
 * Provides functionality for working with logical and comparison operators
 */

import {
  FIELD_SPECIAL_HANDLING,
  FilterConditionType,
  type ListEntryFilter,
  type ListEntryFilters,
} from './types.js';

/**
 * Checks if an operator is supported for a specific field
 *
 * @param fieldSlug - The field slug to check
 * @param operator - The operator to validate
 * @returns True if the operator is supported for the field
 */
export function isOperatorSupportedForField(
  fieldSlug: string,
  operator: string
): boolean {
  const specialHandling = FIELD_SPECIAL_HANDLING[fieldSlug];

  if (!(specialHandling && specialHandling.operators)) {
    // No special handling defined, assume all operators are supported
    return true;
  }

  // Check if the operator is in the allowed list
  return specialHandling.operators.includes(operator);
}

/**
 * Maps a generic operator to a field-specific operator
 *
 * @param fieldSlug - The field slug
 * @param operator - The generic operator
 * @returns The mapped operator for the specific field
 */
export function mapOperatorForField(
  fieldSlug: string,
  operator: string
): string {
  const specialHandling = FIELD_SPECIAL_HANDLING[fieldSlug];

  if (!specialHandling) {
    return operator;
  }

  // Check if there's a mapping for this operator
  return specialHandling[operator] || operator;
}

/**
 * Inverts a filter condition (returns the opposite condition)
 *
 * @param condition - The condition to invert
 * @returns The inverted condition
 */
export function invertCondition(
  condition: FilterConditionType
): FilterConditionType {
  const inversionMap: Partial<
    Record<FilterConditionType, FilterConditionType>
  > = {
    [FilterConditionType.EQUALS]: FilterConditionType.NOT_EQUALS,
    [FilterConditionType.NOT_EQUALS]: FilterConditionType.EQUALS,
    [FilterConditionType.CONTAINS]: FilterConditionType.NOT_CONTAINS,
    [FilterConditionType.NOT_CONTAINS]: FilterConditionType.CONTAINS,
    [FilterConditionType.GREATER_THAN]: FilterConditionType.LESS_THAN_OR_EQUALS,
    [FilterConditionType.GREATER_THAN_OR_EQUALS]: FilterConditionType.LESS_THAN,
    [FilterConditionType.LESS_THAN]: FilterConditionType.GREATER_THAN_OR_EQUALS,
    [FilterConditionType.LESS_THAN_OR_EQUALS]: FilterConditionType.GREATER_THAN,
    [FilterConditionType.IS_EMPTY]: FilterConditionType.IS_NOT_EMPTY,
    [FilterConditionType.IS_NOT_EMPTY]: FilterConditionType.IS_EMPTY,
  };

  return inversionMap[condition] || condition;
}

/**
 * Creates a NOT filter by inverting all conditions in the given filters
 *
 * @param filters - The filters to negate
 * @returns Negated filter set
 */
export function createNotFilter(filters: ListEntryFilters): ListEntryFilters {
  const negatedFilters =
    (filters.filters &&
      filters.filters.map((filter) => ({
        ...filter,
        condition: invertCondition(filter.condition as FilterConditionType),
      }))) ||
    [];

  return {
    filters: negatedFilters,
    // Invert the matchAny logic as well
    matchAny: !filters.matchAny,
  };
}

/**
 * Checks if a condition requires a value
 *
 * @param condition - The condition to check
 * @returns True if the condition requires a value
 */
export function conditionRequiresValue(
  condition: FilterConditionType
): boolean {
  const noValueConditions = [
    FilterConditionType.IS_EMPTY,
    FilterConditionType.IS_NOT_EMPTY,
    FilterConditionType.IS_SET,
    FilterConditionType.IS_NOT_SET,
  ];

  return !noValueConditions.includes(condition);
}

/**
 * Gets the comparison type for a filter condition
 *
 * @param condition - The filter condition
 * @returns The comparison type (equality, range, text, etc.)
 */
export function getComparisonType(condition: FilterConditionType): string {
  const equalityConditions = [
    FilterConditionType.EQUALS,
    FilterConditionType.NOT_EQUALS,
  ];

  const rangeConditions = [
    FilterConditionType.GREATER_THAN,
    FilterConditionType.GREATER_THAN_OR_EQUALS,
    FilterConditionType.LESS_THAN,
    FilterConditionType.LESS_THAN_OR_EQUALS,
  ];

  const textConditions = [
    FilterConditionType.CONTAINS,
    FilterConditionType.NOT_CONTAINS,
    FilterConditionType.STARTS_WITH,
    FilterConditionType.ENDS_WITH,
  ];

  const existenceConditions = [
    FilterConditionType.IS_EMPTY,
    FilterConditionType.IS_NOT_EMPTY,
    FilterConditionType.IS_SET,
    FilterConditionType.IS_NOT_SET,
  ];

  if (equalityConditions.includes(condition)) return 'equality';
  if (rangeConditions.includes(condition)) return 'range';
  if (textConditions.includes(condition)) return 'text';
  if (existenceConditions.includes(condition)) return 'existence';

  return 'unknown';
}

/**
 * Determines if two filter conditions are compatible for combination
 *
 * @param condition1 - First condition
 * @param condition2 - Second condition
 * @returns True if conditions can be combined
 */
export function areConditionsCompatible(
  condition1: FilterConditionType,
  condition2: FilterConditionType
): boolean {
  const type1 = getComparisonType(condition1);
  const type2 = getComparisonType(condition2);

  // Same types are generally compatible
  if (type1 === type2) return true;

  // Range conditions can be combined (e.g., greater than AND less than)
  if (type1 === 'range' && type2 === 'range') return true;

  // Existence conditions cannot be combined with value conditions
  if (type1 === 'existence' || type2 === 'existence') return false;

  // Default to incompatible
  return false;
}

/**
 * Simplifies a filter by combining compatible conditions
 *
 * @param filters - The filters to simplify
 * @returns Simplified filter set
 */
export function simplifyFilters(filters: ListEntryFilters): ListEntryFilters {
  const simplifiedFilters: ListEntryFilter[] = [];
  const filterMap = new Map<string, ListEntryFilter[]>();

  // Group filters by attribute
  filters.filters &&
    filters.filters.forEach((filter) => {
      const key = filter.attribute.slug;
      if (!filterMap.has(key)) {
        filterMap.set(key, []);
      }
      filterMap.get(key)!.push(filter);
    });

  // Simplify each group
  filterMap.forEach((filterGroup, _attribute) => {
    if (filterGroup.length === 1) {
      // Single filter, no simplification needed
      simplifiedFilters.push(...filterGroup);
    } else {
      // Multiple filters for same attribute, check if they can be combined
      const rangeFilters = filterGroup.filter(
        (f) => getComparisonType(f.condition as FilterConditionType) === 'range'
      );

      if (rangeFilters.length === 2) {
        // Potentially combinable range filters
        const [filter1, filter2] = rangeFilters;

        // Check for min/max combination
        if (
          (filter1.condition === FilterConditionType.GREATER_THAN ||
            filter1.condition === FilterConditionType.GREATER_THAN_OR_EQUALS) &&
          (filter2.condition === FilterConditionType.LESS_THAN ||
            filter2.condition === FilterConditionType.LESS_THAN_OR_EQUALS)
        ) {
          // This is a valid range, keep both
          simplifiedFilters.push(filter1, filter2);
        } else if (
          (filter2.condition === FilterConditionType.GREATER_THAN ||
            filter2.condition === FilterConditionType.GREATER_THAN_OR_EQUALS) &&
          (filter1.condition === FilterConditionType.LESS_THAN ||
            filter1.condition === FilterConditionType.LESS_THAN_OR_EQUALS)
        ) {
          // This is a valid range, keep both
          simplifiedFilters.push(filter1, filter2);
        } else {
          // Incompatible range conditions, keep all
          simplifiedFilters.push(...filterGroup);
        }
      } else {
        // Cannot simplify, keep all filters
        simplifiedFilters.push(...filterGroup);
      }
    }
  });

  return {
    filters: simplifiedFilters,
    matchAny: filters.matchAny,
  };
}
