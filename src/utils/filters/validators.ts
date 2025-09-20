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

// External dependencies
import { DateRangePreset, isValidFilterCondition } from '../../types/attio.js';
import { FilterValidationError } from '../../errors/api-errors.js';
import { isValidISODateString } from '../date-utils.js';

// Internal module dependencies
import {
  DateRange,
  ActivityFilter,
  InteractionType,
  NumericRange,
  FilterConditionType,
  ListEntryFilter,
} from './types.js';

/**
 * Validates a filter structure for basic required properties
 *
 * @param filter - The filter to validate
 * @returns True if filter is valid, false otherwise
 */
export function validateFilterStructure(filter: ListEntryFilter): boolean {
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

/**
 * Validates a date range object
 *
 * @param dateRange - The date range to validate
 * @returns Validated and normalized date range
 * @throws FilterValidationError if validation fails
 */
export function validateDateRange(
  dateRange: Record<string, unknown> | string | null | undefined
): DateRange {
  if (!dateRange) {
    throw new FilterValidationError('Date range is required');
  }

  // Normalize dateRange if it's a string
  let parsedDateRange: Record<string, unknown>;
  if (typeof dateRange === 'string') {
    try {
      parsedDateRange = JSON.parse(dateRange) as Record<string, unknown>;
    } catch (error: unknown) {
      throw new FilterValidationError(
        `Invalid date range format: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    parsedDateRange = dateRange;
  }

  // Check if it's a proper object
  if (
    typeof parsedDateRange !== 'object' ||
    Array.isArray(parsedDateRange) ||
    parsedDateRange === null
  ) {
    throw new FilterValidationError(
      'Date range must be an object with start, end, or preset properties'
    );
  }

  // Must have at least one of preset, start, or end
  if (
    !parsedDateRange.preset &&
    !parsedDateRange.start &&
    !parsedDateRange.end
  ) {
    throw new FilterValidationError(
      'Date range must specify at least one of: preset, start, or end'
    );
  }

  // Validate preset if provided
  if (parsedDateRange.preset) {
    const normalizedPreset =
      typeof parsedDateRange.preset === 'string'
        ? parsedDateRange.preset.toLowerCase().trim()
        : String(parsedDateRange.preset);

    const validPresets = Object.values(DateRangePreset);
    if (!validPresets.includes(normalizedPreset as DateRangePreset)) {
      throw new FilterValidationError(
        `Invalid date preset: "${parsedDateRange.preset}". ` +
          `Valid presets are: ${validPresets.join(', ')}`
      );
    }

    // Normalize the preset to ensure proper casing
    parsedDateRange.preset = normalizedPreset;
  }

  // Validate start date if provided
  if (parsedDateRange.start) {
    if (typeof parsedDateRange.start === 'string') {
      // Validate ISO string format
      if (!isValidISODateString(parsedDateRange.start)) {
        throw new FilterValidationError(
          `Invalid ISO date string format for start date: ${parsedDateRange.start}`
        );
      }
    } else if (
      typeof parsedDateRange.start === 'object' &&
      !Array.isArray(parsedDateRange.start)
    ) {
      // It's a relative date object, validate basic structure
      const startObj = parsedDateRange.start as Record<string, unknown>;
      if (!startObj.unit || !startObj.value || !startObj.direction) {
        throw new FilterValidationError(
          'Relative start date must have unit, value, and direction properties'
        );
      }

      // Validate value is a number
      if (typeof startObj.value !== 'number' || isNaN(startObj.value)) {
        throw new FilterValidationError('Relative date value must be a number');
      }

      // Validate direction
      if (startObj.direction !== 'past' && startObj.direction !== 'future') {
        throw new FilterValidationError(
          'Relative date direction must be either "past" or "future"'
        );
      }
    } else {
      throw new FilterValidationError(
        'Start date must be either an ISO date string or a relative date object'
      );
    }
  }

  // Validate end date if provided
  if (parsedDateRange.end) {
    if (typeof parsedDateRange.end === 'string') {
      // Validate ISO string format
      if (!isValidISODateString(parsedDateRange.end)) {
        throw new FilterValidationError(
          `Invalid ISO date string format for end date: ${parsedDateRange.end}`
        );
      }
    } else if (
      typeof parsedDateRange.end === 'object' &&
      !Array.isArray(parsedDateRange.end)
    ) {
      // It's a relative date object, validate basic structure
      const endObj = parsedDateRange.end as Record<string, unknown>;
      if (!endObj.unit || !endObj.value || !endObj.direction) {
        throw new FilterValidationError(
          'Relative end date must have unit, value, and direction properties'
        );
      }

      // Validate value is a number
      if (typeof endObj.value !== 'number' || isNaN(endObj.value)) {
        throw new FilterValidationError('Relative date value must be a number');
      }

      // Validate direction
      if (endObj.direction !== 'past' && endObj.direction !== 'future') {
        throw new FilterValidationError(
          'Relative date direction must be either "past" or "future"'
        );
      }
    } else {
      throw new FilterValidationError(
        'End date must be either an ISO date string or a relative date object'
      );
    }
  }

  return parsedDateRange as DateRange;
}

/**
 * Validates an activity filter object
 *
 * @param activityFilter - The activity filter to validate
 * @returns Validated and normalized activity filter
 * @throws FilterValidationError if validation fails
 */
export function validateActivityFilter(
  activityFilter: Record<string, unknown> | string | null | undefined
): ActivityFilter {
  if (!activityFilter) {
    throw new FilterValidationError('Activity filter is required');
  }

  // Normalize if it's a string
  let parsedActivityFilter: Record<string, unknown>;
  if (typeof activityFilter === 'string') {
    try {
      parsedActivityFilter = JSON.parse(activityFilter) as Record<
        string,
        unknown
      >;
    } catch (error: unknown) {
      throw new FilterValidationError(
        `Invalid activity filter format: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    parsedActivityFilter = activityFilter;
  }

  // Check if it's a proper object
  if (
    typeof parsedActivityFilter !== 'object' ||
    Array.isArray(parsedActivityFilter) ||
    parsedActivityFilter === null
  ) {
    throw new FilterValidationError(
      'Activity filter must be an object with dateRange and optional interactionType'
    );
  }

  // Validate required dateRange property
  if (!parsedActivityFilter.dateRange) {
    throw new FilterValidationError(
      'Activity filter must include a dateRange property'
    );
  }

  // Validate dateRange
  try {
    parsedActivityFilter.dateRange = validateDateRange(
      parsedActivityFilter.dateRange as
        | Record<string, unknown>
        | string
        | null
        | undefined
    );
  } catch (error: unknown) {
    throw new FilterValidationError(
      `Invalid dateRange in activity filter: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Validate interactionType if provided
  if (parsedActivityFilter.interactionType !== undefined) {
    const validTypes = Object.values(InteractionType);

    if (
      typeof parsedActivityFilter.interactionType !== 'string' ||
      !validTypes.includes(
        parsedActivityFilter.interactionType as InteractionType
      )
    ) {
      throw new FilterValidationError(
        `Invalid interaction type: "${parsedActivityFilter.interactionType}". ` +
          `Valid types are: ${validTypes.join(', ')}`
      );
    }
  }

  return parsedActivityFilter as ActivityFilter;
}

/**
 * Validates a numeric range object
 *
 * @param range - The numeric range to validate
 * @returns Validated and normalized numeric range
 * @throws FilterValidationError if validation fails
 */
export function validateNumericRange(
  range: Record<string, unknown> | string | null | undefined
): NumericRange {
  if (!range) {
    throw new FilterValidationError('Numeric range is required');
  }

  // Normalize if it's a string
  let parsedRange: Record<string, unknown>;
  if (typeof range === 'string') {
    try {
      parsedRange = JSON.parse(range) as Record<string, unknown>;
    } catch (error: unknown) {
      throw new FilterValidationError(
        `Invalid numeric range format: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    parsedRange = range;
  }

  // Check if it's a proper object
  if (
    typeof parsedRange !== 'object' ||
    Array.isArray(parsedRange) ||
    parsedRange === null
  ) {
    throw new FilterValidationError(
      'Numeric range must be an object with min, max, or equals properties'
    );
  }

  // Must have at least one of min, max, or equals
  if (
    parsedRange.min === undefined &&
    parsedRange.max === undefined &&
    parsedRange.equals === undefined
  ) {
    throw new FilterValidationError(
      'Numeric range must specify at least one of: min, max, or equals'
    );
  }

  // If equals is specified, min and max should not be
  if (
    parsedRange.equals !== undefined &&
    (parsedRange.min !== undefined || parsedRange.max !== undefined)
  ) {
    throw new FilterValidationError(
      'Cannot specify both equals and min/max in a numeric range'
    );
  }

  // Check types and convert to number if needed
  if (parsedRange.min !== undefined) {
    parsedRange.min = Number(parsedRange.min);
    if (isNaN(parsedRange.min as number)) {
      throw new FilterValidationError('Min value must be a valid number');
    }
  }

  if (parsedRange.max !== undefined) {
    parsedRange.max = Number(parsedRange.max);
    if (isNaN(parsedRange.max as number)) {
      throw new FilterValidationError('Max value must be a valid number');
    }
  }

  if (parsedRange.equals !== undefined) {
    parsedRange.equals = Number(parsedRange.equals);
    if (isNaN(parsedRange.equals as number)) {
      throw new FilterValidationError('Equals value must be a valid number');
    }
  }

  // Check that min <= max if both are specified
  if (
    parsedRange.min !== undefined &&
    parsedRange.max !== undefined &&
    (parsedRange.min as number) > (parsedRange.max as number)
  ) {
    throw new FilterValidationError(
      `Invalid numeric range: min (${parsedRange.min}) cannot be greater than max (${parsedRange.max})`
    );
  }

  return parsedRange as NumericRange;
}

/**
 * Validates a filter condition string
 *
 * @param condition - The condition to validate
 * @returns The validated condition
 * @throws FilterValidationError if validation fails
 */
export function validateFilterCondition(
  condition: string
): FilterConditionType {
  if (!condition) {
    throw new FilterValidationError('Filter condition is required');
  }

  // Use the isValidFilterCondition from types/attio.js
  if (!isValidFilterCondition(condition)) {
    const validConditions = Object.values(FilterConditionType);
    throw new FilterValidationError(
      `Invalid filter condition: "${condition}". ` +
        `Valid conditions are: ${validConditions.join(', ')}`
    );
  }

  return condition as FilterConditionType;
}

/**
 * Ensures a value is a number, converting if necessary
 *
 * @param value - The value to validate and convert
 * @param paramName - Name of the parameter (for error messages)
 * @param defaultValue - Optional default value if undefined
 * @returns The validated number
 * @throws FilterValidationError if validation fails
 */
export function validateNumericParam(
  value: unknown,
  paramName: string,
  defaultValue?: number
): number {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new FilterValidationError(`${paramName} is required`);
  }

  const num = Number(value);
  if (isNaN(num)) {
    throw new FilterValidationError(`${paramName} must be a valid number`);
  }

  return num;
}

/**
 * Validates filter structure and conditions
 *
 * @param filter - The filter to validate
 * @param validateConditions - Whether to validate condition types (default: true)
 * @throws FilterValidationError if validation fails
 */
export function validateFilterWithConditions(
  filter: ListEntryFilter,
  validateConditions: boolean = true
): void {
  if (!validateFilterStructure(filter)) {
    const slugInfo = filter?.attribute?.slug ? ` ${filter.attribute.slug}` : '';
    throw new FilterValidationError(
      `Invalid filter: Incomplete filter structure for${slugInfo}`
    );
  }

  const { slug } = filter.attribute;

  if (validateConditions && !isValidFilterCondition(filter.condition)) {
    throw new FilterValidationError(
      `Invalid filter condition '${filter.condition}' for attribute '${slug}'. ` +
        `Valid conditions are: ${Object.values(FilterConditionType).join(', ')}`
    );
  }
}
